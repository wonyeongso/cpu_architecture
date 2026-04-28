export default function Registers() {
  return (
    <>
      <h2>General Purpose Registers</h2>
      <p>AArch64는 총 31개의 범용 레지스터 + 전용 레지스터. 32-bit 뷰는 <code>W</code> prefix.</p>
      <pre><code>
<span className="reg">X0  – X30</span>   <span className="cmt">{"// 64-bit general purpose (31 regs)"}</span>{"\n"}
<span className="reg">W0  – W30</span>   <span className="cmt">{"// low 32-bit view — writes auto zero-extend the upper 32 bits"}</span>{"\n"}
<span className="reg">X30 / LR</span>    <span className="cmt">{"// Link Register — BL stores the return address here"}</span>{"\n"}
<span className="reg">XZR / WZR</span>   <span className="cmt">{"// Zero Register — reads as 0, writes are discarded"}</span>{"\n"}
<span className="reg">SP</span>          <span className="cmt">{"// Stack Pointer (banked per EL: SP_EL0/1/2/3)"}</span>{"\n"}
<span className="reg">PC</span>          <span className="cmt">{"// Program Counter — not directly writable (branch only)"}</span>
      </code></pre>

      <h2>PSTATE <span className="en">/ Process State</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Field</th><th>Bits</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><code>N, Z, C, V</code></td><td>4</td><td>Negative / Zero / Carry / oVerflow — condition flags</td></tr>
            <tr><td><code>DAIF</code></td><td>4</td><td>Debug · SError · IRQ · FIQ mask</td></tr>
            <tr><td><code>CurrentEL</code></td><td>2</td><td>current Exception Level (0 ~ 3)</td></tr>
            <tr><td><code>SPSel</code></td><td>1</td><td>select SP_EL0 vs SP_ELx</td></tr>
            <tr><td><code>nRW</code></td><td>1</td><td>AArch64 vs AArch32 execution state</td></tr>
          </tbody>
        </table>
      </div>

      <h2>시스템 레지스터 <span className="en">/ Exception Handling</span></h2>
      <pre><code>
<span className="reg">ELR_ELx</span>   <span className="cmt">{"// Exception Link Register — PC at the moment of exception"}</span>{"\n"}
<span className="reg">SPSR_ELx</span>  <span className="cmt">{"// Saved Program Status — PSTATE at the moment of exception"}</span>{"\n"}
<span className="reg">ESR_ELx</span>   <span className="cmt">{"// Exception Syndrome Register — classifies the exception cause"}</span>{"\n"}
<span className="reg">FAR_ELx</span>   <span className="cmt">{"// Fault Address Register — address for data/instruction abort"}</span>{"\n"}
<span className="reg">VBAR_ELx</span>  <span className="cmt">{"// Vector Base Address — location of the exception vector table"}</span>
      </code></pre>

      <h2>예제 코드 <span className="en">/ Function Prologue &amp; Epilogue</span></h2>
      <pre><code>
<span className="kw">stp</span>   x29, x30, [sp, <span className="num">#-16</span>]!   <span className="cmt">{"// save FP, LR + SP -= 16 (pre-index)"}</span>{"\n"}
<span className="kw">mov</span>   x29, sp                 <span className="cmt">{"// set up frame pointer"}</span>{"\n"}
<span className="cmt">{"// ... function body ..."}</span>{"\n"}
<span className="kw">ldp</span>   x29, x30, [sp], <span className="num">#16</span>    <span className="cmt">{"// restore + SP += 16 (post-index)"}</span>{"\n"}
<span className="kw">ret</span>                           <span className="cmt">{"// branch to LR (x30)"}</span>
      </code></pre>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>Tip.</b> <code>stp / ldp</code>는 두 레지스터를 한 번에 push/pop. Pre-index (<code>[sp, #-16]!</code>)는 접근 전 SP 조정, post-index (<code>[sp], #16</code>)는 접근 후 조정.</div>
      </div>
    </>
  )
}
