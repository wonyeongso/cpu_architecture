export default function AsmCache() {
  return (
    <>
      <h2>이 페이지의 범위 <span className="en">/ Scope</span></h2>
      <p>cache 동작에 관여하는 명령들 — <b>CMO (Cache Maintenance Op), DC ZVA, PRFM, alignment hint, 스트리밍 load/store</b>. ARM ARM의 cache 관련 mnemonic을 categorical view로 정리하고, 면접에서 묻는 패턴(false sharing 진단, DMA-safe 시퀀스, JIT 시퀀스)을 함께.</p>

      <h2>① CMO 분류 — 4 차원 조합 <span className="en">/ Mnemonic Anatomy</span></h2>
      <p>ARM CMO 니모닉은 <b>대상 · 동작 · 범위 · 기준점</b> 4요소를 합친 약자.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>자리</th><th>값</th><th>의미</th></tr></thead>
          <tbody>
            <tr><td>대상</td><td><code>IC</code> / <code>DC</code></td><td>Instruction cache / Data cache</td></tr>
            <tr><td>동작</td><td><code>I</code> / <code>C</code> / <code>CI</code></td><td>Invalidate / Clean / Clean+Invalidate</td></tr>
            <tr><td>범위</td><td><code>VA</code> / <code>SW</code> / <code>ALL</code></td><td>by VA / set-way / 전부</td></tr>
            <tr><td>기준점</td><td><code>U</code> / <code>C</code></td><td>to PoU / to PoC</td></tr>
          </tbody>
        </table>
      </div>
      <p>예: <code>DC CIVAC</code> = D-cache, Clean+Invalidate, by VA, to PoC.&nbsp;&nbsp;<code>IC IVAU</code> = I-cache, Invalidate, by VA, to PoU.</p>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>PoU vs PoC — 뭐가 다른가.</b><br/>
        캐시 계층의 어느 지점까지 일관성을 보장할지를 정하는 두 기준점.<br/>
        <b>PoU (Point of Unification)</b> — 한 코어 안에서 <b>I-cache와 D-cache가 같은 데이터를 보는 지점</b>. 보통 L2. 자기 코어가 방금 쓴 데이터를 자기 코어가 instruction으로 fetch할 때 필요(예: JIT, self-modifying code) — <code>DC CVAU</code>로 D→PoU만 밀면 충분.<br/>
        <b>PoC (Point of Coherency)</b> — <b>모든 관측자(다른 코어 + DMA 등 외부 master)가 같은 데이터를 보는 지점</b>. 보통 DRAM. 다른 코어나 device와 데이터를 주고받을 때 필요 — <code>DC CVAC</code>로 D→PoC까지 밀어야 함.<br/>
        <b>한 줄로:</b> "내 코어 안 I/D 동기화면 PoU, 시스템 전체와 동기화면 PoC". PoC가 PoU보다 더 깊으니 더 비쌈.</div>
      </div>

      <h2>② 자주 쓰는 CMO 명령 <span className="en">/ Working Set</span></h2>
      <pre><code>
<span className="kw">IC</span>   IALLU              <span className="cmt">{"// invalidate this core's entire I-cache (to PoU)"}</span>{"\n"}
<span className="kw">IC</span>   IALLUIS            <span className="cmt">{"// same + inner shareable (all cores)"}</span>{"\n"}
<span className="kw">IC</span>   IVAU, Xt           <span className="cmt">{"// invalidate I-cache line at address Xt"}</span>{"\n"}
{"\n"}
<span className="kw">DC</span>   IVAC, Xt           <span className="cmt">{"// Invalidate D by VA to PoC (after DMA-in)"}</span>{"\n"}
<span className="kw">DC</span>   CVAC, Xt           <span className="cmt">{"// Clean by VA to PoC (before DMA-out)"}</span>{"\n"}
<span className="kw">DC</span>   CIVAC, Xt          <span className="cmt">{"// Clean+Invalidate (bidirectional DMA)"}</span>{"\n"}
<span className="kw">DC</span>   CVAU, Xt           <span className="cmt">{"// Clean to PoU (for self-modifying code)"}</span>{"\n"}
<span className="kw">DC</span>   ZVA, Xt            <span className="cmt">{"// zero a whole cache line (memset accelerator)"}</span>
      </code></pre>

      <h2>③ DMA 송수신 시퀀스 <span className="en">/ DMA Sync Patterns</span></h2>
      <pre><code>
<span className="cmt">{"// before handing the buffer off to DMA (CPU → device)"}</span>{"\n"}
  <span className="kw">dc</span>    <span className="kw">cvac</span>, x_buf            <span className="cmt">{"// clean dirty lines down to PoC"}</span>{"\n"}
  <span className="kw">dsb</span>   <span className="kw">sy</span>                     <span className="cmt">{"// fully reflected to DRAM"}</span>{"\n"}
  <span className="cmt">{"// → kick DMA engine here"}</span>{"\n\n"}
<span className="cmt">{"// after DMA fills the buffer (device → CPU)"}</span>{"\n"}
  <span className="kw">dc</span>    <span className="kw">ivac</span>, x_buf            <span className="cmt">{"// invalidate stale lines"}</span>{"\n"}
  <span className="kw">dsb</span>   <span className="kw">sy</span>                     <span className="cmt">{"// wait for invalidate"}</span>{"\n"}
  <span className="cmt">{"// → CPU now reads fresh DRAM"}</span>
      </code></pre>
      <div className="callout warn">
        <span className="icon">⚠</span>
        <div><b>면접 함정.</b> CMO 발행 후 <b>DSB로 완료 대기</b>가 빠지면 buffer가 device에 보이기 전에 다음 동작 진행 → race. 또한 buffer 시작 ~ 끝까지 라인을 모두 cover하려면 <b>line size 단위 loop</b>로 호출해야 함 — 보통 64 byte stride.</div>
      </div>

      <h2>④ Self-Modifying Code 시퀀스 <span className="en">/ JIT Pattern</span></h2>
      <pre><code>
<span className="cmt">{"// JIT compiler / hot-patch — write new instruction then execute"}</span>{"\n"}
  <span className="kw">str</span>   w_new_insn, [x_addr]   <span className="cmt">{"// ① write as data → D-cache"}</span>{"\n"}
{"\n"}
  <span className="kw">dc</span>    <span className="kw">cvau</span>, x_addr          <span className="cmt">{"// ② D-cache clean to PoU"}</span>{"\n"}
  <span className="kw">dsb</span>   <span className="kw">ish</span>                   <span className="cmt">{"// ③ wait clean across cores"}</span>{"\n"}
  <span className="kw">ic</span>    <span className="kw">ivau</span>, x_addr          <span className="cmt">{"// ④ I-cache invalidate (drop old)"}</span>{"\n"}
  <span className="kw">dsb</span>   <span className="kw">ish</span>                   <span className="cmt">{"// ⑤ wait invalidate across cores"}</span>{"\n"}
  <span className="kw">isb</span>                         <span className="cmt">{"// ⑥ flush this core's pipeline"}</span>{"\n"}
  <span className="kw">br</span>    x_addr                <span className="cmt">{"// safe to jump"}</span>
      </code></pre>
      <p><b>왜 6 단계인가.</b> D-cache와 I-cache가 분리되어 있어 ② 없으면 새 instruction이 I-cache에 안 보임. ⑤ 없으면 다른 코어가 옛 instruction fetch. ⑥ 없으면 자기 파이프라인이 prefetch한 옛 instruction 실행. <b>면접 단골</b> — 한 단계라도 빼면 깨지는 이유 답할 줄 알아야.</p>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>C에서는.</b> <code>__builtin___clear_cache(begin, end)</code>(GCC/Clang) 한 줄이 위 시퀀스를 자동 생성. Linux 유저스페이스는 <code>__clear_cache()</code> glibc 래퍼.</div>
      </div>

      <h2>⑤ DC ZVA — 캐시 라인 zero <span className="en">/ Fast memset</span></h2>
      <pre><code>
<span className="cmt">{"// DC ZVA: write zeros to a whole cache line in one shot"}</span>{"\n"}
<span className="cmt">{"// no read-for-ownership — directly allocates a zeroed line"}</span>{"\n\n"}
memset_zero:                            <span className="cmt">{"// x0=ptr, x1=size (bytes, multiple of line size)"}</span>{"\n"}
{"  "}<span className="kw">mrs</span>   x2, <span className="reg">DCZID_EL0</span>           <span className="cmt">{"// query supported line size"}</span>{"\n"}
{"  "}<span className="kw">and</span>   x2, x2, <span className="num">#0xF</span>            <span className="cmt">{"// log2(line/4)"}</span>{"\n"}
{"  "}<span className="kw">mov</span>   x3, <span className="num">#4</span>{"\n"}
{"  "}<span className="kw">lsl</span>   x3, x3, x2               <span className="cmt">{"// x3 = line bytes (typically 64)"}</span>{"\n"}
.Lloop:{"\n"}
{"  "}<span className="kw">dc</span>    <span className="kw">zva</span>, x0                 <span className="cmt">{"// zero the line at x0"}</span>{"\n"}
{"  "}<span className="kw">add</span>   x0, x0, x3{"\n"}
{"  "}<span className="kw">subs</span>  x1, x1, x3{"\n"}
{"  "}<span className="kw">b.gt</span>  .Lloop{"\n"}
{"  "}<span className="kw">ret</span>
      </code></pre>
      <p>일반 STR로 같은 라인에 64-byte 0을 쓰는 것 대비 <b>~2배 빠름</b> — read-for-ownership을 건너뛰기 때문. glibc <code>memset</code>이 자동 활용 (<code>__memset_zva</code> path).</p>

      <h2>⑥ PRFM — Prefetch Hint <span className="en">/ Software Prefetch</span></h2>
      <pre><code>
<span className="cmt">{"// PRFM <type>, addr"}</span>{"\n"}
<span className="cmt">{"//   type encoding: <target><policy><level>"}</span>{"\n"}
<span className="cmt">{"//   target: PLD (load) / PST (store) / PLI (instruction)"}</span>{"\n"}
<span className="cmt">{"//   policy: KEEP (cache) / STRM (streaming, low priority)"}</span>{"\n"}
<span className="cmt">{"//   level:  L1 / L2 / L3"}</span>{"\n\n"}
<span className="kw">prfm</span>  <span className="kw">PLDL1KEEP</span>, [x0]        <span className="cmt">{"// preload to L1 for read"}</span>{"\n"}
<span className="kw">prfm</span>  <span className="kw">PSTL2KEEP</span>, [x0, <span className="num">#256</span>]  <span className="cmt">{"// preload to L2 for write"}</span>{"\n"}
<span className="kw">prfm</span>  <span className="kw">PLDL1STRM</span>, [x1]        <span className="cmt">{"// streaming — bypass cache eviction policy"}</span>
      </code></pre>
      <div className="callout warn">
        <span className="icon">⚠</span>
        <div><b>면접 함정.</b> PRFM은 <b>hint일 뿐 보장 아님</b>. CPU가 무시할 수 있고, 너무 이르면 evict, 너무 늦으면 무용. <code>perf stat</code>으로 hit/miss 보면서 distance(<code>#256</code>) tuning. linked-list traversal에서만 효용 큼 — sequential access는 HW prefetcher가 더 잘함.</div>
      </div>

      <h2>⑦ False Sharing — asm으로 진단 <span className="en">/ Cache-line Aware Layout</span></h2>
      <pre><code>
<span className="cmt">{"// BAD — two atomics on same 64B line → ping-pong"}</span>{"\n"}
<span className="kw">struct</span> Bad {"{"}{"\n"}
{"  "}<span className="kw">atomic_int</span> a;          <span className="cmt">{"// offset 0"}</span>{"\n"}
{"  "}<span className="kw">atomic_int</span> b;          <span className="cmt">{"// offset 4 — same line as a !"}</span>{"\n"}
{"};"}                              <span className="cmt">{"// sizeof = 8"}</span>{"\n\n"}
<span className="cmt">{"// GOOD — explicit 64B alignment"}</span>{"\n"}
<span className="kw">struct</span> Good {"{"}{"\n"}
{"  "}<span className="kw">alignas</span>(<span className="num">64</span>) <span className="kw">atomic_int</span> a;{"\n"}
{"  "}<span className="kw">alignas</span>(<span className="num">64</span>) <span className="kw">atomic_int</span> b;{"\n"}
{"};"}                              <span className="cmt">{"// sizeof = 128 — separate lines"}</span>
      </code></pre>
      <p><b>asm으로 진단:</b> <code>perf c2c</code> 또는 <code>perf stat -e cache-misses,cache-references</code> 결과에서 두 atomic 사용 thread 모두 high miss → ping-pong. 코드 측면에서는 같은 struct 내부에 자주 쓰는 atomic이 64B 미만 거리에 있으면 의심.</p>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>Linux 매크로.</b> 커널은 <code>____cacheline_aligned</code>, <code>L1_CACHE_BYTES</code>(보통 64) 매크로로 자동 처리. 사용자 코드는 <code>std::hardware_destructive_interference_size</code> (C++17) 활용 가능.</div>
      </div>

      <h2>⑧ Cache 정보 읽기 <span className="en">/ Discovery Registers</span></h2>
      <pre><code>
<span className="cmt">{"// Read cache hierarchy at runtime"}</span>{"\n"}
  <span className="kw">mrs</span>   x0, <span className="reg">CTR_EL0</span>          <span className="cmt">{"// Cache Type — IminLine, DminLine"}</span>{"\n"}
  <span className="kw">mrs</span>   x1, <span className="reg">CCSIDR_EL1</span>       <span className="cmt">{"// selected cache size: sets, ways, line"}</span>{"\n"}
  <span className="kw">mrs</span>   x2, <span className="reg">CLIDR_EL1</span>        <span className="cmt">{"// cache levels implemented"}</span>{"\n"}
  <span className="kw">mrs</span>   x3, <span className="reg">CSSELR_EL1</span>       <span className="cmt">{"// select level/type before reading CCSIDR"}</span>
      </code></pre>
      <p><b>실용:</b> <code>CTR_EL0.DminLine</code> = D-cache 최소 line size (log2 of words). 64B 가정 코드는 깨질 수 있어 동적 query가 정석 — 특히 ARM big.LITTLE / DynamIQ는 코어마다 line size 다를 수 있음.</p>

      <h2>⑨ NEON streaming load/store <span className="en">/ LD1 / ST1 + Hints</span></h2>
      <pre><code>
<span className="cmt">{"// LD1 — multi-lane structured load"}</span>{"\n"}
<span className="kw">ld1</span>  {"{"}v0.16b, v1.16b{"}"}, [x0]             <span className="cmt">{"// load 32B into v0+v1"}</span>{"\n"}
<span className="kw">ld1</span>  {"{"}v0.4s, v1.4s, v2.4s, v3.4s{"}"}, [x0]   <span className="cmt">{"// load 64B (full cache line)"}</span>{"\n\n"}
<span className="cmt">{"// LDNP/STNP — non-temporal pair (streaming)"}</span>{"\n"}
<span className="kw">ldnp</span> q0, q1, [x0]                       <span className="cmt">{"// load pair, hint: don't keep in cache"}</span>{"\n"}
<span className="kw">stnp</span> q0, q1, [x1]                       <span className="cmt">{"// store pair, hint: bypass cache"}</span>
      </code></pre>
      <p><b>활용:</b> 큰 배열을 한 번 훑고 버릴 때 (memcpy, packet copy). <b>LDNP/STNP</b>는 cache를 오염시키지 않아 LLC pollution 회피. glibc <code>memcpy</code>가 큰 사이즈에서 자동 사용.</p>

      <h2>한 줄 요약 <span className="en">/ Cheat Sheet</span></h2>
      <div className="callout">
        <span className="icon">📌</span>
        <div>
          <ul style={{margin: 0, paddingLeft: 18}}>
            <li>CMO 4요소: <b>대상 · 동작 · 범위 · 기준점</b>. <code>DC CIVAC</code> 읽을 줄 알면 됨.</li>
            <li>DMA: 송신 전 <code>DC CVAC</code>, 수신 후 <code>DC IVAC</code>, 양방향 <code>DC CIVAC</code> + 항상 <code>DSB</code>.</li>
            <li>JIT 6 단계: STR → DC CVAU → DSB → IC IVAU → DSB → ISB. C에선 <code>__builtin___clear_cache</code>.</li>
            <li>fast memset: <code>DC ZVA</code> — read-for-ownership 회피로 ~2배.</li>
            <li>PRFM은 hint, distance tuning 필요. linked-list만 효용 큼.</li>
            <li>False sharing 의심: 64B 안에 자주 쓰는 atomic 둘 → <code>alignas(64)</code>.</li>
            <li>line size 동적 query: <code>CTR_EL0.DminLine</code>.</li>
            <li>큰 copy는 <code>LDNP/STNP</code>로 cache 오염 피함.</li>
          </ul>
        </div>
      </div>
    </>
  )
}
