export default function DramController() {
  return (
    <>
      <h2>왜 DRAM 컨트롤러가 성능을 가른다 <span className="en">/ Why It Matters</span></h2>
      <p>코어가 아무리 빨라도 미스는 결국 DRAM 까지 내려갑니다. DRAM 은 <b>SRAM 대비 수십 배 느리고</b>, 내부 구조상 <b>순서·타이밍·refresh 제약</b>이 얽혀 있어서 같은 총 BW 가 있어도 <b>실효 대역폭</b>이 20 ~ 80% 까지 흔들립니다. 이 손실/회복을 책임지는 것이 memory controller 의 핵심 역할.</p>
      <div className="grid3">
        <div className="card">
          <h4>Cycle cost</h4>
          <p>L1 ~4 cyc, L2 ~12 cyc, LLC 30 ~ 60 cyc, <b>DRAM 150 ~ 250 cyc</b>. A single LLC miss costs the pipeline tens of cycles.</p>
        </div>
        <div className="card">
          <h4>Effective BW ≠ peak BW</h4>
          <p>Row miss · refresh · read/write turnaround all eat into the spec — <b>60 ~ 85% of peak is realistic</b>.</p>
        </div>
        <div className="card">
          <h4>Latency vs BW trade-off</h4>
          <p>Reordering requests boosts BW but moves individual latencies. Tuned via <b>QoS</b>.</p>
        </div>
      </div>

      <h2>DRAM 구조 <span className="en">/ Anatomy</span></h2>
      <div className="diagram">{`Channel ─┬─ Rank 0 ──┬─ Bank Group 0 ── Bank 0, Bank 1, Bank 2, Bank 3
         │           ├─ Bank Group 1 ── Bank 0, Bank 1, Bank 2, Bank 3
         │           └─ Bank Group 2 …
         └─ Rank 1 ──┴─ …

Inside a bank:
   ┌─────────────────────────────┐
   │   row × column grid          │
   │   (e.g. 65536 × 1024 bits)   │
   └────────────┬─────────────────┘
                │ ACT (activate) → pull a row into the sense amps (row buffer)
                │ RD / WR       → access columns from the row buffer
                │ PRE (precharge) → close the row, ready next ACT`}</div>
      <div className="grid2">
        <div className="card">
          <h4>Channel</h4>
          <p>Independent data bus + command bus. More channels = more <b>parallel BW</b> (servers: 4 ~ 12ch, mobile: 2 ~ 4ch).</p>
        </div>
        <div className="card">
          <h4>Rank</h4>
          <p>A group of chips that share a channel. Switching ranks needs data-bus turnaround (<code>tRTRS</code>).</p>
        </div>
        <div className="card">
          <h4>Bank Group (DDR4+)</h4>
          <p>Banks are clustered into groups: <b>fast across groups (<code>tCCD_S</code>), slow within a group (<code>tCCD_L</code>)</b>. Inter-group interleaving is the key optimization.</p>
        </div>
        <div className="card">
          <h4>Bank</h4>
          <p>An array with its own row buffer. DDR5 scales this up to <b>32 banks per channel (8 groups × 4)</b>.</p>
        </div>
      </div>

      <h2>기본 커맨드 & 타이밍 <span className="en">/ Commands & Timing</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Parameter</th><th>Meaning</th><th>DDR4-3200 e.g.</th><th>DDR5-6400 e.g.</th></tr></thead>
          <tbody>
            <tr><td><code>tRCD</code></td><td>ACT → RD/WR minimum delay (cost of opening a row)</td><td>~13.75 ns</td><td>~14 ns</td></tr>
            <tr><td><code>tRP</code></td><td>PRE → next ACT minimum delay (cost of closing a row)</td><td>~13.75 ns</td><td>~14 ns</td></tr>
            <tr><td><code>tCL</code> / CAS</td><td>RD command → first data</td><td>~13.75 ns (CL22)</td><td>~14 ns (CL40)</td></tr>
            <tr><td><code>tRAS</code></td><td>ACT → PRE minimum hold (minimum row-open time)</td><td>~32 ns</td><td>~32 ns</td></tr>
            <tr><td><code>tRC</code></td><td>ACT → next ACT on same bank (= tRAS+tRP)</td><td>~46 ns</td><td>~46 ns</td></tr>
            <tr><td><code>tRRD_L / _S</code></td><td>min interval between ACTs in same / different bank groups</td><td>~5 ns / ~2.5 ns</td><td>~5 ns / ~2.5 ns</td></tr>
            <tr><td><code>tFAW</code></td><td>4 ACTs in a rolling window — current limit</td><td>~21 ns</td><td>~13.3 ns</td></tr>
            <tr><td><code>tWR</code></td><td>last write data → PRE</td><td>~15 ns</td><td>~30 ns</td></tr>
            <tr><td><code>tRFC</code></td><td>refresh duration (rises with capacity)</td><td>~350 ns (16 Gb)</td><td>~295 ns (16 Gb)</td></tr>
          </tbody>
        </table>
      </div>
      <div className="callout">
        <span className="icon">💡</span>
        <div>스펙시트의 <code>CL</code>/<code>tRCD</code>/<code>tRP</code> 는 거의 그대로지만 I/O 속도가 올라서 <b>cycle 수</b>로는 DDR5 가 더 큼. 즉 "같은 ns" 지만 "더 많은 사이클" 동안 stall — 고IPC 코어일수록 latency 체감이 오히려 커질 수 있음.</div>
      </div>

      <h2>Row Buffer & Policy <span className="en">/ Row Buffer Locality</span></h2>
      <p>같은 row 를 연달아 읽으면 <b>row hit</b> — <code>tRCD</code>/<code>tRP</code> 없이 column access(<code>tCL</code>)만 지불. 다른 row 면 <b>row miss</b> — PRE → ACT → RD 로 풀 페널티.</p>
      <div className="grid2">
        <div className="card">
          <h4>Open Page policy</h4>
          <p>Keeps the row open after a request → highest speed when the same row is revisited. Hurts random access (next ACT pays the full price).</p>
        </div>
        <div className="card">
          <h4>Closed Page policy</h4>
          <p>Issues PRE right after each request. Even latency for random patterns; lower hit rate.</p>
        </div>
        <div className="card">
          <h4>Adaptive</h4>
          <p>Watches recent locality and picks open / closed dynamically. The default in modern controllers.</p>
        </div>
        <div className="card">
          <h4>Row-hit latency win</h4>
          <p>A burst of row hits delivers <b>2 ~ 3× the effective BW</b> compared to a hit/miss mix. Prefetchers and sequencers aim for this.</p>
        </div>
      </div>

      <h2>Address Mapping <span className="en">/ Physical → DRAM 좌표</span></h2>
      <p>물리 주소가 (Channel, Rank, Bank Group, Bank, Row, Column) 어디로 매핑되느냐에 따라 워크 패턴이 달라집니다. 보통 <b>low-order bit 을 channel / bank group 에 분배</b>해 연속 접근을 자동으로 interleave.</p>
      <div className="diagram">{`  | row | bank | bank_group | rank | channel | column | byte |
    MSB                                                       LSB

  ─ column: contiguous within a row — maximize row hits
  ─ channel/bank_group: route the next line to a different channel/BG — parallelism
  ─ rank/row: high-order bits — genuinely different pages`}</div>
      <div className="grid2">
        <div className="card">
          <h4>Hash-based mapping</h4>
          <p>Plain bit-slice mapping is vulnerable to bad patterns (power-of-2 stride). XOR hashing <b>spreads</b> accesses and avoids hotspots.</p>
        </div>
        <div className="card">
          <h4>NUMA interleaving</h4>
          <p>Socket / channel interleaving policy is chosen by firmware. The "channel interleave granularity" BIOS option is this knob.</p>
        </div>
      </div>

      <h2>스케줄링 <span className="en">/ Command Scheduling</span></h2>
      <p>컨트롤러는 요청 큐 안의 여러 항목 중 <b>타이밍 제약을 만족시키면서 실효 BW 를 최대화</b>하도록 재배열합니다.</p>
      <div className="grid2">
        <div className="card">
          <h4>FR-FCFS</h4>
          <p>First-Ready, First-Come-First-Served. <b>Prioritizes row-hit requests</b>, breaking ties by arrival order. The canonical way to exploit row-buffer locality.</p>
        </div>
        <div className="card">
          <h4>PAR-BS</h4>
          <p>Groups requests from the same thread into <b>batches</b> for inter-core fairness.</p>
        </div>
        <div className="card">
          <h4>Write Draining</h4>
          <p>When the write queue hits the high watermark, reads are paused and a <b>write burst</b> drains it — amortizing the turnaround cost in one shot.</p>
        </div>
        <div className="card">
          <h4>Read-Write Turnaround</h4>
          <p>Cost of flipping the bus direction (<code>tRTW</code>, <code>tWTR</code>). Frequent flipping wastes BW — that's why batching helps.</p>
        </div>
      </div>

      <h2>Refresh <span className="en">/ tREFI & Refresh Modes</span></h2>
      <p>DRAM cell 은 주기적으로 재충전이 필요. 평균 <code>tREFI</code>(~7.8 μs) 마다 refresh 를 발행해야 함 — 그 동안 해당 bank 는 접근 불가.</p>
      <div className="grid2">
        <div className="card">
          <h4>All-bank refresh</h4>
          <p>Refreshes every bank in a rank at once. Simple, but the <b>stall window</b> is large.</p>
        </div>
        <div className="card">
          <h4>Per-bank refresh (DDR5/LPDDR)</h4>
          <p>Splits refresh across banks — access blackouts are spread out, latency variance drops.</p>
        </div>
        <div className="card">
          <h4>Fine-grained / Same-bank (DDR5)</h4>
          <p>Refreshes only the same bank number across ranks → preserves bank-level parallelism.</p>
        </div>
        <div className="card">
          <h4>Temp-compensated</h4>
          <p>Higher temperature → more leakage → shorter refresh period (relaxed when cool). <b>DDR5 adjusts automatically using on-die sensors</b>.</p>
        </div>
      </div>

      <h2>DDR5 가 바꾼 것 <span className="en">/ DDR4 → DDR5</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Item</th><th>DDR4</th><th>DDR5</th></tr></thead>
          <tbody>
            <tr><td>Data rate</td><td>2133 ~ 3200 MT/s</td><td>4800 ~ 8400+ MT/s</td></tr>
            <tr><td>Channel structure</td><td><b>1 × 64-bit</b> per DIMM</td><td><b>2 × 32-bit sub-channels</b> per DIMM</td></tr>
            <tr><td>Burst length</td><td>BL8 (64 B)</td><td>BL16 (64 B per sub-channel)</td></tr>
            <tr><td>Bank</td><td>16 banks (4 BG × 4)</td><td>32 banks (8 BG × 4)</td></tr>
            <tr><td>Refresh</td><td>all-bank / per-bank</td><td>same-bank / fine-grained</td></tr>
            <tr><td>On-die ECC</td><td>optional</td><td>mandatory</td></tr>
            <tr><td>PMIC</td><td>off-DIMM</td><td><b>on-DIMM</b> PMIC 1.1 V</td></tr>
          </tbody>
        </table>
      </div>
      <div className="callout">
        <span className="icon">💡</span>
        <div>DDR5 의 <b>sub-channel 분리</b> 가 중요: 한 DIMM 이지만 두 독립 32-bit 채널처럼 동작 → small-request 동시성이 크게 개선. 메모리 컨트롤러도 채널 수가 사실상 2배.</div>
      </div>

      <h2>LPDDR · HBM 짧게 <span className="en">/ Cousins</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>LPDDR5 / 5X</h4>
          <p>Mobile low-power. <b>Many 16-bit channels + on-die ECC + deep power down</b>. LPDDR5X reaches ~8533 MT/s.</p>
        </div>
        <div className="card">
          <h4>HBM3 / HBM3e</h4>
          <p>TSV stacking + wide I/O (1024 bits × stack). GPU/AI memory. <b>Hundreds of GB/s per stack</b>, TB/s class for the whole package.</p>
        </div>
        <div className="card">
          <h4>GDDR6X / 7</h4>
          <p>Graphics DRAM. PAM4/PAM3 signaling pushes pin-level speed to the limit; latency matters less than for DDR.</p>
        </div>
        <div className="card">
          <h4>CXL.mem</h4>
          <p>Not DRAM itself, but to the host it's "another memory tier". Interacts with DRAM-controller policy in <b>tiered-memory placement</b>.</p>
        </div>
      </div>

      <h2>신뢰성 · RowHammer <span className="en">/ Reliability</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>ECC (SEC-DED)</h4>
          <p>Single-bit correct, double-bit detect. DDR5 has <b>on-die ECC</b> (compensates process noise) plus server-class <b>system ECC</b> (channel-level).</p>
        </div>
        <div className="card">
          <h4>Chipkill</h4>
          <p>Recovers from a full DRAM-chip failure. A must-have for server RAS.</p>
        </div>
        <div className="card">
          <h4>RowHammer / RFM</h4>
          <p>Repeated ACT on the same row → bit flips in adjacent rows. Late DDR4 added <b>TRR</b>; DDR5 uses the <b>RFM</b> (Refresh Management) command so the controller can issue explicit targeted refreshes.</p>
        </div>
        <div className="card">
          <h4>Patrol Scrub</h4>
          <p>Controller periodically reads through the address space to <b>prevent soft-error accumulation</b>. A server BIOS option.</p>
        </div>
      </div>

      <h2>QoS 와 Arbiter <span className="en">/ QoS</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>Latency vs BW classes</h4>
          <p>CPU wants low latency, GPU / display wants <b>deadline-driven BW</b>. Coexistence requires priority queues + deadlines in the same controller.</p>
        </div>
        <div className="card">
          <h4>Display underrun</h4>
          <p>If display refresh starves for data the screen tears — display traffic is promoted to a <b>hard real-time</b> top-priority class.</p>
        </div>
        <div className="card">
          <h4>Starvation avoidance</h4>
          <p>Prevents aging / priority inversion — long-waiting low-priority requests are promoted.</p>
        </div>
        <div className="card">
          <h4>ARM QoS-400 / CMN QoS</h4>
          <p>The controller interprets the <b>QoS class</b> propagated from the upper SoC (CMN/NoC) → consistent policy across the fabric.</p>
        </div>
      </div>

      <h2>관측 & 튜닝 <span className="en">/ Observability</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Metric</th><th>Source</th><th>Interpretation</th></tr></thead>
          <tbody>
            <tr><td>Row hit rate</td><td>controller PMU</td><td>high = OK; low = revisit address mapping / prefetcher</td></tr>
            <tr><td>Bank conflict rate</td><td>controller PMU</td><td>high = insufficient bank-group interleaving</td></tr>
            <tr><td>Read/Write turnarounds</td><td>controller PMU</td><td>many = retune the write-drain watermark</td></tr>
            <tr><td>Refresh occupancy</td><td>PMU; 5 ~ 10% on large DIMMs</td><td>enable per-bank refresh to mitigate</td></tr>
            <tr><td>CPU-side LLC miss</td><td>perf / Arm PMU</td><td>predicts DRAM traffic from MPKI</td></tr>
            <tr><td>STREAM / MLC</td><td>user benchmarks</td><td>measure effective BW — efficiency vs spec</td></tr>
          </tbody>
        </table>
      </div>

      <h2>함정 <span className="en">/ Pitfalls</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>Power-of-2 Stride</h4>
          <p>Walking a 2^n-sized array piles all accesses onto the same bank → <b>bank-conflict explosion</b>. Adjust padding / stride to break the alignment.</p>
        </div>
        <div className="card">
          <h4>False BW Saturation</h4>
          <p>Often the core simply lacks outstanding requests — fix MLP first before blaming DRAM.</p>
        </div>
        <div className="card">
          <h4>Refresh Storm</h4>
          <p>High-capacity (32 ~ 64 Gb) DIMMs have long <code>tRFC</code> → big latency spikes during refresh. Check that per-bank / fine-grained refresh is enabled.</p>
        </div>
        <div className="card">
          <h4>NUMA mismatch</h4>
          <p>Remote-channel access is <b>2 ~ 3× slower</b>. Always inspect page placement / <code>numactl</code>.</p>
        </div>
      </div>

      <h2>한 줄 정리 <span className="en">/ Cheat Sheet</span></h2>
      <div className="callout">
        <span className="icon">📌</span>
        <div>
          <ul style={{margin: 0, paddingLeft: 18}}>
            <li>DRAM 접근 비용은 <b>row hit ≪ row miss</b>, 차이 2 ~ 3 배.</li>
            <li>DDR5 는 <b>sub-channel 2 개 + bank 32 개 + RFM</b> 이 핵심 변화.</li>
            <li>주소 매핑은 <b>low bit = channel/BG</b> 로 흩어야 병렬성 확보.</li>
            <li>FR-FCFS + write draining + 적응형 page policy 가 표준 스케줄러.</li>
            <li>실효 BW 체크는 <b>STREAM/MLC</b>, latency/variance 는 <b>refresh·bank conflict PMU</b>.</li>
          </ul>
        </div>
      </div>
    </>
  )
}
