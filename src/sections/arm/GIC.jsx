export default function GIC() {
  return (
    <>
      <h2>Generic Interrupt Controller</h2>
      <p>ARM 표준 인터럽트 컨트롤러. <code>v2</code>는 MMIO 기반, <code>v3+</code>는 system register + redistributor + ITS.</p>

      <h2>Interrupt 분류 <span className="en">/ INTID Ranges</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>종류</th><th>INTID 범위</th><th>설명</th></tr></thead>
          <tbody>
            <tr><td><b>SGI</b> (Software Generated)</td><td><code>0 – 15</code></td><td>코어 간 IPI</td></tr>
            <tr><td><b>PPI</b> (Private Peripheral)</td><td><code>16 – 31</code></td><td>코어 로컬 (e.g., generic timer)</td></tr>
            <tr><td><b>SPI</b> (Shared Peripheral)</td><td><code>32 – 1019</code></td><td>일반 주변장치</td></tr>
            <tr><td><b>LPI</b> (Locality-specific)</td><td><code>8192+</code></td><td>MSI — ITS 경유 라우팅 (v3+)</td></tr>
          </tbody>
        </table>
      </div>

      <h2>GICv3 구조 <span className="en">/ Architecture</span></h2>
      <div className="diagram">{`  ┌───────────────────────────────────────────────┐
  │              Distributor (GICD)               │   ← SPI 라우팅, priority
  └───────┬──────────────┬──────────────┬─────────┘
          │              │              │
     ┌────v──────┐  ┌────v──────┐  ┌────v──────┐
     │ Redist 0  │  │ Redist 1  │  │ Redist N  │    ← PPI/SGI + LPI config
     └────┬──────┘  └────┬──────┘  └────┬──────┘
          │              │              │
     ┌────v──────┐  ┌────v──────┐  ┌────v──────┐
     │  CPU 0    │  │  CPU 1    │  │  CPU N    │    ← ICC_* system regs
     │ (ICC_*)   │  │ (ICC_*)   │  │ (ICC_*)   │
     └───────────┘  └───────────┘  └───────────┘

        ITS (Interrupt Translation Service)
        → DeviceID + EventID → LPI INTID`}</div>

      <h2>주요 시스템 레지스터 <span className="en">/ ICC_*</span></h2>
      <pre><code>
<span className="reg">ICC_IAR1_EL1</span>    <span className="cmt">{"// Interrupt Acknowledge — 어떤 INTID인지 읽기"}</span>{"\n"}
<span className="reg">ICC_EOIR1_EL1</span>   <span className="cmt">{"// End Of Interrupt — 처리 완료 signal"}</span>{"\n"}
<span className="reg">ICC_PMR_EL1</span>     <span className="cmt">{"// Priority Mask"}</span>{"\n"}
<span className="reg">ICC_SGI1R_EL1</span>   <span className="cmt">{"// SGI generate (affinity-based targeting)"}</span>{"\n"}
<span className="reg">ICC_CTLR_EL1</span>    <span className="cmt">{"// Control — EOI mode 등"}</span>
      </code></pre>

      <h2>ISR 진입 / 종료 (대략)</h2>
      <pre><code>
<span className="cmt">{"// IRQ 벡터 진입"}</span>{"\n"}
<span className="kw">mrs</span>  x0, <span className="reg">ICC_IAR1_EL1</span>   <span className="cmt">{"// INTID acquire"}</span>{"\n"}
<span className="cmt">{"// ... 디스패치 & 핸들링 ..."}</span>{"\n"}
<span className="kw">msr</span>  <span className="reg">ICC_EOIR1_EL1</span>, x0  <span className="cmt">{"// EOI, drop priority"}</span>{"\n"}
<span className="kw">eret</span>
      </code></pre>
    </>
  )
}
