export default function TrustZone() {
  return (
    <>
      <h2>두 개의 월드 <span className="en">/ Secure &amp; Non-secure</span></h2>
      <p>CPU와 시스템 전체를 Secure / Non-secure 두 월드로 분리. <code>NS bit</code>가 버스·캐시·메모리에 전파되어 시스템 수준 격리를 제공.</p>

      <h2>구성 요소 <span className="en">/ Components</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>EL3 Secure Monitor</h4>
          <p>두 월드 간 컨텍스트 전환. 보통 ATF (TF-A, Trusted Firmware-A) 구현.</p>
        </div>
        <div className="card">
          <h4>Secure EL1 — Trusted OS</h4>
          <p>OP-TEE, QSEE (Qualcomm), Trusty (Google). TEE kernel 구동.</p>
        </div>
        <div className="card">
          <h4>Secure EL0 — TA</h4>
          <p>Trusted Applications. 키 관리, DRM, 지문 매칭 등.</p>
        </div>
        <div className="card">
          <h4>SMC Instruction</h4>
          <p>월드 전환 트리거. PSCI CPU on/off 포함 표준 서비스 호출.</p>
        </div>
      </div>

      <h2>시스템 전파 <span className="en">/ System-wide NS bit</span></h2>
      <p>NS bit는 CPU만의 것이 아니라 AXI/CHI의 <code>AxPROT[1]</code>로 전파되어:</p>
      <ul>
        <li><b>TZASC</b> — 메모리 영역을 Secure-only로 마킹 (DDR 컨트롤러 front)</li>
        <li><b>TZPC</b> — 주변장치를 Secure / Non-secure 분류</li>
        <li>캐시에서도 Secure / Non-secure를 별도 tag로 구분</li>
      </ul>

      <h2>PSCI 예제 <span className="en">/ CPU_ON via SMC</span></h2>
      <pre><code>
<span className="cmt">{"// Wake a secondary core from the Linux kernel:"}</span>{"\n"}
<span className="kw">mov</span>  x0, <span className="num">#0xC4000003</span>   <span className="cmt">{"// CPU_ON function ID"}</span>{"\n"}
<span className="kw">mov</span>  x1, {"#<target_cpu_mpidr>"}{"\n"}
<span className="kw">mov</span>  x2, {"#<entry_point>"}{"\n"}
<span className="kw">mov</span>  x3, {"#<context_id>"}{"\n"}
<span className="kw">smc</span>  <span className="num">#0</span>                 <span className="cmt">{"// → EL3 → ATF → power-domain control"}</span>
      </code></pre>
    </>
  )
}
