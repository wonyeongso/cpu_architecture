export default function Cores() {
  return (
    <>
      <h2>Cortex-A · Application</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Core</th><th>ISA</th><th>Pipeline</th><th>Target</th></tr></thead>
          <tbody>
            <tr><td><b>A53</b></td><td>v8.0</td><td>In-order, 8-stage</td><td>Efficient, big.LITTLE little</td></tr>
            <tr><td><b>A72</b></td><td>v8.0</td><td>OoO, 15-stage</td><td>Balanced performance</td></tr>
            <tr><td><b>A76</b></td><td>v8.2</td><td>OoO, 4-wide decode</td><td>High perf mobile/laptop</td></tr>
            <tr><td><b>A78</b></td><td>v8.2</td><td>OoO, deeper ROB</td><td>Flagship phones</td></tr>
            <tr><td><b>X1 / X2 / X3</b></td><td>v8.4+ / v9</td><td>Very wide OoO</td><td>Peak single-thread</td></tr>
            <tr><td><b>A510</b></td><td>v9</td><td>In-order</td><td>Efficiency core (LITTLE)</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Neoverse · Infrastructure</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Core</th><th>Focus</th><th>실사용 예</th></tr></thead>
          <tbody>
            <tr><td><b>N1</b></td><td>Balanced cloud</td><td>AWS Graviton2, Ampere eMAG</td></tr>
            <tr><td><b>N2</b></td><td>v9, SVE2, 5nm</td><td>Alibaba Yitian 710</td></tr>
            <tr><td><b>V1</b></td><td>HPC, 2×256b SVE</td><td>AWS Graviton3</td></tr>
            <tr><td><b>V2</b></td><td>v9, higher IPC</td><td>NVIDIA Grace, Graviton4</td></tr>
            <tr><td><b>E1 / E2</b></td><td>Edge, 저전력</td><td>5G 기지국, 네트워킹</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Cortex-M · Microcontroller</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Core</th><th>ISA</th><th>특징</th></tr></thead>
          <tbody>
            <tr><td><b>M0 / M0+</b></td><td>v6-M</td><td>초저전력, 작은 다이, Thumb만</td></tr>
            <tr><td><b>M3 / M4</b></td><td>v7-M</td><td>DSP (M4), FPU optional</td></tr>
            <tr><td><b>M7</b></td><td>v7-M</td><td>Dual-issue, 캐시, 높은 성능 MCU</td></tr>
            <tr><td><b>M33 / M55</b></td><td>v8-M</td><td>TrustZone-M, Helium (M55 MVE)</td></tr>
            <tr><td><b>M85</b></td><td>v8.1-M</td><td>최상위 MCU, ML 가속</td></tr>
          </tbody>
        </table>
      </div>

      <h2>big.LITTLE / DynamIQ</h2>
      <p>고성능 + 저전력 코어 혼합. DynamIQ (DSU)는 같은 클러스터 안에서 이종 코어를 섞을 수 있고 L3 / SLC를 공유.</p>
      <div className="diagram">{`   ┌────────── DynamIQ Shared Unit (DSU) ──────────┐
   │         L3 / SLC, snoop filter, ACP           │
   ├──────┬──────┬──────┬──────┬──────┬──────┬─────┤
   │ X3   │ A715 │ A715 │ A715 │ A510 │ A510 │ ... │
   │(big) │(mid) │(mid) │(mid) │(LIT) │(LIT) │     │
   └──────┴──────┴──────┴──────┴──────┴──────┴─────┘`}</div>
    </>
  )
}
