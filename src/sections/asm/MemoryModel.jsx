export default function AsmMemoryModel() {
  return (
    <>
      <h2>이 페이지의 범위 <span className="en">/ Scope</span></h2>
      <p>memory ordering을 SW에서 강제하는 도구들 — <b>DMB / DSB / ISB · LDAR / STLR · fence / fence.i</b>. <code>arm/MemoryModel</code>이 weakly-ordered 모델 자체를 다루고 <code>asm/Coherence</code>가 atomic primitive를 다룬다면, 여기는 <b>"어느 시점에 어떤 barrier를 어떤 옵션으로?"</b>의 의사결정 가이드.</p>

      <h2>① 3 ISA barrier 한 표 <span className="en">/ Side-by-Side</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>의도</th><th>AArch64</th><th>RISC-V</th><th>x86-64</th></tr></thead>
          <tbody>
            <tr><td>memory order만</td><td><code>dmb &lt;option&gt;</code></td><td><code>fence pred,succ</code></td><td><code>mfence</code> 또는 자동(TSO)</td></tr>
            <tr><td>completion 대기</td><td><code>dsb &lt;option&gt;</code></td><td>(fence + 명시적 wait)</td><td>일부 device write에 mfence</td></tr>
            <tr><td>instruction sync</td><td><code>isb</code></td><td><code>fence.i</code> (Zifencei)</td><td>serializing inst (cpuid 등)</td></tr>
            <tr><td>load-acquire</td><td><code>ldar</code></td><td><code>l*.aq</code></td><td>일반 load (TSO)</td></tr>
            <tr><td>store-release</td><td><code>stlr</code></td><td><code>s*.rl</code></td><td>일반 store (TSO)</td></tr>
          </tbody>
        </table>
      </div>

      <h2>② DMB · DSB · ISB — 무엇이 다른가 <span className="en">/ Three Different Barriers</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>DMB — Data Memory Barrier</h4>
          <p><b>관측 순서</b>만 보장. CPU가 멈추진 않음 — DMB 이전 메모리 접근이 이후 접근보다 먼저 보이게만. 가장 가볍고 가장 자주 씀. SMP 공유 변수 핸드오프의 기본형.</p>
        </div>
        <div className="card">
          <h4>DSB — Data Sync Barrier</h4>
          <p>이전 메모리 접근이 <b>실제로 완료</b>될 때까지 CPU 멈춤. 비쌈. MMIO 후 device가 받았는지 확인, CMO/TLBI 완료 대기 등 HW 협조가 필요할 때만.</p>
        </div>
        <div className="card">
          <h4>ISB — Instruction Sync Barrier</h4>
          <p>파이프라인 flush + <b>이후 명령 재-fetch</b>. SCTLR/TTBR/DAIF 같은 시스템 레지스터 변경 후, self-modifying code 후 필수. 메모리 순서와는 별개.</p>
        </div>
        <div className="card">
          <h4>한 줄 결정 트리</h4>
          <p>SMP 공유 변수 → <b>DMB ISH</b> (또는 LDAR/STLR로 대체). 장치/CMO/TLBI 끝까지 → <b>DSB</b>. 시스템 레지스터·코드 변경 → <b>DSB + ISB</b>.</p>
        </div>
      </div>

      <h2>③ DMB 옵션 다이얼 <span className="en">/ Scope × Direction</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>옵션</th><th>의미</th><th>전형적 상황</th></tr></thead>
          <tbody>
            <tr><td><code>SY</code></td><td>Full system — 모든 관측자</td><td>MMIO, 외부 device, 보수적 기본값</td></tr>
            <tr><td><code>ISH</code></td><td>Inner shareable — 같은 CPU 클러스터</td><td>SMP 공유 메모리 (Linux 기본)</td></tr>
            <tr><td><code>OSH</code></td><td>Outer shareable</td><td>여러 소켓 / 큰 시스템</td></tr>
            <tr><td><code>NSH</code></td><td>Non-shareable — 자기 코어만</td><td>UP 또는 self-modifying 한정</td></tr>
            <tr><td><code>LD</code> 접미</td><td>Load-Load + Load-Store만 순서</td><td>read 기준 acquire 의도</td></tr>
            <tr><td><code>ST</code> 접미</td><td>Store-Store만 순서</td><td>write 기준 release 의도 — 가장 가벼움</td></tr>
          </tbody>
        </table>
      </div>
      <div className="callout">
        <span className="icon">💡</span>
        <div><b>Shareability domain — SY / OSH / ISH / NSH 가 뭔가.</b><br/>
        ARM 시스템은 캐시 일관성을 보장할 관측자 집합을 <b>동심원</b>처럼 계층화함.<br/>
        <b>NSH (Non-shareable)</b> — 자기 코어만. UP 시스템 또는 자기 코어만 보면 충분한 경우.<br/>
        <b>ISH (Inner Shareable)</b> — 같은 inner-shareable 도메인의 모든 코어 (보통 한 클러스터 또는 한 SoC의 일반 코어들). <b>SMP Linux의 디폴트</b>.<br/>
        <b>OSH (Outer Shareable)</b> — outer 도메인까지 (멀티소켓·시스템 wide accelerator 포함).<br/>
        <b>SY (Full System)</b> — 모든 관측자 (외부 device, MMIO 까지). 가장 보수적·가장 비쌈.<br/>
        <b>한 줄:</b> "SMP 코어들끼리면 ISH, 외부 device 관여하면 SY". <code>LD/ST</code> 접미는 직교 — load-load+load-store만(LD), store-store만(ST), 양방향(없음).</div>
      </div>

      <pre><code>
<span className="cmt">{"// 자주 보는 조합"}</span>{"\n"}
<span className="kw">dmb</span>  <span className="kw">ishst</span>    <span className="cmt">{"// SMP producer: store-store, inner shareable"}</span>{"\n"}
<span className="kw">dmb</span>  <span className="kw">ishld</span>    <span className="cmt">{"// SMP consumer: load 기준 이후 접근 순서"}</span>{"\n"}
<span className="kw">dmb</span>  <span className="kw">ish</span>      <span className="cmt">{"// 양방향 full, inner shareable"}</span>{"\n"}
<span className="kw">dsb</span>  <span className="kw">sy</span>       <span className="cmt">{"// 가장 강력 — MMIO, debug"}</span>{"\n"}
<span className="kw">dsb</span>  <span className="kw">nshst</span>    <span className="cmt">{"// self-modifying code: 자기 코어 store 완료만"}</span>
      </code></pre>

      <h2>④ DMB ISH의 실전 — Producer/Consumer <span className="en">/ Hand-off Pattern</span></h2>
      <pre><code>
<span className="cmt">{"// Core 0 (producer)"}</span>{"\n"}
  <span className="kw">str</span>   w1, [x_data]        <span className="cmt">{"// data = 42"}</span>{"\n"}
  <span className="kw">dmb</span>   <span className="kw">ishst</span>               <span className="cmt">{"// data store visible before ready"}</span>{"\n"}
  <span className="kw">mov</span>   w2, <span className="num">#1</span>{"\n"}
  <span className="kw">str</span>   w2, [x_ready]       <span className="cmt">{"// ready = 1"}</span>{"\n\n"}
<span className="cmt">{"// Core 1 (consumer)"}</span>{"\n"}
wait:{"\n"}
  <span className="kw">ldr</span>   w3, [x_ready]{"\n"}
  <span className="kw">cbz</span>   w3, wait{"\n"}
  <span className="kw">dmb</span>   <span className="kw">ishld</span>               <span className="cmt">{"// later loads must not move ahead"}</span>{"\n"}
  <span className="kw">ldr</span>   w4, [x_data]        <span className="cmt">{"// guaranteed 42"}</span>
      </code></pre>

      <h2>⑤ LDAR / STLR — DMB의 우아한 대안 <span className="en">/ One-way Barrier</span></h2>
      <pre><code>
<span className="cmt">{"// 위 producer/consumer를 LDAR/STLR로 다시"}</span>{"\n\n"}
<span className="cmt">{"// Core 0 (producer)"}</span>{"\n"}
  <span className="kw">str</span>   w1, [x_data]{"\n"}
  <span className="kw">stlr</span>  w2, [x_ready]       <span className="cmt">{"// release: prior stores observed before this"}</span>{"\n\n"}
<span className="cmt">{"// Core 1 (consumer)"}</span>{"\n"}
wait:{"\n"}
  <span className="kw">ldar</span>  w3, [x_ready]       <span className="cmt">{"// acquire: later loads observed after this"}</span>{"\n"}
  <span className="kw">cbz</span>   w3, wait{"\n"}
  <span className="kw">ldr</span>   w4, [x_data]        <span className="cmt">{"// guaranteed 42, no DMB needed"}</span>
      </code></pre>
      <div className="callout">
        <span className="icon">💡</span>
        <div><b>왜 더 좋은가.</b> DMB는 <b>양방향</b> 순서 강제 — 한쪽 방향만 필요한데도 비용 지불. LDAR/STLR은 <b>한 방향</b>만 막음 → 더 적은 reorder 차단 → 컴파일러·CPU가 더 많이 최적화 가능. C++ <code>memory_order_acquire/release</code>의 native 매핑.</div>
      </div>

      <h2>⑥ DSB — MMIO 시퀀스 <span className="en">/ Device Sync</span></h2>
      <pre><code>
<span className="cmt">{"// kick DMA: write start bit, then wait until device sees it"}</span>{"\n"}
  <span className="kw">mov</span>   w1, <span className="num">#1</span>{"\n"}
  <span className="kw">str</span>   w1, [x_dma_ctrl]      <span className="cmt">{"// DMA_CTRL.START = 1"}</span>{"\n"}
  <span className="kw">dsb</span>   <span className="kw">sy</span>                     <span className="cmt">{"// wait until device accepted the write"}</span>{"\n"}
  <span className="kw">bl</span>    wait_for_dma_done
      </code></pre>
      <div className="callout warn">
        <span className="icon">⚠</span>
        <div><b>면접 함정.</b> "MMIO 뒤엔 그냥 DMB만 쓰면 되지 않나?" — 아니. DMB는 <b>관측 순서만</b>, 완료를 기다리지 않음. 다음 명령이 device의 응답을 기다려야 한다면 DSB. 잘못 쓰면 race가 드물게 발생해 디버깅 지옥.</div>
      </div>

      <h2>⑦ DSB + TLBI 시퀀스 <span className="en">/ Page-table Sync</span></h2>
      <pre><code>
<span className="cmt">{"// after a page-table change"}</span>{"\n"}
  <span className="kw">str</span>   x_new_pte, [x_pte]{"\n"}
  <span className="kw">dsb</span>   <span className="kw">ishst</span>                  <span className="cmt">{"// PTE write visible in memory"}</span>{"\n"}
  <span className="kw">tlbi</span>  <span className="kw">vae1is</span>, x_va            <span className="cmt">{"// inner shareable TLB invalidate"}</span>{"\n"}
  <span className="kw">dsb</span>   <span className="kw">ish</span>                    <span className="cmt">{"// TLBI completes on all cores"}</span>{"\n"}
  <span className="kw">isb</span>                          <span className="cmt">{"// pipeline re-fetches with new mapping"}</span>
      </code></pre>
      <p>이 시퀀스는 <b>커널 페이지 테이블 변경의 표준 형태</b>. 한 명령이라도 빼먹으면 stale TLB로 wrong page 접근.</p>

      <h2>⑧ ISB — 시스템 레지스터 변경 <span className="en">/ Context Sync</span></h2>
      <pre><code>
<span className="cmt">{"// enable MMU"}</span>{"\n"}
  <span className="kw">mrs</span>   x0, <span className="kw">sctlr_el1</span>{"\n"}
  <span className="kw">orr</span>   x0, x0, <span className="num">#1</span>            <span className="cmt">{"// SCTLR_EL1.M = 1"}</span>{"\n"}
  <span className="kw">msr</span>   <span className="kw">sctlr_el1</span>, x0{"\n"}
  <span className="kw">isb</span>                          <span className="cmt">{"// later instructions fetched with MMU on"}</span>
      </code></pre>
      <p><b>왜 ISB?</b> MSR이 SCTLR을 바꾸는 시점에 <b>이미 파이프라인에 prefetch된 다음 명령</b>은 옛 SCTLR 상태로 디코드됨. ISB가 파이프라인을 비우고 새 컨텍스트로 재-fetch.</p>

      <h2>⑨ RISC-V fence — ARM 대응 <span className="en">/ RVWMO</span></h2>
      <pre><code>
<span className="cmt">{"// fence pred, succ — pred 접근이 succ 접근 전에 관측 보장"}</span>{"\n"}
<span className="cmt">{"// pred / succ 는 r/w/i/o 의 부분집합:"}</span>{"\n"}
<span className="cmt">{"//   r = memory read, w = memory write"}</span>{"\n"}
<span className="cmt">{"//   i = device input,  o = device output"}</span>{"\n\n"}
<span className="kw">fence</span>  rw, rw      <span className="cmt">{"// = ARM DMB SY (full memory)"}</span>{"\n"}
<span className="kw">fence</span>  r, rw       <span className="cmt">{"// load barrier (acquire-ish)"}</span>{"\n"}
<span className="kw">fence</span>  rw, w       <span className="cmt">{"// store barrier (release-ish)"}</span>{"\n"}
<span className="kw">fence</span>  iorw, iorw  <span className="cmt">{"// device + memory (= DSB SY)"}</span>{"\n"}
<span className="kw">fence.i</span>             <span className="cmt">{"// instruction-stream sync (= ARM ISB, Zifencei)"}</span>{"\n\n"}
<span className="cmt">{"// 한 방향 변형도 동일 — .aq / .rl suffix"}</span>{"\n"}
<span className="kw">lr.w.aq</span>   t0, (a0)     <span className="cmt">{"// Load-Acquire"}</span>{"\n"}
<span className="kw">sc.w.rl</span>   t2, t1, (a0) <span className="cmt">{"// Store-Release"}</span>
      </code></pre>

      <h2>⑩ 면접 단골 — 흔한 실수 <span className="en">/ Common Pitfalls</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>DMB 없이 동기화</h4>
          <p>"x86에선 잘 돌던" lock-free가 ARM에서 희귀하게 깨짐. x86(TSO)은 store-store가 자동 순서, ARM은 아님. <b>C11 <code>atomic_*</code> 또는 acquire/release 디폴트</b>.</p>
        </div>
        <div className="card">
          <h4>MMIO 뒤에 DMB만</h4>
          <p>DMB는 순서만, <b>완료를 기다리지 않음</b>. 장치가 실제로 받았는지 확인이 필요하면 DSB.</p>
        </div>
        <div className="card">
          <h4>시스템 레지스터 후 ISB 누락</h4>
          <p>MSR 후 바로 다음 명령 실행 — 이미 fetch된 파이프라인은 옛 상태. <code>msr; isb</code>를 관용구처럼.</p>
        </div>
        <div className="card">
          <h4>SY를 남발</h4>
          <p><code>dsb sy</code>는 가장 보수적이지만 가장 느림. SMP 공유라면 <code>ish</code>로 충분. 핫패스에선 범위 좁히기.</p>
        </div>
        <div className="card">
          <h4>Normal 메모리에 MMIO 기대</h4>
          <p>Normal로 매핑된 영역은 배리어로도 막을 수 없는 reorder(merge/speculate)가 있을 수 있음. MMIO는 반드시 <code>Device</code> 매핑.</p>
        </div>
        <div className="card">
          <h4>컴파일러 배리어 누락</h4>
          <p>HW 배리어를 써도 <b>컴파일러가 load/store를 위아래로 옮기면</b> 무용지물. <code>asm volatile("dmb ish" ::: "memory")</code>의 <code>"memory"</code> 클로버 필수.</p>
        </div>
      </div>

      <h2>한 줄 요약 <span className="en">/ Cheat Sheet</span></h2>
      <div className="callout">
        <span className="icon">📌</span>
        <div>
          <ul style={{margin: 0, paddingLeft: 18}}>
            <li>DMB = 관측 순서, DSB = 완료 대기, ISB = 파이프라인 재-fetch.</li>
            <li>SMP 공유 변수의 디폴트는 <code>DMB ISH</code> 또는 <b>LDAR/STLR</b> 페어.</li>
            <li>MMIO 뒤엔 <code>DSB SY</code>, 페이지 테이블 변경 후엔 <code>DSB ISH + ISB</code>.</li>
            <li>시스템 레지스터 변경 후 <code>ISB</code>는 관용구.</li>
            <li>한 방향 acquire/release(LDAR/STLR)는 양방향 DMB보다 가볍다.</li>
            <li>RISC-V <code>fence rw,rw</code> ≈ DMB SY, <code>fence.i</code> ≈ ISB.</li>
            <li>면접 한 줄: <b>"x86에선 보이지 않던 reorder가 ARM에서 보인다 — 의도가 release/acquire면 명시할 것."</b></li>
          </ul>
        </div>
      </div>
    </>
  )
}
