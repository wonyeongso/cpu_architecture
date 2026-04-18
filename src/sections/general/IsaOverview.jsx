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
            <li>명령 길이 <b>고정</b> (32-bit 주류) — decode 단순, 파이프라인 친화</li>
            <li>Load / Store 만 메모리 접근, 연산은 레지스터 ↔ 레지스터</li>
            <li>레지스터 다수 (≥ 32개) — spill 부담 감소</li>
            <li>Addressing mode 소수, 명령 직교성 높음</li>
            <li>대표: ARM, RISC-V, MIPS, POWER, SPARC</li>
          </ul>
        </div>
        <div className="card">
          <h4>CISC · Complex Instruction Set</h4>
          <ul>
            <li>명령 길이 <b>가변</b> (x86은 1–15 byte) — decode 복잡</li>
            <li>ALU 명령이 직접 메모리 피연산자 허용</li>
            <li>레지스터 수 적음 (x86-64 = 16) — 스택 의존도 ↑</li>
            <li>Addressing mode 다양, 특수명령 많음</li>
            <li>대표: x86 / x86-64 (AMD64), 초기 VAX</li>
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
          <thead><tr><th>축</th><th>ARM AArch64</th><th>RISC-V RV64</th><th>x86-64</th></tr></thead>
          <tbody>
            <tr><td>명령 길이</td><td>32-bit 고정 (+ SVE 변형)</td><td>32-bit 기본, <code>C</code>(RVC) 확장 시 16-bit 혼합</td><td>가변 1–15 byte</td></tr>
            <tr><td>GPR</td><td>31 (+ SP/PC/ZR)</td><td>31 (<code>x1-x31</code>) + <code>x0</code> (hardwired 0)</td><td>16 (RAX–R15)</td></tr>
            <tr><td>FP Register</td><td>32 (<code>V0-V31</code>)</td><td>32 (<code>f0-f31</code>, F/D/Q 확장)</td><td>16 (XMM/YMM/ZMM)</td></tr>
            <tr><td>Privilege</td><td>EL0 / EL1 / EL2 / EL3</td><td>U / S / (HS) / M</td><td>Ring 0 / 1 / 2 / 3 (주로 0·3)</td></tr>
            <tr><td>Memory Model</td><td>Weakly-ordered + acquire/release</td><td>RVWMO (weak) / Ztso (strict)</td><td>TSO (Total Store Order)</td></tr>
            <tr><td>SIMD / Vector</td><td>NEON (128-bit 고정), SVE/SVE2 (VL-agnostic)</td><td>RVV 1.0 (VL-agnostic)</td><td>SSE / AVX / AVX-512 (128/256/512-bit 고정)</td></tr>
            <tr><td>Atomic</td><td>LL/SC + LSE (v8.1+)</td><td>LR/SC + AMO (A 확장)</td><td>LOCK prefix, XADD, CMPXCHG</td></tr>
            <tr><td>Interrupt Ctrl</td><td>GIC (v2/v3/v4)</td><td>PLIC / CLIC / AIA</td><td>LAPIC + IOAPIC</td></tr>
            <tr><td>라이선스</td><td>독점 IP (Arm Ltd)</td><td>오픈 표준 (RISC-V Foundation)</td><td>독점 (Intel / AMD 크로스 라이선스)</td></tr>
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
