export default function Cache() {
  return (
    <>
      <h2>Cache Hierarchy</h2>
      <p>대부분의 Cortex-A는 <b>Harvard L1</b> (I/D 분리) + <b>Unified L2</b>, 일부는 shared <b>L3 / SLC</b>까지 보유.</p>

      <h2>인덱싱 방식 <span className="en">/ Indexing Schemes</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Type</th><th>Index</th><th>Tag</th><th>Trade-offs</th></tr></thead>
          <tbody>
            <tr><td><code>VIVT</code></td><td>VA</td><td>VA</td><td>fast but aliasing/homonym hazards — rarely used</td></tr>
            <tr><td><code>VIPT</code></td><td>VA</td><td>PA</td><td>can run in parallel with TLB — typical L1D</td></tr>
            <tr><td><code>PIPT</code></td><td>PA</td><td>PA</td><td>no aliasing, TLB first — typical L2/L3</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Shareability &amp; Coherency Points</h2>
      <div className="grid2">
        <div className="card">
          <h4>Shareability Domains</h4>
          <ul>
            <li><b>Non-shareable</b>: single core, local</li>
            <li><b>Inner Shareable (ISH)</b>: within the same cluster</li>
            <li><b>Outer Shareable (OSH)</b>: across clusters / system-wide</li>
          </ul>
        </div>
        <div className="card">
          <h4>Coherency Points</h4>
          <ul>
            <li><b>PoU</b> (Point of Unification) — where I/D caches see the same data</li>
            <li><b>PoC</b> (Point of Coherency) — where all masters (incl. DMA) agree</li>
          </ul>
        </div>
      </div>

      <h2>Cache Maintenance Ops (CMO) <span className="en">/ What &amp; Why</span></h2>
      <p>CPU가 보는 "메모리의 값"과 실제 DRAM·다른 관측자(DMA, 다른 코어)가 보는 값이
      <b>캐시 때문에 달라지는 순간</b>이 있습니다. 이때 SW가 명시적으로 캐시를 조작해
      일치시키는 명령들이 CMO(Cache Maintenance Operation)예요.</p>

      <h3>언제 필요한가</h3>
      <div className="grid2">
        <div className="card">
          <h4>① DMA로 버퍼 넘길 때</h4>
          <p>CPU가 버퍼에 쓴 내용이 <b>D-cache에만</b> 있고 DRAM에는 아직 없음. 장치가 DRAM을 읽으면 옛 값. → <b>Clean</b> 필요.</p>
        </div>
        <div className="card">
          <h4>② DMA가 버퍼를 채운 뒤</h4>
          <p>장치는 DRAM을 직접 갱신했지만 CPU의 D-cache에는 <b>낡은 값이 남아</b> 있음. → <b>Invalidate</b>로 캐시 버리고 DRAM에서 다시 읽게.</p>
        </div>
        <div className="card">
          <h4>③ 코드를 데이터로 썼을 때</h4>
          <p>JIT/패치. 방금 쓴 새 명령이 <b>D-cache에만</b> 있고 <b>I-cache엔 옛 명령</b>이 들어있음. → 둘을 맞춰야 새 코드가 실행됨.</p>
        </div>
        <div className="card">
          <h4>④ MMU 켜기 전/후</h4>
          <p>부팅 초기 캐시에 쓰레기 라인이 있을 수 있고, 페이지 속성이 바뀌면 invalidate가 필요.</p>
        </div>
      </div>

      <h3>세 가지 기본 동작</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>동작</th><th>하는 일</th><th>비유</th></tr></thead>
          <tbody>
            <tr><td><b>Invalidate</b></td><td>캐시 라인을 <b>그냥 버림</b> (DRAM에 반영 X)</td><td>"낡았을지 모르니 없는 걸로 치자"</td></tr>
            <tr><td><b>Clean</b> (writeback)</td><td>dirty 라인을 <b>DRAM까지 밀어내림</b>, 캐시엔 남김</td><td>"내가 쓴 내용을 저장소에 반영"</td></tr>
            <tr><td><b>Clean + Invalidate</b></td><td>Clean 후 Invalidate — 밀어내고 버림</td><td>"저장하고 지운다"</td></tr>
          </tbody>
        </table>
      </div>

      <h3>명령 이름 읽는 법</h3>
      <p>ARM CMO 니모닉은 <b>대상 · 동작 · 범위 · 기준점</b> 4요소를 합친 약자입니다.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>자리</th><th>값</th><th>의미</th></tr></thead>
          <tbody>
            <tr><td>대상</td><td><code>IC</code> / <code>DC</code></td><td>Instruction cache / Data cache</td></tr>
            <tr><td>동작</td><td><code>I</code> / <code>C</code> / <code>CI</code></td><td>Invalidate / Clean / Clean+Invalidate</td></tr>
            <tr><td>범위</td><td><code>VA</code> / <code>SW</code> / <code>ALL</code></td><td>주소 기준 / set-way / 전부</td></tr>
            <tr><td>기준점</td><td><code>U</code> / <code>C</code></td><td>to PoU / to PoC</td></tr>
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
      예: <code>DC CIVAC</code> = <b>D</b>ata cache, <b>C</b>lean + <b>I</b>nvalidate, by <b>VA</b>, to Po<b>C</b>.
      &nbsp;/&nbsp; <code>IC IVAU</code> = <b>I</b>-cache, <b>I</b>nvalidate, by <b>VA</b>, to Po<b>U</b>.</p>

      <h3>자주 쓰는 명령 정리</h3>
      <pre><code>
<span className="kw">IC</span>   IALLU              <span className="cmt">{"// invalidate this core's entire I-cache (to PoU)"}</span>{"\n"}
<span className="kw">IC</span>   IALLUIS            <span className="cmt">{"// same + inner shareable (all cores)"}</span>{"\n"}
<span className="kw">IC</span>   IVAU, Xt           <span className="cmt">{"// invalidate only the I-cache line at address Xt"}</span>{"\n"}
{"\n"}
<span className="kw">DC</span>   IVAC, Xt           <span className="cmt">{"// Invalidate D by VA to PoC (after DMA-in)"}</span>{"\n"}
<span className="kw">DC</span>   CVAC, Xt           <span className="cmt">{"// Clean by VA to PoC (before DMA-out)"}</span>{"\n"}
<span className="kw">DC</span>   CIVAC, Xt          <span className="cmt">{"// Clean+Invalidate (bidirectional DMA)"}</span>{"\n"}
<span className="kw">DC</span>   CVAU, Xt           <span className="cmt">{"// Clean to PoU (for self-modifying code)"}</span>{"\n"}
<span className="kw">DC</span>   ZVA, Xt            <span className="cmt">{"// zero a whole cache line (memset accelerator)"}</span>
      </code></pre>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>Why PoU vs PoC?</b> PoU(Point of Unification)는 I/D 캐시가 같은 걸 보는 지점 — 보통 L2. 자기 수정 코드엔 <code>CVAU</code>면 충분.
        PoC(Point of Coherency)는 DMA까지 보는 지점 — 보통 DRAM. 장치와 주고받을 땐 <code>CVAC</code>로 끝까지 밀어야 함.</div>
      </div>

      <div className="callout warn">
        <span className="icon">⚠</span>
        <div><b>CMO만으로는 끝나지 않음.</b> CMO 발행 후엔 <b>DSB</b>로 "실제 완료"를 기다려야 후속 동작(DMA 킥, 코드 실행)이 안전. 아래 SMC 시퀀스가 정식 예시.</div>
      </div>

      <h2>Self-modifying Code 시퀀스 <span className="en">/ SMC Sequence</span></h2>
      <p><b>"자기 수정 코드(Self-Modifying Code, SMC)"</b> — 실행 중인 프로그램이 <b>자기 코드 영역을 다시 쓰는</b> 경우.
      JIT 컴파일러(JVM HotSpot, V8, LuaJIT), 동적 패치, 부트로더가 DRAM으로 커널 이미지 복사 후 점프 등이 대표 사례.</p>

      <h3>왜 특별한가</h3>
      <p>우리가 <code>str</code>로 메모리에 데이터를 쓰면 그 값은 <b>D-cache(데이터 캐시)에 먼저</b> 들어갑니다.
      그런데 CPU가 명령을 읽을 땐 <b>I-cache(명령 캐시)</b>를 봐요. 이 둘은 <b>물리적으로 분리</b>되어 있어서,
      방금 쓴 새 명령이 I-cache엔 아직 반영되지 않음 → <b>옛 명령이 실행됨</b>.</p>

      <div className="diagram">{` STR 로 새 명령 쓰기
        |
        v
  +---------------+       +---------------+
  |   D-cache     |       |   I-cache     |
  | [새 명령 O]    |       | [옛 명령 ✗]    |  ← CPU가 fetch하면 여기!
  +-------+-------+       +-------^-------+
          |                       |
          +-------> DRAM <--------+
          (Clean하면)           (Invalidate해야 다시 읽어감)`}</div>

      <h3>표준 5단계 시퀀스</h3>
      <pre><code>
<span className="cmt">{"// precondition: x_addr = address where the new instruction was written"}</span>{"\n"}
{"\n"}
  <span className="kw">str</span>   w_new_insn, [x_addr]   <span className="cmt">{"// ① write new instruction as data (lands in D-cache)"}</span>{"\n"}
{"\n"}
  <span className="kw">dc</span>    <span className="kw">cvau</span>, x_addr           <span className="cmt">{"// ② D-cache clean → push to PoU so I-cache can see it"}</span>{"\n"}
  <span className="kw">dsb</span>   <span className="kw">ish</span>                    <span className="cmt">{"// ③ wait for clean to complete on every core"}</span>{"\n"}
{"\n"}
  <span className="kw">ic</span>    <span className="kw">ivau</span>, x_addr           <span className="cmt">{"// ④ I-cache invalidate — drop the old instruction"}</span>{"\n"}
  <span className="kw">dsb</span>   <span className="kw">ish</span>                    <span className="cmt">{"// ⑤ wait for invalidate to complete on every core"}</span>{"\n"}
{"\n"}
  <span className="kw">isb</span>                          <span className="cmt">{"// ⑥ flush this core's pipeline — drop already-prefetched old instructions"}</span>{"\n"}
{"\n"}
  <span className="kw">br</span>    x_addr                 <span className="cmt">{"// safe to jump into the new code now"}</span>
      </code></pre>

      <h3>각 단계가 왜 필요한가</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>단계</th><th>빼먹으면?</th></tr></thead>
          <tbody>
            <tr><td>② <code>DC CVAU</code></td><td>새 명령이 D-cache에만 머물러 I-cache가 못 봄</td></tr>
            <tr><td>③ <code>DSB ISH</code></td><td>clean이 아직 진행 중인데 다음 단계 시작 — 레이스</td></tr>
            <tr><td>④ <code>IC IVAU</code></td><td>I-cache에 옛 명령이 그대로 남아 fetch 시 옛 값</td></tr>
            <tr><td>⑤ <code>DSB ISH</code></td><td>invalidate 진행 중 분기하면 다른 코어가 옛 명령 fetch 가능</td></tr>
            <tr><td>⑥ <code>ISB</code></td><td>이미 파이프라인에 prefetch된 옛 명령이 실행됨</td></tr>
          </tbody>
        </table>
      </div>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>C/C++에선.</b> 직접 쓸 일은 드물고 <code>__builtin___clear_cache(begin, end)</code>(GCC/Clang) 한 줄이면 이 시퀀스를 전부 생성. Linux 유저스페이스는 <code>__clear_cache()</code> glibc 래퍼 사용.</div>
      </div>

      <div className="callout warn">
        <span className="icon">⚠</span>
        <div><b>IS 접미.</b> <code>DSB ISH</code>는 inner-shareable 도메인(모든 코어)을 기다림 — 멀티코어 필수. 단일 코어라면 <code>DSB NSH</code>로 충분하지만, Linux 커널/대부분의 SMP 시스템은 ISH가 안전한 기본값.</div>
      </div>
    </>
  )
}
