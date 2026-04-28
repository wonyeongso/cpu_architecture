export default function MemoryModel() {
  return (
    <>
      <h2>Weakly Ordered Model</h2>
      <p>ARM은 <b>weakly-ordered</b> 메모리 모델. Load/Store가 프로그램 순서와 다르게 관측될 수 있어, 순서가 중요한 경우 배리어 또는 acquire/release 명령이 필요합니다.</p>

      <div className="callout warn">
        <span className="icon">⚠️</span>
        <div><b>주의.</b> x86(TSO)에서 동작하던 lock-free 코드가 ARM에서는 깨질 수 있음. SMP 환경에서 공유 데이터 접근 시 반드시 확인.</div>
      </div>

      <h2>메모리 타입 <span className="en">/ Memory Types</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Type</th><th>특성</th><th>용도</th></tr></thead>
          <tbody>
            <tr><td><code>Normal</code></td><td>Reorder / Merge / Speculate 가능, cacheable</td><td>일반 RAM</td></tr>
            <tr><td><code>Device</code></td><td>순서 보장, cache 금지, speculate 제한</td><td>MMIO (nGnRnE / nGnRE / nGRE / GRE)</td></tr>
          </tbody>
        </table>
      </div>
      <p><span className="tag info">nG</span> non-Gathering &nbsp; <span className="tag info">nR</span> non-Reordering &nbsp; <span className="tag info">nE</span> non-Early write ack</p>

      <h2>배리어 명령 <span className="en">/ Barrier Instructions</span></h2>
      <pre><code>
<span className="kw">DMB</span>  {"<option>"}   <span className="cmt">{"// Data Memory Barrier — orders memory accesses only"}</span>{"\n"}
<span className="kw">DSB</span>  {"<option>"}   <span className="cmt">{"// Data Sync Barrier — waits for prior memory accesses to complete"}</span>{"\n"}
<span className="kw">ISB</span>             <span className="cmt">{"// Instruction Sync Barrier — pipeline flush, context sync"}</span>{"\n\n"}
<span className="cmt">{"// Options:"}</span>{"\n"}
<span className="cmt">{"//   Scope:     SY (full system), ISH (inner shareable), OSH (outer), NSH"}</span>{"\n"}
<span className="cmt">{"//   Direction: LD (load-load + load-store), ST (store-store)"}</span>
      </code></pre>

      <h2>왜 배리어가 필요한가 <span className="en">/ Why Barriers?</span></h2>
      <p>ARM은 성능을 위해 Load/Store를 <b>프로그램 순서와 다르게</b> 실행하거나 관측되게 허용해요.
      단일 스레드에선 컴파일러·CPU가 "결과가 같아 보이도록" 재정렬하니 문제 없지만,
      <b>다른 코어가 내 쓰기를 본다면</b>? 순서가 뒤집혀 보일 수 있습니다.</p>

      <div className="diagram">{` Core 0 (생산자)              Core 1 (소비자)
   data = 42;                  while (ready == 0) {}
   ready = 1;                  print(data);   // ← 42? 아니면 쓰레기값?`}</div>

      <p>ARM에서는 Core 0의 두 store가 <b>순서 뒤집혀</b> Core 1에 보일 수 있어요 — <code>ready=1</code>이 먼저,
      <code>data=42</code>가 나중에 도달. 그래서 Core 1이 <code>ready</code>를 봤을 때 <code>data</code>는 아직 쓰레기.
      이걸 막으려면 <b>배리어</b>로 "순서를 강제"해야 합니다.</p>

      <h2>DMB — 실전 예시 <span className="en">/ Data Memory Barrier</span></h2>
      <p>가장 가볍고 자주 씀. "<b>DMB 이전의 메모리 접근이 DMB 이후보다 먼저 관측됨을 보장</b>."
      파이프라인이 멈추지 않고 일반적인 producer/consumer 패턴에 충분.</p>

      <h3>예시 1 — 공유 데이터 + ready 플래그</h3>
      <pre><code>
<span className="cmt">{"// Core 0 (producer)"}</span>{"\n"}
  <span className="kw">str</span>   w1, [x_data]        <span className="cmt">{"// data = 42"}</span>{"\n"}
  <span className="kw">dmb</span>   <span className="kw">ishst</span>               <span className="cmt">{"// the store above is observed before the store below"}</span>{"\n"}
  <span className="kw">mov</span>   w2, <span className="num">#1</span>{"\n"}
  <span className="kw">str</span>   w2, [x_ready]       <span className="cmt">{"// ready = 1"}</span>{"\n"}
{"\n"}
<span className="cmt">{"// Core 1 (consumer)"}</span>{"\n"}
wait:{"\n"}
  <span className="kw">ldr</span>   w3, [x_ready]{"\n"}
  <span className="kw">cbz</span>   w3, wait{"\n"}
  <span className="kw">dmb</span>   <span className="kw">ishld</span>               <span className="cmt">{"// later loads must not move ahead of the ready read"}</span>{"\n"}
  <span className="kw">ldr</span>   w4, [x_data]        <span className="cmt">{"// load data — guaranteed 42 now"}</span>
      </code></pre>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>더 간결한 대안.</b> 위 패턴은 <b>release/acquire</b>로 한 명령에 처리 가능:
        생산자 쪽은 <code>stlr w2, [x_ready]</code>, 소비자 쪽은 <code>ldar w3, [x_ready]</code>.
        DMB 없이 동일한 순서 보장 + 더 빠름. 다음 섹션 참고.</div>
      </div>

      <h3>예시 2 — 링 버퍼 (producer writes, consumer reads)</h3>
      <pre><code>
<span className="cmt">{"// producer: write data, then update head"}</span>{"\n"}
  <span className="kw">str</span>   w_val, [x_buf, w_head, <span className="kw">lsl</span> <span className="num">#2</span>]   <span className="cmt">{"// buf[head] = val"}</span>{"\n"}
  <span className="kw">dmb</span>   <span className="kw">ishst</span>                           <span className="cmt">{"// data write must precede head update"}</span>{"\n"}
  <span className="kw">add</span>   w_head, w_head, <span className="num">#1</span>{"\n"}
  <span className="kw">str</span>   w_head, [x_head_ptr]{"\n"}
{"\n"}
<span className="cmt">{"// consumer: check head, then read data"}</span>{"\n"}
  <span className="kw">ldr</span>   w_h, [x_head_ptr]{"\n"}
  <span className="kw">cmp</span>   w_h, w_tail{"\n"}
  <span className="kw">b.eq</span>  empty{"\n"}
  <span className="kw">dmb</span>   <span className="kw">ishld</span>                           <span className="cmt">{"// the head read must not move ahead of the data read"}</span>{"\n"}
  <span className="kw">ldr</span>   w_val, [x_buf, w_tail, <span className="kw">lsl</span> <span className="num">#2</span>]
      </code></pre>

      <h2>DSB — 실전 예시 <span className="en">/ Data Synchronization Barrier</span></h2>
      <p>DMB보다 <b>훨씬 강함</b>. "<b>이전 메모리 접근이 실제로 완료될 때까지 CPU 전체가 멈춤</b>."
      파이프라인 스톨 → 성능 비쌈. 하드웨어가 관련된 상황에서 사용.</p>

      <h3>예시 1 — MMIO 쓰기 후 장치 동작 보장</h3>
      <pre><code>
<span className="cmt">{"// write DMA-start bit to device register"}</span>{"\n"}
  <span className="kw">mov</span>   w1, <span className="num">#1</span>{"\n"}
  <span className="kw">str</span>   w1, [x_dma_ctrl]      <span className="cmt">{"// DMA_CTRL.START = 1"}</span>{"\n"}
  <span className="kw">dsb</span>   <span className="kw">sy</span>                     <span className="cmt">{"// wait until the device has actually accepted the write"}</span>{"\n"}
  <span className="cmt">{"// without this, the next instruction may run before the device sees it"}</span>{"\n"}
  <span className="kw">bl</span>    wait_for_dma_done
      </code></pre>

      <h3>예시 2 — 캐시 유지 명령(CMO) 완료 보장</h3>
      <pre><code>
<span className="cmt">{"// common pattern for self-modifying code / DMA buffer sync"}</span>{"\n"}
  <span className="kw">ic</span>    <span className="kw">ivau</span>, x_addr           <span className="cmt">{"// Instruction cache invalidate by VA"}</span>{"\n"}
  <span className="kw">dsb</span>   <span className="kw">ish</span>                    <span className="cmt">{"// wait until IC invalidation propagates to all cores"}</span>{"\n"}
  <span className="kw">isb</span>                          <span className="cmt">{"// flush this core's pipeline too"}</span>{"\n"}
{"\n"}
<span className="cmt">{"// before handing the buffer off to DMA"}</span>{"\n"}
  <span className="kw">dc</span>    <span className="kw">civac</span>, x_addr          <span className="cmt">{"// Clean+Invalidate data cache by VA to PoC"}</span>{"\n"}
  <span className="kw">dsb</span>   <span className="kw">sy</span>                     <span className="cmt">{"// fully reflected down to DRAM"}</span>
      </code></pre>

      <h3>예시 3 — TLB invalidate 후</h3>
      <pre><code>
<span className="cmt">{"// after a page-table change"}</span>{"\n"}
  <span className="kw">str</span>   x_new_pte, [x_pte]{"\n"}
  <span className="kw">dsb</span>   <span className="kw">ishst</span>                  <span className="cmt">{"// PTE write is visible in memory"}</span>{"\n"}
  <span className="kw">tlbi</span>  <span className="kw">vae1is</span>, x_va            <span className="cmt">{"// inner shareable TLB invalidate"}</span>{"\n"}
  <span className="kw">dsb</span>   <span className="kw">ish</span>                    <span className="cmt">{"// TLBI completes on all cores"}</span>{"\n"}
  <span className="kw">isb</span>                          <span className="cmt">{"// pipeline re-fetches with the new mapping"}</span>
      </code></pre>

      <h2>ISB — 실전 예시 <span className="en">/ Instruction Synchronization Barrier</span></h2>
      <p>"<b>파이프라인을 비우고, 이후 명령은 최신 컨텍스트로 다시 fetch</b>."
      시스템 레지스터·페이지 테이블·코드 변경처럼 <b>실행 환경이 바뀌었을 때</b> 필요.</p>

      <h3>예시 1 — 시스템 레지스터 변경 후</h3>
      <pre><code>
<span className="cmt">{"// enable MMU"}</span>{"\n"}
  <span className="kw">mrs</span>   x0, <span className="kw">sctlr_el1</span>{"\n"}
  <span className="kw">orr</span>   x0, x0, <span className="num">#1</span>            <span className="cmt">{"// SCTLR_EL1.M = 1 (MMU enable)"}</span>{"\n"}
  <span className="kw">msr</span>   <span className="kw">sctlr_el1</span>, x0{"\n"}
  <span className="kw">isb</span>                          <span className="cmt">{"// required! later instructions fetched with MMU on"}</span>{"\n"}
  <span className="cmt">{"// without ISB, the already-fetched next instruction runs with MMU off"}</span>
      </code></pre>

      <h3>예시 2 — EL 전환 후 (ERET 직전엔 불필요, ERET 자체가 context sync)</h3>
      <pre><code>
<span className="cmt">{"// after changing interrupt mask — when the next instruction must observe it"}</span>{"\n"}
  <span className="kw">msr</span>   <span className="kw">daifset</span>, <span className="num">#2</span>        <span className="cmt">{"// mask IRQ"}</span>{"\n"}
  <span className="kw">isb</span>{"\n"}
  <span className="cmt">{"// without this, in-flight instructions may execute with the old mask"}</span>
      </code></pre>

      <h3>예시 3 — 자기 수정 코드 (Self-Modifying Code)</h3>
      <pre><code>
<span className="cmt">{"// JIT compiler, hot-patch, etc."}</span>{"\n"}
  <span className="kw">str</span>   w_new_insn, [x_code]    <span className="cmt">{"// write the new instruction into the code region"}</span>{"\n"}
  <span className="kw">dc</span>    <span className="kw">cvau</span>, x_code            <span className="cmt">{"// clean data cache to PoU"}</span>{"\n"}
  <span className="kw">dsb</span>   <span className="kw">ish</span>                     <span className="cmt">{"// clean complete"}</span>{"\n"}
  <span className="kw">ic</span>    <span className="kw">ivau</span>, x_code            <span className="cmt">{"// invalidate instruction cache"}</span>{"\n"}
  <span className="kw">dsb</span>   <span className="kw">ish</span>                     <span className="cmt">{"// invalidate complete"}</span>{"\n"}
  <span className="kw">isb</span>                           <span className="cmt">{"// refresh this core's pipeline — new instruction is now safe to run"}</span>
      </code></pre>

      <h2>언제 어떤 옵션을 쓰나 <span className="en">/ Barrier Options</span></h2>
      <p>DMB와 DSB는 <b>범위(scope)</b>와 <b>방향(direction)</b>을 조합한 옵션을 받음.</p>

      <div className="table-wrap">
        <table>
          <thead><tr><th>옵션</th><th>의미</th><th>전형적 상황</th></tr></thead>
          <tbody>
            <tr><td><code>SY</code></td><td>Full system — 모든 관측자 대상</td><td>MMIO, 외부 장치와 동기화, 보수적 기본값</td></tr>
            <tr><td><code>ISH</code></td><td>Inner shareable — 같은 CPU 클러스터 내</td><td>멀티코어 공유 메모리 (Linux SMP 기본)</td></tr>
            <tr><td><code>OSH</code></td><td>Outer shareable — outer domain</td><td>여러 소켓 / 큰 시스템</td></tr>
            <tr><td><code>NSH</code></td><td>Non-shareable — 자기 코어만</td><td>UP(단일 코어) 또는 self-modifying 한정</td></tr>
            <tr><td><code>LD</code> 접미</td><td>Load-Load + Load-Store만 순서</td><td>읽기가 앞선 후속 접근과 순서 가질 때 (acquire 쪽)</td></tr>
            <tr><td><code>ST</code> 접미</td><td>Store-Store만 순서</td><td>쓰기끼리만 순서 필요 (release 쪽) — 더 가벼움</td></tr>
          </tbody>
        </table>
      </div>

      <pre><code>
<span className="cmt">{"// option combinations"}</span>{"\n"}
<span className="kw">dmb</span>  <span className="kw">ishst</span>    <span className="cmt">{"// SMP producer: store-store only, inner shareable"}</span>{"\n"}
<span className="kw">dmb</span>  <span className="kw">ishld</span>    <span className="cmt">{"// SMP consumer: order later accesses against the load"}</span>{"\n"}
<span className="kw">dmb</span>  <span className="kw">ish</span>      <span className="cmt">{"// full both-way, inner shareable"}</span>{"\n"}
<span className="kw">dsb</span>  <span className="kw">sy</span>       <span className="cmt">{"// strongest — MMIO, debug"}</span>{"\n"}
<span className="kw">dsb</span>  <span className="kw">nshst</span>    <span className="cmt">{"// self-modifying code: only this core's stores need to drain"}</span>
      </code></pre>

      <h2>DMB vs DSB vs ISB 한눈에 <span className="en">/ Side-by-Side</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th></th><th>DMB</th><th>DSB</th><th>ISB</th></tr></thead>
          <tbody>
            <tr><td>보장</td><td>메모리 접근 <b>관측 순서</b></td><td>메모리 접근 <b>완료</b></td><td>파이프라인 flush + 재-fetch</td></tr>
            <tr><td>CPU 대기?</td><td>아니오 (가벼움)</td><td>예 (비쌈)</td><td>예 (비쌈)</td></tr>
            <tr><td>주 용도</td><td>SMP 공유 변수 순서</td><td>MMIO, CMO, TLBI 완료</td><td>SCTLR/TTBR/DAIF 변경 후, SMC 전</td></tr>
            <tr><td>흔한 쌍</td><td>단독 또는 LDAR/STLR 대체</td><td>+ ISB 짝지어 사용</td><td>DSB 뒤에 따라옴</td></tr>
          </tbody>
        </table>
      </div>

      <h2>전형적 실수 <span className="en">/ Common Pitfalls</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>DMB 없이 동기화</h4>
          <p>"x86에선 잘 돌던" lock-free 코드가 ARM에서 희귀하게 깨짐. x86(TSO)은 store-store 순서가 자동이지만 ARM은 아님. <b>C11 <code>atomic_*</code></b>이나 <b>acquire/release</b>가 기본.</p>
        </div>
        <div className="card">
          <h4>MMIO 뒤에 DMB만</h4>
          <p>DMB는 순서만 보장하지 <b>완료를 기다리지 않음</b>. 장치가 실제로 쓰기를 받았는지 확인해야 하면 <b>DSB</b>. 괜히 DMB 쓰다 타이밍 레이스.</p>
        </div>
        <div className="card">
          <h4>시스템 레지스터 후 ISB 누락</h4>
          <p><code>MSR</code>로 MMU/TTBR/SCTLR 바꾸고 바로 다음 명령 실행 — 이미 fetch된 파이프라인은 <b>옛 상태</b>. 디버깅 악몽. <code>msr; isb</code>를 관용구처럼.</p>
        </div>
        <div className="card">
          <h4>SY를 남발</h4>
          <p><code>dsb sy</code>는 가장 보수적이지만 가장 느림. SMP 공유라면 <code>ish</code>로 충분. 커널 핫패스에서는 범위를 좁혀야 성능 확보.</p>
        </div>
        <div className="card">
          <h4>Normal 메모리에 MMIO 기대</h4>
          <p>Normal로 매핑된 영역은 배리어로도 <b>순서 보장 못하는 재정렬</b>(merge/reorder)이 있을 수 있음. MMIO는 반드시 <code>Device</code> 매핑.</p>
        </div>
        <div className="card">
          <h4>컴파일러 배리어를 잊음</h4>
          <p>ARM 명령 배리어를 써도 <b>컴파일러가 load/store를 위아래로 옮기면</b> 무용지물. <code>asm volatile("dmb ish" ::: "memory")</code>의 <code>"memory"</code> 클로버가 핵심.</p>
        </div>
      </div>

      <h2>Acquire / Release 의미론 <span className="en">/ One-way Barriers</span></h2>
      <pre><code>
<span className="kw">LDAR</span>  Wt, [Xn]    <span className="cmt">{"// Load-Acquire — later accesses are observed after this load"}</span>{"\n"}
<span className="kw">STLR</span>  Wt, [Xn]    <span className="cmt">{"// Store-Release — prior accesses are observed before this store"}</span>{"\n"}
<span className="kw">LDAPR</span> Wt, [Xn]    <span className="cmt">{"// Load-AcquirePC (v8.3) — weaker acquire"}</span>
      </code></pre>

      <h2>Atomic: LL/SC vs LSE</h2>
      <div className="grid2">
        <div className="card">
          <h4>LL/SC · Legacy (ARMv8.0)</h4>
          <pre style={{ margin: '8px 0 0' }}><code>
<span className="kw">loop:</span>{"\n"}
  <span className="kw">ldxr</span>  w1, [x0]{"\n"}
  <span className="kw">add</span>   w1, w1, <span className="num">#1</span>{"\n"}
  <span className="kw">stxr</span>  w2, w1, [x0]{"\n"}
  <span className="kw">cbnz</span>  w2, loop
          </code></pre>
        </div>
        <div className="card">
          <h4>LSE · Large System Ext. (ARMv8.1+)</h4>
          <pre style={{ margin: '8px 0 0' }}><code>
  <span className="kw">mov</span>   w1, <span className="num">#1</span>{"\n"}
  <span className="kw">ldadd</span> w1, w2, [x0]{"\n"}
  <span className="cmt">{"// single-instruction atomic"}</span>{"\n"}
  <span className="cmt">{"// far more efficient under high contention"}</span>
          </code></pre>
        </div>
      </div>
    </>
  )
}
