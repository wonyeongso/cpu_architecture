export default function PipelineBasics() {
  return (
    <>
      <h2>왜 파이프라인인가 <span className="en">/ Why Pipeline</span></h2>
      <p>한 명령을 여러 단계로 쪼개 단계별로 동시에 처리하면 단위 시간당 throughput 이 올라갑니다. 이상적으로 N-stage = N배 throughput, 실제로는 hazard와 frequency penalty로 덜 나옴.</p>

      <h2>Classic 5-Stage Pipeline <span className="en">/ MIPS / RV baseline</span></h2>
      <div className="diagram">{`   IF  ─>  ID  ─>  EX  ─>  MEM ─>  WB
  Fetch  Decode  Execute  Memory  Write-back

  Cycle:    1    2    3    4    5    6    7    8
  I1:      IF   ID   EX   MEM  WB
  I2:           IF   ID   EX   MEM  WB
  I3:                IF   ID   EX   MEM  WB
  I4:                     IF   ID   EX   MEM  WB

  → N-stage 파이프라인은 ideally 매 cycle 한 명령 retire (CPI=1)`}</div>

      <h2>파이프라인 해저드 <span className="en">/ Hazards</span></h2>
      <div className="grid3">
        <div className="card">
          <h4>Structural</h4>
          <p>같은 자원을 동시에 두 단계가 쓸 때 (e.g. 단일 포트 메모리로 IF + MEM 동시 접근). 대개 자원 복제로 해결 (Harvard L1 등).</p>
        </div>
        <div className="card">
          <h4>Data</h4>
          <p>이전 명령의 결과를 다음 명령이 필요로 하는데 아직 WB 전 (<b>RAW</b>). <b>Forwarding (bypass)</b> 로 EX→EX 직결하거나, 안 되면 stall.</p>
        </div>
        <div className="card">
          <h4>Control</h4>
          <p>분기 결과가 EX나 MEM에 가야 확정 — 그 사이 fetch된 명령은 wrong path일 수 있음. <b>Branch prediction</b> + speculative execution이 기본 대응.</p>
        </div>
      </div>

      <h2>Forwarding 예시 <span className="en">/ EX → EX Bypass</span></h2>
      <pre><code>
<span className="cmt">{"// RAW dependency"}</span>{"\n"}
<span className="kw">add</span>  x1, x2, x3    <span className="cmt">{"// result of x1 at end of EX (cycle 3)"}</span>{"\n"}
<span className="kw">sub</span>  x4, x1, x5    <span className="cmt">{"// needs x1 in EX (cycle 4)"}</span>{"\n\n"}
<span className="cmt">{"// In the classic 5-stage pipeline:"}</span>{"\n"}
<span className="cmt">{"//   forward x1 from end-of-EX of `add` straight into EX of `sub` → 0 stall"}</span>{"\n"}
<span className="cmt">{"//   (forwarding / bypass muxes)"}</span>{"\n\n"}
<span className="cmt">{"// Load-use hazard (MEM → EX has a 1-cycle delay):"}</span>{"\n"}
<span className="kw">ld</span>   x1, [x2]      <span className="cmt">{"// x1 available at end of MEM (cycle 4)"}</span>{"\n"}
<span className="kw">sub</span>  x4, x1, x5    <span className="cmt">{"// needs x1 in EX (cycle 4) → 1-cycle stall required"}</span>
      </code></pre>

      <h2>Deep Pipeline 트레이드오프 <span className="en">/ Depth vs Frequency</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>측면</th><th>Shallow (5 stage)</th><th>Deep (15+ stage)</th></tr></thead>
          <tbody>
            <tr><td>Clock freq</td><td>낮음 — stage 당 긴 logic</td><td>높음 — stage 당 짧은 logic</td></tr>
            <tr><td>Mispredict penalty</td><td>적음 (~5 cycle)</td><td>큼 (~15-20 cycle)</td></tr>
            <tr><td>Forwarding 네트워크</td><td>단순</td><td>복잡, 면적·전력 ↑</td></tr>
            <tr><td>대표</td><td>A53, in-order MCU, 단순 RISC-V core</td><td>Cortex-X, Neoverse V2, Intel P-core</td></tr>
          </tbody>
        </table>
      </div>

      <h2>In-order vs Out-of-Order <span className="en">/ Execution Order</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>In-order</h4>
          <p>디스패치·실행·retire 모두 프로그램 순서. 단순, 결정론적, 면적·전력 효율. dependency stall 시 전체 파이프 멈춤. A53 / A510 / 대부분 MCU / 기본 RISC-V core.</p>
        </div>
        <div className="card">
          <h4>Out-of-Order (OoO)</h4>
          <p>데이터 의존성이 풀린 명령부터 실행 → stall 은폐. Rename·ROB·Issue queue 필요. 면적·전력 비싸지만 IPC 크게 상승. A710+, Neoverse N/V, Intel/AMD big cores, SiFive P870.</p>
        </div>
      </div>

      <div className="callout warn">
        <span className="icon">⚠️</span>
        <div>IPC 는 μarch 속성. 같은 ISA라도 in-order vs OoO 차이가 IPC 3~5배로 벌어집니다. 반대로 ISA가 달라도 비슷한 μarch 클래스면 IPC는 근사. — <b>ISA ≠ 성능</b>.</div>
      </div>

      <h2>ILP · TLP · DLP <span className="en">/ Three Parallelisms</span></h2>
      <ul>
        <li><b>ILP</b> (Instruction-level): OoO · superscalar · speculation — 한 thread 내 독립 명령 병렬 실행</li>
        <li><b>TLP</b> (Thread-level): SMT · SMP · CMP — 여러 thread를 동시 실행</li>
        <li><b>DLP</b> (Data-level): SIMD (NEON/SSE), Vector (SVE/RVV), GPU — 한 명령이 여러 데이터 처리</li>
      </ul>
    </>
  )
}
