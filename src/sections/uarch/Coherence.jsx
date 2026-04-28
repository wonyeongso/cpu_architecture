export default function Coherence() {
  return (
    <>
      <h2>왜 코히어런스가 필요한가 <span className="en">/ Why Coherence</span></h2>
      <p>멀티코어에서 각 코어는 <b>자기 L1/L2에 사본</b>을 두기 때문에, 어느 코어 하나의 store가 다른 코어에 <i>언제</i>·<i>어떻게</i> 보이는지 규정해야 프로그래머가 공유 변수 논리를 세울 수 있습니다. 이 "언제"에 답하는 것이 <b>memory consistency</b>이고, "어떻게 사본 일관성 유지"를 답하는 것이 <b>cache coherence</b>입니다.</p>
      <div className="grid3">
        <div className="card">
          <h4>Coherence ≠ Consistency</h4>
          <p>Coherence = same-address reads/writes have a global order. Consistency = ordering rules across different-address accesses. ARM is <b>weakly-ordered</b>.</p>
        </div>
        <div className="card">
          <h4>SWMR invariant</h4>
          <p>Single-Writer Multiple-Reader — at any instant, a line is either <b>uniquely written</b> or <b>shared read-only</b>.</p>
        </div>
        <div className="card">
          <h4>Data-Value invariant</h4>
          <p>A reader sees the most recent writer's value or the initial value. Prevents stale sharing.</p>
        </div>
      </div>

      <h2>상태 기반 프로토콜 <span className="en">/ State Protocols</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>State</th><th>Meaning</th><th>MESI</th><th>MOESI</th><th>MESIF</th></tr></thead>
          <tbody>
            <tr><td><code>M</code> Modified</td><td>exclusive + dirty, out of sync with memory</td><td>✓</td><td>✓</td><td>✓</td></tr>
            <tr><td><code>O</code> Owned</td><td>shared + dirty, this node owns write-back</td><td>—</td><td>✓</td><td>—</td></tr>
            <tr><td><code>E</code> Exclusive</td><td>sole copy, clean</td><td>✓</td><td>✓</td><td>✓</td></tr>
            <tr><td><code>S</code> Shared</td><td>multiple copies, clean</td><td>✓</td><td>✓</td><td>✓</td></tr>
            <tr><td><code>I</code> Invalid</td><td>invalid</td><td>✓</td><td>✓</td><td>✓</td></tr>
            <tr><td><code>F</code> Forward</td><td>designated <b>responder</b> among Shared copies — caps broadcast traffic</td><td>—</td><td>—</td><td>✓</td></tr>
          </tbody>
        </table>
      </div>
      <div className="grid2">
        <div className="card">
          <h4>MESI</h4>
          <p>Classic Intel. Shared-dirty requires write-back. Simple to implement, but high broadcast cost.</p>
        </div>
        <div className="card">
          <h4>MOESI</h4>
          <p>AMD / ARM family. Adds <code>O</code> so dirty data can be shared via <b>cache-to-cache transfer</b> without write-back — saves DRAM traffic.</p>
        </div>
        <div className="card">
          <h4>MESIF</h4>
          <p>Intel QPI/UPI. <code>F</code> elects one responder among shared copies → caps NoC broadcast traffic.</p>
        </div>
        <div className="card">
          <h4>ARM AMBA ACE · CHI</h4>
          <p>Superset of MOESI. ACE uses 5 states (UC/UD/SC/SD/I + dirty/unique decomposition); CHI adds further granularity.</p>
        </div>
      </div>

      <h2>MESI vs MOESI — 상세 비교 <span className="en">/ Head-to-Head</span></h2>
      <p>핵심 차이는 단 하나: <b>MOESI에 <code>O</code>(Owned) 상태가 있느냐</b>.
      이 한 상태가 <b>DRAM 트래픽</b>, <b>공유 지연</b>, <b>프로토콜 복잡도</b>에 꽤 큰 영향을 줍니다.</p>

      <h3>같은 시나리오, 다른 동작</h3>
      <p>두 코어가 같은 캐시 라인을 공유하고 한 쪽이 <b>dirty(쓴 상태)</b>인데, 다른 코어가 읽기 요청을 한다고 해봅시다.</p>

      <div className="grid2">
        <div className="card">
          <h4>MESI — 반드시 write-back</h4>
          <p>Dirty 상태는 <code>M</code>밖에 없고, <code>M</code>은 "<b>독점 + dirty</b>"이기 때문에 공유 불가.
          다른 코어가 읽으려 하면:</p>
          <pre style={{ margin: '6px 0 0', fontSize: 11 }}><code>
Core0:  M  ─write-back→  DRAM
Core0:  M  →  S
Core1:  I  →  S           <span className="cmt">{"// then reads from DRAM"}</span>
          </code></pre>
          <p style={{ marginTop: 8 }}>→ <b>DRAM 왕복 1회 발생</b>. 데이터는 일단 memory로 내려갔다가 다시 올라옴.</p>
        </div>
        <div className="card">
          <h4>MOESI — cache-to-cache 직접 전달</h4>
          <p><code>O</code>는 "<b>공유 가능한 dirty</b>"를 허용. 요청자에게 캐시에서 바로 넘기고 write-back은 지연.</p>
          <pre style={{ margin: '6px 0 0', fontSize: 11 }}><code>
Core0:  M  ─data→  Core1    <span className="cmt">{"// cache-to-cache transfer"}</span>
Core0:  M  →  O            <span className="cmt">{"// Core0 takes write-back responsibility"}</span>
Core1:  I  →  S            <span className="cmt">{"// Core1 holds a clean copy"}</span>
DRAM:                      <span className="cmt">{"// untouched"}</span>
          </code></pre>
          <p style={{ marginTop: 8 }}>→ <b>DRAM 트래픽 0</b>. dirty 데이터가 한 번도 memory로 가지 않고 공유됨.</p>
        </div>
      </div>

      <h3>O state의 역할 — "누가 write-back 할 책임을 지나"</h3>
      <p>MOESI에서 dirty 라인을 공유하려면 <b>언젠간 누군가 DRAM에 써야</b> 합니다(evict 시). 그 책임자를 <code>O</code> 상태 노드가 짊어짐:</p>
      <ul>
        <li>다른 공유 사본들은 <code>S</code> — read-only, write-back 책임 없음</li>
        <li><code>O</code> 보유자가 evict 될 때 <b>DRAM에 write-back</b> 수행</li>
        <li><code>O</code> 보유자가 새 공유자에게 데이터 공급 (snoop 응답)</li>
        <li><code>O</code> 보유자가 쓰기 시 → <code>M</code>으로 올라가며 다른 <code>S</code>들을 invalidate</li>
      </ul>

      <h3>상태 전이 비교</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>이벤트</th><th>MESI 동작</th><th>MOESI 동작</th></tr></thead>
          <tbody>
            <tr><td>로컬 Read hit (M)</td><td>M 유지</td><td>M 유지</td></tr>
            <tr><td>원격 Read 요청 (M)</td><td><b>write-back</b> 후 M→S</td><td>M→O, <b>캐시 전달</b>, 원격은 S</td></tr>
            <tr><td>원격 Read 요청 (O)</td><td>— (상태 없음)</td><td>O 유지, 캐시 전달</td></tr>
            <tr><td>로컬 Write (O)</td><td>—</td><td>O→M, 다른 S들 invalidate</td></tr>
            <tr><td>Evict (O)</td><td>—</td><td>DRAM write-back 후 I</td></tr>
            <tr><td>Evict (M)</td><td>write-back 후 I</td><td>write-back 후 I</td></tr>
          </tbody>
        </table>
      </div>

      <h3>성능 · 구현 관점 비교</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>관점</th><th>MESI</th><th>MOESI</th></tr></thead>
          <tbody>
            <tr><td>상태 bit</td><td>2 bit</td><td>3 bit (또는 2+1 encoding)</td></tr>
            <tr><td>Shared-dirty 전달</td><td>불가 — DRAM 경유</td><td>가능 — cache-to-cache</td></tr>
            <tr><td>DRAM 트래픽</td><td>higher (공유 시마다 WB)</td><td>lower</td></tr>
            <tr><td>공유 read 지연</td><td>DRAM latency (~80 ns)</td><td>캐시 간 전송 (~20 ns)</td></tr>
            <tr><td>구현 복잡도</td><td>단순</td><td>O→M upgrade, ownership 이전 로직 필요</td></tr>
            <tr><td>Snoop 트래픽</td><td>비슷</td><td>비슷 (상태만 추가, 메시지는 유사)</td></tr>
            <tr><td>써짐</td><td>Intel 옛 버스 (P6, Core2)</td><td>AMD K7부터, ARM, 대부분 현대 ARM CHI/ACE</td></tr>
          </tbody>
        </table>
      </div>

      <h3>실제 시스템 매핑</h3>
      <div className="grid2">
        <div className="card">
          <h4>Intel — MESI → MESIF</h4>
          <p>전통적 MESI. 멀티소켓에서 shared read 응답이 여러 소켓에서 터져 나오는 걸 막기 위해 <b><code>F</code>(Forward)</b> 추가 — 동일 데이터를 가진 여러 <code>S</code> 중 <b>하나만</b>이 응답 담당. Dirty 공유는 여전히 write-back 경유.</p>
        </div>
        <div className="card">
          <h4>AMD — MOESI</h4>
          <p>K7(Athlon)부터 MOESI 채택. HT(HyperTransport) 위에서 cache-to-cache 전달이 표준. 소켓간 dirty 공유도 write-back 없이.</p>
        </div>
        <div className="card">
          <h4>ARM ACE — MOESI 변형</h4>
          <p>5-state: <code>UC</code>(Unique Clean), <code>UD</code>(Unique Dirty), <code>SC</code>(Shared Clean), <code>SD</code>(Shared Dirty), <code>I</code>. 개념적으로 MOESI와 일치 — <code>SD</code>가 <code>O</code>에 해당.</p>
        </div>
        <div className="card">
          <h4>ARM CHI — 확장 MOESI</h4>
          <p>UC/UD/SC/SD/I에 <b>Passing Dirty</b>·<b>Ownership transfer</b> 세밀화. CMN mesh에서 HN-F(home node)가 directory 관리 + snoop filtering 수행.</p>
        </div>
      </div>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>왜 Intel은 MOESI로 안 갔나?</b> MESIF로도 멀티소켓에서 충분한 성능이 나왔고, shared-dirty 시나리오가 실제 워크로드에서 드물다는 판단. 반면 AMD/ARM은 처음부터 MOESI로 설계해 공유 heavy 워크로드(DB, HPC)에서 이점.</div>
      </div>

      <div className="callout warn">
        <span className="icon">⚠</span>
        <div><b>false sharing 주의.</b> MESI든 MOESI든 "같은 라인을 <b>쓰는</b> 코어가 여럿"이면 성능은 무너집니다 — 매 write마다 invalidate 폭주. 프로토콜이 아니라 데이터 레이아웃이 해결책(<code>alignas(64)</code>, per-CPU 변수).</div>
      </div>

      <h2>Snooping vs Directory <span className="en">/ Topology</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>Snooping (broadcast)</h4>
          <p>모든 coherent 노드에 request를 broadcast → 소수 코어에 단순·저레이턴시. 노드 수가 늘면 <b>N² broadcast</b>로 스케일 한계.</p>
        </div>
        <div className="card">
          <h4>Directory-based</h4>
          <p>"어느 노드가 이 라인을 가졌나"를 중앙 또는 분산 directory 가 추적. 관련 노드에만 메시지 발송 → 스케일링 우수. <b>CMN-700 HN-F 가 분산 directory</b>.</p>
        </div>
      </div>
      <div className="callout">
        <span className="icon">💡</span>
        <div>DSU(DynamIQ)까지는 <b>snoop filter + bus</b> 구조로 소수 코어 묶음, Neoverse 서버는 <b>CMN mesh + 분산 directory(HN-F)</b>로 확장 — 같은 회사 같은 ISA지만 물리 인터커넥트가 완전히 다릅니다.</div>
      </div>

      <h2>AMBA 코히어런트 프로토콜 <span className="en">/ AXI · ACE · CHI</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>프로토콜</th><th>스코프</th><th>특징</th><th>사용처</th></tr></thead>
          <tbody>
            <tr><td><code>AXI4</code></td><td>non-coherent</td><td>read/write 채널 분리, burst, outstanding</td><td>IP ↔ memory 일반</td></tr>
            <tr><td><code>AXI5</code></td><td>non-coherent +</td><td>atomics, QoS, user sideband 확장</td><td>현대 SoC 기본</td></tr>
            <tr><td><code>ACE</code></td><td>full coherent</td><td>5-state, snoop 채널(ACE-lite 제외)</td><td>DSU, 소규모 cluster</td></tr>
            <tr><td><code>ACE-Lite</code></td><td>I/O coherent</td><td>coherent <b>읽기만</b> 참여, cache 없음</td><td>GPU, DMA, accelerator</td></tr>
            <tr><td><code>CHI</code></td><td>mesh coherent</td><td>packet 기반, REQ/RSP/SNP/DAT 4채널, 확장 state</td><td>Neoverse + CMN</td></tr>
          </tbody>
        </table>
      </div>
      <div className="callout">
        <span className="icon">⚠️</span>
        <div>많은 accelerator가 실수로 <b>ACE-Lite만 쓰면서 coherent write도 된다</b>고 착각합니다. ACE-Lite는 read-only coherent — write는 non-coherent로 취급되어 <b>CPU L1 stale</b> 유발 가능. 필요시 CMO(cache maintenance op)나 full ACE로 올려야 합니다.</div>
      </div>

      <h2>CHI 채널 구조 <span className="en">/ CHI Channels</span></h2>
      <div className="diagram">{`  Requester (RN-F: coherent core)                Home Node (HN-F)
  ┌──────────────┐                               ┌──────────────┐
  │              │ ── REQ ─── (ReadUnique …) ──> │              │
  │              │ <── SNP ── (SnpUnique …) ──── │  directory   │
  │   L1 / L2    │ ── DAT ───────────────────── > │  + SLC slice │
  │              │ <── RSP ── (CompAck, Retry) ── │              │
  └──────────────┘                               └──────┬───────┘
                                                        │
                                                        ▼
                                                 ┌──────────────┐
                                                 │ SN-F (DRAM)  │
                                                 └──────────────┘`}</div>
      <div className="grid2">
        <div className="card">
          <h4>노드 종류</h4>
          <p><code>RN-F</code> full-coherent requester (CPU), <code>RN-I</code> I/O requester, <code>HN-F</code> home+SLC, <code>HN-I</code> I/O home, <code>SN-F</code> slave(DRAM), <code>MN</code> misc.</p>
        </div>
        <div className="card">
          <h4>4채널</h4>
          <p><b>REQ</b> (요청), <b>SNP</b> (snoop), <b>DAT</b> (데이터), <b>RSP</b> (ack/응답). 물리적으로 독립 VC — deadlock 회피.</p>
        </div>
        <div className="card">
          <h4>DMT · DCT</h4>
          <p><b>Direct Memory Transfer</b> = HN 이 SN 에게 요청자로 직접 보내게 시킴. <b>Direct Cache Transfer</b> = peer RN 이 요청자에게 cache-to-cache 전달. 평균 latency ↓.</p>
        </div>
        <div className="card">
          <h4>Exclusive monitor</h4>
          <p><code>LDXR/STXR</code> 의 global monitor 가 HN 에 존재 — 다른 노드의 conflicting request 를 감지해 <code>STXR</code> 실패 유도.</p>
        </div>
      </div>

      <h2>CMN-700 Mesh <span className="en">/ Topology</span></h2>
      <div className="diagram">{`  +──XP──XP──XP──XP──XP──XP──XP──+
  │   │   │   │   │   │   │   │   │
  XP  RN  HN  RN  HN  RN  HN  SN  XP
  │   │   │   │   │   │   │   │   │
  XP  HN  RN  HN  RN  HN  RN  SN  XP
  │   │   │   │   │   │   │   │   │
  XP  RN  HN  RN  HN  RN  HN  MN  XP
  │   │   │   │   │   │   │   │   │
  +──XP──XP──XP──XP──XP──XP──XP──+

  XP = Crosspoint (mesh router),  RN/HN/SN 은 XP 에 attach`}</div>
      <div className="grid2">
        <div className="card">
          <h4>주소 → HN 매핑</h4>
          <p>주소 해시로 <b>HN-F slice</b> 분산. hot line 이 한 slice 로 쏠리지 않게 설계.</p>
        </div>
        <div className="card">
          <h4>SLC (System Level Cache)</h4>
          <p>HN-F 가 들고 있는 shared last-level cache. coherency home + cache 공유.</p>
        </div>
        <div className="card">
          <h4>Routing · QoS</h4>
          <p>XY-routing 기본, QoS class 별 VC. 중요 트래픽(예: exclusive) 선점.</p>
        </div>
        <div className="card">
          <h4>Scale</h4>
          <p>CMN-700은 최대 <b>256 core + 512 MB SLC</b> 급까지 확장. Grace, Graviton 세대가 이 위에서 구성.</p>
        </div>
      </div>

      <h2>Snoop Filter & Inclusion <span className="en">/ Filtering</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>Snoop Filter</h4>
          <p>"이 라인을 가진 코어만" 추적해 불필요 snoop 차단. DSU 의 SCU, CMN 의 HN-F directory 가 역할 수행.</p>
        </div>
        <div className="card">
          <h4>Inclusive / Exclusive / NINE</h4>
          <p>L3 inclusive = L1/L2 사본이 반드시 L3 에 존재 (snoop filter 자동). Exclusive = 중복 없음 (용량 효율). <b>NINE</b> (non-inclusive non-exclusive) = 힌트만 — 현대 서버 기본.</p>
        </div>
      </div>

      <h2>Atomics & Coherence <span className="en">/ LSE · Near/Far</span></h2>
      <p>ARMv8.1 LSE (<code>LDADD</code>, <code>CAS</code>, <code>SWP</code>, …) 은 단일 메모리 연산으로 atomic 을 수행. 경로는 두 가지.</p>
      <div className="grid2">
        <div className="card">
          <h4>Near Atomic</h4>
          <p>요청 코어의 L1/L2 또는 가까운 HN 에서 완료 — 일반적인 경합 없는 atomic. 수 ~ 수십 cycle.</p>
        </div>
        <div className="card">
          <h4>Far Atomic</h4>
          <p>HN / SLC 가 atomic 을 <b>home 쪽에서 직접 수행</b>. 고경합 (hot lock, counter) 상황에서 라인 ping-pong 제거 → throughput 크게 개선.</p>
        </div>
        <div className="card">
          <h4>LL/SC vs LSE</h4>
          <p><code>LDXR/STXR</code> 은 retry loop — 경합 시 live-lock 위험. LSE 는 HW 가 retry 없이 완료 보장. glibc·kernel 이 LSE 탐지 후 자동 선택.</p>
        </div>
        <div className="card">
          <h4>Ordering</h4>
          <p><code>LDADDA</code> = acquire, <code>LDADDL</code> = release, <code>LDADDAL</code> = acq+rel. RCsc 기본, RCpc 는 <code>LDAPR</code> 계열.</p>
        </div>
      </div>

      <h2>성능 함정 <span className="en">/ Common Pitfalls</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>현상</th><th>원인</th><th>대응</th></tr></thead>
          <tbody>
            <tr><td><b>False sharing</b></td><td>독립 변수가 같은 64 B 라인 → write 시 상호 invalidate</td><td>padding, <code>alignas(64)</code>, per-CPU data</td></tr>
            <tr><td><b>Line ping-pong</b></td><td>hot counter / lock 이 코어 간 진동</td><td>LSE far atomic, per-CPU counter + aggregation</td></tr>
            <tr><td><b>Snoop storm</b></td><td>broadcast 기반 cluster 에서 writer 폭주</td><td>snoop filter 있는 interconnect, write combining</td></tr>
            <tr><td><b>Store buffer drain 지연</b></td><td>배리어 (<code>DMB SY</code>, <code>DSB</code>) 가 buffer flush 대기</td><td>꼭 필요한 곳만 배리어, 약한 배리어(<code>ISHLD</code>) 선택</td></tr>
            <tr><td><b>ACE-Lite DMA stale</b></td><td>accelerator write 후 CPU L1 이 구값 유지</td><td>CMO(<code>DC CIVAC</code>) 또는 full coherent 경로로 전환</td></tr>
          </tbody>
        </table>
      </div>

      <h2>관측 & 디버깅 <span className="en">/ Observability</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>CPU PMU</h4>
          <p><code>LL_CACHE_MISS_RD</code>, <code>REMOTE_ACCESS</code>, <code>BUS_ACCESS</code>, <code>MEM_ACCESS_RD_CTX_*</code> — cache-to-cache 트래픽 단서.</p>
        </div>
        <div className="card">
          <h4>CMN PMU</h4>
          <p>HN-F / XP 에 PMU unit 존재. snoop rate, SLC hit, mesh utilization 측정 가능 — 소켓 전역 병목 분석용.</p>
        </div>
        <div className="card">
          <h4>SPE</h4>
          <p>개별 로드의 <b>source level</b> (L1/L2/L3/DRAM/peer cache) 샘플링 — false-sharing 과 원격 접근 식별에 결정적.</p>
        </div>
        <div className="card">
          <h4>Litmus / herd7</h4>
          <p>memory model 디버깅. 모호한 배리어 이슈는 <b>litmus test</b> 로 재현·검증 — ARM 공식 <code>arm-mm</code> cat 모델 기준.</p>
        </div>
      </div>

      <h2>한 줄 정리 <span className="en">/ Cheat Sheet</span></h2>
      <div className="callout">
        <span className="icon">📌</span>
        <div>
          <ul style={{margin: 0, paddingLeft: 18}}>
            <li>코어 수 적으면 <b>snoop + MOESI</b>, 많으면 <b>directory + mesh (CMN)</b>. ARM 은 둘 다 씀.</li>
            <li>ACE = full coherent, <b>ACE-Lite = read-only coherent</b> — DMA 버그의 단골 원인.</li>
            <li>CHI는 REQ/SNP/DAT/RSP 4채널 + HN-F 분산 directory로 mesh 까지 확장.</li>
            <li>고경합 워크엔 <b>LSE far atomic</b> 이 LL/SC 대비 수배 throughput.</li>
            <li>공유 변수 배치는 64 B 라인을 의식 — false sharing은 라인 bandwidth 를 몇 % 로 깎음.</li>
          </ul>
        </div>
      </div>
    </>
  )
}
