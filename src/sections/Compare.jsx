export default function Compare() {
  return (
    <>
      <h2>ARM vs RISC-V — 한눈에 보기 <span className="en">/ Side-by-Side</span></h2>
      <p>이 사이트 전체 내용을 한 표에 요약. x86-64 는 참고용 3번째 축으로 함께 배치.</p>

      <h3>ISA 기초 <span className="en">/ ISA Basics</span></h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>축</th><th>ARM AArch64</th><th>RISC-V RV64</th><th>x86-64</th></tr></thead>
          <tbody>
            <tr><td>명령 길이</td><td>32-bit 고정</td><td>32-bit (+ C 확장으로 16-bit 혼합)</td><td>가변 1 ~ 15 byte</td></tr>
            <tr><td>GPR 수</td><td>31 + SP/PC/ZR</td><td>31 + <code>x0</code>(=0)</td><td>16</td></tr>
            <tr><td>FP Reg</td><td>32 (<code>V0-V31</code>)</td><td>32 (<code>f0-f31</code>, F/D/Q)</td><td>16 (XMM/YMM/ZMM)</td></tr>
            <tr><td>조건 플래그</td><td>PSTATE NZCV</td><td>없음 — <code>slt</code>·<code>beq</code> 등으로 비교+분기</td><td>EFLAGS</td></tr>
            <tr><td>라이선스</td><td>독점 (Arm Ltd)</td><td>오픈 표준 (RISC-V International)</td><td>독점 (Intel/AMD)</td></tr>
          </tbody>
        </table>
      </div>

      <h3>Privilege &amp; OS interface</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>축</th><th>ARM AArch64</th><th>RISC-V</th><th>x86-64</th></tr></thead>
          <tbody>
            <tr><td>Privilege 레벨</td><td>EL0 / EL1 / EL2 / EL3</td><td>U / S / (HS) / M</td><td>Ring 0 ~ 3 (주로 0·3)</td></tr>
            <tr><td>Firmware 인터페이스</td><td>PSCI (via SMC → EL3 ATF)</td><td>SBI (via ECALL → M mode OpenSBI)</td><td>UEFI / ACPI</td></tr>
            <tr><td>Syscall</td><td><code>SVC</code> → EL1</td><td><code>ECALL</code> → S</td><td><code>syscall</code> → Ring 0</td></tr>
            <tr><td>Hypercall</td><td><code>HVC</code> → EL2</td><td><code>ECALL</code> from VS → HS</td><td><code>vmcall</code> / <code>vmmcall</code></td></tr>
            <tr><td>보안 월드</td><td>TrustZone (Secure EL3/1/0)</td><td>PMP + optional AP-TEE / Keystone</td><td>SGX / TDX (Intel), SEV (AMD)</td></tr>
          </tbody>
        </table>
      </div>

      <h3>Memory Model</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>축</th><th>ARM AArch64</th><th>RISC-V</th><th>x86-64</th></tr></thead>
          <tbody>
            <tr><td>기본 모델</td><td>Weak</td><td>RVWMO (weak)</td><td>TSO (strong)</td></tr>
            <tr><td>Full fence</td><td><code>DMB SY / DSB SY</code></td><td><code>fence rw,rw</code></td><td><code>mfence</code></td></tr>
            <tr><td>Acquire / Release</td><td><code>LDAR / STLR</code></td><td><code>lr.w.aq / sc.w.rl / amo*.aq/rl</code></td><td>암묵적 (TSO)</td></tr>
            <tr><td>I-cache sync</td><td><code>IC IVAU + DSB + ISB</code></td><td><code>fence.i</code> (Zifencei)</td><td>자동 (I/D coherent)</td></tr>
            <tr><td>Atomic</td><td>LL/SC + LSE</td><td>LR/SC (Zalrsc) + AMO (Zaamo)</td><td><code>LOCK</code> prefix</td></tr>
          </tbody>
        </table>
      </div>

      <h3>Virtual Memory</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>축</th><th>ARM AArch64</th><th>RISC-V RV64</th><th>x86-64</th></tr></thead>
          <tbody>
            <tr><td>Page scheme</td><td>4K / 16K / 64K granule × 48~52 bit VA</td><td>Sv39 / Sv48 / Sv57 (4K page)</td><td>4K / 2M / 1G, 48/57-bit VA (LA57)</td></tr>
            <tr><td>Root reg</td><td>TTBR0_EL1 + TTBR1_EL1 + TCR</td><td>satp (단일)</td><td>CR3</td></tr>
            <tr><td>2-stage (VM)</td><td>Stage 1 (EL1) + Stage 2 (EL2)</td><td>satp + hgatp (H 확장)</td><td>EPT (Intel) / NPT (AMD)</td></tr>
            <tr><td>TLB invalidate</td><td><code>TLBI</code> + DSB + ISB</td><td><code>sfence.vma</code></td><td><code>invlpg</code> / write CR3</td></tr>
          </tbody>
        </table>
      </div>

      <h3>Vector / SIMD</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>축</th><th>ARM</th><th>RISC-V</th><th>x86-64</th></tr></thead>
          <tbody>
            <tr><td>고정폭 SIMD</td><td>NEON (128-bit)</td><td>— (P 확장 draft)</td><td>SSE / AVX / AVX-512 (128/256/512)</td></tr>
            <tr><td>VL-agnostic</td><td>SVE / SVE2 (128~2048-bit)</td><td>RVV 1.0 (128~65536-bit)</td><td>— (AVX-10이 유사 지향)</td></tr>
            <tr><td>Predicate</td><td>16 dedicated P-reg</td><td><code>v0</code> mask 관례</td><td>AVX-512 opmask (<code>k0-k7</code>)</td></tr>
          </tbody>
        </table>
      </div>

      <h3>Interrupt Controller</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>축</th><th>ARM</th><th>RISC-V</th><th>x86-64</th></tr></thead>
          <tbody>
            <tr><td>표준</td><td>GIC (v2/v3/v4)</td><td>PLIC / CLIC / AIA</td><td>LAPIC + IOAPIC</td></tr>
            <tr><td>MSI</td><td>ITS (GICv3)</td><td>IMSIC (AIA)</td><td>LAPIC MSI</td></tr>
            <tr><td>Nested preempt</td><td>priority 기반 (GIC)</td><td>CLIC 전용</td><td>priority 기반 (LAPIC)</td></tr>
          </tbody>
        </table>
      </div>

      <h2>두 ISA 를 함께 배우는 이유 <span className="en">/ Why Both</span></h2>
      <ul>
        <li><b>공통 원리가 많다</b>. 둘 다 load-store RISC, OoO μarch, weak memory, 모듈형 확장 경향. 한 쪽을 알면 다른 쪽은 90% 전이됨.</li>
        <li><b>차이점이 설계 의도를 드러낸다</b>. ARM 의 <code>PSTATE</code> 대 RISC-V 의 flag-less 는 μarch rename 전략에 영향. ARM <code>TTBR0/1</code> 두 개 대 RISC-V 단일 <code>satp</code> 는 user/kernel 분리 설계 철학.</li>
        <li><b>산업적 현실</b>. 서버는 ARM Neoverse 가, embedded/accelerator/IP는 RISC-V 가 급속히 확산. 두 축을 모두 읽을 수 있어야 지금 현장의 설계 결정을 이해 가능.</li>
      </ul>

      <div className="callout warn">
        <span className="icon">⚠️</span>
        <div>비교표는 스펙 "있음/없음" 수준에서 주요 차이만 뽑은 것. 같은 기능이라도 <b>세부 의미론·타이밍·비트 인코딩</b> 은 ISA 별로 달라, 실제 구현 시에는 반드시 <b>원전 스펙</b>(ARM ARM / RISC-V Priv &amp; Unpriv Manual) 을 확인해야 합니다.</div>
      </div>
    </>
  )
}
