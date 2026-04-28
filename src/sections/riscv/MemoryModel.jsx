export default function RiscvMemoryModel() {
  return (
    <>
      <h2>RVWMO <span className="en">/ RISC-V Weak Memory Ordering</span></h2>
      <p>RISC-V 는 기본적으로 <b>weak</b> 메모리 모델(<code>RVWMO</code>). ARM weakly-ordered 와 개념적으로 같은 범주지만 공식 스펙이 <b>operational model + axiomatic model</b> 두 방식 모두 제공되어 형식 검증에 유리.</p>

      <div className="callout warn">
        <span className="icon">⚠️</span>
        <div>x86 TSO 하에서 돌던 lock-free 코드는 RISC-V 에서도 ARM 과 마찬가지로 깨질 수 있습니다. SMP 공유 데이터 접근 시 fence / AMO aq/rl 가 필수.</div>
      </div>

      <h2>PPO 규칙 <span className="en">/ Preserved Program Order</span></h2>
      <p>HW 가 무조건 지켜야 하는 순서 규칙 13개가 스펙에 명시 (간략화):</p>
      <ul>
        <li>같은 주소 : load → load (store buffer 안 지나도) 순서 유지</li>
        <li>같은 주소 : store → load 가 forwarding 이 아니면 유지</li>
        <li>AMO / LR / SC 의 amoset / release 는 주변 접근 순서 제약</li>
        <li>data / address dependency 가 있으면 순서 유지</li>
        <li>... 상세는 RISC-V Unpriv Spec 제17장</li>
      </ul>

      <h2>fence 명령 <span className="en">/ Barrier</span></h2>
      <pre><code>
<span className="kw">fence</span>  <span className="reg">pred</span>, <span className="reg">succ</span>     <span className="cmt">{"// pred accesses observed before succ accesses"}</span>{"\n\n"}
<span className="cmt">{"// pred/succ is a subset of r/w/i/o:"}</span>{"\n"}
<span className="cmt">{"//   r = memory read, w = memory write"}</span>{"\n"}
<span className="cmt">{"//   i = device input,  o = device output"}</span>{"\n\n"}
<span className="cmt">{"// common combinations:"}</span>{"\n"}
<span className="kw">fence</span>  rw, rw          <span className="cmt">{"// full memory fence (= ARM DMB SY)"}</span>{"\n"}
<span className="kw">fence</span>  r, rw           <span className="cmt">{"// load barrier"}</span>{"\n"}
<span className="kw">fence</span>  rw, w           <span className="cmt">{"// store barrier"}</span>{"\n"}
<span className="kw">fence</span>  iorw, iorw      <span className="cmt">{"// device (MMIO) + memory"}</span>{"\n\n"}
<span className="kw">fence.i</span>                 <span className="cmt">{"// instruction-stream sync (Zifencei, = ARM ISB)"}</span>
      </code></pre>

      <h2>A 확장 <span className="en">/ Atomic Operations</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>LR / SC · Zalrsc</h4>
          <pre style={{ margin: '8px 0 0' }}><code>
<span className="kw">loop:</span>{"\n"}
  <span className="kw">lr.w</span>   t0, (a0)     <span className="cmt">{"// load-reserved"}</span>{"\n"}
  <span className="kw">addi</span>   t1, t0, <span className="num">1</span>{"\n"}
  <span className="kw">sc.w</span>   t2, t1, (a0) <span className="cmt">{"// store-conditional"}</span>{"\n"}
  <span className="kw">bnez</span>   t2, loop     <span className="cmt">{"// retry if failed"}</span>
          </code></pre>
        </div>
        <div className="card">
          <h4>AMO · Zaamo</h4>
          <pre style={{ margin: '8px 0 0' }}><code>
  <span className="kw">li</span>     t0, <span className="num">1</span>{"\n"}
  <span className="kw">amoadd.w</span> t1, t0, (a0)  <span className="cmt">{"// *a0 += 1, t1 = old *a0"}</span>{"\n"}
<span className="cmt">{"// single-instruction atomic"}</span>{"\n"}
<span className="cmt">{"// = ARM LSE LDADD"}</span>
          </code></pre>
        </div>
      </div>

      <h2>.aq / .rl 한 방향 배리어 <span className="en">/ Acquire / Release</span></h2>
      <pre><code>
<span className="kw">lr.w.aq</span>   t0, (a0)     <span className="cmt">{"// Load-Acquire — later accesses observed after this load"}</span>{"\n"}
<span className="kw">sc.w.rl</span>   t2, t1, (a0) <span className="cmt">{"// Store-Release — earlier accesses observed before this store"}</span>{"\n"}
<span className="kw">amoadd.w.aqrl</span> t1, t0, (a0)  <span className="cmt">{"// Acquire + Release (SC)"}</span>
      </code></pre>
      <p>ARM <code>LDAR / STLR</code> 에 직접 대응. 한 방향 배리어는 full fence 보다 가볍고 lock-free 자료구조의 hot path 에 유리.</p>

      <h2>Ztso · x86-호환 프로파일 <span className="en">/ Total Store Order</span></h2>
      <p><code>Ztso</code> 확장은 TSO 메모리 모델을 강제 — x86 lock-free 코드가 그대로 동작. Zalrsc / Zaamo 를 보강해 대부분의 reorder 를 금지. 대표 구현: <b>NVIDIA Grace-hopper 경쟁 ARM-on-ARM 에뮬</b>에 유사한 역할.</p>

      <div className="table-wrap">
        <table>
          <thead><tr><th>모델</th><th>강도</th><th>Reorder 허용</th></tr></thead>
          <tbody>
            <tr><td>RVWMO (기본)</td><td>Weak</td><td>load-load, load-store, store-load, store-store 모두</td></tr>
            <tr><td>Ztso (x86 호환)</td><td>Strong</td><td>store-load 만 (store buffer forwarding)</td></tr>
            <tr><td>x86 TSO</td><td>Strong</td><td>store-load 만</td></tr>
            <tr><td>ARM weak</td><td>Weak</td><td>RVWMO 와 거의 동급</td></tr>
            <tr><td>SC (이론)</td><td>Strongest</td><td>없음 — 실제 CPU 는 거의 채택 안 함</td></tr>
          </tbody>
        </table>
      </div>
    </>
  )
}
