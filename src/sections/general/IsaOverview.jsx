export default function IsaOverview() {
  return (
    <>
      <h2>ISA란 무엇인가 <span className="en">/ What is an ISA</span></h2>
      <p><b>Instruction Set Architecture</b>는 HW와 SW 사이의 계약. 어떤 명령이 존재하는가, 레지스터·메모리 모델이 어떤가, 예외·가상화·보안 경계가 어떻게 정의되는가를 규정합니다. 같은 ISA라도 구현(마이크로아키텍처)은 수십 가지로 갈릴 수 있음.</p>

      <h2>RISC vs CISC <span className="en">/ Design Philosophy</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>RISC · Reduced Instruction Set</h4>
          <ul>
            <li><b>fixed</b>-length instructions (typically 32-bit) — simple decode, pipeline-friendly</li>
            <li>only Load/Store touch memory; ALU ops are register ↔ register</li>
            <li>many registers (≥ 32) — less spill pressure</li>
            <li>few addressing modes, highly orthogonal ISA</li>
            <li>examples: ARM, RISC-V, MIPS, POWER, SPARC</li>
          </ul>
        </div>
        <div className="card">
          <h4>CISC · Complex Instruction Set</h4>
          <ul>
            <li><b>variable</b>-length instructions (x86: 1–15 bytes) — complex decode</li>
            <li>ALU ops can take memory operands directly</li>
            <li>few registers (x86-64 = 16) — heavier stack reliance</li>
            <li>many addressing modes, many special-purpose instructions</li>
            <li>examples: x86 / x86-64 (AMD64), early VAX</li>
          </ul>
        </div>
      </div>

      <div className="callout">
        <span className="icon">💡</span>
        <div>현대 x86 CPU도 내부적으로 복잡 CISC 명령을 <b>μop</b>으로 분해(crack)해 RISC 스타일 backend로 실행합니다. 그래서 "CISC vs RISC" 구분은 ISA 표면에만 남아 있고, μarchitecture 레벨에선 거의 같은 그림.</div>
      </div>

      <h2>주요 ISA 한눈에 비교 <span className="en">/ Quick Comparison</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Axis</th><th>ARM AArch64</th><th>RISC-V RV64</th><th>x86-64</th></tr></thead>
          <tbody>
            <tr><td>Instruction length</td><td>fixed 32-bit (+ SVE variant)</td><td>32-bit base, mixed 16-bit with <code>C</code> (RVC) extension</td><td>variable 1–15 bytes</td></tr>
            <tr><td>GPR</td><td>31 (+ SP/PC/ZR)</td><td>31 (<code>x1-x31</code>) + <code>x0</code> (hardwired 0)</td><td>16 (RAX–R15)</td></tr>
            <tr><td>FP Register</td><td>32 (<code>V0-V31</code>)</td><td>32 (<code>f0-f31</code>, F/D/Q extensions)</td><td>16 (XMM/YMM/ZMM)</td></tr>
            <tr><td>Privilege</td><td>EL0 / EL1 / EL2 / EL3</td><td>U / S / (HS) / M</td><td>Ring 0 / 1 / 2 / 3 (mostly 0 and 3)</td></tr>
            <tr><td>Memory Model</td><td>Weakly-ordered + acquire/release</td><td>RVWMO (weak) / Ztso (strict)</td><td>TSO (Total Store Order)</td></tr>
            <tr><td>SIMD / Vector</td><td>NEON (fixed 128-bit), SVE/SVE2 (VL-agnostic)</td><td>RVV 1.0 (VL-agnostic)</td><td>SSE / AVX / AVX-512 (fixed 128/256/512-bit)</td></tr>
            <tr><td>Atomic</td><td>LL/SC + LSE (v8.1+)</td><td>LR/SC + AMO (A extension)</td><td>LOCK prefix, XADD, CMPXCHG</td></tr>
            <tr><td>Interrupt Ctrl</td><td>GIC (v2/v3/v4)</td><td>PLIC / CLIC / AIA</td><td>LAPIC + IOAPIC</td></tr>
            <tr><td>License</td><td>proprietary IP (Arm Ltd)</td><td>open standard (RISC-V Foundation)</td><td>proprietary (Intel / AMD cross-licensed)</td></tr>
          </tbody>
        </table>
      </div>

      <h2>왜 이 페이지는 ARM과 RISC-V를 나란히 두나 <span className="en">/ Why Compare</span></h2>
      <ul>
        <li>둘 다 <b>load-store RISC</b> 계열이라 공통 원리가 많아 대조 학습에 유리</li>
        <li>ARM은 <b>배포된 설계</b> — 수십억 대 칩의 구체적 TRM·설계 결정이 공개</li>
        <li>RISC-V는 <b>열린 표준</b> — 스펙 문서로 바로 확인 가능, 확장 구조가 학습용으로 깔끔</li>
        <li>x86-64는 세 번째 기준점으로만 표에 포함 — 별도 섹션은 다루지 않음</li>
      </ul>
    </>
  )
}
