export default function CacheAdvanced() {
  return (
    <>
      <h2>시작하기 전에 <span className="en">/ Prerequisites</span></h2>
      <p>이 페이지는 <b>General &gt; Cache 기본</b>(cache line · set · way · associativity · 주소 분해 · 3C miss · write policy)의 개념을 안다고 가정합니다.
      아직 안 읽었다면 그쪽 먼저.</p>
      <p>여기서는 그 기반 위에 modern cache의 <b>heuristic 층</b>을 다룹니다 — 같은 μarch에서도 이 한 줄 설계 차이로 IPC 10 ~ 30%가 움직이는 영역.</p>

      <div className="grid3">
        <div className="card">
          <h4>Replacement</h4>
          <p>용량이 차면 어떤 victim을 내보낼지. LRU/PLRU → RRIP → SHiP → Hawkeye로 진화.</p>
        </div>
        <div className="card">
          <h4>Inclusion · Partitioning</h4>
          <p>계층 간 포함 관계(Inclusive/Exclusive/NINE), 테넌트 QoS(Intel CAT, ARM MPAM).</p>
        </div>
        <div className="card">
          <h4>Prefetch · MSHR · Measurement</h4>
          <p>패턴 학습 엔진, miss 파이프라이닝, Top-down으로 병목 분석.</p>
        </div>
      </div>


      <h2>Replacement Policy 진화 <span className="en">/ Who Gets Evicted</span></h2>
      <p>Set-associative cache에서 set이 가득 찼을 때, <b>어떤 way를 버릴지</b> 정하는 정책.
      이론적 최적은 <b>Belady's OPT</b> — "앞으로 가장 늦게 쓰일 라인을 버려라" — 이지만 미래를 못 보니 <b>과거로부터 근사</b>하는 게 전부입니다.</p>

      <h3>왜 하필 LRU? <span className="en">/ Temporal Locality</span></h3>
      <p>프로그램 메모리 접근의 핵심 관찰: <b>방금 쓴 데이터는 곧 또 쓸 가능성이 크다</b> (temporal locality).
      루프 변수, 스택 top, 방금 call한 함수의 instruction — 전부 이 가정을 따릅니다.</p>
      <p>그래서 "<b>가장 오래 안 쓴 라인을 버리자</b>"가 자연스러운 답이 돼요 — <b>Least Recently Used (LRU)</b>.
      Belady's OPT의 <i>시간 축을 뒤집은 근사</i>라고 생각하면 됨: 미래 대신 과거를 보는 것.</p>

      <div className="diagram">{`way 0  way 1  way 2  way 3       접근 순서를 따라가 봅시다
 [A]    [B]    [C]    [D]       초기 — 모두 채워짐
 access A → A가 MRU, 나머지는 한 자리씩 뒤로 밀림
 [A]    [B]    [C]    [D]       MRU 순서: A > B > C > D
 access E → LRU인 D를 쫓아냄, E가 MRU로
 [A]    [B]    [C]    [E]       MRU 순서: E > A > B > C
 access B → 기존 B를 MRU 끝으로
 [A]    [B]    [C]    [E]       MRU 순서: B > E > A > C
 access F → LRU인 C를 쫓아냄
 [A]    [B]    [F]    [E]       MRU 순서: F > B > E > A`}</div>

      <h3>True LRU 구현 — 세 가지 방식 <span className="en">/ How It's Actually Built</span></h3>
      <div className="grid3">
        <div className="card">
          <h4>① Counter / Timestamp</h4>
          <p>각 way에 "마지막 접근 사이클"을 저장. 추방은 <b>최솟값</b>의 way.<br/>
          단순하지만 카운터가 끝없이 커지고, way별 N-bit 비교기까지 달아야 해서 실제 구현은 드물어요.</p>
        </div>
        <div className="card">
          <h4>② Matrix (pairwise)</h4>
          <p>N × N 비트 매트릭스. <code>m[i][j]=1</code> 은 "way i가 j보다 최근에 쓰임".<br/>
          접근 시 해당 way의 <b>행은 전부 1, 열은 전부 0</b>. 추방: 열이 전부 0인 way (아무보다도 오래됨).<br/>
          비용: <code>N(N-1)/2</code> 비트. 4-way에 6-bit, 8-way에 28, 16-way에 120.</p>
        </div>
        <div className="card">
          <h4>③ Stack / Logical List</h4>
          <p>way들을 <b>MRU→LRU 순서로 logical stack에 저장</b>. 접근 시 해당 way를 stack top으로 끌어올리고 나머지는 한 칸씩 밀어내림.<br/>
          비용: <code>N × log₂(N)</code> 비트 + shuffle 로직. 16-way에 64-bit + shift.</p>
        </div>
      </div>

      <p>정확한 LRU의 실리콘 하한은 <b>log₂(N!) 비트</b>입니다 — N-way의 순서를 유일하게 인코딩해야 하니까.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>N-way</th><th>순열 수</th><th>log₂(N!) 비트</th><th>실전</th></tr></thead>
          <tbody>
            <tr><td>2</td><td>2</td><td>1</td><td>간단 — 1 bit flip</td></tr>
            <tr><td>4</td><td>24</td><td>5</td><td>matrix 6-bit로 OK</td></tr>
            <tr><td>8</td><td>40,320</td><td>16</td><td>여전히 가능</td></tr>
            <tr><td>16</td><td>~2.1 × 10¹³</td><td>44</td><td>매 접근마다 44-bit 업데이트? 전력·면적 폭증</td></tr>
            <tr><td>32</td><td>~2.6 × 10³⁵</td><td>118</td><td>사실상 불가능 — 모두 PLRU로</td></tr>
          </tbody>
        </table>
      </div>

      <h3>Pseudo-LRU (PLRU) — 트리 근사</h3>
      <p>True LRU가 너무 비싸니까 <b>N-1 비트</b>로 근사. 각 비트가 "이쪽 서브트리가 덜 쓰였다"는 방향을 기억.</p>

      <div className="diagram">{`// 4-way Tree-PLRU (3 bit: b0·b1·b2)

              b0                    b0=0 → 왼쪽 서브트리가 덜 쓰였음
            /    \\                   b0=1 → 오른쪽 서브트리가 덜 쓰였음
          b1      b2
         /  \\    /  \\
        W0  W1  W2  W3

접근 W1  : b0=1 (오른쪽으로 버리게), b1=0 (W0쪽이 덜 쓰임)
접근 W3  : b0=0 (왼쪽으로 버리게), b2=0 (W2쪽이 덜 쓰임)

추방 시 : 루트부터 b 비트를 따라 내려가며 "덜 쓰인" 방향으로.
         b0=0, b1=0 이면 → W0 쫓아냄.

8-way에 7 bit, 16-way에 15 bit. 업데이트는 접근 way의 root→leaf 경로만 flip.`}</div>

      <p>True LRU 대비 hit rate <b>0.5 ~ 1% 낮은 정도</b>로 그치면서 비용은 수십 배 저렴 — 거의 모든 <b>L1/L2가 tree-PLRU</b>. ARM Cortex-A 대부분, Intel 전통 L1D가 이 방식.</p>

      <h3>Bit-PLRU (MRU-bit) — 더 단순한 변형</h3>
      <p>way마다 1-bit "MRU flag". 접근하면 1로 set. <b>모든 way가 1이 되면 자기 bit만 남기고 전부 0으로 reset</b>. 추방: bit=0인 way 중 아무거나. 트리 로직조차 없어서 L1I에 가끔 씀.</p>

      <h3>Random — 의외로 만만찮음</h3>
      <p>추방 후보를 랜덤 선택. 하드웨어 비용 거의 0(LFSR 하나).
      직관적으론 형편없을 것 같지만, <b>연관도가 커질수록 LRU와의 격차가 좁아집니다</b>:</p>
      <ul>
        <li>4-way: LRU 대비 hit rate <b>~5% 낮음</b></li>
        <li>16-way: <b>~2% 낮음</b></li>
        <li>32-way+: <b>~1% 이하</b></li>
      </ul>
      <p>이유: 연관도가 크면 어느 라인을 버려도 다른 유용한 라인들이 대체로 살아남아서 "정보의 가치"가 희석됨.
      ARM Cortex-A53 같은 일부 저전력 코어의 L1D가 random을 씁니다 — PLRU의 면적·전력마저 아끼려고.</p>

      <h3>FIFO — 거의 안 씀</h3>
      <p>가장 먼저 들어온 라인부터 추방. <b>Belady's anomaly</b> (용량을 키웠는데 miss가 <i>증가</i>하는 반직관적 현상) 발생 가능. 임베디드 TLB 등 일부에만 남아있고 data cache에선 사실상 사장.</p>

      <h3>왜 LRU(/PLRU)가 LLC에서는 무너지는가 <span className="en">/ Scan Problem</span></h3>
      <p>LLC는 <b>L1·L2가 이미 필터링한 후</b>에 오는 캐시라, miss stream이 이미 불규칙합니다. LRU의 가정("방금 접근 = 곧 다시")이 이미 깨진 후에 들어옴.</p>
      <p>특히 치명적인 게 <b>scan 패턴</b> — 큰 배열을 처음부터 끝까지 한 번만 훑는 traversal. LRU는 이 "곧 안 쓸" 라인들을 전부 MRU에 꽂아버려서, 재사용 가능성이 높던 라인들을 오히려 LRU 쪽으로 밀어내 evict해버립니다.</p>
      <div className="diagram">{`// LLC, 8-way. 평소 5-way는 re-use hot data, 3-way는 idle.
//    그런데 100MB 배열 한 번 스캔...

[hot A][hot B][hot C][hot D][hot E][  -  ][  -  ][  -  ]
                         ↓ scan 시작
[hot A][hot B][hot C][hot D][hot E][scan1][scan2][scan3]
                         ↓ scan 계속 — LRU는 가장 오래된 hot을 버림
[scan7][hot B][hot C][hot D][hot E][scan4][scan5][scan6]
                         ↓ 끝까지 훑으면
[scan∞][scan∞][scan∞][scan∞][scan∞][scan∞][scan∞][scan∞]
  hot data 전멸 — 다시 "hot"을 쓸 때 모두 DRAM에서 다시 읽어야 함`}</div>
      <p>이 <b>cache thrashing</b> 때문에 현대 LLC는 LRU/PLRU를 넘어섭니다.</p>

      <h3>RRIP 계열 <span className="en">/ Re-Reference Interval Prediction</span></h3>
      <div className="grid2">
        <div className="card">
          <h4>SRRIP (Static RRIP)</h4>
          <p>각 라인에 <b>RRPV</b>(Re-Reference Prediction Value, 2~3-bit) 저장. 새 라인은 기본값 <code>2</code>로 삽입(far-future). hit 시 <code>0</code>(near-future). 추방은 RRPV가 최댓값인 라인에서. <i>모든 라인을 MRU에 끼우는 LRU의 약점(scan)을 해결</i>.</p>
        </div>
        <div className="card">
          <h4>DRRIP (Dynamic RRIP)</h4>
          <p>SRRIP + BIP(Bimodal Insertion, 거의 모두 far-future로 삽입)를 <b>set dueling</b>으로 동적 선택. workload별 자동 튜닝. Intel Haswell/Broadwell LLC 채택.</p>
        </div>
        <div className="card">
          <h4>SHiP</h4>
          <p>삽입 시 RRPV를 <b>PC(signature)별 과거 재사용 확률</b>로 결정. 반복 재사용되던 PC는 near-future로, 한 번 쓰고 버리던 PC는 far-future로. Accuracy 20~30% 개선.</p>
        </div>
        <div className="card">
          <h4>Hawkeye</h4>
          <p>과거 트레이스에서 <b>Belady's OPT를 실제로 돌려</b> "이 PC가 캐시친화적인지" 학습(OPTgen). cache-averse PC는 즉시 추방 후보로. MICRO'16, 실제 칩 채택 보고는 아직 제한적.</p>
        </div>
      </div>

      <h3>비교 요약</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>정책</th><th>비트/way</th><th>scan 저항</th><th>구현 비용</th><th>실사용 위치</th></tr></thead>
          <tbody>
            <tr><td><code>Random</code></td><td>0</td><td>낮음</td><td>매우 낮음</td><td>L1 (저 연관도)</td></tr>
            <tr><td><code>PLRU (tree)</code></td><td>~1</td><td>낮음</td><td>낮음</td><td>대부분 L1/L2</td></tr>
            <tr><td><code>SRRIP</code></td><td>2~3</td><td><b>높음</b></td><td>중</td><td>Intel Nehalem+ LLC</td></tr>
            <tr><td><code>DRRIP</code></td><td>2~3 + dueling</td><td><b>높음</b></td><td>중</td><td>Intel Haswell+ LLC</td></tr>
            <tr><td><code>SHiP</code></td><td>RRPV + PC sig</td><td>높음</td><td>중+</td><td>후기 서버 LLC</td></tr>
            <tr><td><code>Hawkeye/Mockingjay</code></td><td>RRPV + OPT 모델</td><td>매우 높음</td><td>상</td><td>연구/일부 제품</td></tr>
          </tbody>
        </table>
      </div>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>바이패스(bypass) 결정</b>도 replacement의 일부. "이 라인은 재사용 확률이 너무 낮다" 싶으면 아예 캐시에 안 넣고 통과시킴. SHiP/Hawkeye의 핵심 기능 중 하나.</div>
      </div>

      <h2>Inclusion Policy <span className="en">/ Inclusive · Exclusive · NINE</span></h2>
      <p>L2 ↔ LLC 계층에서, 상위(L1/L2)에 있는 라인이 하위(L2/LLC)에도 <b>반드시</b> 있어야 하나, <b>있어선 안 되나</b>, 아니면 <b>상관없나</b>—를 정하는 정책.</p>

      <div className="diagram">{`Inclusive  :  L1 ⊆ L2     L2 안에 L1의 모든 라인 사본이 존재
                         장: snoop filter 구현 쉬움 (L2만 보면 됨)
                         단: L1 evict 시 L2에서도 invalidate 필요 (back-invalidation)
                             유효 용량 = L2 크기 (L1 부분은 중복)

Exclusive  :  L1 ∩ L2 = ∅  한 라인은 L1 또는 L2 중 한 쪽에만
                         장: 유효 용량 = L1 + L2 (중복 없음)
                         단: L1→L2로 fill 시 "victim을 L2로 밀어넣기" 등 이동 로직 필요

NINE       :  Non-Inclusive Non-Exclusive — 규칙 없음
             장: 둘의 중간 — back-invalidation 없음, 중복은 허용
             단: snoop 시 L1+L2 둘 다 확인 필요 (filter 별도 필요)`}</div>

      <div className="grid3">
        <div className="card">
          <h4>Intel (전통 Inclusive)</h4>
          <p>Nehalem ~ Skylake Server L3 까지 inclusive. L3 miss = 어느 core에도 없음 ⇒ snoop 생략 가능. 대신 L3 evict가 L1/L2 back-invalidate를 강제.</p>
        </div>
        <div className="card">
          <h4>Intel 최근 (NINE)</h4>
          <p>Skylake-SP부터 L3는 <b>victim cache + NINE</b>. L2 대형화(1MB+)에 맞춰 유효 용량 확보. Snoop filter를 별도 SRAM으로 분리.</p>
        </div>
        <div className="card">
          <h4>AMD Zen (Exclusive L3)</h4>
          <p>L3 is a <b>victim cache</b> of L2. Core-cluster의 L2가 밀어낸 라인만 L3로. 유효 용량 최대화. CCD별 L3 파티셔닝과 연계.</p>
        </div>
        <div className="card">
          <h4>ARM DSU / SLC</h4>
          <p>DynamIQ L3는 보통 <b>non-inclusive</b>. CMN-700 System Level Cache(SLC)는 선택 가능한 NINE/exclusive 구성. HN-F의 directory가 coherency 처리.</p>
        </div>
      </div>

      <div className="callout warn">
        <span className="icon">⚠️</span>
        <div><b>Back-invalidation</b>은 inclusive의 숨은 비용. 큰 L3가 일부 라인을 evict하면, 그 라인을 L1/L2에 들고 있던 코어들이 강제로 함께 invalidate됨 — 최근에 열심히 쓰던 라인이 "L3 용량 부족"으로 사라지는 현상. Intel이 NINE으로 이주한 이유 중 하나.</div>
      </div>

      <h2>Cache Partitioning · QoS <span className="en">/ Noisy Neighbor 방지</span></h2>
      <p>서버/클라우드에서는 한 VM·컨테이너가 LLC를 독점해 옆 테넌트의 latency를 망치는 <b>noisy neighbor</b> 문제가 있음. HW-level로 cache 점유율을 제한하는 메커니즘.</p>

      <div className="grid2">
        <div className="card">
          <h4>Way Partitioning</h4>
          <p>16-way LLC를 tenant A에 8-way, B에 4-way, default 4-way 식으로 배분. 구현 쉬움(각 way에 mask bit). 단, granularity가 <code>1/ways</code>로 거침.</p>
        </div>
        <div className="card">
          <h4>Set Partitioning (Page Coloring)</h4>
          <p>OS가 physical page를 색칠해 특정 set만 사용하도록 할당. HW 변경 불필요하지만 page allocator 복잡도 ↑.</p>
        </div>
        <div className="card">
          <h4>Intel CAT / CDP</h4>
          <p><b>Cache Allocation Technology</b> — way-mask 기반. Class of Service(CLOS) 별로 L2/L3 way 배분. CDP는 code/data 분리 배분까지.</p>
        </div>
        <div className="card">
          <h4>ARM MPAM</h4>
          <p><b>Memory Partitioning And Monitoring</b> — v8.4+, PARTID로 cache·memory BW 둘 다 제한. MPAM SR(System Register)로 EL1/2/3 별 분리.</p>
        </div>
      </div>

      <h3>모니터링 (CMT/MBM/MPAM-MSMON)</h3>
      <p>파티션만으론 부족하고 <b>지금 누가 얼마나 쓰고 있나</b>를 봐야 SLA 판정이 가능. Intel CMT(cache occupancy) / MBM(memory BW), ARM MPAM-MSMON이 그 역할.</p>

      <h2>Prefetcher 심화 <span className="en">/ Modern Prefetch Engines</span></h2>
      <p>Prefetch의 성패는 세 축:</p>

      <div className="grid3">
        <div className="card">
          <h4>Accuracy</h4>
          <p>prefetch한 라인이 실제로 쓰였나. 낮으면 <b>cache pollution</b>.</p>
        </div>
        <div className="card">
          <h4>Coverage</h4>
          <p>demand miss 중 prefetch가 미리 덮은 비율. 낮으면 무용지물.</p>
        </div>
        <div className="card">
          <h4>Timeliness</h4>
          <p>너무 일찍 → evict 당해 다시 miss. 너무 늦게 → demand가 먼저 나서 stall.</p>
        </div>
      </div>

      <h3>기법 계보 요약</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>기법</th><th>학습 신호</th><th>강점</th><th>약점</th></tr></thead>
          <tbody>
            <tr><td><b>Next-line / Tagged</b></td><td>마지막 miss 주소 +1</td><td>I-cache에서 강력, 거의 공짜</td><td>D-cache에선 비효율</td></tr>
            <tr><td><b>Stride</b></td><td>Δ = 최근 miss 간 간격</td><td>배열 순회 완벽</td><td>포인터 체이싱 ✗</td></tr>
            <tr><td><b>IP-stride</b></td><td>PC별 Δ 테이블</td><td>여러 stream 동시 추적</td><td>stream 수 테이블 크기에 제한</td></tr>
            <tr><td><b>Stream Buffer</b></td><td>miss 시 N 라인 순차 prefetch</td><td>bandwidth-bound 루프</td><td>coverage 낮음</td></tr>
            <tr><td><b>GHB</b></td><td>전역 miss history 해시 매치</td><td>복잡·비선형 stride 검출</td><td>SRAM 비용 ↑</td></tr>
            <tr><td><b>SMS</b></td><td>region 내 access 비트맵</td><td>객체·struct 접근 패턴</td><td>region 재방문 필요</td></tr>
            <tr><td><b>BO</b></td><td>offset별 hit score</td><td>단순·효과 강함</td><td>single-stream 한정</td></tr>
            <tr><td><b>SPP</b></td><td>path signature → delta pattern</td><td>분기 많은 구조 traversal</td><td>테이블 열화 민감</td></tr>
            <tr><td><b>ISB·Triage·Domino</b></td><td>temporal miss 시퀀스 그대로</td><td>불규칙 포인터 체이싱</td><td>SRAM 수십 KB 요구</td></tr>
            <tr><td><b>Perceptron / ML</b></td><td>multi-feature 가중합</td><td>여러 엔진의 컨센서스</td><td>학습·추론 전력</td></tr>
          </tbody>
        </table>
      </div>

      <h3>주요 기법 상세</h3>

      <h4>Next-line / Tagged</h4>
      <p>가장 단순한 engine. miss가 나면 <code>line + 1</code>을 자동으로 같이 가져옴. <b>Tagged</b> 변형은 해당 prefetch가 실제로 demand hit을 받았을 때만 다음 라인까지 chain 연장 — 잘못된 path의 폭주 방지.
      I-cache의 sequential fetch와 궁합이 좋아 거의 공짜로 큰 이득. D-cache에선 overshoot이 많아 덜 씀.</p>

      <h4>Stride &amp; IP-stride</h4>
      <p>최근 두 miss의 주소 차이(Δ)를 기억. 같은 Δ가 연속 관찰되면 그 Δ만큼 앞으로 prefetch.
      <b>Global stride</b>는 테이블 1개 — 여러 배열이 동시에 돌면 Δ가 섞여 학습 실패. 그래서 현대는 <b>PC(IP)별 테이블</b>로 분리.</p>
      <div className="diagram">{`// IP-stride 예

  PC=0xC010 → 최근 주소: A, A+64, A+128   Δ=64  →  다음에 A+192 prefetch
  PC=0xC020 → 최근 주소: B, B+128, B+256  Δ=128 →  다음에 B+384 prefetch
                 ↑
       PC별 테이블(~256 entry). stream이 여러 개여도 간섭 없음.`}</div>

      <h4>GHB · Global History Buffer</h4>
      <p>Nesbit &amp; Smith 2004 (HPCA). 전역 miss 주소를 <b>circular FIFO</b>에 쌓고, 인덱스 테이블(PC 또는 최근 Δ 해시)로 그 FIFO의 특정 지점을 가리킵니다.
      매치된 지점의 "<b>그 다음 miss</b>"를 보고 예측 — address-correlated(AC) 또는 delta-correlated(DC) 모드 가능.
      stride보다 복잡한 반복 패턴(예: A, A+4, A+8, A+100, A+4, A+8, A+100 ...)도 잡음. SRAM 비용이 커서 LLC보단 L2급에서 주로.</p>

      <h4>SMS · Spatial Memory Streaming</h4>
      <p>Somogyi et al. ISCA 2006. 큰 region(2~4KB)을 <b>N-bit access bitmap</b>으로 기록.
      같은 trigger PC가 그 region에 다시 진입하면 저장된 bitmap을 <b>한 번에 재생</b>해서 모든 예상 라인을 prefetch.</p>
      <div className="diagram">{`// SMS 예 — struct traversal

  struct Node { int id; char name[64]; float x,y,z; Node *next; };

  Node 하나 접근 시 offset 0, 64, 128 (약) 을 자주 함께 건드림
  → region[A..A+256]의 bitmap: 10100100...
  → 다른 struct 재방문 시 그 패턴 그대로 재생 → cold miss 통째 제거`}</div>
      <p>객체·struct heavy 코드(게임 엔진, 그래프 DB)에 특히 강력. ARM Neoverse의 L2/L3 region prefetcher가 이 계통.</p>

      <h4>BO · Best Offset</h4>
      <p>Michaud DPC2 2016 우승작. 여러 후보 offset(예: 1, 2, 3, 4, 6, 8, ..., 256)마다 <b>score</b>를 유지.
      현재 miss 주소 X가 들어올 때마다, 각 후보 offset d에 대해 "<b>X − d가 최근 past에 실제 접근됐는가?</b>"를 RR(Recent Requests) 테이블에서 찾아 맞으면 그 d의 score를 +1.
      일정 주기마다 가장 높은 score를 <b>best offset</b>으로 승격하고, prefetch는 그 하나의 offset만 사용 → 누적 트래픽 최소.</p>
      <p>단순하면서 여러 엔진보다 효과 좋음 — "한 번에 한 offset만 쓴다"가 의외로 낭비를 크게 줄임.</p>

      <h4>SPP · Signature Path Prefetcher</h4>
      <p>Kim et al. MICRO 2016. 최근 Δ 이력 수 개를 해시해 <b>signature</b> 생성.
      signature-to-delta 테이블이 "이 signature 다음엔 주로 어떤 Δ가 왔는지"의 확률 분포를 저장.
      prefetch는 <b>확률을 곱해 나가면서</b> 연쇄 발행(depth-k): signature → best Δ → 새 signature → 다음 best Δ ...</p>
      <p>포인터 자식 노드 개수가 2~4 가지로 분기하는 트리 순회 같은 구조에 강함. Intel 일부 최신 코어가 유사 알고리즘 사용.</p>

      <h4>Temporal Prefetchers (ISB · Triage · Domino)</h4>
      <p>앞의 기법들은 "패턴을 압축된 형태로" 학습하는데, temporal 계열은 <b>miss 주소 시퀀스를 그대로</b> 저장합니다.
      같은 시퀀스가 반복되면 <b>정확히 그 시퀀스대로 재생</b>.
      <b>ISB</b>(Jain &amp; Lin ISCA 2013)는 이 시퀀스를 <b>off-chip DRAM에 저장</b>해 수 MB의 "prefetch history"를 유지 — 정확한 포인터 체이싱을 쫓는 유일한 해답.
      단점은 SRAM 메타데이터 수십 KB + DRAM BW 소비. 서버 in-memory DB 같은 대용량 불규칙 워크로드 타겟.</p>

      <h4>Perceptron / ML-based</h4>
      <p>Bhatia et al. HPCA 2019, 이후 다수. "이 delta 후보를 prefetch할까?"를 <b>여러 feature의 가중 합</b>으로 결정.</p>
      <pre><code>
features = [last_Δ, PC_hash, confidence, offset_score, ...]{"\n"}
weights  = [w1,     w2,      w3,         w4,          ...]{"\n"}
score    = Σ(f · w){"\n"}
<span className="kw">if</span> score &gt; threshold: prefetch
      </code></pre>
      <p>정답(실제 사용됐나) 여부에 따라 weight를 +1/-1 조정하는 online learning. 여러 heuristic의 약점을 상호 보완해 coverage·accuracy 동시 개선.
      Samsung·AMD 최근 논문에 프로토타입 등장.</p>

      <h3>현대 코어 구성</h3>
      <p>대부분 <b>여러 엔진을 병렬 운영</b>하고 선택 혹은 투표.</p>
      <div className="grid2">
        <div className="card">
          <h4>ARM Neoverse V2</h4>
          <p>L1D: IP-stride + next-line. L2: region / spatial + correlation. L3/SLC: stream + confidence throttled. 구체 알고리즘은 비공개.</p>
        </div>
        <div className="card">
          <h4>Intel Golden Cove</h4>
          <p>L1D: stride + IP-stride, L2: stream + spatial, L3: stream만. "Prefetcher Configuration" MSR로 일부 on/off 가능.</p>
        </div>
        <div className="card">
          <h4>AMD Zen 4</h4>
          <p>L1: region + stride + IP-stride. L2: stream. 공식 가이드에 "AutoPrefetch" 언급 — pattern engine 여러 개 병행.</p>
        </div>
        <div className="card">
          <h4>SW prefetch</h4>
          <p>명시적 hint (<code>PLD</code>/<code>PRFM</code> on ARM, <code>PREFETCHT0/1/2/NTA</code> on x86, RV는 <code>Zicbop</code>의 <code>prefetch.r/w/i</code>). HW가 못 잡는 불규칙 패턴에 마지막 카드.</p>
        </div>
      </div>

      <h2>Prefetch Throttling · Confidence <span className="en">/ Adaptive Control</span></h2>
      <p>공격적인 prefetch는 종종 해가 됨 — 쓸데없이 DRAM BW를 먹고 유용한 라인을 evict. 그래서 모든 현대 엔진은 <b>피드백 루프</b>로 자신을 조절.</p>

      <div className="diagram">{`metrics (per stream / per engine):
  ── accuracy  = useful / issued
  ── pollution = evicted-before-use
  ── lateness  = demand-hit-on-prefetch-inflight
         │
         ▼
  Confidence counter (2~4-bit saturating)
         │
         ▼
  상태 전이: Aggressive ↔ Normal ↔ Conservative ↔ Disabled
         │
         ▼
  prefetch degree (몇 라인 앞서?) / distance (얼마나 앞서?) 조절`}</div>

      <ul>
        <li><b>Bloom filter</b>로 "최근 prefetch했는데 안 쓰고 쫓겨난 주소" 추적 → pollution 카운트.</li>
        <li><b>Set dueling</b>: LLC set의 1~2%를 prefetch-off, 또 다른 1~2%를 prefetch-on으로 고정 → 평균 miss rate 비교해 동적 결정.</li>
        <li><b>Bandwidth-aware throttling</b>: DRAM 사용률이 높으면 자동으로 degree 감소 (Intel "Active Idle"의 연장).</li>
      </ul>

      <h2>Non-blocking Cache · MSHR <span className="en">/ Miss Pipelining</span></h2>
      <p>현대 cache는 miss가 생겨도 멈추지 않음 — <b>MSHR</b>(Miss Status Holding Register)에 등록하고 다음 요청을 계속 받음. 이게 없으면 OoO backend가 무의미.</p>

      <div className="grid2">
        <div className="card">
          <h4>Hit Under Miss (HUM)</h4>
          <p>miss 진행 중에도 다른 hit은 통과. 사실상 모든 L1D 기본.</p>
        </div>
        <div className="card">
          <h4>Miss Under Miss (MUM)</h4>
          <p>여러 독립 miss를 동시에 진행. MSHR 개수 = 동시 outstanding miss 한계.</p>
        </div>
        <div className="card">
          <h4>MSHR 병합</h4>
          <p>같은 라인에 여러 load가 miss → 한 MSHR에 subscribe. 라인 도착 시 일괄 wake-up.</p>
        </div>
        <div className="card">
          <h4>Critical Word First</h4>
          <p>DRAM이 64B를 16B씩 네 번에 나눠 주더라도, 요청된 word부터 return → demand load를 먼저 unblock, 나머지는 백그라운드 fill.</p>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>레벨</th><th>MSHR (대략)</th><th>영향</th></tr></thead>
          <tbody>
            <tr><td>L1D (Cortex-X3, Zen4, Golden Cove)</td><td>16 ~ 32</td><td>많을수록 MLP ↑, load-use 은폐 ↑</td></tr>
            <tr><td>L2</td><td>32 ~ 64</td><td>LLC로 병렬 요청 상한</td></tr>
            <tr><td>LLC</td><td>64 ~ 256</td><td>DRAM으로 가는 outstanding 상한 — BW bound</td></tr>
          </tbody>
        </table>
      </div>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>"MSHR가 찼다"</b>는 OoO backend의 <i>memory wall</i> 신호. pointer chasing처럼 load 하나가 완료돼야 다음 주소가 나오는 코드는 MSHR을 꽉 채우지 못해 DRAM BW가 남아도 IPC가 안 오름. 이 때문에 HW prefetch + SW prefetch의 가치가 큼.</div>
      </div>

      <h2>Way Prediction · Energy <span className="en">/ 전력 최적화</span></h2>
      <p>8-way cache에서 매번 8 way tag+data array를 병렬 구동하면 전력 낭비. 하나만 켜면 6~8배 절감.</p>

      <div className="grid2">
        <div className="card">
          <h4>Way Prediction</h4>
          <p>PC 또는 최근 way 이력으로 "이번엔 way N일 거다" 예측 → 그 way만 activate. 맞으면 전력 절감, 틀리면 1-cycle penalty로 전체 way 재검색.</p>
        </div>
        <div className="card">
          <h4>μTag (Apple·일부 x86)</h4>
          <p>가상주소 상위 비트 해시 = way-id 예측 키. <i>Take A Way</i> 공격의 근원이기도 함(side-channel).</p>
        </div>
        <div className="card">
          <h4>Filter Cache / L0</h4>
          <p>L1 앞에 작은(1~4KB) 초저전력 cache. hit rate 60~70%지만 전력 엄청 아낌. 임베디드·IoT 코어에 적극 활용.</p>
        </div>
        <div className="card">
          <h4>Phased / Sequential Access</h4>
          <p>tag 먼저 검사 → hit한 way만 data array 구동. 에너지 ↓, latency +1 cycle. L2 이하에서 흔함.</p>
        </div>
      </div>

      <h2>Cache-aware 프로그래밍 <span className="en">/ Writing Cache-Friendly Code</span></h2>
      <p>HW heuristic은 "연속적/규칙적" 패턴에 강합니다. SW 쪽에서 이걸 도와주면 공짜 성능.</p>

      <h3>① Loop Tiling / Blocking</h3>
      <pre><code>
<span className="cmt">{"// Naïve GEMM — C[i][j] += A[i][k]*B[k][j]"}</span>{"\n"}
<span className="kw">for</span> (i=<span className="num">0</span>; i&lt;N; i++){"\n"}
{"  "}<span className="kw">for</span> (j=<span className="num">0</span>; j&lt;N; j++){"\n"}
{"    "}<span className="kw">for</span> (k=<span className="num">0</span>; k&lt;N; k++){"\n"}
{"      "}C[i][j] += A[i][k] * B[k][j];  <span className="cmt">{"// B is column-wise → cache misses explode"}</span>{"\n"}

<span className="cmt">{"// Tiled — pick TILE to fit in L1 (e.g. 64):"}</span>{"\n"}
<span className="kw">for</span> (ii=<span className="num">0</span>; ii&lt;N; ii+=TILE){"\n"}
{"  "}<span className="kw">for</span> (jj=<span className="num">0</span>; jj&lt;N; jj+=TILE){"\n"}
{"    "}<span className="kw">for</span> (kk=<span className="num">0</span>; kk&lt;N; kk+=TILE){"\n"}
{"      "}<span className="kw">for</span> (i=ii; i&lt;ii+TILE; i++)  <span className="cmt">{"// access stays inside the block → data reuse"}</span>{"\n"}
{"        "}... <span className="cmt">{"// L1 hit rate 95%+"}</span>
      </code></pre>

      <h3>② False Sharing 회피</h3>
      <pre><code>
<span className="kw">struct</span> Counters {"{"}{"\n"}
{"  "}<span className="kw">atomic_int</span> a;           <span className="cmt">{"// written by core 0"}</span>{"\n"}
{"  "}<span className="kw">atomic_int</span> b;           <span className="cmt">{"// written by core 1"}</span>{"\n"}
{"};"}                                <span className="cmt">{"// both share the same 64B line → coherence ping-pong on every write"}</span>{"\n\n"}
<span className="kw">struct</span> Counters {"{"}{"\n"}
{"  "}<span className="kw">alignas</span>(<span className="num">64</span>) <span className="kw">atomic_int</span> a;{"\n"}
{"  "}<span className="kw">alignas</span>(<span className="num">64</span>) <span className="kw">atomic_int</span> b;{"\n"}
{"};"}                                <span className="cmt">{"// each on its own line → zero interference"}</span>
      </code></pre>

      <h3>③ 데이터 레이아웃 — AoS vs SoA</h3>
      <div className="grid2">
        <div className="card">
          <h4>Array of Structs (AoS)</h4>
          <p><code>struct P{"{"}x,y,z,w{"}"}  arr[N];</code>. 한 객체 전체를 쓰는 게임 엔진 entity에 적합. SIMD 로드는 <code>deinterleave</code> 필요.</p>
        </div>
        <div className="card">
          <h4>Struct of Arrays (SoA)</h4>
          <p><code>float x[N], y[N], z[N];</code>. x만 꺼내는 물리 업데이트·SIMD 벡터화에 강함. cache utilization 거의 100%.</p>
        </div>
      </div>

      <h3>④ SW Prefetch Hint</h3>
      <pre><code>
<span className="cmt">{"// linked-list traversal: HW prefetcher can't catch this"}</span>{"\n"}
<span className="kw">while</span> (node) {"{"}{"\n"}
{"  "}__builtin_prefetch(node-&gt;next, <span className="num">0</span>, <span className="num">0</span>);  <span className="cmt">{"// pull in the next node early"}</span>{"\n"}
{"  "}process(node-&gt;data);{"\n"}
{"  "}node = node-&gt;next;{"\n"}
{"}"}
      </code></pre>
      <p>단, prefetch도 <b>너무 이르면 evict</b>, <b>너무 늦으면 무용</b>. <code>perf stat</code>으로 hit/miss 보면서 tuning.</p>

      <h2>측정 · 지표 <span className="en">/ Metrics &amp; Tooling</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>지표</th><th>계산</th><th>의미</th></tr></thead>
          <tbody>
            <tr><td><b>MPKI</b></td><td>1000 × misses / instructions</td><td>워크로드 간 비교 표준. L1D MPKI &gt; 20은 cache-bound 의심.</td></tr>
            <tr><td><b>Hit ratio</b></td><td>hits / (hits+misses)</td><td>레벨별. L1D 95%+, L2 70%+, L3 50%+가 일반적 헬시값.</td></tr>
            <tr><td><b>Prefetch accuracy</b></td><td>useful_prefetch / issued_prefetch</td><td>&lt; 30%면 pollution 의심, throttle 검토.</td></tr>
            <tr><td><b>Prefetch coverage</b></td><td>prefetch_hits / total_misses</td><td>&gt; 50%면 prefetcher가 잘 일하는 중.</td></tr>
            <tr><td><b>Eviction-before-use</b></td><td>prefetched_evicted_unused</td><td>오래 걸려 evict된 것 — timeliness 문제.</td></tr>
          </tbody>
        </table>
      </div>

      <h3>도구</h3>
      <div className="grid2">
        <div className="card">
          <h4>perf</h4>
          <p><code>perf stat -e L1-dcache-loads,L1-dcache-load-misses,LLC-load-misses</code>. ARM은 <code>l1d_cache_refill</code>, <code>ll_cache_miss_rd</code>.</p>
        </div>
        <div className="card">
          <h4>perf c2c</h4>
          <p>false sharing / cacheline contention 핫스팟 발굴. <code>HITM</code>(modified-to-modified snoop) 이벤트 기반.</p>
        </div>
        <div className="card">
          <h4>perf mem · SPE</h4>
          <p>샘플당 load latency + address. ARM SPE, Intel PEBS, AMD IBS. 어떤 인스트럭션이 long-latency인지 핀포인트.</p>
        </div>
        <div className="card">
          <h4>likwid / VTune / uProf</h4>
          <p>GUI 기반 PMU 해석. Top-Down breakdown, roofline, cacheline access heatmap 시각화.</p>
        </div>
      </div>

      <div className="callout warn">
        <span className="icon">⚠️</span>
        <div>Cache 최적화는 <b>측정 먼저</b>. IPC는 같은데 MPKI 증가? → prefetcher coverage 확인. Prefetch issue는 많은데 coverage는 낮음? → pattern이 HW가 못 잡는 비선형, SW prefetch 고려. 반대로 coverage 높은데 accuracy 낮음? → pollution으로 demand miss 증가 중일 수 있음 — throttle.</div>
      </div>

      <h2>참고 <span className="en">/ Further Reading</span></h2>
      <ul>
        <li>Jaleel et al., <i>"High Performance Cache Replacement Using Re-Reference Interval Prediction"</i> ISCA 2010 (RRIP/DRRIP)</li>
        <li>Wu et al., <i>"SHiP: Signature-Based Hit Predictor"</i> MICRO 2011</li>
        <li>Jain &amp; Lin, <i>"Back to the Future: Leveraging Belady's Algorithm"</i> ISCA 2016 (Hawkeye)</li>
        <li>Pugsley et al., <i>"Sandbox Prefetching"</i> HPCA 2014</li>
        <li>Intel 64 and IA-32 Optimization Reference Manual — Chapter 2 (Prefetch)</li>
        <li>ARM Neoverse V2 SW Optimization Guide — Cache &amp; Prefetch behavior 섹션</li>
      </ul>
    </>
  )
}
