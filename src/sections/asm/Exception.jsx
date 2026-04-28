export default function AsmException() {
  return (
    <>
      <h2>이 페이지의 범위 <span className="en">/ Scope</span></h2>
      <p>예외·인터럽트 처리에 관여하는 명령들 — <b>vector table 구조, SVC/HVC/SMC 핸들러, ESR/ELR/SPSR/FAR 디코드, ERET, GIC ISR</b>. <code>arm/ExceptionLevels</code>가 EL 권한 모델을 다룬다면 여기는 <b>SW가 trap을 어떻게 받고 보내나</b>의 실제 코드.</p>

      <h2>① Vector table 구조 <span className="en">/ 16 Entries × 0x80</span></h2>
      <p><code>VBAR_ELx</code>가 가리키는 0x800 byte 테이블. 16개 엔트리 × 0x80 byte. 엔트리는 <b>(소스 EL, 스택 선택, 예외 타입)</b> 조합으로 인덱싱.</p>
      <pre><code>
<span className="cmt">{"// VBAR_EL1 + offset"}</span>{"\n"}
<span className="num">0x000</span>  Current EL, SP0, Sync          <span className="cmt">{"// EL1 stays, uses SP_EL0 (rare)"}</span>{"\n"}
<span className="num">0x080</span>  Current EL, SP0, IRQ{"\n"}
<span className="num">0x100</span>  Current EL, SP0, FIQ{"\n"}
<span className="num">0x180</span>  Current EL, SP0, SError{"\n"}
{"\n"}
<span className="num">0x200</span>  Current EL, SPx, Sync          <span className="cmt">{"// EL1→EL1 (data abort, etc.)"}</span>{"\n"}
<span className="num">0x280</span>  Current EL, SPx, IRQ{"\n"}
<span className="num">0x300</span>  Current EL, SPx, FIQ{"\n"}
<span className="num">0x380</span>  Current EL, SPx, SError{"\n"}
{"\n"}
<span className="num">0x400</span>  Lower EL (AArch64), Sync       <span className="cmt">{"// ← SVC from EL0 lands here"}</span>{"\n"}
<span className="num">0x480</span>  Lower EL (AArch64), IRQ{"\n"}
<span className="num">0x500</span>  Lower EL (AArch64), FIQ{"\n"}
<span className="num">0x580</span>  Lower EL (AArch64), SError{"\n"}
{"\n"}
<span className="num">0x600</span>  Lower EL (AArch32), Sync       <span className="cmt">{"// 32-bit guests"}</span>{"\n"}
<span className="cmt">{"// ... 16 entries total, 0x80 bytes each (up to 32 instructions)"}</span>
      </code></pre>
      <div className="callout warn">
        <span className="icon">⚠</span>
        <div><b>제약.</b> 한 엔트리는 <b>0x80 byte (32 instructions)</b> 제한. 긴 핸들러는 여기서 레지스터 저장만 하고 <code>b c_handler</code>로 점프하는 게 관례.</div>
      </div>

      <h2>② 예외 진입 — HW가 자동으로 하는 일 <span className="en">/ Implicit Save</span></h2>
      <pre><code>
<span className="cmt">{"// EL0에서 SVC 발생 시 (EL1 진입 가정)"}</span>{"\n"}
<span className="num">1.</span> ELR_EL1  ← next PC           <span className="cmt">{"// instruction after SVC"}</span>{"\n"}
<span className="num">2.</span> SPSR_EL1 ← current PSTATE    <span className="cmt">{"// NZCV, DAIF, CurrentEL, SPSel ..."}</span>{"\n"}
<span className="num">3.</span> ESR_EL1  ← {"{EC=0x15, ISS=imm16}"}  <span className="cmt">{"// EC=0x15 = SVC from AArch64"}</span>{"\n"}
<span className="num">4.</span> PSTATE.DAIF ← 1111          <span className="cmt">{"// mask all interrupts"}</span>{"\n"}
<span className="num">5.</span> PSTATE.SPSel ← 1            <span className="cmt">{"// use SP_EL1"}</span>{"\n"}
<span className="num">6.</span> PSTATE.CurrentEL ← 01       <span className="cmt">{"// EL1"}</span>{"\n"}
<span className="num">7.</span> PC ← VBAR_EL1 + 0x400        <span className="cmt">{"// jump to vector entry"}</span>
      </code></pre>
      <p><b>핵심 통찰.</b> HW는 <b>4개 레지스터</b>(ELR, SPSR, ESR, FAR-if-applicable)만 자동 저장 + 인터럽트 마스킹. <b>X0~X30 / V0~V31은 SW가 직접 저장</b> 해야 함 — 그래서 vector entry의 첫 일이 GP register dump.</p>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>예외 처리 4 레지스터 — 한 줄씩.</b><br/>
        <b>ELR_ELx (Exception Link Register)</b> — 예외 발생 시점의 PC. ERET 시 이 값으로 복귀.<br/>
        <b>SPSR_ELx (Saved Program Status Register)</b> — 예외 발생 시점의 PSTATE 전체(NZCV/DAIF/CurrentEL/SPSel). ERET 시 이 값으로 PSTATE 복원.<br/>
        <b>ESR_ELx (Exception Syndrome Register)</b> — 예외 원인 분류. EC + ISS 비트로 syscall #, fault 종류 등이 인코딩.<br/>
        <b>FAR_ELx (Fault Address Register)</b> — data abort / instruction abort 시 faulting VA. abort 종류가 아니면 무의미.<br/>
        <b>전부 EL마다 banked</b> — EL1·EL2·EL3가 각자 자기 사본. nested trap에 오염되지 않음.</div>
      </div>

      <h2>③ 일반적 핸들러 entry 패턴 <span className="en">/ Save Then Branch</span></h2>
      <pre><code>
<span className="kw">.macro</span> kernel_entry{"\n"}
{"  "}<span className="kw">sub</span>   sp, sp, <span className="num">#272</span>          <span className="cmt">{"// frame for X0~X30 + extras"}</span>{"\n"}
{"  "}<span className="kw">stp</span>   x0, x1, [sp, <span className="num">#0</span>]{"\n"}
{"  "}<span className="kw">stp</span>   x2, x3, [sp, <span className="num">#16</span>]{"\n"}
{"  "}<span className="cmt">{"// ... save x4 ~ x29 ..."}</span>{"\n"}
{"  "}<span className="kw">stp</span>   x29, x30, [sp, <span className="num">#240</span>]{"\n"}
{"  "}<span className="kw">mrs</span>   x21, <span className="reg">elr_el1</span>{"\n"}
{"  "}<span className="kw">mrs</span>   x22, <span className="reg">spsr_el1</span>{"\n"}
{"  "}<span className="kw">stp</span>   x21, x22, [sp, <span className="num">#256</span>]   <span className="cmt">{"// save ELR/SPSR for nested traps"}</span>{"\n"}
<span className="kw">.endm</span>{"\n\n"}
<span className="kw">vector_sync_lower_el64:</span>{"\n"}
{"  "}<span className="kw">kernel_entry</span>{"\n"}
{"  "}<span className="kw">mov</span>   x0, sp                   <span className="cmt">{"// pass register frame to C"}</span>{"\n"}
{"  "}<span className="kw">bl</span>    do_sync_handler{"\n"}
{"  "}<span className="kw">b</span>     ret_to_user
      </code></pre>
      <p>이 패턴이 Linux 커널 <code>arch/arm64/kernel/entry.S</code>의 본질. <code>kernel_entry</code> 매크로 → C 핸들러 호출 → <code>kernel_exit</code> 복원 → ERET.</p>

      <h2>④ ESR_EL1 디코드 <span className="en">/ Exception Syndrome</span></h2>
      <p>ESR_EL1은 <b>EC (Exception Class, 6-bit) + IL (Instruction Length) + ISS (Instruction-Specific Syndrome, 25-bit)</b>로 구성. EC가 분기의 핵심.</p>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>EC / ISS / DFSC — 무슨 차이.</b><br/>
        <b>EC (Exception Class, 6-bit)</b> — 예외의 <b>큰 분류</b>. SVC인지, data abort인지, sysreg trap인지 등. handler가 가장 먼저 분기하는 키.<br/>
        <b>ISS (Instruction Specific Syndrome, 25-bit)</b> — 그 EC 안의 <b>세부 정보</b>. EC=SVC면 ISS는 imm16(syscall #), EC=data abort면 ISS 안에 다시 DFSC + 다른 비트들.<br/>
        <b>DFSC (Data Fault Status Code, 6-bit)</b> — data abort EC 안에 들어 있는 <b>fault 종류</b>: translation fault / access flag fault / permission fault / alignment fault / external abort 등.<br/>
        <b>읽는 순서:</b> ESR &gt;&gt; 26 = EC → 분기. 그 안에서 ISS &amp; 0x3F = DFSC → 페이지 폴트 종류 식별.</div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>EC</th><th>의미</th><th>ISS 활용</th></tr></thead>
          <tbody>
            <tr><td><code>0x15</code></td><td>SVC from AArch64 (syscall)</td><td>imm16 = syscall #</td></tr>
            <tr><td><code>0x16</code></td><td>HVC from AArch64</td><td>hypercall #</td></tr>
            <tr><td><code>0x17</code></td><td>SMC from AArch64</td><td>secure-call #</td></tr>
            <tr><td><code>0x20 / 0x21</code></td><td>Instruction abort (lower EL / same EL)</td><td>FAR_EL1 = faulting address</td></tr>
            <tr><td><code>0x24 / 0x25</code></td><td>Data abort (lower / same EL)</td><td>FAR_EL1, DFSC = fault code</td></tr>
            <tr><td><code>0x0E</code></td><td>Illegal execution state</td><td>—</td></tr>
            <tr><td><code>0x18</code></td><td>MSR/MRS/system register access trap</td><td>which register</td></tr>
            <tr><td><code>0x2F</code></td><td>SError</td><td>impl-defined</td></tr>
          </tbody>
        </table>
      </div>
      <pre><code>
<span className="cmt">{"// 디코드 패턴"}</span>{"\n"}
do_sync_handler:{"\n"}
{"  "}<span className="kw">mrs</span>   x0, <span className="reg">esr_el1</span>{"\n"}
{"  "}<span className="kw">lsr</span>   x1, x0, <span className="num">#26</span>             <span className="cmt">{"// EC = ESR[31:26]"}</span>{"\n"}
{"  "}<span className="kw">cmp</span>   x1, <span className="num">#0x15</span>{"\n"}
{"  "}<span className="kw">b.eq</span>  do_svc{"\n"}
{"  "}<span className="kw">cmp</span>   x1, <span className="num">#0x24</span>{"\n"}
{"  "}<span className="kw">b.eq</span>  do_data_abort{"\n"}
{"  "}<span className="cmt">{"// ... cascade or jump table dispatch ..."}</span>
      </code></pre>

      <h2>⑤ SVC — Syscall 시퀀스 <span className="en">/ Linux Style</span></h2>
      <pre><code>
<span className="cmt">{"// EL0 (user)"}</span>{"\n"}
  <span className="kw">mov</span>   x8, <span className="num">#64</span>             <span className="cmt">{"// syscall # (Linux: 64 = write)"}</span>{"\n"}
  <span className="kw">mov</span>   x0, <span className="num">#1</span>              <span className="cmt">{"// fd = stdout"}</span>{"\n"}
  <span className="kw">adr</span>   x1, msg               <span className="cmt">{"// buf"}</span>{"\n"}
  <span className="kw">mov</span>   x2, <span className="num">#13</span>             <span className="cmt">{"// count"}</span>{"\n"}
  <span className="kw">svc</span>   <span className="num">#0</span>                <span className="cmt">{"// → EL1 vector @ VBAR_EL1+0x400"}</span>{"\n"}
  <span className="cmt">{"// returns: x0 = bytes written or -errno"}</span>{"\n\n"}
<span className="cmt">{"// EL1 (kernel) — short hand"}</span>{"\n"}
do_svc:{"\n"}
{"  "}<span className="kw">mov</span>   x21, x8                 <span className="cmt">{"// syscall #"}</span>{"\n"}
{"  "}<span className="kw">cmp</span>   x21, <span className="num">#__NR_syscalls</span>{"\n"}
{"  "}<span className="kw">b.hs</span>  invalid_syscall{"\n"}
{"  "}<span className="kw">adrp</span>  x22, sys_call_table{"\n"}
{"  "}<span className="kw">add</span>   x22, x22, :lo12:sys_call_table{"\n"}
{"  "}<span className="kw">ldr</span>   x22, [x22, x21, <span className="kw">lsl</span> <span className="num">#3</span>]{"\n"}
{"  "}<span className="kw">blr</span>   x22                     <span className="cmt">{"// indirect call to sys_*"}</span>{"\n"}
{"  "}<span className="kw">b</span>     ret_to_user             <span className="cmt">{"// restores x0 (return), ERET"}</span>
      </code></pre>

      <h2>⑥ HVC / SMC — Hypervisor / Secure call <span className="en">/ EL2 / EL3</span></h2>
      <pre><code>
<span className="cmt">{"// HVC #imm — EL1 → EL2 (KVM hypercall)"}</span>{"\n"}
  <span className="kw">mov</span>   x0, <span className="num">#0xC4000003</span>          <span className="cmt">{"// ARM SMCCC function ID"}</span>{"\n"}
  <span className="kw">mov</span>   x1, x_hartid{"\n"}
  <span className="kw">hvc</span>   <span className="num">#0</span>                       <span className="cmt">{"// trap to EL2"}</span>{"\n\n"}
<span className="cmt">{"// SMC #imm — Any → EL3 (PSCI, secure services)"}</span>{"\n"}
  <span className="kw">mov</span>   x0, <span className="num">#0xC4000003</span>          <span className="cmt">{"// CPU_ON function ID (PSCI)"}</span>{"\n"}
  <span className="kw">mov</span>   x1, x_target_mpidr{"\n"}
  <span className="kw">mov</span>   x2, x_entry_point{"\n"}
  <span className="kw">mov</span>   x3, x_context_id{"\n"}
  <span className="kw">smc</span>   <span className="num">#0</span>                       <span className="cmt">{"// → EL3 → ATF → power domain ctrl"}</span>
      </code></pre>
      <p><b>면접 함정.</b> SMC/HVC 모두 <b>SMCCC 호출 규약</b>(ARM Secure Monitor Call Calling Convention) 따름 — function ID 인코딩, fast/yielding 구분, hint bit 등. 단순한 레지스터 전달이 아니라 <b>표준화된 ABI</b>가 있다는 점이 자주 묻는 포인트.</p>

      <h2>⑦ ERET — 복귀 시퀀스 <span className="en">/ One Instruction</span></h2>
      <pre><code>
ret_to_user:{"\n"}
{"  "}<span className="cmt">{"// restore X0~X30 from stack (kernel_exit equivalent)"}</span>{"\n"}
{"  "}<span className="kw">ldp</span>   x21, x22, [sp, <span className="num">#256</span>]{"\n"}
{"  "}<span className="kw">msr</span>   <span className="reg">elr_el1</span>, x21        <span className="cmt">{"// PC to return to"}</span>{"\n"}
{"  "}<span className="kw">msr</span>   <span className="reg">spsr_el1</span>, x22       <span className="cmt">{"// PSTATE to restore"}</span>{"\n"}
{"  "}<span className="cmt">{"// ... restore X0~X30 ..."}</span>{"\n"}
{"  "}<span className="kw">add</span>   sp, sp, <span className="num">#272</span>{"\n"}
{"  "}<span className="kw">eret</span>                          <span className="cmt">{"// PC ← ELR_EL1, PSTATE ← SPSR_EL1, EL drops"}</span>
      </code></pre>
      <p><b>ERET의 우아함.</b> <b>한 명령으로</b> PC + PSTATE 복원 + EL 변경 + 인터럽트 마스크 자동 복구. <b>context sync 포함</b>(ISB 불필요). 잘못 만든 SPSR로 ERET하면 <b>illegal exception return</b> → 또 trap.</p>

      <h2>⑧ Page fault 핸들러 — Data Abort <span className="en">/ EC=0x24/0x25</span></h2>
      <pre><code>
do_data_abort:{"\n"}
{"  "}<span className="kw">mrs</span>   x0, <span className="reg">esr_el1</span>{"\n"}
{"  "}<span className="kw">mrs</span>   x1, <span className="reg">far_el1</span>           <span className="cmt">{"// faulting VA"}</span>{"\n"}
{"  "}<span className="kw">and</span>   x2, x0, <span className="num">#0x3F</span>          <span className="cmt">{"// ISS.DFSC — fault status code"}</span>{"\n"}
{"  "}<span className="cmt">{"// DFSC values:"}</span>{"\n"}
{"  "}<span className="cmt">{"//   0x04~0x07  Translation fault (level 0~3)"}</span>{"\n"}
{"  "}<span className="cmt">{"//   0x08~0x0B  Access flag fault"}</span>{"\n"}
{"  "}<span className="cmt">{"//   0x0C~0x0F  Permission fault"}</span>{"\n"}
{"  "}<span className="cmt">{"//   0x21       Alignment fault"}</span>{"\n"}
{"  "}<span className="kw">bl</span>    handle_mm_fault          <span className="cmt">{"// VMA lookup, on-demand alloc, etc."}</span>
      </code></pre>

      <h2>⑨ GIC ISR 시퀀스 <span className="en">/ Interrupt Path</span></h2>
      <pre><code>
<span className="cmt">{"// IRQ vector lands here (offset 0x480 if from EL0)"}</span>{"\n"}
vector_irq_lower_el64:{"\n"}
{"  "}<span className="kw">kernel_entry</span>{"\n"}
{"  "}<span className="kw">mrs</span>   x0, <span className="reg">ICC_IAR1_EL1</span>      <span className="cmt">{"// acquire INTID (also EOI inhibit)"}</span>{"\n"}
{"  "}<span className="kw">cmp</span>   w0, <span className="num">#1023</span>{"\n"}
{"  "}<span className="kw">b.eq</span>  spurious                 <span className="cmt">{"// 1023 = no pending"}</span>{"\n"}
{"  "}<span className="cmt">{"// dispatch on INTID (e.g. timer, scheduler)"}</span>{"\n"}
{"  "}<span className="kw">bl</span>    handle_irq{"\n"}
{"  "}<span className="kw">msr</span>   <span className="reg">ICC_EOIR1_EL1</span>, x0     <span className="cmt">{"// EOI: drop priority"}</span>{"\n"}
{"  "}<span className="kw">b</span>     ret_to_user
      </code></pre>
      <p><b>EOI의 의미.</b> ICC_EOIR1로 처리 완료 신호 → GIC가 priority를 drop하고 다음 우선순위 IRQ를 보낼 수 있게 됨. <b>EOI 누락은 dead-lock</b> — 같은 IRQ가 다시 안 옴.</p>

      <h2>⑩ RISC-V 비교 — trap handler <span className="en">/ Same Idea</span></h2>
      <pre><code>
<span className="cmt">{"// On trap (exception or interrupt) — HW automatically:"}</span>{"\n"}
<span className="cmt">{"//   1) mepc   ← PC of faulting instruction"}</span>{"\n"}
<span className="cmt">{"//   2) mcause ← cause code (async bit + cause#)"}</span>{"\n"}
<span className="cmt">{"//   3) mtval  ← fault address / inst bits"}</span>{"\n"}
<span className="cmt">{"//   4) mstatus.MPP  ← previous privilege"}</span>{"\n"}
<span className="cmt">{"//   5) mstatus.MPIE ← MIE; MIE ← 0  (interrupts disabled)"}</span>{"\n"}
<span className="cmt">{"//   6) PC ← mtvec"}</span>{"\n\n"}
handler:{"\n"}
{"  "}<span className="kw">csrr</span>  t0, <span className="reg">mcause</span>{"\n"}
{"  "}<span className="kw">csrr</span>  t1, <span className="reg">mtval</span>{"\n"}
{"  "}<span className="cmt">{"// dispatch ..."}</span>{"\n"}
{"  "}<span className="kw">mret</span>                            <span className="cmt">{"// PC←mepc, MIE←MPIE, priv←MPP"}</span>
      </code></pre>
      <p>구조는 ARM과 거의 동일 — 이름만 다름. (ELR↔mepc, ESR↔mcause, FAR↔mtval, ERET↔mret). <b>vectored mode</b>면 mcause로 분기 테이블 활용.</p>

      <h2>한 줄 요약 <span className="en">/ Cheat Sheet</span></h2>
      <div className="callout">
        <span className="icon">📌</span>
        <div>
          <ul style={{margin: 0, paddingLeft: 18}}>
            <li>Vector table: 16 entries × 0x80 byte. <b>EL0 → EL1 SVC는 +0x400</b>.</li>
            <li>HW가 자동 저장: ELR, SPSR, ESR (+ FAR if applicable). <b>X0~X30은 SW가 직접</b>.</li>
            <li>ESR.EC가 분기의 핵심: 0x15(SVC), 0x24/25(data abort), 0x20/21(inst abort), 0x18(sysreg trap).</li>
            <li>SVC/HVC/SMC 모두 <b>SMCCC 호출 규약</b>(function ID 인코딩) 따름.</li>
            <li>ERET 한 명령으로 PC + PSTATE 복원 + EL 변경 + 인터럽트 마스크 복구. context sync 포함.</li>
            <li>GIC: <code>IAR1</code>로 INTID 획득, 처리 후 <code>EOIR1</code>로 완료. EOI 누락은 dead-lock.</li>
            <li>RISC-V trap: ELR↔mepc, ESR↔mcause, FAR↔mtval, ERET↔mret. 구조 동일.</li>
          </ul>
        </div>
      </div>
    </>
  )
}
