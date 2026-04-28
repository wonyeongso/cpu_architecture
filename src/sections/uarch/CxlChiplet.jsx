export default function CxlChiplet() {
  return (
    <>
      <h2>왜 Chiplet · CXL 인가 <span className="en">/ Why Now</span></h2>
      <p>모놀리식 die 는 <b>레티클 크기 + 수율</b>에 부딪혔고, 메모리 대역폭은 <b>pin/채널 한계</b>에 묶였습니다. 답은 두 가지: (1) 기능을 여러 작은 die 로 쪼갠 뒤 빠른 die-to-die 인터커넥트로 잇는 <b>chiplet</b>, (2) PCIe 물리층 위에 메모리·캐시·I/O 를 통합 coherent 로 올리는 <b>CXL</b>. 같은 철학 — "한 칩 안에 억지로 넣지 말고, 표준 링크로 붙이자".</p>
      <div className="grid3">
        <div className="card">
          <h4>Reticle Limit</h4>
          <p>한 die 최대 ~858 mm². 그 이상은 <b>다중 die + 브리지</b> 가 유일한 길.</p>
        </div>
        <div className="card">
          <h4>Heterogeneous Process</h4>
          <p>logic 은 최첨단 노드, I/O/SRAM 은 한 세대 뒤 — 원가 최적화를 위해 <b>공정 분리</b> 가 이득.</p>
        </div>
        <div className="card">
          <h4>Memory Wall</h4>
          <p>DRAM 채널/pin 으로는 용량·대역폭이 더 이상 안 늘어남. CXL 이 <b>링크 통해 메모리 확장</b> 을 허용.</p>
        </div>
      </div>

      <h2>Chiplet 용어 <span className="en">/ Terminology</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>용어</th><th>의미</th></tr></thead>
          <tbody>
            <tr><td><b>Chiplet</b></td><td>단일 기능(코어, I/O, 캐시, GPU tile …)으로 제작된 작은 die</td></tr>
            <tr><td><b>Package / SiP</b></td><td>여러 die 를 하나의 기판 위에 합친 최종 제품</td></tr>
            <tr><td><b>Interposer</b></td><td>die 들을 잇는 <b>실리콘 기판</b>. 수천 개의 μbump 배선.</td></tr>
            <tr><td><b>2.5D</b></td><td>die 가 옆으로 나란히, interposer 로 연결 (HBM 이 대표적)</td></tr>
            <tr><td><b>3D stacking</b></td><td>die 를 <b>수직으로 쌓고</b> TSV(Through-Silicon Via) 로 연결 (AMD X3D, HBM 내부)</td></tr>
            <tr><td><b>μbump / hybrid bond</b></td><td>die 간 물리 접합. hybrid bond 는 bump 없이 copper-to-copper 로 밀도 ↑</td></tr>
            <tr><td><b>CoWoS / EMIB / Foveros</b></td><td>TSMC · Intel 의 advanced packaging 기술명</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Die-to-Die 인터커넥트 <span className="en">/ D2D Interconnects</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>UCIe (Universal Chiplet Interconnect Express)</h4>
          <p>업계 표준 D2D PHY + 프로토콜 스택. <b>CXL/PCIe 패킷을 거의 그대로</b> 운반할 수 있도록 설계 — 에코시스템 통일이 목표.</p>
        </div>
        <div className="card">
          <h4>AMD Infinity Fabric</h4>
          <p>AMD 의 on-package 코히어런트 링크. CCD ↔ IOD 연결, CPU ↔ GPU 통합(MI300).</p>
        </div>
        <div className="card">
          <h4>Intel EMIB / D2D</h4>
          <p>EMIB 은 <b>부분 실리콘 브리지</b>로 고밀도 배선, 대형 interposer 비용 회피.</p>
        </div>
        <div className="card">
          <h4>NVIDIA NVLink-C2C</h4>
          <p>Grace-Hopper 의 CPU-GPU 코히어런트 D2D. 양방향 900 GB/s 급.</p>
        </div>
      </div>
      <div className="callout">
        <span className="icon">💡</span>
        <div>UCIe 의 실익: <b>다른 회사 die 를 한 패키지에</b> 올릴 수 있게 함. 과거엔 벤더 락-인 프로토콜이라 실질적 멀티벤더 chiplet 은 막혀있었음.</div>
      </div>

      <h2>AMD · Intel · Apple 사례 <span className="en">/ In Practice</span></h2>
      <div className="diagram">{`AMD EPYC (Zen4/5)            Intel Meteor Lake           NVIDIA Grace-Hopper
  ┌────────┐ ┌────────┐        ┌────────┐ ┌────────┐       ┌────────────┐
  │  CCD   │ │  CCD   │        │ Compute│ │  SoC   │       │   Grace    │
  │ 8×core │ │ 8×core │        │  tile  │ │  tile  │       │  72 cores  │
  └───┬────┘ └────┬───┘        └───┬────┘ └───┬────┘       └──────┬─────┘
      │Infinity   │                 │Foveros  │                   │ NVLink-C2C
      ▼Fabric     ▼                 ▼         ▼                   │ 900 GB/s
  ┌────────────────┐        ┌────────┐ ┌────────┐           ┌──────┴─────┐
  │      IOD       │        │ Graph. │ │   I/O  │           │   Hopper   │
  │ DDR + PCIe+CXL │        │  tile  │ │  tile  │           │    GPU     │
  └────────────────┘        └────────┘ └────────┘           └────────────┘`}</div>
      <div className="grid2">
        <div className="card">
          <h4>AMD EPYC</h4>
          <p>CCD(compute) + IOD(I/O · 메모리) 분리. 같은 CCD 여러 개 찍어 확장성 + 수율 확보. 메모리·PCIe/CXL 은 IOD 에 집중.</p>
        </div>
        <div className="card">
          <h4>Intel Meteor Lake</h4>
          <p>Compute / Graphics / SoC / IOE 4 tile 을 <b>Foveros</b> 로 적층·인접 배치. 프로세스도 각기 다름.</p>
        </div>
        <div className="card">
          <h4>Apple M-Ultra</h4>
          <p>M-Max 두 개를 <b>UltraFusion</b> 브리지로 붙여 TB/s 급 대역폭. SW 는 단일 SoC 로 인식.</p>
        </div>
        <div className="card">
          <h4>NVIDIA GH200</h4>
          <p>Grace CPU + Hopper GPU 를 NVLink-C2C 로 <b>coherent</b> 연결 → GPU 가 CPU 메모리를 바로 참조.</p>
        </div>
      </div>

      <h2>CXL 개요 <span className="en">/ Compute Express Link</span></h2>
      <p>PCIe 물리층 · 리타이머 · 커넥터를 <b>그대로 재사용</b>하면서, 위에 세 가지 하위 프로토콜을 얹어 CPU · 가속기 · 메모리를 coherent 로 붙이는 링크 표준.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>서브프로토콜</th><th>역할</th><th>대표 디바이스</th></tr></thead>
          <tbody>
            <tr><td><code>CXL.io</code></td><td>PCIe 와 거의 동등한 I/O · DMA · 설정</td><td>모든 CXL 장치 (필수)</td></tr>
            <tr><td><code>CXL.cache</code></td><td>가속기가 CPU 메모리를 <b>caching coherent</b> 로 참조</td><td>SmartNIC, GPU, FPGA</td></tr>
            <tr><td><code>CXL.mem</code></td><td>CPU 가 장치 메모리를 <b>자기 주소공간의 메모리</b> 로 사용</td><td>메모리 확장기, pooled memory</td></tr>
          </tbody>
        </table>
      </div>
      <div className="grid3">
        <div className="card">
          <h4>Type 1</h4>
          <p>가속기 + cache, device 메모리 없음. <code>.io + .cache</code>. SmartNIC 류.</p>
        </div>
        <div className="card">
          <h4>Type 2</h4>
          <p>가속기 + 자체 메모리. <code>.io + .cache + .mem</code>. GPU/FPGA + HBM 세팅.</p>
        </div>
        <div className="card">
          <h4>Type 3</h4>
          <p>메모리 확장기. <code>.io + .mem</code>. DDR5 만 잔뜩 달린 박스가 CXL 로 호스트에 붙음.</p>
        </div>
      </div>
      <div className="callout">
        <span className="icon">💡</span>
        <div>핵심 설계 포인트: <b>CPU 와 가속기의 coherency domain 을 합치되, 서로 다른 cache 상태 기계</b>를 정의해 race 없이 동작시킴. CXL 2.0+ 에서 pooling/switching, 3.0 에서 <b>peer-to-peer 및 fabric-attached memory</b> 까지 확장.</div>
      </div>

      <h2>CXL 버전 스냅샷 <span className="en">/ CXL 1.x → 3.x</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>버전</th><th>PHY</th><th>주요 추가</th></tr></thead>
          <tbody>
            <tr><td>CXL 1.1</td><td>PCIe 5.0 (32 GT/s)</td><td>세 서브프로토콜 정의, 직결 Type 1/2/3</td></tr>
            <tr><td>CXL 2.0</td><td>PCIe 5.0</td><td><b>스위칭</b>, 메모리 <b>pooling</b>, 핫플러그, 보안(IDE)</td></tr>
            <tr><td>CXL 3.0</td><td>PCIe 6.0 (64 GT/s, PAM4)</td><td><b>fabric</b>, <b>P2P</b> CXL.mem, 다중 호스트 공유 메모리</td></tr>
            <tr><td>CXL 3.1</td><td>PCIe 6.x</td><td>GFAM(global fabric attached memory), 보안 확장</td></tr>
          </tbody>
        </table>
      </div>

      <h2>CXL 메모리 모델 · 소프트웨어 <span className="en">/ Host View</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>메모리 주소공간</h4>
          <p>CXL.mem 메모리는 host 의 physical address space 에 <b>일반 DRAM 처럼 매핑</b>. NUMA node 로 노출되는 경우 많음.</p>
        </div>
        <div className="card">
          <h4>Tiered Memory</h4>
          <p>CXL 메모리는 local DDR 보다 지연·대역폭이 낮음 → <b>hot/cold 분리</b>. Linux <code>DAMON + tiering</code> 이 페이지를 자동 이동.</p>
        </div>
        <div className="card">
          <h4>Pooling / Sharing</h4>
          <p>CXL 2.0/3.0 에선 한 메모리 박스를 <b>여러 호스트가 공유</b>. 동적 재할당으로 메모리 stranding 해소.</p>
        </div>
        <div className="card">
          <h4>HDM / PMEM</h4>
          <p>HDM(Host-managed Device Memory) — 호스트가 coherency 관리. PMEM 모드로 persistence 지원 가능(장치 나름).</p>
        </div>
      </div>

      <h2>ARM CMN / SMMU 와의 궁합 <span className="en">/ Where It Lands in Arm</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>CXL Home Agent</h4>
          <p>ARM Neoverse 플랫폼에선 CXL controller 가 <b>CMN 의 coherent slave</b> 로 attach. HN-F 분산 directory 에 의해 CXL.cache 의 coherency 가 통합 관리.</p>
        </div>
        <div className="card">
          <h4>CXL.mem → CMN → Core</h4>
          <p>CPU 입장에서 CXL 메모리는 한 단계 더 먼 slave node (SN) — 액세스 latency 가 local DDR 대비 보통 <b>2 ~ 3 배</b>.</p>
        </div>
        <div className="card">
          <h4>SMMU 와 CXL.io</h4>
          <p>CXL.io 경로는 PCIe 와 동치 — SMMU 가 translation/isolation 수행. ATS/PRI 흐름도 동일.</p>
        </div>
        <div className="card">
          <h4>RAS</h4>
          <p>CXL 은 자체 <b>RAS 캡슐</b>(poison, media error, link CRC) 정의. host RAS 와 매핑 필요.</p>
        </div>
      </div>

      <h2>성능 함정 <span className="en">/ Pitfalls</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>현상</th><th>원인</th><th>완화</th></tr></thead>
          <tbody>
            <tr><td>CXL 메모리 핫 페이지</td><td>hot page 가 느린 tier 에 남음</td><td>커널 tiering, <code>numactl</code> 재배치</td></tr>
            <tr><td>Noisy neighbor</td><td>pooled 메모리를 여러 호스트가 경쟁</td><td>QoS 클래스, 예약 대역폭</td></tr>
            <tr><td>False coherence 가정</td><td>PCIe-only 가속기를 CXL 처럼 취급</td><td>명시적 flush/ATS, CXL.cache 미지원 장치 주의</td></tr>
            <tr><td>Link retrain 지연</td><td>PAM4 / 리타이머 다단으로 수 ms</td><td>핫플러그 · 전력 전환 경로 계획</td></tr>
            <tr><td>Die-to-die 지연</td><td>chiplet 경계 crossing</td><td>affinity 고정, 같은 CCD 에 pinning</td></tr>
          </tbody>
        </table>
      </div>

      <h2>한 줄 정리 <span className="en">/ Cheat Sheet</span></h2>
      <div className="callout">
        <span className="icon">📌</span>
        <div>
          <ul style={{margin: 0, paddingLeft: 18}}>
            <li>Chiplet = 기능 분할 + advanced packaging + UCIe/IF 같은 <b>D2D 링크</b>.</li>
            <li>CXL = PCIe 물리층 재활용 + <code>.io / .cache / .mem</code> 세 서브프로토콜.</li>
            <li>Type 1(가속기 캐시), Type 2(가속기 + 메모리), Type 3(메모리 확장기).</li>
            <li>CXL 2 부터 <b>pooling/switching</b>, 3 부터 <b>fabric/P2P</b>.</li>
            <li>성능 설계는 <b>coherency 도메인 경계</b>와 <b>die/link 경계</b> 두 축을 동시에 관리.</li>
          </ul>
        </div>
      </div>
    </>
  )
}
