export default function CacheBasics() {
  return (
    <>
      <h2>Cache가 왜 필요한가 <span className="en">/ Why Cache</span></h2>
      <p>CPU가 DRAM에 직접 접근하면 <b>100 ~ 300 cycle</b>이 걸립니다. 그 사이 OoO backend가 할 수 있는 일엔 한계가 있고, 결국 파이프라인이 비어 stall.
      이 격차를 메우려고 "<b>자주 쓰는 데이터를 가까이</b>" 두는 작은 고속 메모리 — <b>cache</b> — 가 필요합니다.</p>

      <h3>Memory Wall</h3>
      <p>CPU 클럭은 2000년대 이후 4 ~ 5 GHz에서 정체됐는데, DRAM 레이턴시는 60 ~ 80 ns에서 수십 년째 제자리.
      그 결과 "몇 사이클만 기다리면 되던 메모리"가 "수백 사이클 걸리는 메모리"가 됐어요 — 이 격차를 <b>memory wall</b>이라 부릅니다.
      Cache는 이 벽에 사다리를 놓는 장치.</p>

      <h3>Memory Hierarchy</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>레벨</th><th>크기</th><th>지연</th><th>대역폭</th><th>특징</th></tr></thead>
          <tbody>
            <tr><td>Register</td><td>32 × 64-bit</td><td>0 cycle</td><td>—</td><td>ISA 정의, ALU 직결</td></tr>
            <tr><td>L1D / L1I</td><td>32 ~ 128 KB</td><td>3 ~ 5 cyc</td><td>~TB/s</td><td>core 전용, latency 우선</td></tr>
            <tr><td>L2</td><td>512 KB ~ 2 MB</td><td>10 ~ 15 cyc</td><td>수백 GB/s</td><td>core 전용 또는 클러스터 공유</td></tr>
            <tr><td>L3 / SLC</td><td>수 ~ 수십 MB</td><td>30 ~ 60 cyc</td><td>수백 GB/s</td><td>소켓 / chip 공유</td></tr>
            <tr><td>DRAM</td><td>GB 급</td><td>150 ~ 300 cyc</td><td>~100 GB/s (DDR5 ch)</td><td>주기억, BW 민감</td></tr>
            <tr><td>SSD</td><td>TB 급</td><td>~10 µs</td><td>수 GB/s</td><td>storage</td></tr>
          </tbody>
        </table>
      </div>
      <p>한 단계 내려갈수록 <b>용량 10 ~ 100배</b>, <b>지연 3 ~ 10배</b>. Cache 계층이 이 경사를 완만하게 이어줘서
      "자주 쓰는 건 가까운 곳에서 빠르게" 가 가능.</p>

      <div className="callout">
        <span className="icon">💡</span>
        <div>Cache는 <b>HW 자동 관리</b>. SW가 "이건 L1에 두어라" 명시 못 함 — 패턴을 관찰해 HW가 알아서 배치·교체.
        반면 <b>Scratchpad 메모리</b>(임베디드·DSP·GPU shared mem)는 <b>SW 직접 관리</b> — 프로그래머가 DMA로 명시 복사.</div>
      </div>

      <h2>Cache Line · Block — 최소 단위 <span className="en">/ Unit of Transfer</span></h2>
      <p>CPU가 메모리에서 한 번에 가져오는 <b>최소 단위</b>를 <b>cache line</b>(또는 block)이라 합니다. 거의 모든 현대 CPU에서 <b>64 byte</b>.</p>

      <div className="grid2">
        <div className="card">
          <h4>왜 64 byte인가</h4>
          <ul>
            <li><b>DRAM burst 매칭</b>: DDR4/5의 BL8 × 8 B = 정확히 64 B</li>
            <li><b>Spatial locality 활용</b>: 이웃 데이터도 곧 쓸 확률 ↑</li>
            <li><b>Coherence 단위</b>: directory/snoop 추적의 granule</li>
            <li><b>Prefetch 단위</b>: prefetcher가 당겨오는 기본 크기</li>
          </ul>
        </div>
        <div className="card">
          <h4>왜 크게 or 작게 안 하나</h4>
          <ul>
            <li><b>너무 크면</b> (128 B+): 쓰지도 않을 데이터까지 끌고 와 BW 낭비, false sharing ↑</li>
            <li><b>너무 작으면</b> (16 B): coherence directory 폭증, prefetch 비효율, tag overhead 비율 ↑</li>
            <li>Apple M 시리즈는 예외적으로 <b>128 B</b> 라인 — 전용 메모리 시스템 덕</li>
          </ul>
        </div>
      </div>

      <h2>Line Metadata <span className="en">/ Tag · Valid · Dirty</span></h2>
      <p>한 cache line은 데이터 64 B만 있는 게 아닙니다. tag 비교, coherence, replacement를 위해 <b>상태 비트</b>들이 함께 붙어 있어요.</p>

      <div className="grid3">
        <div className="card">
          <h4>Tag</h4>
          <p>해당 라인이 <b>어떤 주소</b>인지 식별. 주소 상위 비트 ~30 ~ 40 bit. 메타 중 가장 큼.</p>
        </div>
        <div className="card">
          <h4>Valid bit</h4>
          <p>이 라인이 <b>유효 데이터</b>를 담고 있나. reset 직후엔 모두 invalid, fill되면 valid.</p>
        </div>
        <div className="card">
          <h4>Dirty bit (write-back only)</h4>
          <p>CPU가 <b>수정했으나 DRAM엔 아직 반영 안 됨</b>. evict 시 반드시 write-back.</p>
        </div>
        <div className="card">
          <h4>Replacement 비트</h4>
          <p>LRU bits / PLRU tree / RRPV — 어느 way를 먼저 버릴지 (자세한 건 Cache 심화).</p>
        </div>
        <div className="card">
          <h4>Coherence state</h4>
          <p>MESI/MOESI: M/E/S/I/O 중 하나. 멀티코어 coherence 프로토콜 상태 (Coherence 섹션 참조).</p>
        </div>
        <div className="card">
          <h4>ECC / Parity</h4>
          <p>서버급은 line당 ECC (SEC-DED 8-bit/64B). L1은 parity, L2+는 ECC가 일반적.</p>
        </div>
      </div>

      <div className="diagram">{`// 64 B line — 실제 저장 구조 예 (36-bit tag + MESI + SEC-DED ECC 가정)

  +--------------+--------+----+----+--------+------+
  |     Data     |  Tag   | V  | D  |  MESI  | ECC  |
  |     512 b    |  36 b  | 1  | 1  |   2 b  |  8 b |
  +--------------+--------+----+----+--------+------+

  약 48 ~ 55 bit 메타 / 512 bit 데이터  =  ~10 % 오버헤드`}</div>

      <h2>3가지 매핑 방식 <span className="en">/ Mapping Schemes</span></h2>
      <p>"이 주소의 데이터를 cache의 <b>어느 slot에 둘까?</b>" 를 정하는 세 가지 설계:</p>

      <div className="grid3">
        <div className="card">
          <h4>Direct-Mapped</h4>
          <p>각 메모리 주소는 <b>딱 하나의 slot</b>에만 들어갈 수 있음.<br/>
          <code>slot = (addr / 64) % num_slots</code><br/>
          <b>장</b>: 비교기 1개 → 초고속, 초저전력.<br/>
          <b>단</b>: 같은 slot에 매핑되는 두 주소를 번갈아 쓰면 <b>conflict miss</b> 폭주. 80년대 이후엔 거의 안 씀.</p>
        </div>
        <div className="card">
          <h4>Fully-Associative</h4>
          <p>어떤 line이든 <b>어디든</b> 들어갈 수 있음. 모든 slot의 tag를 병렬 비교.<br/>
          <b>장</b>: conflict miss 0.<br/>
          <b>단</b>: N개 비교기 병렬 — N이 수백이면 면적·전력·지연 전부 터짐. TLB처럼 32 ~ 64 entry 소형 구조에만.</p>
        </div>
        <div className="card">
          <h4>N-way Set Associative</h4>
          <p>타협점 — 주소로 <b>set</b>을 정하고 set 안의 <b>N개 way</b> 중 어디든.<br/>
          <code>set = (addr / 64) % num_sets</code><br/>
          비교기 N개만 필요. 현대 L1~L3의 <b>사실상 표준</b>. L1: 4 ~ 8, L2: 8 ~ 16, L3: 16 ~ 20.</p>
        </div>
      </div>

      <div className="diagram">{`// 32 KB cache, 64 B line, 8-way set associative
//   32 KB / 64 B       = 512 lines
//   512 lines / 8 ways = 64 sets

          way0  way1  way2  way3  way4  way5  way6  way7
         +-----+-----+-----+-----+-----+-----+-----+-----+
 set  0  |  .  |  .  |  .  |  .  |  .  |  .  |  .  |  .  |   <- 한 set = 8 ways
 set  1  |  .  |  .  |  .  |  .  |  .  |  .  |  .  |  .  |      (한 주소는 이 중 어느 way에든)
 set  2  |  .  |  .  |  .  |  .  |  .  |  .  |  .  |  .  |
   ..    |  .  |  .  |  .  |  .  |  .  |  .  |  .  |  .  |
 set 63  |  .  |  .  |  .  |  .  |  .  |  .  |  .  |  .  |
         +-----+-----+-----+-----+-----+-----+-----+-----+

 Direct-mapped     = 1-way  (way = 1, set = total lines)
 Fully-associative = N-way with N = total lines (set = 1)
 Above             = 8-way × 64 sets × 64 B line  =  32 KB`}</div>

      <h2>주소 분해 <span className="en">/ Address Breakdown</span></h2>
      <p>HW는 주소를 세 부분으로 쪼개 lookup에 사용:</p>

      <div className="diagram">{`  high bits                                      low bits
  |<-------- tag --------->|<-- index -->|<-- offset -->|
        (나머지 상위)           set 선택       line 내 byte

  예) 32 KB, 8-way, 64 B line, 48-bit VA 가정

  offset = log2(64)       = 6 bit   (line 안 어느 byte?)
  sets   = 32 K / 64 / 8  = 64
  index  = log2(64)       = 6 bit   (어느 set?)
  tag    = 48 - 6 - 6     = 36 bit  (이 way가 정말 우리 주소인지 확인)`}</div>

      <h3>Lookup 절차</h3>
      <ol>
        <li><b>index</b> 로 하나의 set 선택 → SRAM 행 access</li>
        <li>그 set의 <b>N way tag를 병렬 비교</b> (+ valid bit 확인)</li>
        <li>일치 → <b>hit</b>, data array에서 <code>offset</code> 위치의 byte 반환</li>
        <li>불일치 → <b>miss</b>, replacement policy가 victim way 선정 → 하위 cache / DRAM에서 fill</li>
      </ol>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>Index 비트에 VA를 쓰느냐 PA를 쓰느냐</b>가 <b>VIPT / PIPT</b> 구분이에요 (ARM Cache 페이지 참조).
        PIPT는 TLB 끝난 뒤 PA로 index — alias 안전하지만 TLB가 critical path. VIPT는 VA로 index하면서 tag는 PA로 비교 — TLB와 SRAM access 병렬 가능.
        단, <code>(page_size) ≥ (num_sets × line_size)</code>가 지켜져야 alias가 자동 배제 — 예) 4 KB page, 64 B line이면 sets ≤ 64 → L1D 용량 ≤ 32 KB × way. 이게 L1D 용량이 전통적으로 32 KB 주변에 묶여 있던 이유.</div>
      </div>

      <h2>Hit vs Miss · 3C + 1 분류 <span className="en">/ Miss Taxonomy</span></h2>
      <p>모든 miss를 <b>왜 발생했는지</b>로 분류하면 4가지. <b>Mark Hill의 3C 모델</b>(1987)에 후일 coherence miss가 추가됨.
      이 분류는 "어떻게 고칠까"의 출발점입니다.</p>

      <div className="grid2">
        <div className="card">
          <h4>① Compulsory (Cold)</h4>
          <p>처음 접근하는 라인 — cache에 있을 리 없음. 프로세스 시작, 새 working set 진입, 첫 함수 호출 시 피할 수 없는 miss.</p>
          <p><b>대응</b>: prefetch (패턴 예측 가능하면), warmup 루프, larger line (spatial locality 얻기).</p>
        </div>
        <div className="card">
          <h4>② Capacity</h4>
          <p><b>working set &gt; cache 크기</b>라서 예전 라인이 evict된 뒤 다시 필요해졌을 때. fully-associative여도 발생.</p>
          <p><b>대응</b>: 더 큰 cache, <b>loop tiling</b>(블록 크기를 cache에 맞춤), 데이터 재사용 늘리기.</p>
        </div>
        <div className="card">
          <h4>③ Conflict</h4>
          <p>cache 용량은 충분한데 <b>같은 set에 매핑되는 라인 수가 way 수보다 많아서</b> 서로 밀어냄. fully-associative에선 발생 X.</p>
          <p><b>대응</b>: 연관도 증가, 주소 reshuffling (padding), victim cache 추가.</p>
        </div>
        <div className="card">
          <h4>④ Coherence (4th C)</h4>
          <p><b>다른 코어의 write</b>가 내 라인을 invalidate함. shared writable data의 대가. <b>false sharing</b>이 대표 사례.</p>
          <p><b>대응</b>: false sharing 제거 (<code>alignas(64)</code>), 락 세분화, thread-local 구조.</p>
        </div>
      </div>

      <div className="diagram">{`// 같은 워크로드를 여러 cache 구성에 돌려 miss를 분리

  (1) 무한 cache         →  남은 miss  =  compulsory
  (2) fully-associative  →  (1) 대비 증분 = (아무도 아님, 같음)     ※ 용량 같으면 capacity ↓
      실제로는           →  (1) 대비 증분 = capacity
  (3) 실제 N-way         →  (2) 대비 증분 = conflict
  (4) 멀티코어 실행      →  (3) 대비 증분 = coherence`}</div>

      <div className="callout">
        <span className="icon">💡</span>
        <div>실측은 Intel VTune <i>Memory Access</i> analysis, Valgrind <code>cachegrind</code>, Linux <code>perf stat</code> (L1-dcache-load-misses 등)로 근사.
        정확한 3C 분리는 시뮬레이터(gem5, ChampSim) 몫.</div>
      </div>

      <h2>Write Policies <span className="en">/ 쓰기 정책</span></h2>
      <p>CPU가 write할 때 두 가지 결정이 필요:</p>
      <ul>
        <li><b>(1)</b> DRAM에 <b>언제 반영</b>할지 — Write-Through vs Write-Back</li>
        <li><b>(2)</b> write miss 시 <b>cache에 가져올지</b> — Write-Allocate vs No-Write-Allocate</li>
      </ul>

      <h3>① Write-Through vs Write-Back</h3>
      <div className="grid2">
        <div className="card">
          <h4>Write-Through</h4>
          <p>write마다 <b>cache와 DRAM을 동시에</b> 업데이트. dirty bit 불필요.</p>
          <ul>
            <li><b>장</b>: evict 시 단순 drop, coherence 구조 단순</li>
            <li><b>단</b>: write BW 엄청 — DRAM write 채널 포화</li>
            <li><b>실사용</b>: 일부 L1 (store buffer와 짝), 임베디드 코어</li>
          </ul>
        </div>
        <div className="card">
          <h4>Write-Back</h4>
          <p>write는 <b>cache에만</b>, dirty bit set. evict 시에만 DRAM으로 write-back.</p>
          <ul>
            <li><b>장</b>: write BW 대폭 절감, 연속 write 자연 coalescing</li>
            <li><b>단</b>: coherence 복잡 (dirty 라인 snoop 시 forward), evict 시 write-back latency</li>
            <li><b>실사용</b>: <b>현대 거의 모든 L1/L2/L3</b></li>
          </ul>
        </div>
      </div>

      <h3>② Write-Allocate vs No-Write-Allocate</h3>
      <p>write 대상이 <b>cache에 없을 때</b>(write miss) 어떻게 할지:</p>

      <div className="grid2">
        <div className="card">
          <h4>Write-Allocate (Fetch-on-Write)</h4>
          <p>miss 시 해당 라인을 <b>먼저 DRAM에서 가져온 뒤</b> write. 후속 read/write가 같은 라인에 hit될 것을 기대. <b>write-back과 짝</b>으로 흔히 사용.</p>
        </div>
        <div className="card">
          <h4>No-Write-Allocate</h4>
          <p>miss 시 <b>cache 건드리지 않고 write buffer 경유해 DRAM에 바로</b> write. streaming write(예: <code>memset</code> 큰 영역)에 적합. <b>write-through와 짝</b>.</p>
        </div>
      </div>

      <div className="diagram">{`// 네 가지 조합

                        Write-Through      Write-Back
                      +----------------+----------------+
   Write-Allocate     |    드묾        |   **현대 L1D** |   ← x86 / ARM / RISC-V 대부분
                      +----------------+----------------+
   No-Write-Allocate  |  streaming IO  |    거의 없음   |
                      +----------------+----------------+`}</div>

      <div className="callout warn">
        <span className="icon">⚠️</span>
        <div>특정 메모리 영역(Device memory, Write-Combining, MMIO)은 attribute로 <b>write-through</b> 또는 <b>uncached</b>를 강제합니다 (ARM <code>MAIR_EL1</code>, x86 <code>MTRR/PAT</code>).
        이걸 잘못 설정하면 UART write 한 번이 L1에 갇혀서 실제로 안 나가는 문제 발생 — 임베디드 디버깅의 단골.</div>
      </div>

      <h3>Store Buffer — write 지연 흡수</h3>
      <p>write가 L1에 hit해도 <b>즉시 완료되는 게 아님</b>. <b>Store Buffer</b>(~20 ~ 60 entry)에 먼저 기록됐다가 retire 후 cache로 commit.
      이 버퍼 덕에 write는 시퀀셜로 보이면서도 OoO backend가 stall 없이 진행 가능 —
      <b>Store-to-Load Forwarding</b>, <b>Memory Ordering</b>의 기반이기도 합니다.
      (자세한 건 <i>Microarchitecture</i> · <i>Memory Model</i> 섹션.)</p>

      <h2>용량 공식</h2>
      <div className="diagram">{`  capacity = num_sets × num_ways × line_size

  e.g. 32 KB L1D (8-way, 64 B):  64 × 8 × 64 = 32 KB ✓
       1 MB L2  (16-way, 64 B):  1024 × 16 × 64 = 1 MB ✓
       3 MB/core LLC (12-way):   ~3900 × 12 × 64 ≈ 3 MB ✓`}</div>

      <h2>연관도(Associativity) 트레이드오프 <span className="en">/ Why Not Always High N</span></h2>
      <p>"연관도를 무한히 높이면 되지 않나?" — 비용이 비선형으로 증가합니다.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>연관도</th><th>Conflict miss</th><th>Tag 비교기</th><th>Hit latency</th><th>전력</th></tr></thead>
          <tbody>
            <tr><td>1 (direct-mapped)</td><td>매우 많음</td><td>1</td><td>최저</td><td>최저</td></tr>
            <tr><td>2 ~ 4-way</td><td>크게 감소</td><td>2 ~ 4</td><td>+0 ~ 1 cyc</td><td>낮음</td></tr>
            <tr><td>8-way</td><td>적음</td><td>8</td><td>+1 cyc</td><td>중</td></tr>
            <tr><td>16-way+</td><td>거의 없음</td><td>16+</td><td>+1 ~ 2 cyc</td><td>높음</td></tr>
            <tr><td>Fully associative</td><td>0 (이상적)</td><td>N (수백)</td><td>크게 증가</td><td>매우 높음</td></tr>
          </tbody>
        </table>
      </div>
      <ul>
        <li><b>1 → 4-way</b>: conflict miss 대폭 감소 — 비용 대비 효과 최고</li>
        <li><b>4 → 8</b>: 여전히 이득, 대부분 L1이 여기 머무름</li>
        <li><b>8 → 16</b>: diminishing return. "연관도 두 배 대신 용량 두 배"가 hit rate 관점에서 종종 더 나음
        (<b>Hill &amp; Smith 1989, capacity doubling rule</b>)</li>
        <li>그래서 <b>L1은 4 ~ 8, L2는 8 ~ 16, L3는 16 ~ 20</b>이 표준 레시피</li>
      </ul>

      <h2>실제 코어 구성 <span className="en">/ Real-World Configurations</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>코어</th><th>L1I</th><th>L1D</th><th>L2</th><th>L3 / SLC</th></tr></thead>
          <tbody>
            <tr><td><code>Cortex-A710</code></td><td>64 KB 4-way</td><td>64 KB 4-way</td><td>512 KB 8-way</td><td>DSU L3 shared</td></tr>
            <tr><td><code>Cortex-X3</code></td><td>64 KB 4-way</td><td>64 KB 4-way</td><td>1 MB 8-way</td><td>DSU L3 shared</td></tr>
            <tr><td><code>Neoverse V2</code></td><td>64 KB 4-way</td><td>64 KB 4-way</td><td>2 MB 8-way</td><td>CMN-700 SLC (config)</td></tr>
            <tr><td><code>Apple M2 (Avalanche)</code></td><td>192 KB 6-way</td><td>128 KB 8-way</td><td>16 MB shared</td><td>SLC (system)</td></tr>
            <tr><td><code>Intel Golden Cove</code></td><td>32 KB 8-way</td><td>48 KB 12-way</td><td>1.25 MB 20-way</td><td>3 MB/core 12-way</td></tr>
            <tr><td><code>AMD Zen 4</code></td><td>32 KB 8-way</td><td>32 KB 8-way</td><td>1 MB 8-way</td><td>32 MB/CCD 16-way</td></tr>
          </tbody>
        </table>
      </div>

      <h2>다음: Cache 심화 <span className="en">/ What's Next</span></h2>
      <p>여기까지가 어느 CPU에나 공통으로 적용되는 기본기. <b>Deep Dive &gt; Cache 심화</b>에서는 이 위에 modern cache의 heuristic 층을 다룹니다:</p>
      <ul>
        <li><b>Replacement Policy 진화</b> — LRU → PLRU → RRIP → SHiP → Hawkeye, scan 저항</li>
        <li><b>Inclusion Policy</b> — Inclusive / Exclusive / NINE 트레이드오프</li>
        <li><b>Cache Partitioning</b> — Intel CAT, ARM MPAM, noisy-neighbor 제어</li>
        <li><b>Prefetcher 심화</b> — stride / SMS / BO / SPP / temporal / ML</li>
        <li><b>MSHR · Way Prediction · Cache-aware 코딩 · 측정 도구</b></li>
      </ul>
    </>
  )
}
