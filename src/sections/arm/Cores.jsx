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

      <h2>Core Power Modes <span className="en">/ 코어 전원 모드</span></h2>
      <p>최신 Cortex-A / Neoverse 코어는 "켜짐 / 꺼짐" 두 상태만 있는 게 아니라
      <b>여러 단계의 전원 모드</b>를 가집니다. PSCI(OS)와 PPU(하드웨어 Power Policy Unit)가 협력해
      전환을 관리하고, 각 모드마다 <b>유지되는 상태</b>와 <b>복귀 지연</b>이 다릅니다.</p>

      <div className="table-wrap">
        <table>
          <thead><tr><th>모드</th><th>상태 유지</th><th>전력</th><th>설명</th></tr></thead>
          <tbody>
            <tr><td><b>On</b></td><td>전부 유효</td><td>Full</td><td>정상 실행. 클록 게이팅은 여전히 미세 단위로 동작.</td></tr>
            <tr><td><b>Functional retention</b></td><td>레지스터 유지, 클록 정지</td><td>Low</td><td>WFI/WFE로 진입. 빠른 복귀(수십 cycle) — L1 캐시도 보통 유지.</td></tr>
            <tr><td><b>Off</b></td><td>전부 손실</td><td>Zero</td><td>Power-gated. PSCI CPU_OFF 경로. 복귀 시 OS가 컨텍스트 복원.</td></tr>
            <tr><td><b>Off emulation</b></td><td>전부 유효</td><td>Full</td><td>OS에는 "꺼진 것"으로 보이지만 실제론 On — 전원/레이시아 측정용.</td></tr>
            <tr><td><b>Debug recovery</b></td><td>디버그 로직만</td><td>Low</td><td>Off 상태에서 외부 디버거 접근 시 자동 진입. 요청 처리 후 Off로 복귀.</td></tr>
          </tbody>
        </table>
      </div>

      <h3>Debug recovery mode — 왜 필요한가</h3>
      <p>코어가 <code>Off</code>로 전원 차단되면 디버그 레지스터 접근도 안 됩니다.
      하지만 디버거(JTAG/SWD/DAP) 입장에선 "지금 저 코어가 왜 꺼졌지? 마지막에 뭘 했지?"를 <b>확인해야 할 때</b>가 있어요.
      <b>Debug recovery</b>는 이 딜레마를 해결합니다.</p>

      <div className="grid2">
        <div className="card">
          <h4>진입 조건</h4>
          <p>코어가 <code>Off</code> 상태에 있을 때 <b>외부 디버거가 DAP/EDBGRQ로 접근</b> 시도. PPU가 이를 감지해 전원과 클록을 <b>부분적으로 복구</b>.</p>
        </div>
        <div className="card">
          <h4>복구되는 범위</h4>
          <p>디버그 서브시스템(EDLAR, EDSCR, CoreSight 창) + 최소한의 응답 로직. <b>아키텍처 상태(X0~X30, 시스템 레지스터)는 Off 진입 시 이미 손실</b>돼 복원되지 않음 — 그건 OS가 컨텍스트 저장했어야 함.</p>
        </div>
        <div className="card">
          <h4>디버거가 할 수 있는 일</h4>
          <p>디버그 레지스터 읽기, Always-on 도메인에 남은 정보(일부 PMU, trace buffer) 조회, 브레이크포인트 설정해두고 다음 on 시 잡기.</p>
        </div>
        <div className="card">
          <h4>종료</h4>
          <p>디버거가 트랜잭션을 끝내면 PPU가 다시 전원을 내려 <b>원래 Off로 복귀</b>. OS 스케줄러는 이 이벤트를 인지하지 못함 (transparent).</p>
        </div>
      </div>

      <h3>전이 다이어그램</h3>
      <div className="diagram">{`                 PSCI CPU_ON
        +------------------------+
        |                        v
  +----------+   WFI/WFE   +--------------+
  |          +------------>|              |
  |    On    |             |  Retention   |
  |          |<------------+              |
  +----+-----+   wake      +--------------+
       |
       | PSCI CPU_OFF
       v
  +----------+                                +------------------+
  |          |   debugger access (DAP/EDBGRQ) |                  |
  |   Off    +------------------------------->| Debug recovery   |
  |          |<-------------------------------+                  |
  +----------+       debugger releases        +------------------+
       ^
       |
       | (측정 목적으로만)
  +----------------+
  | Off emulation  |
  +----------------+`}</div>

      <h3>관련 레지스터 · 신호</h3>
      <pre><code>
<span className="kw">DBGPRCR_EL1</span>         <span className="cmt">{"// Debug Processor Recovery Control — request warm reset (CWRR bit)"}</span>{"\n"}
<span className="kw">EDPRCR</span>              <span className="cmt">{"// External Debug Processor Reset/Recovery Control"}</span>{"\n"}
<span className="kw">EDPRSR</span>              <span className="cmt">{"// External Debug Processor Status — bits reflecting power state"}</span>{"\n"}
<span className="kw">PWRCTLR_EL1</span>         <span className="cmt">{"// Power Control — power-saving policy on some Armv9 cores"}</span>{"\n"}
<span className="kw">EDBGRQ</span>              <span className="cmt">{"// signal asserted by an external debugger to request halt"}</span>{"\n"}
<span className="kw">CPUPWRUPREQ</span> / <span className="kw">PWRUPACK</span>  <span className="cmt">{"// power-up handshake between the PPU and the core"}</span>
      </code></pre>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>언제 만나나.</b> 펌웨어·칩 bring-up 엔지니어가 "코어가 왜 응답 안 하지?" 디버깅할 때, 또는 랩에서 저전력 측정 중 크래시 원인 추적할 때. 일반 SW 개발자는 거의 볼 일 없지만, <b>이 기능이 있어서 PSCI로 꺼진 코어도 JTAG으로 들여다볼 수 있음</b>을 아는 게 중요.</div>
      </div>

      <div className="callout warn">
        <span className="icon">⚠</span>
        <div><b>주의.</b> Debug recovery는 <b>아키텍처 상태를 복원하지 않음</b>. "Off 전에 실행 중이던 프로그램 상태"를 보려면 OS가 context save를 했거나 retention 모드에 머물러야 함. 값은 코어마다 다르니 정확한 진입 조건·유지 범위는 각 코어의 TRM 참조.</div>
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
