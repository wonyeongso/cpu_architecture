export default function PowerDvfs() {
  return (
    <>
      <h2>전력이 곧 성능 예산 <span className="en">/ Power-Bound Design</span></h2>
      <p>모바일은 배터리, 서버는 TDP — 현대 SoC 는 거의 항상 <b>power/thermal 에 먼저 묶이고</b> 그 한도 안에서 성능을 쥐어짭니다. 따라서 "얼마나 빠른가" 보다 "어떤 V/F 곡선 어디서 얼마를 태울 수 있나"가 본질적인 질문입니다.</p>
      <div className="grid3">
        <div className="card">
          <h4>Dynamic Power</h4>
          <p><code>P ≈ α · C · V² · f</code>. The V² term is why dropping voltage by 1% saves <b>~2% power</b>. This is the math behind DVFS.</p>
        </div>
        <div className="card">
          <h4>Leakage Power</h4>
          <p>Subthreshold and gate leakage. Sensitive to temperature and process variation, and leaks even when idle — hence the need for <b>power-gating</b>.</p>
        </div>
        <div className="card">
          <h4>Thermal limit</h4>
          <p>Sustained TDP is ultimately set by the cooling solution. Short bursts above it are allowed only as long as the cooler's <b>thermal capacity</b> can absorb them.</p>
        </div>
      </div>

      <h2>DVFS 기본 <span className="en">/ Dynamic Voltage & Frequency Scaling</span></h2>
      <p>특정 frequency 를 안정적으로 돌리는 데 필요한 최소 전압이 존재 (<b>V-f curve</b>). 주파수를 낮추면 전압도 함께 낮출 수 있어 <code>P = C·V²·f</code> 가 입방체급으로 떨어집니다.</p>
      <div className="diagram">{`Voltage
  │        ┌─ max (boost)
  │      ┌─┘
  │    ┌─┘          ← nominal
  │  ┌─┘
  │┌─┘              ← efficiency sweet spot
  ├┘
  └──────────────────> Frequency
      low           high

  each operating point = (V, f, allowed temp, allowed current) tuple = OPP (Operating Performance Point)`}</div>
      <div className="grid2">
        <div className="card">
          <h4>OPP Table</h4>
          <p>The list of OPPs the SoC publishes to the OS via DT/ACPI. The kernel CPUfreq layer picks one of these and switches.</p>
        </div>
        <div className="card">
          <h4>Voltage Margin</h4>
          <p>Worst-case margin for process, temperature and aging. <b>AVS</b> (Adaptive Voltage Scaling) shrinks this margin using on-chip sensors → extra power savings.</p>
        </div>
        <div className="card">
          <h4>Switching Cost</h4>
          <p>PLL relock + voltage ramp = a few μs to a few hundred μs. Switching too often adds overhead; too rarely hurts responsiveness.</p>
        </div>
        <div className="card">
          <h4>Per-core / Per-cluster</h4>
          <p>Modern SoCs use <b>per-core DVFS</b> (independent V/F rail per core). Classic big.LITTLE / DynamIQ scaled at cluster granularity.</p>
        </div>
      </div>

      <h2>Governor / 제어 정책 <span className="en">/ Linux CPUfreq</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Governor</th><th>Policy</th><th>Use case</th></tr></thead>
          <tbody>
            <tr><td><code>performance</code></td><td>always max OPP</td><td>benchmarks, latency-sensitive servers</td></tr>
            <tr><td><code>powersave</code></td><td>always min OPP</td><td>extreme low-power</td></tr>
            <tr><td><code>ondemand</code></td><td>load &gt; threshold → up, otherwise → down (step-wise)</td><td>older desktop default</td></tr>
            <tr><td><code>conservative</code></td><td>gentler than ondemand</td><td>some power-sensitive mobile</td></tr>
            <tr><td><code>schedutil</code></td><td>direct feedback from <b>scheduler utilization</b></td><td>modern Linux default, paired with EAS</td></tr>
            <tr><td><code>intel_pstate</code></td><td>HW P-state (HWP) + firmware cooperation</td><td>Intel active/passive modes</td></tr>
          </tbody>
        </table>
      </div>
      <div className="callout">
        <span className="icon">💡</span>
        <div>모바일은 거의 <code>schedutil + EAS</code>. scheduler 가 각 태스크의 예상 util 과 각 CPU 의 <b>energy model</b>(전력-주파수 추정) 을 보고 <b>성능당 전력이 최소</b>인 코어로 배치합니다.</div>
      </div>

      <h2>Idle States <span className="en">/ C-states · WFI · WFE</span></h2>
      <p>실행할 일이 없을 때 단계적으로 더 깊게 잠들기. 깊을수록 소비 전력 ↓, wake latency ↑.</p>
      <div className="diagram">{`active ─ WFI ─── shallow retention ─── deep retention ── power-off
  │    │          │                       │                │
  │    clock      L1/L2 retained          L1 flushed,       full power off
  │    gated      state retained          state scrubbed   OS must
  │    instant    μs-scale wake           tens of μs wake  restore state (ms)
  │    wake       GIC wake OK             GIC wake OK`}</div>
      <div className="grid2">
        <div className="card">
          <h4><code>WFI</code></h4>
          <p>Wait-for-Interrupt — clock-gates the core and waits for an interrupt. The first idle step in most cases.</p>
        </div>
        <div className="card">
          <h4><code>WFE</code></h4>
          <p>Wait-for-Event — wakes when the event register is set. Released by <code>SEV</code>, GIC events, or a global-monitor update. Used for spinlock waits.</p>
        </div>
        <div className="card">
          <h4>Retention</h4>
          <p>Drop voltage to the <b>minimum retention voltage</b>, preserving state only. Wake is fast, but leakage is still paid.</p>
        </div>
        <div className="card">
          <h4>Power-off</h4>
          <p>Core fully powered down. On wake the OS must restore context and warm caches → trade off against the <b>race-to-idle</b> benefit.</p>
        </div>
      </div>
      <div className="callout warn">
        <span className="icon">⚠️</span>
        <div><b>Exit latency</b> 가 긴 idle state 는 실시간 응답을 해칠 수 있음. Linux <code>menu/teo</code> idle governor 가 latency QoS 와 predicted residency 를 보고 진입 여부 결정.</div>
      </div>

      <h2>PSCI & Firmware 관여 <span className="en">/ Platform Coordination</span></h2>
      <p>코어 전원을 <b>OS 혼자</b> 못 끕니다. clock tree · voltage rail · reset · coherency disconnection 이 모두 얽혀 있어 EL3 펌웨어(TF-A)가 조율합니다.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>PSCI call</th><th>Role</th></tr></thead>
          <tbody>
            <tr><td><code>CPU_ON</code></td><td>power up a core + set the entry point → secondary boot</td></tr>
            <tr><td><code>CPU_OFF</code></td><td>quiesce the current core → power down</td></tr>
            <tr><td><code>CPU_SUSPEND</code></td><td>request idle-state entry (depth chosen via state ID)</td></tr>
            <tr><td><code>SYSTEM_OFF / RESET</code></td><td>shut down or reboot the whole system</td></tr>
            <tr><td><code>MIGRATE_*</code></td><td>migrate the trusted OS between cores</td></tr>
          </tbody>
        </table>
      </div>
      <div className="callout">
        <span className="icon">💡</span>
        <div>flow: OS idle governor → <code>PSCI CPU_SUSPEND(state_id)</code> → EL3 TF-A 가 cluster/system power controller 제어 → 코어 전원 차단 → interrupt 시 ResetVector 거쳐 OS 복귀. OS 는 "잠들었다 깨어났다" 만 인식하면 됨.</div>
      </div>

      <h2>Boost / Turbo / Thermal Throttling <span className="en">/ Dynamic Limits</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>Boost frequency</h4>
          <p>Briefly exceed sustained TDP for higher performance. Useful for short compute bursts; converges back to base once thermal capacity is exhausted.</p>
        </div>
        <div className="card">
          <h4>Race-to-Idle</h4>
          <p>Finishing fast and dropping into deep idle often wins on <b>average energy</b>. The trade-off flips when leakage dominates or engine warm-up cost is high.</p>
        </div>
        <div className="card">
          <h4>Thermal Throttling</h4>
          <p>T_j sensor crosses the limit → OPP is demoted. External cooling capability is the ultimate cap on sustained performance.</p>
        </div>
        <div className="card">
          <h4>Power Capping (RAPL / Arm PMU)</h4>
          <p>Intel RAPL or Arm power-meter / amperage-limit features set a <b>total power ceiling</b>. Datacenters use this to enforce rack-level power budgets.</p>
        </div>
      </div>

      <h2>EAS / Scheduler 연동 <span className="en">/ Energy-Aware Scheduling</span></h2>
      <p>big.LITTLE·DynamIQ 에서 어떤 태스크를 어느 코어에 올릴지 결정 — 성능 코어에 가벼운 태스크를 올리면 전력 낭비, 반대로 무거운 태스크를 약한 코어에 올리면 성능 저하.</p>
      <div className="grid2">
        <div className="card">
          <h4>PELT / WALT</h4>
          <p>Per-Entity Load Tracking — exponentially-weighted utilization per task. WALT is a window-based variant.</p>
        </div>
        <div className="card">
          <h4>Energy Model</h4>
          <p>A power/performance table per OPP. EAS estimates <b>total energy of (util × placement)</b> and picks the minimum.</p>
        </div>
        <div className="card">
          <h4>Uclamp</h4>
          <p>Forces a min/max on a task's util — guarantees a min for foreground apps and caps background tasks for power savings.</p>
        </div>
        <div className="card">
          <h4>UI responsiveness</h4>
          <p>On mobile it's common to <b>pin to a perf core at max OPP for a few hundred ms</b> right after a touch event — a heuristic optimized for perceived performance.</p>
        </div>
      </div>

      <h2>서버·클라우드 관점 <span className="en">/ Server Side</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>P-state vs C-state</h4>
          <p>P-state = active V/F level, C-state = idle depth. Independent dimensions.</p>
        </div>
        <div className="card">
          <h4>HWP / SPE-aware</h4>
          <p>Intel HWP, AMD CPPC, and Arm <code>SPE + AMU</code> (Activity Monitor Unit) feed util / energy hints from hardware to the OS.</p>
        </div>
        <div className="card">
          <h4>Jitter / Latency</h4>
          <p>For low-latency services (trading, real-time) DVFS and C-states are themselves <b>sources of jitter</b> — pinning with <code>performance</code> governor + <code>idle=poll</code> is common.</p>
        </div>
        <div className="card">
          <h4>Rack-level budget</h4>
          <p>RAPL/PDU power caps bound the unit's performance. <b>Efficiency (perf/W)</b> becomes the platform-selection criterion.</p>
        </div>
      </div>

      <h2>관측 <span className="en">/ Observability</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Metric / tool</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><code>cpufreq-info</code>, <code>/sys/.../scaling_cur_freq</code></td><td>current OPP / governor</td></tr>
            <tr><td><code>turbostat</code> (Intel)</td><td>per-core freq · C-state residency · RAPL power</td></tr>
            <tr><td><code>cpupower idle-info</code></td><td>supported idle states · exit latency</td></tr>
            <tr><td>Arm AMU</td><td>core cycles, constant counter, etc. — for freq-normalized util</td></tr>
            <tr><td>ACPI <code>_PSS / _CST</code></td><td>P/C-state tables firmware exposes to the OS</td></tr>
            <tr><td>PMU <code>CPU_CYCLES</code> vs <code>CNTVCT</code></td><td>their ratio gives effective frequency</td></tr>
          </tbody>
        </table>
      </div>

      <h2>함정 <span className="en">/ Pitfalls</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>Cycles ≠ Time</h4>
          <p>Under DVFS the <b>cycle count can drop while wall-clock grows</b>. For latency benchmarks, always pin the governor.</p>
        </div>
        <div className="card">
          <h4>Race-to-Idle misjudgment</h4>
          <p>When leakage dominates, <b>slow and long</b> can lose. Validate per workload.</p>
        </div>
        <div className="card">
          <h4>Idle Latency</h4>
          <p>Deep C-states add tens of μs of interrupt-to-wake delay — real-time devices may drop frames.</p>
        </div>
        <div className="card">
          <h4>Core Hop</h4>
          <p>EAS migrating tasks frequently → L1/L2 warm-up loss. Pinning with <code>taskset</code>/cgroup is sometimes preferable.</p>
        </div>
      </div>

      <h2>한 줄 정리 <span className="en">/ Cheat Sheet</span></h2>
      <div className="callout">
        <span className="icon">📌</span>
        <div>
          <ul style={{margin: 0, paddingLeft: 18}}>
            <li>전력은 <code>V²·f</code> → <b>전압 낮추기</b>가 DVFS 의 본질.</li>
            <li>OPP = (V, f, 조건) 튜플, governor 가 선택, PSCI/TF-A 가 실제 전환.</li>
            <li>Idle 은 WFI → retention → power-off 로 단계적, deep 일수록 exit latency ↑.</li>
            <li>모바일은 <code>schedutil + EAS</code>, 서버 저지연은 <code>performance</code> 고정이 흔함.</li>
            <li>벤치마크 시 OPP/Turbo/C-state 모두 고정해야 <b>재현성</b> 확보.</li>
          </ul>
        </div>
      </div>
    </>
  )
}
