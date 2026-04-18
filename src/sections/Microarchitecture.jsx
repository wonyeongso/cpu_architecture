export default function Microarchitecture() {
  return (
    <>
      <h2>모던 OoO 코어 개관 <span className="en">/ Modern OoO Overview</span></h2>
      <p>이 섹션은 Cortex-A710 / Cortex-X2 / Neoverse N2·V2 급 고성능 OoO 코어를 기준으로, 파이프라인부터 분기 예측, LSU, 프리페처, SVE, PMU, 스펙 미티게이션까지 다룹니다.</p>

      <div className="grid3">
        <div className="card">
          <h4>Decode Width</h4>
          <p>플래그십 라인에서 <b>8-wide</b> (X2/V2). 고정 32-bit 명령 + μop crack으로 ILP 확보.</p>
        </div>
        <div className="card">
          <h4>Pipeline Depth</h4>
          <p>약 <b>13 ~ 15 stages</b>. Decoupled fetch로 BPU가 I-cache를 선행 → fetch bubble 최소화.</p>
        </div>
        <div className="card">
          <h4>Window / Ports</h4>
          <p>ROB ~300 entry, 실행 포트 13 ~ 15개. PRF 기반 rename으로 WAR/WAW 해소.</p>
        </div>
      </div>

      <h2>파이프라인 블록 <span className="en">/ Pipeline Blocks</span></h2>
      <p>Frontend는 명령을 OoO backend에 공급하고, Backend는 실제 실행·메모리·retire를 수행합니다.</p>
      <div className="diagram">{`// Frontend (in-order fetch & decode)
[BPU + BTB/RAS] ─► [IFU / I-cache] ─► [Decode + μop crack] ─► [Rename / Dispatch]
       ▲  decoupled                                          │
       │                                                      ▼
// Backend (Out-of-Order execution & in-order retire)
[Issue Queues] ─► [Execute Ports] ─► [Writeback] ─► [ROB Retire]
                    │
                    ├─ ALU × N            (single-cycle int)
                    ├─ Branch / Jmp
                    ├─ Mul / Div
                    ├─ AGU + LSU × M      (load / store)
                    └─ FP / ASIMD / SVE × K`}</div>

      <h2>분기 예측 <span className="en">/ Branch Prediction</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>Direction Predictor</h4>
          <p>업계 표준 <code>TAGE-SC-L</code> — 다중 히스토리 길이 테이블 + statistical corrector + loop predictor. A710/V2 급은 misprediction rate 1 ~ 3% 수준.</p>
        </div>
        <div className="card">
          <h4>BTB 계층</h4>
          <p>μBTB (L0, ~64 entry) / main BTB (~8-16K) / L2 BTB. 예측 레이턴시와 용량의 전형적 트레이드오프.</p>
        </div>
        <div className="card">
          <h4>RAS + ITTAGE</h4>
          <p>RAS로 <code>BL/RET</code> 짝맞춤 (~16-32 depth). 간접 분기는 <code>ITTAGE</code>로 path history 기반 예측.</p>
        </div>
        <div className="card">
          <h4>Decoupled Fetch</h4>
          <p>BPU가 I-cache보다 <b>앞서 달려</b> miss 시 prefetch를 발행 — fetch stall 은폐의 핵심 메커니즘.</p>
        </div>
      </div>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>Mispredict penalty</b>는 pipeline depth에 비례합니다. 예측 정확도 1% 개선이 IPC 수 %의 차이로 이어지는 이유. <code>BTI / CSV2</code>는 BTB poisoning을 막아 보안과 성능을 동시에 보호.</div>
      </div>

      <h2>Rename / OoO Backend</h2>
      <p>아키텍처 레지스터(<code>X0-X30</code>)를 다수의 physical register(PRF)로 매핑해 <b>WAR/WAW false dependency</b>를 제거합니다.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>자원</th><th>A710 (대략)</th><th>Neoverse V2 (대략)</th><th>역할</th></tr></thead>
          <tbody>
            <tr><td>INT PRF</td><td>~220</td><td>~330</td><td>정수 rename pool</td></tr>
            <tr><td>FP / SVE PRF</td><td>~180</td><td>~300+</td><td>FP · ASIMD · SVE rename pool</td></tr>
            <tr><td>ROB</td><td>~160 ~ 288</td><td>~320+</td><td>in-order retire window</td></tr>
            <tr><td>Dispatch Width</td><td>5 ~ 8</td><td>8</td><td>rename → issue queue</td></tr>
            <tr><td>Execution Ports</td><td>~13</td><td>~15+</td><td>ALU · AGU · LSU · FP · SVE</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Load-Store Unit <span className="en">/ LSU</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>LDQ / STQ</h4>
          <p>LDQ ~80 ~ 90, STQ ~60 ~ 70 entry. Load는 speculative 실행, store는 <b>retire 후에야</b> 메모리에 commit (store buffer drain).</p>
        </div>
        <div className="card">
          <h4>Store-to-Load Forwarding</h4>
          <p>주소·크기·정렬이 맞으면 STQ에서 LDQ로 직접 데이터 전달. 부분 겹침 / 정렬 불일치 → <b>replay</b> 로 degenerate.</p>
        </div>
        <div className="card">
          <h4>Memory Disambiguation</h4>
          <p>앞선 store 주소 미확정 상태에서 load를 speculative 먼저 실행. 나중에 동일 주소였음이 드러나면 violation → squash &amp; replay.</p>
        </div>
        <div className="card">
          <h4>Weak Ordering Replay</h4>
          <p>ARM weakly-ordered 모델에선 다른 코어의 observation이 순서를 깨면 load replay가 일어날 수 있음. 배리어(DMB / LDAR / STLR)가 이 창을 닫음.</p>
        </div>
      </div>

      <h2>캐시 레이턴시 &amp; 프리페처 <span className="en">/ Latency &amp; Prefetchers</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>레벨</th><th>크기 (per core)</th><th>Load-use latency</th><th>비고</th></tr></thead>
          <tbody>
            <tr><td>L1D</td><td>32 ~ 64 KB</td><td>4 cycle</td><td>non-blocking, MSHR, 4-way+</td></tr>
            <tr><td>L1I</td><td>32 ~ 64 KB</td><td>—</td><td>BPU와 decouple, prediction-driven prefetch</td></tr>
            <tr><td>L2</td><td>512 KB ~ 2 MB</td><td>10 ~ 12 cycle</td><td>PIPT, unified I+D, 8-way+</td></tr>
            <tr><td>SLC / LLC</td><td>~1 ~ 16 MB</td><td>30 ~ 60 cycle</td><td>DSU(DynamIQ) 또는 CMN mesh 공유</td></tr>
            <tr><td>DRAM</td><td>—</td><td>150 ~ 250 cycle</td><td>bandwidth-bound 영역</td></tr>
          </tbody>
        </table>
      </div>
      <div className="grid2">
        <div className="card">
          <h4>Stride / Stream</h4>
          <p>연속 miss 주소 간 Δ가 일정하면 n-step 앞서 prefetch. 배열 선형 순회 기본 커버.</p>
        </div>
        <div className="card">
          <h4>Region / SMS</h4>
          <p><b>Spatial Memory Streaming</b> — region 단위 access pattern을 기억했다 재방문 시 동일 패턴 prefetch.</p>
        </div>
        <div className="card">
          <h4>Correlation / Temporal</h4>
          <p>miss 주소 시퀀스 학습 → 비선형 포인터 체이싱 대응. 고성능 Neoverse 급에서 핵심.</p>
        </div>
        <div className="card">
          <h4>Throttling</h4>
          <p>너무 aggressive → cache pollution, DRAM BW 낭비. HW가 coverage / accuracy 지표로 동적 throttling.</p>
        </div>
      </div>

      <h2>SVE / SVE2 <span className="en">/ Scalable Vector Extension</span></h2>
      <p>SVE는 벡터 길이(<code>VL</code>)를 128 ~ 2048-bit 사이에서 <b>구현이 선택</b>. SW는 VL을 모르고 <code>predicate</code> 레지스터로 tail을 안전하게 처리하는 <b>VL-agnostic</b> 모델.</p>
      <pre><code>
<span className="kw">whilelo</span>  p0.s, x0, x1               <span className="cmt">{"// i < n 을 predicate로 생성"}</span>{"\n"}
<span className="kw">ld1w</span>     {"{"} z0.s {"}"}, p0/z, [x2, x0, lsl <span className="num">#2</span>]  <span className="cmt">{"// predicate-zeroed gather load"}</span>{"\n"}
<span className="kw">fadd</span>     z0.s, p0/m, z0.s, z1.s     <span className="cmt">{"// merge semantics (predicate mask)"}</span>{"\n"}
<span className="kw">st1w</span>     {"{"} z0.s {"}"}, p0, [x3, x0, lsl <span className="num">#2</span>]{"\n"}
<span className="kw">incw</span>     x0                         <span className="cmt">{"// i += VL/32 — VL-agnostic"}</span>
      </code></pre>
      <div className="callout">
        <span className="icon">💡</span>
        <div>동일 바이너리가 SVE 128 / 256 / 512-bit 구현에서 그대로 스케일링. <b>SVE2</b> (ARMv9.0)는 DSP/ML 지향 정수 연산·BFloat16·INT8 dot product를 보강 — NEON 대체까지 의도.</div>
      </div>

      <h2>PMU / Top-down 분석 <span className="en">/ Performance Counters</span></h2>
      <p>PMU(<code>PMCCNTR_EL0</code> + <code>PMEVCNTR{"<n>"}_EL0</code>)로 이벤트를 세어 병목을 찾는 방법론. Arm은 top-down level 1/2를 공식 문서로 제공.</p>
      <div className="grid2">
        <div className="card">
          <h4>Top-down L1 4-way split</h4>
          <p>각 dispatch slot을:<br/>
            <span className="tag info">Retiring</span>
            <span className="tag warn">Bad Spec</span>
            <span className="tag hot">Frontend Bound</span>
            <span className="tag new">Backend Bound</span><br/>
            으로 분류 → 병목 구간 특정.</p>
        </div>
        <div className="card">
          <h4>필수 이벤트</h4>
          <p><code>CPU_CYCLES</code>, <code>INST_RETIRED</code>, <code>STALL_FRONTEND</code>, <code>STALL_BACKEND</code>, <code>BR_MIS_PRED_RETIRED</code>, <code>L1D_CACHE_REFILL</code>, <code>LL_CACHE_MISS_RD</code>, <code>DTLB_WALK</code></p>
        </div>
        <div className="card">
          <h4>메모리 계층 분석</h4>
          <p>각 레벨 miss + prefetch coverage로 hierarchy 병목 식별. <b>MPKI = 1000 × misses / instructions</b> 지표 표준.</p>
        </div>
        <div className="card">
          <h4>SPE (Statistical Profiling)</h4>
          <p>ARMv8.2-A <b>Statistical Profiling Extension</b> — 샘플당 latency · issue/retire 타임스탬프 · 메모리 주소 제공. Intel PEBS / AMD IBS 와 같은 위치.</p>
        </div>
      </div>

      <h2>스펙 미티게이션 <span className="en">/ Speculation Controls</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>기능</th><th>ARM ext</th><th>목적</th></tr></thead>
          <tbody>
            <tr><td><code>CSDB</code></td><td>v8.0+</td><td>Consumption-of-Speculative-Data Barrier — Spectre v1 array bounds bypass 차단</td></tr>
            <tr><td><code>SB</code></td><td>v8.5</td><td>Speculation Barrier — 이후 명령이 speculative data를 소비하지 못하도록</td></tr>
            <tr><td><code>DIT</code></td><td>v8.4</td><td>Data Independent Timing — 특정 명령의 타이밍이 피연산자 값에 의존 X (crypto 사이드채널)</td></tr>
            <tr><td><code>BTI</code></td><td>v8.5</td><td>Branch Target Identification — indirect branch landing을 <code>BTI</code> 명령 있는 곳으로 제한 (JOP 방어)</td></tr>
            <tr><td><code>PAuth</code></td><td>v8.3</td><td>Pointer Authentication — LR 등 포인터에 PAC 삽입 (ROP 방어)</td></tr>
            <tr><td><code>CSV2 / CSV3</code></td><td>v8.0~</td><td>Branch / context 기반 side-channel 격리 보장 feature bit</td></tr>
            <tr><td><code>MTE</code></td><td>v8.5</td><td>Memory Tagging — 할당 tag와 포인터 tag 매칭으로 UAF/OOB 탐지</td></tr>
          </tbody>
        </table>
      </div>

      <h2>SMT · DSU · 클러스터 <span className="en">/ Cluster Aspects</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>SMT (Neoverse V3)</h4>
          <p>2-way SMT 도입. 실행 포트·캐시·TLB를 두 HW 스레드가 공유 — 서버 워크로드의 idle slot 회수 목적.</p>
        </div>
        <div className="card">
          <h4>DynamIQ Shared Unit (DSU)</h4>
          <p>최대 8 ~ 12 코어가 L3 + SCU 공유. snoop filter로 coherency traffic 감소. big.LITTLE 혼성 관리.</p>
        </div>
        <div className="card">
          <h4>CMN Mesh</h4>
          <p>Neoverse는 <code>CMN-700</code> 메시로 수십 ~ 수백 코어 확장. HN-F (home node)가 분산 directory 역할.</p>
        </div>
        <div className="card">
          <h4>WFI / WFE / Retention</h4>
          <p>idle 시 clock gate + state retention. WFE는 <code>SEV</code>로 wake, GIC wake-up도 지원. 전력 상태 전이는 PSCI 로 제어.</p>
        </div>
      </div>

      <h2>참고 코어 스펙 요약 <span className="en">/ Reference Specs</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>코어</th><th>Decode</th><th>ROB</th><th>L1D / L2</th><th>특기</th></tr></thead>
          <tbody>
            <tr><td><code>Cortex-A710</code></td><td>5-wide</td><td>~160</td><td>64 KB / 512 KB</td><td>ARMv9 mid-perf</td></tr>
            <tr><td><code>Cortex-X2</code></td><td>8-wide</td><td>~288</td><td>64 KB / 1 MB</td><td>flagship 성능 위주</td></tr>
            <tr><td><code>Neoverse N2</code></td><td>5-wide</td><td>~160</td><td>64 KB / 1 MB</td><td>scale-out 서버</td></tr>
            <tr><td><code>Neoverse V2</code></td><td>8-wide</td><td>~320</td><td>64 KB / 2 MB</td><td>Grace, SVE2 256-bit</td></tr>
            <tr><td><code>Neoverse V3</code></td><td>8+ wide</td><td>~400+</td><td>64 KB / 3 MB</td><td>2-way SMT 도입</td></tr>
          </tbody>
        </table>
      </div>

      <div className="callout warn">
        <span className="icon">⚠️</span>
        <div>위 수치는 공개된 자료(Arm Tech Day, Chips and Cheese, Anandtech deep-dive, 공식 TRM)를 종합한 <b>추정치</b>입니다. 같은 코어도 SoC별 configurable 파라미터(L2/L3 크기, prefetcher profile, coherency 깊이)에 따라 달라질 수 있으니 정확한 값은 해당 코어의 TRM을 참조하세요.</div>
      </div>
    </>
  )
}
