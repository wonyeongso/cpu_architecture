export default function Overview() {
  return (
    <>
      <h2>핵심 철학 <span className="en">/ Core Philosophy</span></h2>
      <p>ARM은 <b>Advanced RISC Machines</b>의 약자. 1990년 창립. 직접 칩을 만들지 않고 IP를 라이선스하는 모델로 모바일·IoT·서버까지 장악.</p>

      <div className="grid3">
        <div className="card">
          <h4>Load / Store</h4>
          <p>메모리는 LDR/STR로만 접근. 연산은 레지스터끼리.</p>
        </div>
        <div className="card">
          <h4>Fixed-length</h4>
          <p>A32/A64 = 32-bit, Thumb = 16/32-bit mixed.</p>
        </div>
        <div className="card">
          <h4>Many registers</h4>
          <p>AArch64 = 31 GPR + SP + PC. 스필 부담 감소.</p>
        </div>
      </div>

      <h2>ISA 계열 <span className="en">/ Profiles</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>Cortex-A · Application</h4>
          <p>OS 구동용 고성능 코어. Android/Linux, SMP, MMU.</p>
          <div className="tags">
            <span className="tag info">A53</span>
            <span className="tag info">A76</span>
            <span className="tag info">A78</span>
            <span className="tag new">X925</span>
          </div>
        </div>
        <div className="card">
          <h4>Cortex-R · Real-time</h4>
          <p>결정론적 응답 시간. 자동차, 스토리지 컨트롤러. MPU 기반.</p>
          <div className="tags">
            <span className="tag info">R5</span>
            <span className="tag info">R52</span>
            <span className="tag info">R82</span>
          </div>
        </div>
        <div className="card">
          <h4>Cortex-M · Microcontroller</h4>
          <p>초저전력 MCU. Thumb-2 전용, No MMU. IoT·센서·임베디드.</p>
          <div className="tags">
            <span className="tag info">M0+</span>
            <span className="tag info">M4</span>
            <span className="tag info">M33</span>
            <span className="tag info">M85</span>
          </div>
        </div>
        <div className="card">
          <h4>Neoverse · Infrastructure</h4>
          <p>서버·데이터센터용. AWS Graviton, NVIDIA Grace, Ampere Altra.</p>
          <div className="tags">
            <span className="tag info">N2</span>
            <span className="tag info">V2</span>
            <span className="tag new">V3</span>
          </div>
        </div>
      </div>

      <h2>ISA 버전 역사 <span className="en">/ ISA Evolution</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Version</th><th>핵심 기능 / Key Features</th><th>대표 코어</th></tr></thead>
          <tbody>
            <tr><td><code>ARMv7-A</code></td><td>32-bit, Thumb-2, NEON SIMD, VFPv3/4</td><td>A8, A9, A15</td></tr>
            <tr><td><code>ARMv8.0-A</code></td><td>AArch64 도입, 31 GPR, AArch32 호환</td><td>A53, A57, A72</td></tr>
            <tr><td><code>ARMv8.1~8.6</code></td><td>LSE atomics, RAS, PAuth, BTI, MTE</td><td>A76, A78, N1</td></tr>
            <tr><td><code>ARMv9.0+</code></td><td>SVE2, CCA (Realm), 강화된 security</td><td>A710, X2, V2</td></tr>
          </tbody>
        </table>
      </div>
    </>
  )
}
