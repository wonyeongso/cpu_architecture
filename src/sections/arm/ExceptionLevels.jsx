export default function ExceptionLevels() {
  return (
    <>
      <h2>4단계 특권 모델 <span className="en">/ Four Privilege Levels</span></h2>
      <p>AArch64는 4개의 Exception Level을 가짐. 숫자가 높을수록 더 높은 특권.
      하위 EL은 상위 EL의 리소스(레지스터, 메모리, 인터럽트 설정)를 직접 건드릴 수 없고,
      동기 예외(SVC/HVC/SMC) 또는 비동기 이벤트(IRQ/FIQ/SError)로만 진입 가능.</p>

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

      <h2>EL0 — User / Application <span className="en">/ Unprivileged</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>뭐가 여기서 돌아가나</h4>
          <p>모든 <b>유저 프로세스</b> — 셸, 브라우저, DB 서버, 심지어 컨테이너 안의 <code>init</code>까지.
          실제로는 커널이 <code>execve()</code>로 로드한 ELF 바이너리의 <code>_start</code>.</p>
        </div>
        <div className="card">
          <h4>할 수 없는 것</h4>
          <p>시스템 레지스터 접근 불가(<code>MSR/MRS</code> 대부분 차단), 인터럽트 마스킹 불가,
          MMU 설정 불가, 물리 주소 직접 접근 불가. 모든 HW 요청은 <code>SVC</code>(syscall)를 경유.</p>
        </div>
        <div className="card">
          <h4>주소 공간</h4>
          <p>EL1이 설정한 <b>TTBR0_EL1</b>(유저 공간, 보통 하위 48-bit VA)만 접근.
          커널 공간(<code>TTBR1_EL1</code>, 상위 VA)은 하드웨어적으로 차단됨 — PAN/EPAN 비트로 강화.</p>
        </div>
        <div className="card">
          <h4>스택</h4>
          <p><code>SP_EL0</code>만 사용. EL1로 진입해도 <code>SPSel=0</code>이면 계속 <code>SP_EL0</code>을 쓰고,
          <code>SPSel=1</code>이면 <code>SP_EL1</code>로 전환 (Linux는 후자).</p>
        </div>
      </div>

      <h2>EL1 — OS Kernel <span className="en">/ Privileged Supervisor</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>책임</h4>
          <p>프로세스 스케줄링, 가상 메모리(Stage-1 translation), 디바이스 드라이버,
          파일시스템, 네트워크 스택, IPC, 시그널, 그리고 <b>syscall 디스패치</b>.</p>
        </div>
        <div className="card">
          <h4>핵심 레지스터</h4>
          <p><code>SCTLR_EL1</code>(MMU/캐시 on/off), <code>TTBR0/1_EL1</code>(페이지 테이블 기반 주소),
          <code>TCR_EL1</code>(VA 크기·granule), <code>MAIR_EL1</code>(메모리 속성), <code>VBAR_EL1</code>(벡터 테이블).</p>
        </div>
        <div className="card">
          <h4>TTBR 분리</h4>
          <p><b>TTBR0_EL1</b> = 유저 공간 (VA 상위 비트 0), <b>TTBR1_EL1</b> = 커널 공간 (VA 상위 비트 1).
          컨텍스트 스위치 시 TTBR0만 바꾸면 되므로 TLB invalidate가 경량화됨. ASID로 더 최적화.</p>
        </div>
        <div className="card">
          <h4>EL0에서 올라오는 경로</h4>
          <p>① <code>SVC</code> (syscall) ② 페이지 폴트/정렬 오류 ③ Undefined instruction ④ IRQ/FIQ ⑤ 디버그 예외.
          진입 시 <code>ELR_EL1</code>에 복귀 PC, <code>SPSR_EL1</code>에 PSTATE, <code>ESR_EL1</code>에 원인 저장.</p>
        </div>
      </div>

      <h2>EL2 — Hypervisor <span className="en">/ Virtualization</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>Stage-2 Translation</h4>
          <p>Guest OS가 EL1에서 본 "물리 주소"(IPA — Intermediate Physical Address)를
          Hypervisor가 <b>VTTBR_EL2</b>로 한 번 더 번역해 실제 PA로 변환. TLB는 두 단계를 합쳐 캐시.</p>
        </div>
        <div className="card">
          <h4>HCR_EL2 — 트랩 구성</h4>
          <p>Guest의 어떤 동작을 EL2로 끌어올릴지 결정. 예: <code>HCR_EL2.TGE</code>=1이면
          EL1 예외도 EL2로 라우팅, <code>HCR_EL2.IMO/FMO</code>는 IRQ/FIQ 가로채기,
          <code>VM</code>=1이면 Stage-2 활성화.</p>
        </div>
        <div className="card">
          <h4>VHE — Virtualization Host Extensions (v8.1)</h4>
          <p>Linux KVM Host가 <b>EL2에서 직접 커널을 실행</b>하게 해주는 확장.
          <code>HCR_EL2.E2H=1</code>이면 EL2가 EL1처럼 보이는 레지스터 뷰(<code>SCTLR_EL1</code>→EL2로 redirect)를 가짐.
          덕분에 host kernel은 재컴파일 없이 EL2에서 실행되며 VM 진입 오버헤드 감소.</p>
        </div>
        <div className="card">
          <h4>VMID</h4>
          <p>ASID가 프로세스를 구분하듯, VMID는 VM을 구분해 TLB 엔트리에 태깅.
          VM 스위치 시 TLB 전체 flush 없이도 격리 유지. <code>VTTBR_EL2</code>에 인코딩.</p>
        </div>
      </div>

      <h2>EL3 — Secure Monitor / Firmware <span className="en">/ Root of Trust</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>유일하게 Secure↔Non-secure 전환 가능</h4>
          <p><code>SCR_EL3.NS</code> 비트가 두 월드를 가르는 스위치.
          <code>SMC</code> 명령으로만 진입 가능하며, 여기서 NS 플립 후 <code>ERET</code>으로 반대편 월드의 EL1/EL2로 복귀.</p>
        </div>
        <div className="card">
          <h4>ATF / TF-A</h4>
          <p><b>Arm Trusted Firmware</b>. 부팅 초기 EL3에서 실행되어 DRAM 초기화, TrustZone 구성,
          <b>PSCI</b>(Power State Coordination Interface — CPU on/off, suspend)를 처리하고
          BL31 런타임으로 상주해 이후 <code>SMC</code>를 서비스.</p>
        </div>
        <div className="card">
          <h4>고유 리소스</h4>
          <p><code>SCR_EL3</code>(security/route 설정), <code>MDCR_EL3</code>(debug/trace),
          <code>SDER32_EL3</code>. TLB/캐시에는 <b>Secure vs Non-secure</b> 태그가 추가돼 월드 간 격리.</p>
        </div>
        <div className="card">
          <h4>왜 "Root of Trust"인가</h4>
          <p>Secure Boot 체인의 최상단. BootROM → BL1(EL3) → BL2 → BL31(EL3 런타임) → BL33(U-Boot/UEFI, EL2).
          EL3 코드는 OTP 키로 서명·검증되어 하위 모든 월드의 무결성 기준이 됨.</p>
        </div>
      </div>

      <h2>EL별 Banked 레지스터 <span className="en">/ Per-EL Banking</span></h2>
      <p>같은 이름의 시스템 레지스터가 EL마다 <b>하드웨어적으로 분리</b>되어 있어, 상위 EL 상태가 하위 EL 진입/복귀에 오염되지 않음.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Register</th><th>EL0</th><th>EL1</th><th>EL2</th><th>EL3</th><th>Purpose</th></tr></thead>
          <tbody>
            <tr><td><code>SP_ELx</code></td><td>✓</td><td>✓</td><td>✓</td><td>✓</td><td>stack pointer (banked per EL)</td></tr>
            <tr><td><code>ELR_ELx</code></td><td>—</td><td>✓</td><td>✓</td><td>✓</td><td>return PC</td></tr>
            <tr><td><code>SPSR_ELx</code></td><td>—</td><td>✓</td><td>✓</td><td>✓</td><td>saved PSTATE</td></tr>
            <tr><td><code>ESR_ELx</code></td><td>—</td><td>✓</td><td>✓</td><td>✓</td><td>exception cause (EC, ISS)</td></tr>
            <tr><td><code>FAR_ELx</code></td><td>—</td><td>✓</td><td>✓</td><td>✓</td><td>fault address</td></tr>
            <tr><td><code>VBAR_ELx</code></td><td>—</td><td>✓</td><td>✓</td><td>✓</td><td>vector-table base</td></tr>
            <tr><td><code>SCTLR_ELx</code></td><td>—</td><td>✓</td><td>✓</td><td>✓</td><td>MMU / cache / endian control</td></tr>
            <tr><td><code>TTBR0_ELx</code></td><td>—</td><td>✓</td><td>✓</td><td>✓</td><td>page-table base</td></tr>
            <tr><td><code>TCR_ELx</code></td><td>—</td><td>✓</td><td>✓</td><td>✓</td><td>translation control</td></tr>
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>EL0는 대부분 읽기조차 불가. <code>CurrentEL</code>, <code>DAIF</code>, <code>NZCV</code>는 PSTATE의 일부로 별도 banking 없이 실행 중 값.</p>

      <h2>EL 전환 명령 <span className="en">/ Transition Instructions</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Instruction</th><th>Target</th><th>Purpose</th></tr></thead>
          <tbody>
            <tr><td><code>SVC #imm</code></td><td>EL0 → EL1</td><td>Syscall (Linux syscall entry)</td></tr>
            <tr><td><code>HVC #imm</code></td><td>EL1 → EL2</td><td>Hypervisor call (KVM guest→host)</td></tr>
            <tr><td><code>SMC #imm</code></td><td>Any → EL3</td><td>Secure Monitor call (e.g. PSCI)</td></tr>
            <tr><td><code>ERET</code></td><td>ELx → ELy</td><td>restore SPSR/ELR and return to a lower EL</td></tr>
          </tbody>
        </table>
      </div>

      <h2>예외 진입 메커니즘 <span className="en">/ Exception Entry Mechanics</span></h2>
      <p>EL_x에서 EL_y로 진입할 때(<code>y ≥ x</code>) 하드웨어가 자동으로 수행하는 일:</p>
      <pre><code>
<span className="cmt">{"// SVC from EL0 (assuming EL1 entry)"}</span>{"\n"}
<span className="num">1.</span> ELR_EL1  ← next PC           <span className="cmt">{"// address of the instruction after SVC"}</span>{"\n"}
<span className="num">2.</span> SPSR_EL1 ← current PSTATE    <span className="cmt">{"// NZCV, DAIF, CurrentEL, SPSel …"}</span>{"\n"}
<span className="num">3.</span> ESR_EL1  ← {"{EC=0x15, ISS=imm16}"}  <span className="cmt">{"// EC=0x15 = SVC from AArch64"}</span>{"\n"}
<span className="num">4.</span> PSTATE.DAIF ← 1111          <span className="cmt">{"// mask all interrupts"}</span>{"\n"}
<span className="num">5.</span> PSTATE.SPSel ← 1            <span className="cmt">{"// use SP_EL1"}</span>{"\n"}
<span className="num">6.</span> PSTATE.CurrentEL ← 01       <span className="cmt">{"// EL1"}</span>{"\n"}
<span className="num">7.</span> PC ← VBAR_EL1 + offset       <span className="cmt">{"// jump into the vector-table entry"}</span>{"\n"}
<span className="cmt">{"// — kernel handler then saves X0~X30 to the stack and branches into C code"}</span>
      </code></pre>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>Tip.</b> <code>ERET</code> 한 방으로 PC=ELR, PSTATE=SPSR 복원. 소프트웨어가 수동으로 플래그를 되돌릴 필요가 없는 이유.</div>
      </div>

      <h2>부팅 흐름 <span className="en">/ Boot Flow Across ELs</span></h2>
      <div className="diagram">{`   Reset
     │
     ▼
   EL3 / BL1 (BootROM → SRAM)
     │   · CPU / memory bring-up
     │   · load and verify BL2 signature
     ▼
   EL3 / BL2
     │   · initialize DRAM, load BL31 / BL33
     ▼
   EL3 / BL31 (resident runtime)    ◄── services SMC requests from here on
     │   · install PSCI and world-switch code
     │   · ERET → Non-secure EL2
     ▼
   EL2 / BL33 (U-Boot · UEFI)
     │   · bootloader → load kernel image
     │   · enter Linux kernel head
     ▼
   EL2 / Linux head (stays here under VHE)
     │   · KVM init path or drop to EL1
     ▼
   EL1 / Linux kernel (start_kernel)
     │   · execve the init process
     ▼
   EL0 / /sbin/init → systemd → userland`}</div>

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
                  separated by the NS bit`}</div>

      <h2>예외 벡터 테이블 <span className="en">/ Vector Table</span></h2>
      <p><code>VBAR_ELx</code>가 가리키는 0x800 바이트 테이블. 16개 엔트리 × 0x80 바이트.
      엔트리는 <b>(소스 EL, 스택 선택, 예외 타입)</b> 조합으로 인덱싱됨.</p>
      <pre><code>
<span className="cmt">{"// VBAR_EL1 + offset"}</span>{"\n"}
<span className="num">0x000</span>  Current EL, SP0, Sync{"\n"}
<span className="num">0x080</span>  Current EL, SP0, IRQ{"\n"}
<span className="num">0x100</span>  Current EL, SP0, FIQ{"\n"}
<span className="num">0x180</span>  Current EL, SP0, SError{"\n"}
<span className="num">0x200</span>  Current EL, SPx, Sync{"\n"}
<span className="num">0x280</span>  Current EL, SPx, IRQ{"\n"}
<span className="num">0x400</span>  Lower EL (AArch64), Sync   <span className="cmt">{"// ← lands here on SVC from EL0"}</span>{"\n"}
<span className="num">0x480</span>  Lower EL (AArch64), IRQ{"\n"}
<span className="num">0x500</span>  Lower EL (AArch64), FIQ{"\n"}
<span className="num">0x580</span>  Lower EL (AArch64), SError{"\n"}
<span className="num">0x600</span>  Lower EL (AArch32), Sync{"\n"}
<span className="cmt">{"// ... 16 entries total, 0x80 bytes each (up to 32 instructions)"}</span>
      </code></pre>

      <div className="callout warn">
        <span className="icon">⚠</span>
        <div><b>주의.</b> 벡터 엔트리는 0x80 바이트 제한. 긴 핸들러는 여기서 레지스터 저장만 하고 <code>b</code>로 C 핸들러로 점프하는 게 관례.</div>
      </div>
    </>
  )
}
