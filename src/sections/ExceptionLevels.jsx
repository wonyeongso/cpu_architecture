export default function ExceptionLevels() {
  return (
    <>
      <h2>4단계 특권 모델 <span className="en">/ Four Privilege Levels</span></h2>
      <p>AArch64는 4개의 Exception Level을 가짐. 숫자가 높을수록 더 높은 특권.</p>

      <div className="el-stack">
        <div className="el-row el3">
          <span className="lvl">EL3</span>
          <span className="desc">Secure Monitor
            <span className="sub">TrustZone · ATF (TF-A) · PSCI 처리</span>
          </span>
          <span className="note">최고 특권</span>
        </div>
        <div className="el-row el2">
          <span className="lvl">EL2</span>
          <span className="desc">Hypervisor
            <span className="sub">KVM · Xen · VM 관리 (stage-2 translation)</span>
          </span>
          <span className="note">가상화</span>
        </div>
        <div className="el-row el1">
          <span className="lvl">EL1</span>
          <span className="desc">OS Kernel
            <span className="sub">Linux · RTOS · 디바이스 드라이버</span>
          </span>
          <span className="note">커널</span>
        </div>
        <div className="el-row el0">
          <span className="lvl">EL0</span>
          <span className="desc">Application / User Mode
            <span className="sub">유저 프로세스 · 권한 없음</span>
          </span>
          <span className="note">유저</span>
        </div>
      </div>

      <h2>EL 전환 명령 <span className="en">/ Transition Instructions</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Instruction</th><th>Target</th><th>용도</th></tr></thead>
          <tbody>
            <tr><td><code>SVC #imm</code></td><td>EL0 → EL1</td><td>Syscall (Linux syscall entry)</td></tr>
            <tr><td><code>HVC #imm</code></td><td>EL1 → EL2</td><td>Hypervisor call</td></tr>
            <tr><td><code>SMC #imm</code></td><td>Any → EL3</td><td>Secure Monitor call (PSCI 등)</td></tr>
            <tr><td><code>ERET</code></td><td>ELx → ELy</td><td>SPSR/ELR 복원하며 하위 EL로 복귀</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Secure / Non-secure 월드 <span className="en">/ Two Worlds</span></h2>
      <div className="diagram">{`   ┌─────────────────────────────────────────┐
   │             EL3  (Monitor)              │
   ├──────────────────┬──────────────────────┤
   │  Non-secure EL2  │    Secure EL2        │  (optional)
   │   (Hypervisor)   │                      │
   ├──────────────────┼──────────────────────┤
   │  Non-secure EL1  │    Secure EL1 (TEE)  │
   │  (Linux kernel)  │    (OP-TEE · TrustY) │
   ├──────────────────┼──────────────────────┤
   │  Non-secure EL0  │    Secure EL0        │
   │  (User apps)     │    (TA — Trusted App)│
   └──────────────────┴──────────────────────┘
                  NS bit로 구분`}</div>

      <h2>예외 벡터 테이블 <span className="en">/ Vector Table</span></h2>
      <p><code>VBAR_ELx</code>가 가리키는 0x800 바이트 테이블. 16개 엔트리 × 0x80 바이트.</p>
      <pre><code>
<span className="cmt">{"// VBAR_EL1 + offset"}</span>{"\n"}
<span className="num">0x000</span>  Current EL, SP0, Sync{"\n"}
<span className="num">0x080</span>  Current EL, SP0, IRQ{"\n"}
<span className="num">0x100</span>  Current EL, SP0, FIQ{"\n"}
<span className="num">0x180</span>  Current EL, SP0, SError{"\n"}
<span className="num">0x200</span>  Current EL, SPx, Sync{"\n"}
<span className="num">0x280</span>  Current EL, SPx, IRQ{"\n"}
<span className="cmt">{"// ... 그리고 Lower EL (AArch64 / AArch32) 각 4개씩"}</span>
      </code></pre>
    </>
  )
}
