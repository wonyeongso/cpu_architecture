export default function RiscvPrivilege() {
  return (
    <>
      <h2>세 가지 기본 모드 <span className="en">/ M · S · U</span></h2>
      <p>RISC-V 는 ARM의 EL 4단계 대비 <b>3단계 기본</b>. 가상화는 <code>H</code> 확장으로 별도 추가.</p>

      <div className="el-stack">
        <div className="el-row el3">
          <span className="lvl">M</span>
          <span className="desc">Machine Mode
            <span className="sub">SBI / firmware / 최고 특권 — ARM EL3 대응</span>
          </span>
          <span className="note">최고 특권</span>
        </div>
        <div className="el-row el1">
          <span className="lvl">S</span>
          <span className="desc">Supervisor Mode
            <span className="sub">OS kernel (Linux) — ARM EL1 대응</span>
          </span>
          <span className="note">커널</span>
        </div>
        <div className="el-row el0">
          <span className="lvl">U</span>
          <span className="desc">User Mode
            <span className="sub">Application — ARM EL0 대응</span>
          </span>
          <span className="note">유저</span>
        </div>
      </div>

      <h2>가상화 <span className="en">/ H Extension</span></h2>
      <p><code>H</code> 확장을 붙이면 <b>HS (Hypervisor-extended Supervisor)</b> 모드가 추가되고, 게스트는 <b>VS / VU</b> 에서 실행. 2-stage 주소 변환(게스트 VA → GPA → HPA)은 ARM stage-1/2 와 개념 동일.</p>

      <div className="diagram">{`   Without H ext          With H ext
   ┌────────┐            ┌──────────────────────┐
   │   M    │            │         M            │
   ├────────┤            ├──────────────────────┤
   │   S    │            │         HS           │  ← hypervisor
   ├────────┤            ├──────────┬───────────┤
   │   U    │            │    VS    │   HU(U)   │
   └────────┘            ├──────────┤           │
                         │    VU    │           │
                         └──────────┴───────────┘
                              guest      host`}</div>

      <h2>모드 전환 명령 <span className="en">/ Transition Instructions</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>명령</th><th>동작</th><th>ARM 대응</th></tr></thead>
          <tbody>
            <tr><td><code>ecall</code></td><td>현재 모드에서 상위 모드로 trap (U→S, S→M, VS→HS, ...)</td><td><code>SVC / HVC / SMC</code></td></tr>
            <tr><td><code>ebreak</code></td><td>디버그 트랩 (breakpoint)</td><td><code>BRK</code></td></tr>
            <tr><td><code>mret</code></td><td>M → (mstatus.MPP가 가리키는 모드) 복귀</td><td><code>ERET</code></td></tr>
            <tr><td><code>sret</code></td><td>S → (sstatus.SPP) 복귀</td><td><code>ERET</code></td></tr>
            <tr><td><code>wfi</code></td><td>Wait-for-Interrupt (저전력 idle)</td><td><code>WFI</code></td></tr>
          </tbody>
        </table>
      </div>

      <h2>주요 CSR <span className="en">/ Control &amp; Status Registers</span></h2>
      <p>RISC-V 는 ARM의 "system register" 자리에 <b>CSR</b> 을 둠. 접근은 <code>csrrw / csrrs / csrrc</code> (Zicsr).</p>
      <div className="grid2">
        <div className="card">
          <h4>Trap Handling (M-mode)</h4>
          <pre style={{ margin: '8px 0 0' }}><code>
<span className="reg">mstatus</span>   <span className="cmt">{"// status (MIE, MPIE, MPP, etc.)"}</span>{"\n"}
<span className="reg">mtvec</span>     <span className="cmt">{"// trap vector base + mode (direct/vectored)"}</span>{"\n"}
<span className="reg">mepc</span>      <span className="cmt">{"// exception PC (= ARM ELR_ELx)"}</span>{"\n"}
<span className="reg">mcause</span>    <span className="cmt">{"// exception cause (= ARM ESR_ELx)"}</span>{"\n"}
<span className="reg">mtval</span>     <span className="cmt">{"// trap value (fault addr, instruction bits, etc.)"}</span>{"\n"}
<span className="reg">mie / mip</span> <span className="cmt">{"// interrupt enable / pending"}</span>
          </code></pre>
        </div>
        <div className="card">
          <h4>S-mode mirror</h4>
          <pre style={{ margin: '8px 0 0' }}><code>
<span className="reg">sstatus</span>   <span className="cmt">{"// S subset of mstatus"}</span>{"\n"}
<span className="reg">stvec</span>     <span className="cmt">{"// S trap vector"}</span>{"\n"}
<span className="reg">sepc</span>      <span className="cmt">{"// S exception PC"}</span>{"\n"}
<span className="reg">scause</span>    <span className="cmt">{"// S cause"}</span>{"\n"}
<span className="reg">stval</span>     <span className="cmt">{"// S trap value"}</span>{"\n"}
<span className="reg">sie / sip</span> <span className="cmt">{"// S interrupt enable / pending"}</span>
          </code></pre>
        </div>
      </div>

      <h2>트랩 진입 / 종료 시퀀스 <span className="en">/ Trap Flow</span></h2>
      <pre><code>
<span className="cmt">{"// On trap (exception or interrupt):"}</span>{"\n"}
<span className="cmt">{"// 1) mepc   ← PC of faulting instruction"}</span>{"\n"}
<span className="cmt">{"// 2) mcause ← cause code (async bit + cause#)"}</span>{"\n"}
<span className="cmt">{"// 3) mtval  ← fault address / inst bits"}</span>{"\n"}
<span className="cmt">{"// 4) mstatus.MPP ← previous privilege"}</span>{"\n"}
<span className="cmt">{"// 5) mstatus.MPIE ← mstatus.MIE; MIE ← 0  (interrupts disabled)"}</span>{"\n"}
<span className="cmt">{"// 6) PC ← mtvec"}</span>{"\n\n"}
<span className="kw">handler:</span>{"\n"}
  <span className="kw">csrr</span>  t0, <span className="reg">mcause</span>{"\n"}
  <span className="kw">csrr</span>  t1, <span className="reg">mtval</span>{"\n"}
  <span className="cmt">{"// ... dispatch ..."}</span>{"\n"}
  <span className="kw">mret</span>                  <span className="cmt">{"// restores PC=mepc, MIE=MPIE, privilege=MPP"}</span>
      </code></pre>

      <h2>SBI <span className="en">/ Supervisor Binary Interface</span></h2>
      <p>S 모드 OS 가 M 모드 firmware 에 요청하는 표준 호출 규약. ARM PSCI 와 유사한 역할. OpenSBI가 사실상 레퍼런스 구현.</p>
      <pre><code>
<span className="cmt">{"// a7 = EID, a6 = FID, a0-a5 = args"}</span>{"\n"}
<span className="kw">li</span>    a7, <span className="num">0x48534D</span>     <span className="cmt">{"// \"HSM\" extension"}</span>{"\n"}
<span className="kw">li</span>    a6, <span className="num">0</span>            <span className="cmt">{"// hart_start FID"}</span>{"\n"}
<span className="kw">mv</span>    a0, t0             <span className="cmt">{"// hartid"}</span>{"\n"}
<span className="kw">mv</span>    a1, t1             <span className="cmt">{"// start_addr"}</span>{"\n"}
<span className="kw">mv</span>    a2, t2             <span className="cmt">{"// opaque"}</span>{"\n"}
<span className="kw">ecall</span>                    <span className="cmt">{"// S → M, OpenSBI brings the core up"}</span>
      </code></pre>
    </>
  )
}
