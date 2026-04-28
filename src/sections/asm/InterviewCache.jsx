export default function InterviewCache() {
  return (
    <>
      <h2>이 페이지의 범위 <span className="en">/ Scope</span></h2>
      <p>커널 · 드라이버 · 펌웨어 · 런타임 · 컴파일러에서 <b>실제로 작성하게 되는 ARM64 어셈블리 시퀀스</b> 모음. 토픽별 reference는 다른 페이지에 있고, 여기는 <b>레시피 view</b> — 매번 같은 형태로 등장하는 pattern들과 각 단계가 무엇을 보호하는지에 집중.</p>

      <div className="callout">
        <span className="icon">📌</span>
        <div><b>핵심 원칙 4개.</b><br/>
        ① <b>Cache</b>는 4축(대상·동작·범위·기준점) 조합 + 항상 DSB로 완료 대기.<br/>
        ② <b>명령 페치 경로</b>가 바뀌면 ISB. 시스템 레지스터 변경 후도 ISB.<br/>
        ③ <b>동기화</b>는 LDAR(acquire)와 STLR(release) 또는 LSE atomic. LL/SC는 livelock 위험.<br/>
        ④ <b>각 명령은 막아야 할 race 하나</b>에 대응 — 한 단계 빼면 어떤 race가 열리는지 매핑이 머릿속에 있어야.</div>
      </div>

      <h2>━━ Part 1 ━━ Cache 제어 <span className="en">/ Cache Maintenance</span></h2>

      <h3>① JIT / Self-Modifying Code 6단계</h3>
      <p>JavaScript V8, JVM, Wasm 런타임, Linux <code>__clear_cache</code>가 모두 이 시퀀스. 한 단계라도 빠지면 race가 생기는 <b>교과서적 패턴</b>.</p>
      <pre><code>
  <span className="kw">str</span>   w2, [x0]          <span className="cmt">{"// ① 새 명령 store (D-cache에 들어감)"}</span>{"\n"}
  <span className="kw">dc</span>    <span className="kw">cvau</span>, x0          <span className="cmt">{"// ② D→PoU clean (I-cache가 봐야 함)"}</span>{"\n"}
  <span className="kw">dsb</span>   <span className="kw">ish</span>               <span className="cmt">{"// ③ clean 완료 대기"}</span>{"\n"}
  <span className="kw">ic</span>    <span className="kw">ivau</span>, x0          <span className="cmt">{"// ④ I-cache invalidate (옛 명령 버리기)"}</span>{"\n"}
  <span className="kw">dsb</span>   <span className="kw">ish</span>               <span className="cmt">{"// ⑤ invalidate 전파 (다른 코어까지)"}</span>{"\n"}
  <span className="kw">isb</span>                     <span className="cmt">{"// ⑥ 자기 파이프라인 prefetch된 옛 명령 flush"}</span>
      </code></pre>
      <div className="table-wrap">
        <table>
          <thead><tr><th>단계</th><th>빠지면 어떻게 되나</th></tr></thead>
          <tbody>
            <tr><td>② <code>DC CVAU</code></td><td>새 명령이 D-cache에만 머물러 I-cache가 못 봄</td></tr>
            <tr><td>③ <code>DSB ISH</code></td><td>clean이 진행 중인데 다음 단계 시작 → race</td></tr>
            <tr><td>④ <code>IC IVAU</code></td><td>I-cache에 옛 명령 그대로 남아 fetch 시 옛 값</td></tr>
            <tr><td>⑤ <code>DSB ISH</code></td><td>invalidate 진행 중 분기 → 다른 코어가 옛 명령 fetch</td></tr>
            <tr><td>⑥ <code>ISB</code></td><td>이미 파이프라인에 prefetch된 옛 명령이 실행됨</td></tr>
          </tbody>
        </table>
      </div>
      <div className="callout">
        <span className="icon">💡</span>
        <div><b>왜 PoU?</b> 자기 코어 내부 I/D 동기만 필요해서. PoC(DRAM)까지 갈 이유 없음. 만약 <b>다른 코어에 코드를 보내야 하면</b> PoC.<br/>
        <b>C 한 줄:</b> <code>__builtin___clear_cache(start, end)</code> — 위 시퀀스 자동 생성.</div>
      </div>

      <h3>② DMA 양방향 시퀀스</h3>
      <p>NIC · GPU · 가속기 드라이버에서 매번 작성. Linux의 <code>dma_map_single()</code>이 내부적으로 이 시퀀스를 호출.</p>
      <pre><code>
<span className="cmt">{"// 송신 (CPU → Device): Clean"}</span>{"\n"}
1:<span className="kw">dc</span>    <span className="kw">cvac</span>, x0          <span className="cmt">{"// dirty 라인을 DRAM까지 밀기"}</span>{"\n"}
  <span className="kw">add</span>   x0, x0, <span className="num">#64</span>{"\n"}
  <span className="kw">subs</span>  x1, x1, <span className="num">#64</span>{"\n"}
  <span className="kw">b.gt</span>  1b{"\n"}
  <span className="kw">dsb</span>   <span className="kw">sy</span>                <span className="cmt">{"// DRAM 도달 대기"}</span>{"\n"}
  <span className="kw">str</span>   x_kick, [x_dev]   <span className="cmt">{"// 장치 시작"}</span>{"\n\n"}
<span className="cmt">{"// 수신 (Device → CPU): Invalidate"}</span>{"\n"}
2:<span className="kw">dc</span>    <span className="kw">ivac</span>, x0          <span className="cmt">{"// 옛 캐시 라인 버리기"}</span>{"\n"}
  <span className="kw">add</span>   x0, x0, <span className="num">#64</span>{"\n"}
  <span className="kw">subs</span>  x1, x1, <span className="num">#64</span>{"\n"}
  <span className="kw">b.gt</span>  2b{"\n"}
  <span className="kw">dsb</span>   <span className="kw">sy</span>{"\n"}
  <span className="kw">ldr</span>   x2, [x0]          <span className="cmt">{"// DRAM에서 새로 읽힘"}</span>
      </code></pre>
      <div className="callout warn">
        <span className="icon">⚠</span>
        <div><b>실수하기 쉬운 포인트.</b><br/>
        • 수신 후 Clean을 쓰면? → 옛 D-cache 값을 DRAM에 덮어써서 <b>장치가 쓴 값 파괴</b>.<br/>
        • 송신 전 Invalidate를 쓰면? → 내가 쓴 값을 버려서 <b>옛 DRAM 값이 전송됨</b>.<br/>
        • 왜 PoU 아니고 PoC? → DMA는 외부 master, <b>모든 관측자가 보는 지점(DRAM)</b>까지 가야.<br/>
        • 양방향 한 번에? → <code>DC CIVAC</code> (Clean+Invalidate) 한 번으로 처리.</div>
      </div>

      <h3>③ MMU enable 시퀀스</h3>
      <p>부트로더, U-Boot, EL3 펌웨어에서 거의 동일한 형태로 등장. 마지막 ISB 빠지면 부팅 자체가 안 됨.</p>
      <pre><code>
  <span className="kw">msr</span>   <span className="reg">TTBR0_EL1</span>, x0    <span className="cmt">{"// 페이지 테이블 베이스"}</span>{"\n"}
  <span className="kw">msr</span>   <span className="reg">TCR_EL1</span>, x1      <span className="cmt">{"// translation control"}</span>{"\n"}
  <span className="kw">msr</span>   <span className="reg">MAIR_EL1</span>, x2     <span className="cmt">{"// memory attributes"}</span>{"\n"}
  <span className="kw">isb</span>                     <span className="cmt">{"// 시스템 레지스터 변경 sync"}</span>{"\n"}
  <span className="kw">mrs</span>   x3, <span className="reg">SCTLR_EL1</span>{"\n"}
  <span className="kw">orr</span>   x3, x3, <span className="num">#1</span>       <span className="cmt">{"// M bit set"}</span>{"\n"}
  <span className="kw">msr</span>   <span className="reg">SCTLR_EL1</span>, x3    <span className="cmt">{"// MMU enable!"}</span>{"\n"}
  <span className="kw">isb</span>                     <span className="cmt">{"// ★ 빼면 다음 명령이 MMU off로 fetch됨"}</span>
      </code></pre>

      <h3>④ TLB invalidate 시퀀스</h3>
      <p>OS의 <code>mprotect</code>·<code>munmap</code>·페이지 마이그레이션, 하이퍼바이저의 stage-2 매핑 변경에서 매번. Linux ARM64의 <code>flush_tlb_*()</code>가 그대로 이 시퀀스.</p>
      <pre><code>
  <span className="kw">str</span>   x1, [x_pte]       <span className="cmt">{"// PTE 수정"}</span>{"\n"}
  <span className="kw">dsb</span>   <span className="kw">ishst</span>             <span className="cmt">{"// store가 메모리 도달"}</span>{"\n"}
  <span className="kw">tlbi</span>  <span className="kw">vae1is</span>, x0       <span className="cmt">{"// VA 하나만 invalidate, IS=inner-shareable"}</span>{"\n"}
  <span className="kw">dsb</span>   <span className="kw">ish</span>               <span className="cmt">{"// TLBI 전파 완료 (다른 코어까지)"}</span>{"\n"}
  <span className="kw">isb</span>                     <span className="cmt">{"// 자기 파이프라인 sync"}</span>
      </code></pre>
      <p><b>비교:</b> x86은 <code>invlpg</code> 한 줄, RISC-V는 <code>sfence.vma</code> 한 줄로 통합. ARM은 명시적 3단계 — <b>약한 메모리 모델의 대가</b>.</p>

      <h2>━━ Part 2 ━━ 메모리 순서 & 동기화 <span className="en">/ Ordering & Concurrency</span></h2>

      <h3>⑤ DMB / DSB / ISB — 세 배리어 정리</h3>
      <p>세 배리어의 역할을 헷갈리면 모든 시퀀스가 깨진다.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>명령</th><th>의미</th><th>언제</th></tr></thead>
          <tbody>
            <tr><td><code>DMB</code></td><td>이전 메모리 접근이 이후보다 <b>먼저 관측됨</b> 보장 (순서만)</td><td>lock/unlock, producer-consumer</td></tr>
            <tr><td><code>DSB</code></td><td>이전 메모리 접근이 <b>실제로 완료</b>될 때까지 CPU 정지</td><td>CMO 후, MMIO 후, TLBI 후</td></tr>
            <tr><td><code>ISB</code></td><td>파이프라인 flush, 시스템 레지스터 변경 후 <b>즉시 보이게</b></td><td>MMU on/off, SCTLR 변경, JIT</td></tr>
          </tbody>
        </table>
      </div>
      <div className="grid2">
        <div className="card">
          <h4>오용 ① — 과다 사용</h4>
          <p><b>DMB로 충분한 곳에 DSB</b>를 쓰면 정상 동작하지만 <b>훨씬 느림</b>. 코어 전체가 멈추니 throughput 손실.</p>
        </div>
        <div className="card">
          <h4>오용 ② — ISB 누락</h4>
          <p><b>DSB만 있고 ISB가 없으면</b> 메모리는 보이지만 <b>파이프라인이 옛 명령</b>을 실행 가능. JIT/MMU 시퀀스 헬게이트.</p>
        </div>
        <div className="card">
          <h4>오용 ③ — MMIO 후 DMB만</h4>
          <p>DMB는 순서만 보장, <b>장치가 받았는지는 모름</b>. polling으로 status 읽기 전에 DSB로 완료 대기 필수.</p>
        </div>
        <div className="card">
          <h4>스코프 선택</h4>
          <p>단일코어 <code>NSH</code>, SMP 기본 <code>ISH</code>, 외부 device 포함 <code>OSH/SY</code>. 잘못 좁히면 다른 코어가 옛 값 봄.</p>
        </div>
      </div>

      <h3>⑥ Spinlock — LL/SC vs LSE</h3>
      <p>커널 lock primitive · concurrent runtime · DB engine에서 매번. <b>왜 LSE가 더 빠른가</b>는 라인 ping-pong을 어떻게 피하는지로 설명.</p>
      <pre><code>
<span className="cmt">{"// Old: LL/SC (LDXR/STXR loop) — ARMv8.0"}</span>{"\n"}
1:<span className="kw">ldaxr</span> w1, [x0]          <span className="cmt">{"// load-acquire exclusive"}</span>{"\n"}
  <span className="kw">cbnz</span>  w1, 1b            <span className="cmt">{"// 0이 아니면 retry"}</span>{"\n"}
  <span className="kw">mov</span>   w2, <span className="num">#1</span>{"\n"}
  <span className="kw">stxr</span>  w3, w2, [x0]      <span className="cmt">{"// store exclusive"}</span>{"\n"}
  <span className="kw">cbnz</span>  w3, 1b            <span className="cmt">{"// 실패하면 retry → livelock 위험"}</span>{"\n"}
  <span className="cmt">{"// ... critical section ..."}</span>{"\n"}
  <span className="kw">stlr</span>  wzr, [x0]         <span className="cmt">{"// store-release로 unlock"}</span>{"\n\n"}
<span className="cmt">{"// New: LSE (ARMv8.1+)"}</span>{"\n"}
  <span className="kw">mov</span>   w1, <span className="num">#1</span>{"\n"}
  <span className="kw">swpal</span> w1, w2, [x0]      <span className="cmt">{"// atomic swap, acq+rel — retry 없음"}</span>{"\n"}
  <span className="kw">cbnz</span>  w2, contended
      </code></pre>
      <div className="callout">
        <span className="icon">💡</span>
        <div>
          • <code>LDAXR</code>의 <b>A</b> = acquire (이후 접근이 못 넘어옴)<br/>
          • <code>STLR</code>의 <b>L</b> = release (이전 접근이 못 넘어감)<br/>
          • LL/SC는 경합 시 <b>livelock 위험</b>, LSE는 HW가 retry 없이 보장<br/>
          • glibc/kernel이 런타임에 <code>HWCAP_ATOMICS</code> 확인 후 자동 선택<br/>
          • 고경합(hot lock, counter)에서 <b>far atomic</b>(HN/SLC가 직접 수행)으로 ping-pong 제거 → throughput 수배
        </div>
      </div>

      <h3>⑦ Lock-free SPSC Ring Buffer — Acquire/Release 쌍</h3>
      <p>DPDK · audio buffer · Linux skb queue · 게임엔진 frame queue. <b>Producer 1 + Consumer 1</b>이면 lock 없이 동작.</p>
      <pre><code>
<span className="cmt">{"// Producer enqueue"}</span>{"\n"}
  <span className="kw">ldr</span>   w_h, [x_head]         <span className="cmt">{"// 내가 쓴 head — relaxed OK"}</span>{"\n"}
  <span className="kw">ldar</span>  w_t, [x_tail]         <span className="cmt">{"// ★ acquire — consumer의 release 관측"}</span>{"\n"}
  <span className="kw">sub</span>   w9, w_h, w_t{"\n"}
  <span className="kw">cmp</span>   w9, <span className="num">#RING_SZ</span>{"\n"}
  <span className="kw">b.eq</span>  full                  <span className="cmt">{"// 가득 참"}</span>{"\n"}
  <span className="kw">str</span>   x_data, [x_buf, w_h, <span className="kw">uxtw</span> <span className="num">#3</span>]   <span className="cmt">{"// slot에 데이터 쓰기"}</span>{"\n"}
  <span className="kw">add</span>   w_h, w_h, <span className="num">#1</span>{"\n"}
  <span className="kw">stlr</span>  w_h, [x_head]         <span className="cmt">{"// ★ release — 데이터가 head 갱신보다 먼저 보임"}</span>{"\n\n"}
<span className="cmt">{"// Consumer dequeue"}</span>{"\n"}
  <span className="kw">ldr</span>   w_t, [x_tail]{"\n"}
  <span className="kw">ldar</span>  w_h, [x_head]         <span className="cmt">{"// ★ acquire — producer가 쓴 데이터 관측"}</span>{"\n"}
  <span className="kw">cmp</span>   w_t, w_h{"\n"}
  <span className="kw">b.eq</span>  empty{"\n"}
  <span className="kw">ldr</span>   x_data, [x_buf, w_t, <span className="kw">uxtw</span> <span className="num">#3</span>]{"\n"}
  <span className="kw">add</span>   w_t, w_t, <span className="num">#1</span>{"\n"}
  <span className="kw">stlr</span>  w_t, [x_tail]         <span className="cmt">{"// ★ release — slot 사용 끝났음 producer에게 알림"}</span>
      </code></pre>
      <div className="callout warn">
        <span className="icon">⚠</span>
        <div><b>4개 메모리 접근 모두 acquire/release면 안 된다.</b> 자기가 쓴 head/tail은 relaxed(<code>LDR</code>), 상대 쪽 인덱스만 acquire(<code>LDAR</code>) — 너무 strong하면 의미 없는 sync로 throughput만 깎임. <b>"내 변수 → 상대가 acquire로 봐야"</b>이 한 방향만 의식하면 됨.</div>
      </div>

      <h3>⑧ Seqlock — Reader Retry 패턴</h3>
      <p>Linux <code>jiffies</code>, <code>vdso</code>의 <code>gettimeofday</code>가 사용. <b>Reader가 reader를 차단하지 않음</b> — 짧은 critical section에 최적.</p>
      <pre><code>
<span className="cmt">{"// Writer (단일 또는 lock으로 보호)"}</span>{"\n"}
  <span className="kw">ldr</span>   w_seq, [x_seq]{"\n"}
  <span className="kw">add</span>   w_seq, w_seq, <span className="num">#1</span>     <span className="cmt">{"// 홀수 = writer 진행 중"}</span>{"\n"}
  <span className="kw">stlr</span>  w_seq, [x_seq]{"\n"}
  <span className="kw">str</span>   x_v1, [x_data]{"\n"}
  <span className="kw">str</span>   x_v2, [x_data, <span className="num">#8</span>]{"\n"}
  <span className="kw">add</span>   w_seq, w_seq, <span className="num">#1</span>     <span className="cmt">{"// 짝수 = 완료"}</span>{"\n"}
  <span className="kw">stlr</span>  w_seq, [x_seq]{"\n\n"}
<span className="cmt">{"// Reader (lock-free, retry 가능)"}</span>{"\n"}
1:<span className="kw">ldar</span>  w_s1, [x_seq]{"\n"}
  <span className="kw">tbnz</span>  w_s1, <span className="num">#0</span>, 1b        <span className="cmt">{"// 홀수면 writer 진행 중 → spin"}</span>{"\n"}
  <span className="kw">ldr</span>   x_v1, [x_data]{"\n"}
  <span className="kw">ldr</span>   x_v2, [x_data, <span className="num">#8</span>]{"\n"}
  <span className="kw">ldar</span>  w_s2, [x_seq]{"\n"}
  <span className="kw">cmp</span>   w_s1, w_s2{"\n"}
  <span className="kw">b.ne</span>  1b                    <span className="cmt">{"// 변경됐으면 재시도"}</span>
      </code></pre>

      <h3>⑨ LSE Atomic 응용 — Counter / Bitmap</h3>
      <pre><code>
<span className="cmt">{"// 통계 카운터 — refcount/perf counter"}</span>{"\n"}
  <span className="kw">mov</span>   w1, <span className="num">#1</span>{"\n"}
  <span className="kw">ldadd</span> w1, w2, [x_cnt]       <span className="cmt">{"// atomic add, w2 = old value"}</span>{"\n\n"}
<span className="cmt">{"// Bitmap set/clear — interrupt mask, dirty bitmap"}</span>{"\n"}
  <span className="kw">ldset</span> x_mask, x_old, [x_bm] <span className="cmt">{"// atomic OR, set bits in mask"}</span>{"\n"}
  <span className="kw">ldclr</span> x_mask, x_old, [x_bm] <span className="cmt">{"// atomic AND-NOT, clear bits"}</span>{"\n\n"}
<span className="cmt">{"// CAS — pointer swap, lock-free stack push"}</span>{"\n"}
1:<span className="kw">mov</span>   x_exp, x_old{"\n"}
  <span className="kw">cas</span>   x_exp, x_new, [x_top] <span className="cmt">{"// if [x_top]==x_exp, store x_new"}</span>{"\n"}
  <span className="kw">cmp</span>   x_exp, x_old          <span className="cmt">{"// 실패면 x_exp = 현재 값"}</span>{"\n"}
  <span className="kw">b.ne</span>  1b                    <span className="cmt">{"// retry with new expected"}</span>
      </code></pre>
      <p><b>Ordering 접미사:</b> <code>LDADD</code>(relaxed) · <code>LDADDA</code>(acquire) · <code>LDADDL</code>(release) · <code>LDADDAL</code>(acq+rel). 보통 lock 안에서는 relaxed, 그 외엔 <code>AL</code>이 안전한 기본값.</p>

      <h2>━━ Part 3 ━━ 함수 ABI / 프롤로그 <span className="en">/ Function ABI</span></h2>

      <h3>⑩ 표준 프롤로그/에필로그</h3>
      <p>모든 ARM64 함수의 기본형. <code>FP</code>(x29) chain으로 backtrace 가능, <code>LR</code>(x30)은 콜스택 위해 저장.</p>
      <pre><code>
foo:{"\n"}
  <span className="kw">stp</span>   x29, x30, [sp, <span className="num">#-32</span>]!  <span className="cmt">{"// FP+LR pair save, pre-decrement"}</span>{"\n"}
  <span className="kw">mov</span>   x29, sp                <span className="cmt">{"// 새 frame pointer"}</span>{"\n"}
  <span className="kw">stp</span>   x19, x20, [sp, <span className="num">#16</span>]   <span className="cmt">{"// callee-saved 추가 저장"}</span>{"\n"}
  <span className="cmt">{"// ... function body ..."}</span>{"\n"}
  <span className="kw">ldp</span>   x19, x20, [sp, <span className="num">#16</span>]{"\n"}
  <span className="kw">ldp</span>   x29, x30, [sp], <span className="num">#32</span>   <span className="cmt">{"// post-increment restore"}</span>{"\n"}
  <span className="kw">ret</span>
      </code></pre>
      <div className="callout">
        <span className="icon">💡</span>
        <div>
          • <code>stp/ldp</code>는 한 쌍을 한 명령으로 — <b>2개 GPR을 1 cycle</b>로 처리.<br/>
          • SP는 16-byte aligned 필수 (안 그러면 #SP_ALIGNMENT_FAULT).<br/>
          • Leaf function (다른 함수 호출 안 함)은 LR 저장 생략 가능 — <b>tail call optimization 핵심</b>.
        </div>
      </div>

      <h3>⑪ PAC + BTI 보안 프롤로그 (ARMv8.3+)</h3>
      <p>Android, iOS, glibc 최신 빌드에서 표준. <b>ROP/JOP 공격 차단</b>이 목적.</p>
      <pre><code>
foo:{"\n"}
  <span className="kw">bti</span>   c                       <span className="cmt">{"// ★ 간접 호출 진입 표시 (BR/BLR로만 진입 가능)"}</span>{"\n"}
  <span className="kw">paciasp</span>                       <span className="cmt">{"// ★ LR을 SP modifier로 sign — return addr 보호"}</span>{"\n"}
  <span className="kw">stp</span>   x29, x30, [sp, <span className="num">#-16</span>]!{"\n"}
  <span className="kw">mov</span>   x29, sp{"\n"}
  <span className="cmt">{"// ... body ..."}</span>{"\n"}
  <span className="kw">ldp</span>   x29, x30, [sp], <span className="num">#16</span>{"\n"}
  <span className="kw">retaa</span>                         <span className="cmt">{"// ★ ret + auth — sign 안 맞으면 fault"}</span>
      </code></pre>
      <div className="grid2">
        <div className="card">
          <h4>BTI 종류</h4>
          <p><code>bti c</code> — call (BLR로만 진입 OK)<br/>
          <code>bti j</code> — jump (BR로만 진입 OK)<br/>
          <code>bti jc</code> — 둘 다 OK<br/>
          <code>bti</code> 없는 위치에 BLR/BR하면 <b>BTI fault</b>.</p>
        </div>
        <div className="card">
          <h4>PAC 변형</h4>
          <p><code>paciasp/autiasp</code> — A key + SP modifier (가장 흔함)<br/>
          <code>pacibsp/autibsp</code> — B key + SP<br/>
          <code>retaa/retab</code> — ret + auth A/B 일체형<br/>
          PAC 안 맞으면 상위 비트 corrupt → fault</p>
        </div>
      </div>

      <h3>⑫ Tail Call Optimization</h3>
      <pre><code>
<span className="cmt">{"// 일반 호출"}</span>{"\n"}
caller:{"\n"}
  <span className="kw">stp</span>   x29, x30, [sp, <span className="num">#-16</span>]!{"\n"}
  <span className="kw">bl</span>    callee                 <span className="cmt">{"// LR이 caller로 set됨"}</span>{"\n"}
  <span className="kw">ldp</span>   x29, x30, [sp], <span className="num">#16</span>{"\n"}
  <span className="kw">ret</span>{"\n\n"}
<span className="cmt">{"// Tail call — frame 복원 후 B (BL 아님!)"}</span>{"\n"}
caller_tail:{"\n"}
  <span className="kw">stp</span>   x29, x30, [sp, <span className="num">#-16</span>]!{"\n"}
  <span className="cmt">{"// ... 자기 일 ..."}</span>{"\n"}
  <span className="kw">ldp</span>   x29, x30, [sp], <span className="num">#16</span>{"\n"}
  <span className="kw">b</span>     callee                 <span className="cmt">{"// callee의 ret이 원래 caller로 직접 — stack 한 단계 절약"}</span>
      </code></pre>

      <h2>━━ Part 4 ━━ Context Switch / Exception <span className="en">/ Trap Path</span></h2>

      <h3>⑬ Vector Entry — GPR Save</h3>
      <p>커널 trap handler 진입. EL0 → EL1 진입 시 SPSR/ELR 자동 저장, 나머지 GPR은 SW가 저장.</p>
      <pre><code>
<span className="cmt">{"// el1_sync (EL1 동기 trap entry)"}</span>{"\n"}
el1_sync_entry:{"\n"}
  <span className="kw">sub</span>   sp, sp, <span className="num">#272</span>          <span className="cmt">{"// pt_regs 공간 (31 GPR + SP + PC + PSTATE)"}</span>{"\n"}
  <span className="kw">stp</span>   x0, x1,  [sp, <span className="num">#0</span>]{"\n"}
  <span className="kw">stp</span>   x2, x3,  [sp, <span className="num">#16</span>]{"\n"}
  <span className="cmt">{"// ... x4~x29 stp pair로 ..."}</span>{"\n"}
  <span className="kw">stp</span>   x28, x29, [sp, <span className="num">#224</span>]{"\n"}
  <span className="kw">mrs</span>   x21, <span className="reg">sp_el0</span>           <span className="cmt">{"// user SP"}</span>{"\n"}
  <span className="kw">mrs</span>   x22, <span className="reg">elr_el1</span>           <span className="cmt">{"// trap PC"}</span>{"\n"}
  <span className="kw">mrs</span>   x23, <span className="reg">spsr_el1</span>          <span className="cmt">{"// 이전 PSTATE"}</span>{"\n"}
  <span className="kw">stp</span>   x30, x21, [sp, <span className="num">#240</span>]   <span className="cmt">{"// LR + SP"}</span>{"\n"}
  <span className="kw">stp</span>   x22, x23, [sp, <span className="num">#256</span>]   <span className="cmt">{"// PC + PSTATE"}</span>{"\n\n"}
  <span className="kw">mrs</span>   x0, <span className="reg">esr_el1</span>            <span className="cmt">{"// Exception Syndrome — 종류 decode"}</span>{"\n"}
  <span className="kw">lsr</span>   x1, x0, <span className="num">#26</span>            <span className="cmt">{"// EC (Exception Class) 추출"}</span>{"\n"}
  <span className="kw">cmp</span>   x1, <span className="num">#0x15</span>{"\n"}
  <span className="kw">b.eq</span>  el1_svc                <span className="cmt">{"// SVC syscall"}</span>{"\n"}
  <span className="cmt">{"// ... 다른 EC 분기 ..."}</span>
      </code></pre>

      <h3>⑭ ERET — 트랩 복귀</h3>
      <pre><code>
<span className="cmt">{"// pt_regs 복원 후 ERET"}</span>{"\n"}
  <span className="kw">ldp</span>   x22, x23, [sp, <span className="num">#256</span>]   <span className="cmt">{"// PC, PSTATE"}</span>{"\n"}
  <span className="kw">ldp</span>   x30, x21, [sp, <span className="num">#240</span>]   <span className="cmt">{"// LR, SP"}</span>{"\n"}
  <span className="kw">msr</span>   <span className="reg">sp_el0</span>, x21          <span className="cmt">{"// user SP 복원"}</span>{"\n"}
  <span className="kw">msr</span>   <span className="reg">elr_el1</span>, x22         <span className="cmt">{"// 돌아갈 PC"}</span>{"\n"}
  <span className="kw">msr</span>   <span className="reg">spsr_el1</span>, x23        <span className="cmt">{"// 돌아갈 PSTATE"}</span>{"\n"}
  <span className="cmt">{"// ... x0~x29 ldp 복원 ..."}</span>{"\n"}
  <span className="kw">add</span>   sp, sp, <span className="num">#272</span>{"\n"}
  <span className="kw">eret</span>                          <span className="cmt">{"// ELR로 점프 + SPSR으로 PSTATE 복원, EL 전환"}</span>
      </code></pre>
      <div className="callout warn">
        <span className="icon">⚠</span>
        <div><b>Spectre v2 mitigation.</b> 최신 커널은 ERET 직전에 <code>dsb nsh; isb</code>를 추가 — 추측 실행이 EL1 코드를 실행하지 못하게. ARMv8.5 FEAT_ERETx 또는 SB barrier도 사용.</div>
      </div>

      <h2>━━ Part 5 ━━ memcpy 가족 <span className="en">/ Copy Recipes</span></h2>

      <h3>⑮ 작은 크기 — LDP/STP</h3>
      <pre><code>
<span className="cmt">{"// ≤16 bytes — 한 쌍이면 끝"}</span>{"\n"}
  <span className="kw">ldp</span>   x2, x3, [x1]            <span className="cmt">{"// 16B load (pair)"}</span>{"\n"}
  <span className="kw">stp</span>   x2, x3, [x0]            <span className="cmt">{"// 16B store"}</span>{"\n\n"}
<span className="cmt">{"// 17~32 bytes — head + tail 겹쳐 쓰기 (overlapping)"}</span>{"\n"}
  <span className="kw">ldp</span>   x2, x3, [x1]            <span className="cmt">{"// 처음 16B"}</span>{"\n"}
  <span className="kw">ldp</span>   x4, x5, [x1, x_size, <span className="kw">lsx</span> <span className="num">#0</span>]   <span className="cmt">{"// 마지막 16B (겹침 OK)"}</span>{"\n"}
  <span className="kw">stp</span>   x2, x3, [x0]{"\n"}
  <span className="kw">stp</span>   x4, x5, [x0, x_size]
      </code></pre>

      <h3>⑯ 중간 크기 — NEON LD1/ST1 64B</h3>
      <pre><code>
<span className="cmt">{"// 64B씩 — full cache line"}</span>{"\n"}
1:<span className="kw">ld1</span>   {"{"}v0.16b, v1.16b, v2.16b, v3.16b{"}"}, [x1], <span className="num">#64</span>{"\n"}
  <span className="kw">st1</span>   {"{"}v0.16b, v1.16b, v2.16b, v3.16b{"}"}, [x0], <span className="num">#64</span>{"\n"}
  <span className="kw">subs</span>  x_size, x_size, <span className="num">#64</span>{"\n"}
  <span className="kw">b.gt</span>  1b
      </code></pre>

      <h3>⑰ 대용량 — LDNP/STNP Non-Temporal</h3>
      <p>LLC를 오염시키지 않는 streaming copy. 큰 버퍼 한 번 훑고 버릴 때 (packet copy, 대용량 memcpy).</p>
      <pre><code>
1:<span className="kw">ldnp</span>  q0, q1, [x1]            <span className="cmt">{"// non-temporal pair load — cache 안 채움"}</span>{"\n"}
  <span className="kw">ldnp</span>  q2, q3, [x1, <span className="num">#32</span>]{"\n"}
  <span className="kw">stnp</span>  q0, q1, [x0]            <span className="cmt">{"// non-temporal pair store"}</span>{"\n"}
  <span className="kw">stnp</span>  q2, q3, [x0, <span className="num">#32</span>]{"\n"}
  <span className="kw">add</span>   x1, x1, <span className="num">#64</span>{"\n"}
  <span className="kw">add</span>   x0, x0, <span className="num">#64</span>{"\n"}
  <span className="kw">subs</span>  x_size, x_size, <span className="num">#64</span>{"\n"}
  <span className="kw">b.gt</span>  1b
      </code></pre>

      <h3>⑱ DC ZVA — Fast memset(0)</h3>
      <pre><code>
  <span className="kw">mrs</span>   x2, <span className="reg">DCZID_EL0</span>           <span className="cmt">{"// line size 동적 query"}</span>{"\n"}
  <span className="kw">and</span>   x2, x2, <span className="num">#0xF</span>{"\n"}
  <span className="kw">mov</span>   x3, <span className="num">#4</span>{"\n"}
  <span className="kw">lsl</span>   x3, x3, x2               <span className="cmt">{"// x3 = line bytes (보통 64)"}</span>{"\n"}
1:<span className="kw">dc</span>    <span className="kw">zva</span>, x0                 <span className="cmt">{"// 한 라인을 0으로 — read-for-ownership 회피"}</span>{"\n"}
  <span className="kw">add</span>   x0, x0, x3{"\n"}
  <span className="kw">subs</span>  x1, x1, x3{"\n"}
  <span className="kw">b.gt</span>  1b
      </code></pre>
      <p>일반 STR로 64B 0을 쓰는 것보다 <b>~2배 빠름</b> — read-for-ownership 단계가 없음. glibc <code>memset</code>이 자동 활용.</p>

      <h2>━━ Part 6 ━━ Boot · Idle · 전력 <span className="en">/ Low-Power & SoC</span></h2>

      <h3>⑲ WFE + SEV — 저전력 Polling</h3>
      <p>Spinlock contention 시 WFE로 sleep → 다른 코어가 unlock하며 자동 SEV로 깨움. <b>전력 ↓ + 라인 ping-pong ↓</b>.</p>
      <pre><code>
<span className="cmt">{"// Waiter — WFE로 저전력 spin"}</span>{"\n"}
1:<span className="kw">ldaxr</span> w0, [x_lock]{"\n"}
  <span className="kw">cbz</span>   w0, acquire             <span className="cmt">{"// 0이면 잡기 시도"}</span>{"\n"}
  <span className="kw">wfe</span>                           <span className="cmt">{"// ★ event 올 때까지 sleep"}</span>{"\n"}
  <span className="kw">b</span>     1b{"\n\n"}
acquire:{"\n"}
  <span className="kw">mov</span>   w1, <span className="num">#1</span>{"\n"}
  <span className="kw">stxr</span>  w2, w1, [x_lock]{"\n"}
  <span className="kw">cbnz</span>  w2, 1b{"\n\n"}
<span className="cmt">{"// Releaser — STLR/STXR이 자동 SEV"}</span>{"\n"}
  <span className="kw">stlr</span>  wzr, [x_lock]           <span className="cmt">{"// store-release가 다른 코어 WFE 깨움 (자동)"}</span>{"\n"}
<span className="cmt">{"// 또는 명시적"}</span>{"\n"}
  <span className="kw">sev</span>                           <span className="cmt">{"// 모든 코어에 event 전송"}</span>
      </code></pre>

      <h3>⑳ PSCI CPU_ON — SMC 호출로 코어 깨우기</h3>
      <p>SMP 부팅·hotplug·suspend resume에서 secondary CPU 깨우기. EL3 펌웨어(ATF)가 처리.</p>
      <pre><code>
  <span className="kw">ldr</span>   x0, =<span className="num">0xC4000003</span>      <span className="cmt">{"// PSCI CPU_ON function ID (SMC32 calling convention)"}</span>{"\n"}
  <span className="kw">mov</span>   x1, x_target_mpidr      <span className="cmt">{"// target CPU MPIDR (Aff3:Aff2:Aff1:Aff0)"}</span>{"\n"}
  <span className="kw">ldr</span>   x2, =cpu_entry          <span className="cmt">{"// secondary가 시작할 PA"}</span>{"\n"}
  <span className="kw">mov</span>   x3, x_context_id        <span className="cmt">{"// secondary entry로 전달할 값"}</span>{"\n"}
  <span className="kw">smc</span>   <span className="num">#0</span>                      <span className="cmt">{"// EL3 monitor 호출 → ATF 처리"}</span>{"\n"}
  <span className="cmt">{"// 반환: x0 == 0 (SUCCESS), -2 (INVALID_PARAMS), -4 (ALREADY_ON), ..."}</span>
      </code></pre>

      <h3>㉑ WFI — Deep Idle</h3>
      <pre><code>
<span className="cmt">{"// idle loop"}</span>{"\n"}
cpu_idle:{"\n"}
  <span className="kw">dsb</span>   <span className="kw">sy</span>                      <span className="cmt">{"// 이전 메모리 작업 완료"}</span>{"\n"}
  <span className="kw">wfi</span>                           <span className="cmt">{"// 인터럽트 올 때까지 코어 정지 (clock gating)"}</span>{"\n"}
  <span className="kw">b</span>     cpu_idle{"\n"}
      </code></pre>
      <div className="callout">
        <span className="icon">💡</span>
        <div><b>WFI vs WFE.</b> WFI는 <b>인터럽트만</b> 깨움 (PMR 마스킹 무시). WFE는 인터럽트 + SEV + STLR/STXR 깨움. spinlock에는 WFE, 진짜 idle에는 WFI.</div>
      </div>

      <h2>━━ Part 7 ━━ Branchless & Speculation <span className="en">/ Predication</span></h2>

      <h3>㉒ CSEL Family — 분기 없는 if</h3>
      <pre><code>
<span className="cmt">{"// max(a, b)"}</span>{"\n"}
  <span className="kw">cmp</span>   x0, x1{"\n"}
  <span className="kw">csel</span>  x2, x0, x1, <span className="kw">gt</span>        <span className="cmt">{"// x2 = (x0 > x1) ? x0 : x1"}</span>{"\n\n"}
<span className="cmt">{"// abs(x)"}</span>{"\n"}
  <span className="kw">cmp</span>   x0, <span className="num">#0</span>{"\n"}
  <span className="kw">cneg</span>  x0, x0, <span className="kw">lt</span>            <span className="cmt">{"// x0 = (x0 < 0) ? -x0 : x0"}</span>{"\n\n"}
<span className="cmt">{"// counter increment with cap"}</span>{"\n"}
  <span className="kw">cmp</span>   x_cnt, x_max{"\n"}
  <span className="kw">csinc</span> x_cnt, x_cnt, x_cnt, <span className="kw">eq</span>   <span className="cmt">{"// (cnt == max) ? cnt : cnt+1"}</span>{"\n\n"}
<span className="cmt">{"// constant-time pointer select (sidechannel-safe)"}</span>{"\n"}
  <span className="kw">cmp</span>   x_secret, <span className="num">#0</span>{"\n"}
  <span className="kw">csel</span>  x_ptr, x_a, x_b, <span className="kw">eq</span>   <span className="cmt">{"// 분기 없음 → timing leak 없음"}</span>
      </code></pre>
      <div className="table-wrap">
        <table>
          <thead><tr><th>명령</th><th>true</th><th>false</th><th>용도</th></tr></thead>
          <tbody>
            <tr><td><code>CSEL</code></td><td>Rn</td><td>Rm</td><td>일반 select</td></tr>
            <tr><td><code>CSINC</code></td><td>Rn</td><td>Rm + 1</td><td>conditional increment</td></tr>
            <tr><td><code>CSINV</code></td><td>Rn</td><td>~Rm</td><td>conditional bitwise not</td></tr>
            <tr><td><code>CSNEG</code></td><td>Rn</td><td>-Rm</td><td>conditional negate</td></tr>
            <tr><td><code>CINC/CSET/CNEG</code></td><td colSpan={2}>aliases</td><td>flag → 0/1, ±1 변환</td></tr>
          </tbody>
        </table>
      </div>

      <h3>㉓ CLZ / RBIT — Bit Tricks</h3>
      <pre><code>
<span className="cmt">{"// log2(x) — count leading zeros"}</span>{"\n"}
  <span className="kw">clz</span>   x1, x0                  <span className="cmt">{"// 64 - log2(x) - 1 (x>0일 때)"}</span>{"\n"}
  <span className="kw">mov</span>   x2, <span className="num">#63</span>{"\n"}
  <span className="kw">sub</span>   x1, x2, x1{"\n\n"}
<span className="cmt">{"// ffs(x) — find first set (lowest set bit)"}</span>{"\n"}
  <span className="kw">rbit</span>  x1, x0                  <span className="cmt">{"// bit reverse"}</span>{"\n"}
  <span className="kw">clz</span>   x1, x1                  <span className="cmt">{"// = ffs(x) - 1"}</span>{"\n\n"}
<span className="cmt">{"// 다음 2의 거듭제곱"}</span>{"\n"}
  <span className="kw">sub</span>   x0, x0, <span className="num">#1</span>{"\n"}
  <span className="kw">clz</span>   x1, x0{"\n"}
  <span className="kw">mov</span>   x2, <span className="num">#1</span>{"\n"}
  <span className="kw">lsl</span>   x0, x2, x1
      </code></pre>

      <h3>㉔ Speculation Barriers — CSDB / SB</h3>
      <p>Spectre v1 (bounds-check bypass) 차단. 분기 직후 데이터 추측 실행을 막음.</p>
      <pre><code>
<span className="cmt">{"// Spectre v1 mitigation — array bounds check"}</span>{"\n"}
  <span className="kw">cmp</span>   x_idx, x_size{"\n"}
  <span className="kw">b.hs</span>  out_of_bounds           <span className="cmt">{"// unsigned 비교"}</span>{"\n"}
  <span className="kw">csdb</span>                          <span className="cmt">{"// ★ 추측 데이터 의존 차단"}</span>{"\n"}
  <span className="kw">ldr</span>   x0, [x_arr, x_idx, <span className="kw">lsl</span> <span className="num">#3</span>]{"\n\n"}
<span className="cmt">{"// FEAT_SB (ARMv8.5+) — 더 광범위"}</span>{"\n"}
  <span className="kw">cmp</span>   x_idx, x_size{"\n"}
  <span className="kw">b.hs</span>  out_of_bounds{"\n"}
  <span className="kw">sb</span>                            <span className="cmt">{"// speculation barrier — 단일 명령으로 차단"}</span>{"\n"}
  <span className="kw">ldr</span>   x0, [x_arr, x_idx, <span className="kw">lsl</span> <span className="num">#3</span>]
      </code></pre>
      <div className="callout">
        <span className="icon">💡</span>
        <div><b>비교: <code>DSB SY; ISB</code> vs <code>SB</code>.</b> 옛날엔 <code>DSB+ISB</code>로 mitigation했는데 너무 비쌈(코어 정지). <code>CSDB</code>는 가벼운 hint, <code>SB</code>는 그 사이의 합리적 비용. Linux 커널은 capability bit으로 가장 가벼운 것 자동 선택.</div>
      </div>

      <h2>함께 알아야 할 개념 <span className="en">/ Conceptual</span></h2>

      <div className="grid2">
        <div className="card">
          <h4>PoU vs PoC</h4>
          <p><b>PoU</b> — 한 코어 내 I/D 같은 값 보는 지점 (보통 L2).<br/>
          <b>PoC</b> — 모든 관측자(다른 코어 + DMA)가 같은 값 보는 지점 (보통 DRAM).<br/>
          <b>판단:</b> JIT은 자기 코어가 자기 코드 fetch만 하니 <b>PoU</b>. 다른 코어로 코드를 보내거나 DMA에 노출되면 <b>PoC</b>.</p>
        </div>
        <div className="card">
          <h4>False Sharing</h4>
          <p>독립 변수 둘이 같은 64B 라인 → write가 상호 invalidate → ping-pong.<br/>
          <b>해결:</b> <code>alignas(64)</code> 또는 padding.<br/>
          <b>측정:</b> <code>perf c2c</code> (Linux), ARM SPE.</p>
        </div>
        <div className="card">
          <h4>Inner / Outer Shareable</h4>
          <p><b>NSH</b> — 단일 코어 로컬<br/>
          <b>ISH</b> — 같은 클러스터 (Linux 기본 SMP)<br/>
          <b>OSH</b> — 클러스터 간 / 시스템 전역<br/>
          <b>SY</b> — full system (most expensive)</p>
        </div>
        <div className="card">
          <h4>MESI / MOESI</h4>
          <p><b>M</b>odified · <b>E</b>xclusive · <b>S</b>hared · <b>I</b>nvalid.<br/>
          MOESI의 <b>O</b>wned: dirty인데 share 가능 — eviction 안 해도 다른 코어에 직접 줄 수 있어 트래픽 ↓ (ARM/AMD).</p>
        </div>
        <div className="card">
          <h4>Acquire / Release</h4>
          <p><b>LDAR</b> (acquire): 이후 메모리 접근이 못 넘어옴 (lock 진입).<br/>
          <b>STLR</b> (release): 이전 메모리 접근이 못 넘어감 (lock 해제).<br/>
          C11 <code>memory_order_acquire/release</code>가 직접 매핑.</p>
        </div>
        <div className="card">
          <h4>Callee / Caller saved</h4>
          <p><b>Caller-saved</b> (x0~x18): 호출 전에 저장 책임. 보통 임시 var.<br/>
          <b>Callee-saved</b> (x19~x29): 함수가 저장하고 복원해야. 긴 lifetime var.<br/>
          <b>x30 (LR)</b>: BL이 자동 set, 내가 함수 호출하면 직접 저장.</p>
        </div>
      </div>

      <h2>실전 디버깅 시나리오 <span className="en">/ Real-World Debug Cases</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>🔧 케이스 A — DMA stale read</h4>
          <p>NIC RX 버퍼를 CPU가 읽으려는데 옛 데이터 보임.</p>
          <p><b>체크:</b> RX 후 <code>DC IVAC</code> + <code>DSB</code> 했는지. 버퍼가 cache-line align인지(64B 미만이면 인접 변수까지 invalidate). <code>DMA_FROM_DEVICE</code> 방향 맞는지.</p>
        </div>
        <div className="card">
          <h4>🔧 케이스 B — JIT 간헐적 옛 함수</h4>
          <p>JIT이 가끔 옛 함수 실행. 멀티코어에서만 재현.</p>
          <p><b>체크:</b> 6단계 중 ⑤번 <code>DSB ISH</code> 누락, 또는 <code>DSB NSH</code>로 좁아져 다른 코어 I-cache invalidate 미전파.</p>
        </div>
        <div className="card">
          <h4>🔧 케이스 C — Spinlock contention</h4>
          <p>코어 64개에서 contention 심함.</p>
          <p><b>개선:</b> ① LL/SC → LSE atomic. ② far atomic (HN-F 직접 수행). ③ per-CPU + aggregation. ④ ticket → MCS lock.</p>
        </div>
        <div className="card">
          <h4>🔧 케이스 D — 멀티스레드가 더 느림</h4>
          <p>멀티스레드 카운터가 단일스레드보다 느림.</p>
          <p><b>진단:</b> <code>perf c2c</code>로 HITM 샘플 확인. <b>해결:</b> <code>alignas(64)</code> 또는 thread-local + 마지막 합산.</p>
        </div>
        <div className="card">
          <h4>🔧 케이스 E — Lock-free queue 손상</h4>
          <p>SPSC ring buffer에서 consumer가 부분 데이터 봄.</p>
          <p><b>체크:</b> producer의 head 갱신이 <code>STLR</code>인지(<code>STR</code>이면 reorder 위험). consumer의 head 읽기가 <code>LDAR</code>인지. data write가 head update보다 먼저 release된 채인지.</p>
        </div>
        <div className="card">
          <h4>🔧 케이스 F — 부팅 직후 hang</h4>
          <p>secondary CPU가 PSCI CPU_ON 후 hang.</p>
          <p><b>체크:</b> entry point가 <b>identity map되어 있고 cache flush됐는지</b>. secondary가 자기 stack을 set하기 전에 함수 호출하지 않는지. MMU enable 전 ISB 빠지지 않았는지.</p>
        </div>
      </div>

      <h2>통합 Cheat Sheet <span className="en">/ All-in-One</span></h2>
      <div className="callout">
        <span className="icon">📌</span>
        <div>
          <b>Cache</b><br/>
          <ul style={{margin: '4px 0 12px 0', paddingLeft: 18}}>
            <li><b>JIT 6단계:</b> STR → DC CVAU → DSB ISH → IC IVAU → DSB ISH → ISB.</li>
            <li><b>DMA:</b> 송신 Clean(CVAC), 수신 Invalidate(IVAC), 양방향 CIVAC. 항상 DSB.</li>
            <li><b>MMU/TLB:</b> 시스템 reg 변경 후 ISB. TLBI 후 DSB ISH + ISB.</li>
          </ul>
          <b>동기화</b><br/>
          <ul style={{margin: '4px 0 12px 0', paddingLeft: 18}}>
            <li><b>DMB·DSB·ISB:</b> 순서 / 완료 / 파이프라인. 강도 DMB &lt; DSB.</li>
            <li><b>SPSC ring:</b> data → STLR(head). 상대 인덱스만 LDAR.</li>
            <li><b>Seqlock:</b> writer가 odd로 마킹. reader는 acquire-acquire 두 번 + 일치 확인.</li>
            <li><b>LSE atomic:</b> LDADD/LDSET/LDCLR/CAS. <code>AL</code> 접미가 안전한 기본.</li>
          </ul>
          <b>함수 / Trap</b><br/>
          <ul style={{margin: '4px 0 12px 0', paddingLeft: 18}}>
            <li><b>프롤로그:</b> <code>stp x29, x30, [sp, #-N]!</code> + <code>mov x29, sp</code>.</li>
            <li><b>PAC+BTI:</b> <code>bti c</code> + <code>paciasp</code> ... <code>retaa</code>.</li>
            <li><b>Trap entry:</b> SP 확보 → GPR pair store → ESR decode → 분기.</li>
            <li><b>ERET:</b> ELR/SPSR 복원 후 — Spectre v2 차단을 위해 <code>dsb nsh; isb</code>.</li>
          </ul>
          <b>copy / 전력 / branchless</b><br/>
          <ul style={{margin: '4px 0 0 0', paddingLeft: 18}}>
            <li><b>memcpy:</b> 작음 LDP/STP, 중간 LD1/ST1 NEON, 큼 LDNP/STNP. memset(0)은 DC ZVA.</li>
            <li><b>저전력 spin:</b> WFE + 자동 SEV(STLR). 진짜 idle은 WFI.</li>
            <li><b>SMP 부팅:</b> <code>SMC #0</code>으로 PSCI CPU_ON.</li>
            <li><b>Branchless:</b> CSEL/CSINC/CSINV/CSNEG. constant-time crypto에 필수.</li>
            <li><b>Spectre v1:</b> bounds check 후 <code>CSDB</code> 또는 <code>SB</code>.</li>
          </ul>
        </div>
      </div>

      <div className="callout warn">
        <span className="icon">⚠</span>
        <div><b>각 단계 = 막아야 할 race 하나.</b> 패턴을 안다는 건 <b>각 명령이 어떤 race를 막는지 매핑이 머릿속에 있다</b>는 뜻. 그래야 변형된 시퀀스(다른 코어에 코드 보내기, stage-2 변경, custom lock primitive)에서도 즉석에서 시퀀스를 조립할 수 있다.</div>
      </div>
    </>
  )
}
