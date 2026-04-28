export default function ChiProtocol() {
  return (
    <>
      <h2>CHI는 무엇인가 <span className="en">/ Coherent Hub Interface</span></h2>
      <p><b>CHI(Coherent Hub Interface)</b>는 ARM AMBA 5 표준에 포함된 <b>directory-based coherent interconnect protocol</b>. 2014년경 발표되어 ACE의 broadcast 한계를 푸는 것이 목적 — 256+ 코어급 mesh SoC에서 cache coherency를 확장 가능한 형태로 유지하기 위해 만들어졌습니다. 모든 ARM 서버 SoC(Graviton, Grace, Altra, Cobalt 등)의 코히어런스 엔진이 이걸 씁니다.</p>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>왜 ACE로는 안 됐나.</b> ACE는 모든 read/write에 broadcast snoop을 보내서 16코어쯤만 돼도 트래픽이 폭증. 64코어 이상에서는 snoop 자체가 병목. CHI는 <b>HN-F의 directory</b>로 "이 라인을 어느 코어가 가졌나" 추적해서 <b>해당 코어에만 snoop</b>을 보내니 트래픽이 코어 수에 선형이 아닌 형태로 줄어듭니다.</div>
      </div>

      <h2>4-Channel 아키텍처 <span className="en">/ Transaction Channels</span></h2>
      <p>CHI 메시지는 4개의 독립적 채널로 흐릅니다. AXI의 5채널(AR/R/AW/W/B)이 read/write 분리 중심이라면, CHI는 <b>coherency 의미</b>를 직접 모델링.</p>

      <div className="table-wrap">
        <table>
          <thead><tr><th>채널</th><th>방향</th><th>용도</th><th>대표 메시지</th></tr></thead>
          <tbody>
            <tr><td><b>REQ</b></td><td>RN → HN</td><td>요청 발행</td><td><code>ReadShared</code>, <code>ReadUnique</code>, <code>WriteUnique</code>, <code>AtomicLoad</code>, <code>CleanInvalid</code></td></tr>
            <tr><td><b>SNP</b></td><td>HN → RN</td><td>다른 RN의 캐시 상태 조사·강제</td><td><code>SnpShared</code>, <code>SnpUnique</code>, <code>SnpInvalid</code>, <code>SnpCleanInvalid</code></td></tr>
            <tr><td><b>RSP</b></td><td>양방향</td><td>completion / ack</td><td><code>Comp</code>, <code>RetryAck</code>, <code>SnpResp</code> (no data)</td></tr>
            <tr><td><b>DAT</b></td><td>양방향</td><td>실제 데이터 전송</td><td><code>CompData</code>, <code>SnpRespData</code>, <code>WriteData</code></td></tr>
          </tbody>
        </table>
      </div>

      <div className="diagram">{`     RN-F (Requester)                  HN-F (Home + Directory + SLC)
       │  REQ: ReadUnique addr=A   ──────►   directory lookup
       │                                     │ (이 라인 누가 가졌나?)
       │                                     ▼
       │                      ◄──────────  SNP: SnpUnique →  RN-F2 (다른 코어)
       │                                                       │
       │                                     ◄──────────  SnpRespData (라인 데이터)
       │                                     │
       │  ◄────  DAT: CompData              │
       │  ◄────  RSP: Comp                  │`}</div>

      <h2>주요 Opcodes <span className="en">/ Transaction Opcodes</span></h2>
      <p>채널 위에 흐르는 메시지의 종류. 각 opcode가 정확히 무엇을 요구하는지 알면 transaction flow를 한 줄씩 읽어낼 수 있음.</p>

      <h3>REQ — Read 계열</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Opcode</th><th>의미</th><th>응답 라인 상태</th><th>SW 매핑</th></tr></thead>
          <tbody>
            <tr><td><code>ReadNoSnp</code></td><td>비-coherent read. snoop 안 보냄, 메모리에서 직접</td><td>(받기만)</td><td>device memory read</td></tr>
            <tr><td><code>ReadOnce</code></td><td>한 번만 쓸 데이터, cache에 보관 안 함</td><td>받자마자 invalidate</td><td>streaming load, packet copy</td></tr>
            <tr><td><code>ReadShared</code></td><td>coherent read, 공유 OK</td><td>UC 또는 SC</td><td>일반 load</td></tr>
            <tr><td><code>ReadUnique</code></td><td>read + 단독 소유 요청 (write 의도)</td><td>UC 또는 UD</td><td>store 발생 시 RFO</td></tr>
            <tr><td><code>ReadClean</code></td><td>read 받되 dirty면 메모리에 writeback 강제</td><td>SC</td><td>(드물게)</td></tr>
            <tr><td><code>ReadNotSharedDirty</code></td><td>read, SD(공유 dirty)는 받지 않음</td><td>UC/UD/SC</td><td>특정 코히어런시 패턴</td></tr>
          </tbody>
        </table>
      </div>

      <h3>REQ — Write 계열</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Opcode</th><th>의미</th><th>방향성</th></tr></thead>
          <tbody>
            <tr><td><code>WriteNoSnp</code></td><td>비-coherent write, 메모리로 직행</td><td>device write</td></tr>
            <tr><td><code>WriteUnique</code></td><td>전체/부분 라인 write + 단독 소유</td><td>일반 store with miss</td></tr>
            <tr><td><code>WriteBack</code></td><td>dirty 라인을 메모리로 evict (UD → I)</td><td>cache eviction</td></tr>
            <tr><td><code>WriteClean</code></td><td>dirty 라인 메모리에 반영하되 cache에 유지 (UD → UC)</td><td>DC CVAC equivalent</td></tr>
            <tr><td><code>WriteEvictFull</code></td><td>clean 전체 라인 evict</td><td>capacity eviction</td></tr>
            <tr><td><code>Evict</code></td><td>silent eviction 통보 (clean 라인 사라짐)</td><td>filter 갱신용</td></tr>
          </tbody>
        </table>
      </div>

      <h3>REQ — CMO (Cache Maintenance) 계열</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Opcode</th><th>의미</th><th>SW asm 대응</th></tr></thead>
          <tbody>
            <tr><td><code>CleanShared</code></td><td>dirty면 writeback, 모든 cache에 SC로 유지</td><td><code>DC CVAC</code> (PoC clean)</td></tr>
            <tr><td><code>CleanInvalid</code></td><td>writeback + 모든 cache에서 invalidate</td><td><code>DC CIVAC</code> (clean+invalidate)</td></tr>
            <tr><td><code>MakeInvalid</code></td><td><b>writeback 없이</b> invalidate (데이터 버림)</td><td><code>DC IVAC</code> (DMA-in 후)</td></tr>
            <tr><td><code>CleanUnique</code></td><td>다른 cache invalidate, 자기 라인을 UD로 → write 준비</td><td>RFO 변형</td></tr>
            <tr><td><code>MakeUnique</code></td><td>전체 라인을 새로 쓸 거니 다른 cache 다 invalidate, 데이터 fetch는 안 함</td><td>full-line write 최적화</td></tr>
          </tbody>
        </table>
      </div>

      <h3>REQ — Atomic 계열 (LSE)</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Opcode</th><th>의미</th><th>ARM asm 대응</th></tr></thead>
          <tbody>
            <tr><td><code>AtomicLoad</code></td><td>RMW, 옛 값 반환 (ADD, OR, AND, EOR 등 sub-op)</td><td><code>LDADD</code>, <code>LDSET</code>, <code>LDCLR</code>, <code>LDEOR</code></td></tr>
            <tr><td><code>AtomicStore</code></td><td>RMW, 결과 안 반환</td><td><code>STADD</code>, <code>STSET</code>, <code>STCLR</code> 등</td></tr>
            <tr><td><code>AtomicSwap</code></td><td>atomic swap</td><td><code>SWP</code></td></tr>
            <tr><td><code>AtomicCompare</code></td><td>compare-and-swap</td><td><code>CAS</code></td></tr>
          </tbody>
        </table>
      </div>
      <p><b>Near vs Far:</b> contention 적으면 RN-F가 라인을 받아 RMW(near). 높으면 HN-F가 SLC에서 직접 RMW(far). opcode는 같지만 처리 위치가 동적으로 결정됨.</p>

      <h3>REQ — Stash · DVM</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Opcode</th><th>의미</th></tr></thead>
          <tbody>
            <tr><td><code>StashOnceUnique</code></td><td>특정 RN-F의 cache에 라인을 push (단독 소유로)</td></tr>
            <tr><td><code>StashOnceShared</code></td><td>특정 RN-F에 push (공유 OK)</td></tr>
            <tr><td><code>WriteUniqueStash</code></td><td>write + 결과를 다른 RN-F에 stash</td></tr>
            <tr><td><code>DVMOp</code></td><td>TLBI, IC, 동기화 등 시스템 레벨 메시지 — payload에 종류 인코딩</td></tr>
          </tbody>
        </table>
      </div>

      <h3>SNP — HN-F → RN-F</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Opcode</th><th>요구하는 것</th><th>받는 RN-F의 동작</th></tr></thead>
          <tbody>
            <tr><td><code>SnpShared</code></td><td>"S 상태로 양보해줘"</td><td>UD/UC → SC, 데이터 응답</td></tr>
            <tr><td><code>SnpUnique</code></td><td>"단독 소유 양도 + 너는 invalidate"</td><td>UD/UC/SC → I, 데이터 응답 (UD면)</td></tr>
            <tr><td><code>SnpInvalid</code></td><td>"버려라" (writeback 필요)</td><td>모든 상태 → I</td></tr>
            <tr><td><code>SnpClean</code></td><td>"dirty면 메모리 반영 후 너는 SC"</td><td>UD → SC + writeback</td></tr>
            <tr><td><code>SnpCleanInvalid</code></td><td>"clean하고 버려"</td><td>UD → I + writeback</td></tr>
            <tr><td><code>SnpMakeInvalid</code></td><td>"writeback 없이 버려" (위험)</td><td>모든 상태 → I, no writeback</td></tr>
            <tr><td><code>SnpOnce</code></td><td>"한 번만 보고 줘, 상태 유지"</td><td>상태 변화 없음, 데이터만 보냄</td></tr>
            <tr><td><code>SnpStashUnique</code></td><td>"이 라인을 너 cache에 받아"</td><td>새 라인 받음 (UD)</td></tr>
            <tr><td><code>SnpDVMOp</code></td><td>DVM 메시지 (TLBI 등)</td><td>해당 sync 수행 후 ack</td></tr>
          </tbody>
        </table>
      </div>

      <h3>RSP — Response (no data)</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Opcode</th><th>의미</th></tr></thead>
          <tbody>
            <tr><td><code>Comp</code></td><td>요청 완료 — 데이터 없는 read/write 완료</td></tr>
            <tr><td><code>CompAck</code></td><td>requester가 받았음을 HN-F에 ack (3-way 핸드셰이크)</td></tr>
            <tr><td><code>RetryAck</code></td><td>credit 부족 등으로 재시도 요청</td></tr>
            <tr><td><code>PCrdGrant</code></td><td>retry 후 credit 부여</td></tr>
            <tr><td><code>SnpResp</code></td><td>snoop 응답 (데이터 없음, 상태만 보고)</td></tr>
            <tr><td><code>DBIDResp</code></td><td>"write data 받을 buffer ID는 X" — write 완료 전 단계</td></tr>
            <tr><td><code>ReadReceipt</code></td><td>read 요청 접수 ack (early)</td></tr>
          </tbody>
        </table>
      </div>

      <h3>DAT — Data carrying</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Opcode</th><th>의미</th></tr></thead>
          <tbody>
            <tr><td><code>CompData</code></td><td>요청 완료 + 라인 데이터 (read 응답)</td></tr>
            <tr><td><code>SnpRespData</code></td><td>snoop 응답 + 데이터 (DCT용)</td></tr>
            <tr><td><code>SnpRespDataPtl</code></td><td>partial data snoop response</td></tr>
            <tr><td><code>WriteDataCancel</code></td><td>write data 취소</td></tr>
            <tr><td><code>NonCopyBackWriteData</code></td><td>일반 write data payload</td></tr>
            <tr><td><code>CopyBackWriteData</code></td><td>writeback 시 dirty data</td></tr>
          </tbody>
        </table>
      </div>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>읽는 법.</b> opcode 이름이 <code>{'<Action><What><Where>'}</code> 패턴 — <code>Read+Unique</code>(단독 read), <code>Snp+Clean+Invalid</code>(clean+invalidate snoop), <code>Atomic+Compare</code>(CAS) 식. <b>"Make"</b>는 데이터를 안 받음(상태만 변경), <b>"Once"</b>는 cache에 안 남김, <b>"NoSnp"</b>는 coherency 우회.</div>
      </div>

      <h2>Node 타입 — Mesh 위에 어떻게 붙나 <span className="en">/ Node Types</span></h2>
      <p>모든 코어·메모리·가속기는 CHI 위에서 <b>node</b>로 표현됩니다. 각 node는 mesh의 <b>crosspoint(XP)</b>에 attach.</p>

      <div className="grid2">
        <div className="card">
          <h4>RN-F (Request Node, Fully Coherent)</h4>
          <p><b>Cache를 가진 coherent requester</b>. 보통 CPU 클러스터(DSU/Neoverse cluster). full MOESI 상태 유지, snoop 받고 응답. read/write/atomic 모두 발행 가능.</p>
        </div>
        <div className="card">
          <h4>RN-I (Request Node, I/O Coherent)</h4>
          <p>Cache 없는 requester. I/O 마스터(DMA, 가속기) 같은 것. coherent read/write는 가능하지만 자기 cache가 없어 snoop 받지 않음.</p>
        </div>
        <div className="card">
          <h4>HN-F (Home Node, Fully Coherent)</h4>
          <p><b>CHI의 두뇌</b>. 주소 범위 별로 분산 — 라인 한 줄당 한 HN-F가 책임. <b>directory(snoop filter) + SLC(System Level Cache)</b> 보유. 요청 받으면 directory 조회해서 적절한 코어에만 snoop, atomic도 여기서 직접 수행 가능(far atomic).</p>
        </div>
        <div className="card">
          <h4>HN-I (Home Node, I/O)</h4>
          <p>MMIO·peripheral 영역의 home. coherency 추적 안 하고 그대로 SN-I로 전달.</p>
        </div>
        <div className="card">
          <h4>SN-F / SN-I (Subordinate Node)</h4>
          <p>최종 저장소. SN-F = DDR controller, SN-I = non-coherent peripheral.</p>
        </div>
        <div className="card">
          <h4>MN (Misc Node)</h4>
          <p>DVM(TLB shootdown 메시지), exclusive monitor sync, 기타. 일반 데이터 트래픽엔 안 관여.</p>
        </div>
      </div>

      <h3>CMN-700 mesh 토폴로지 예</h3>
      <div className="diagram">{`       XP ── XP ── XP ── XP
       │     │     │     │
   RN-F   HN-F   RN-F   HN-F  ← 코어 클러스터, home node 분산
       │     │     │     │
       XP ── XP ── XP ── XP
       │     │     │     │
   HN-F   RN-F   HN-F   SN-F  ← memory controller도 mesh의 일부
       │     │     │     │
       XP ── XP ── XP ── XP

  RN/HN/SN은 XP에 attach.
  주소 해시로 HN-F slice 결정 → hot line이 한 슬라이스에 쏠리지 않게.
  XY-routing 기본, QoS class 별 VC 채널.`}</div>

      <h2>Snoop Filter — Directory의 정체 <span className="en">/ HN-F Directory Structure</span></h2>
      <p>HN-F의 핵심 내부 구조가 <b>snoop filter</b>(또는 "directory") — 어떤 라인을 어느 RN-F가 가지고 있는지 추적하는 작은 SRAM 기반 자료구조. broadcast snoop을 <b>unicast/multicast</b>로 바꿔주는 장치이며, CHI가 256+ 코어로 확장 가능한 본질적 이유.</p>

      <h3>구조 — set-associative cache처럼</h3>
      <pre><code>
+-------+-------+----------------------+--------+{"\n"}
| valid | tag   | presence vector      | state  |{"\n"}
| 1 bit | ~30b  | N bits (per RN-F)    | 2~3 b  |{"\n"}
+-------+-------+----------------------+--------+{"\n"}
        × N entries (set-associative){"\n\n"}
presence vector: <span className="cmt">{"// 이 라인을 가진 RN-F들의 비트맵"}</span>{"\n"}
   <span className="num">0b00100100</span> → RN-F 2와 RN-F 5가 보유{"\n"}
state:           <span className="cmt">{"// UC/UD/SC/SD/I 추적"}</span>
      </code></pre>
      <p>라인 한 줄당 entry 하나. 본질은 <b>"address → who has it + state"</b> 매핑. 자체가 작은 cache처럼 set-associative + LRU.</p>

      <h3>Inclusive vs Non-Inclusive</h3>
      <div className="grid2">
        <div className="card">
          <h4>Inclusive</h4>
          <p>SLC가 모든 inner cache 라인을 보존 → SLC tag array가 곧 directory. 추가 SRAM 불필요. 단점: SLC 용량의 일부가 항상 inner cache 카피로 차지됨 (capacity 낭비).</p>
        </div>
        <div className="card">
          <h4>Non-Inclusive (NINE)</h4>
          <p>SLC와 분리된 별도 directory SRAM. 데이터 안 가지고 추적만. 현대 디자인의 표준 — CMN-700 HN-F가 이 방식. SLC 용량 효율 ↑.</p>
        </div>
      </div>

      <h3>Filter Coverage — 가장 중요한 지표</h3>
      <p><b>Coverage = (filter 추적 가능 라인 수) / (모든 inner cache 라인 수 합계)</b>. 1.0 미만이면 filter가 모든 라인을 추적할 수 없어 <b>강제 eviction</b>이 발생.</p>

      <pre><code>
filter 용량 초과 → 한 entry를 쫓아내야 함{"\n"}
쫓아낼 entry: Core 5가 가진 라인 X{"\n\n"}
   <span className="cmt">{"// filter가 라인 X 추적을 멈추기 전에:"}</span>{"\n"}
   → Core 5의 라인 X를 <b>강제 invalidate</b>{"\n"}
   → 멀쩡한 라인이 inner cache에서 쫓겨남{"\n"}
   → "snoop filter conflict eviction"{"\n\n"}
보통 <b>1.5 ~ 2.0× over-provision</b>해서 이 현상 회피
      </code></pre>

      <h3>주요 동작 시나리오</h3>
      <div className="grid2">
        <div className="card">
          <h4>Read miss + filter miss</h4>
          <p>해당 라인을 가진 RN-F 없음 → 메모리에서 직접 fetch. filter에 새 entry 추가, presence={'{requester}'}, state=UC.</p>
        </div>
        <div className="card">
          <h4>Read miss + filter hit</h4>
          <p>filter가 "RN-F 3이 가졌음" 알림 → RN-F 3에만 SnpShared. broadcast 아님. 응답 받으면 filter presence에 requester 추가.</p>
        </div>
        <div className="card">
          <h4>Write miss (RFO)</h4>
          <p>filter가 sharers={'{B, C, D}'}로 추적 → 셋에만 SnpUnique. 모두 ack 받으면 presence={'{requester}'}, state=UD로 갱신.</p>
        </div>
        <div className="card">
          <h4>Filter eviction (capacity)</h4>
          <p>filter 용량 부족 → 추적 entry 하나 evict 결정 → 그 라인 가진 RN-F들에 강제 invalidate snoop → 그 후 filter entry 제거. 코어 cache의 의미없는 라인 손실.</p>
        </div>
      </div>

      <h3>CMN-700에서의 분산 설계</h3>
      <p>CMN-700은 snoop filter를 <b>모든 HN-F slice에 분산</b>. 주소 해시로 어느 HN-F가 라인을 담당할지 결정 → hot line이 한 HN-F로 쏠리지 않음.</p>
      <div className="diagram">{`  주소 0x1000 → hash → HN-F #3가 담당
  주소 0x2000 → hash → HN-F #7가 담당
  주소 0x3000 → hash → HN-F #1이 담당

  각 HN-F는 자기 담당 주소 범위만 directory에 추적
  → 256 코어 / 32 HN-F 면, HN-F 하나당 ~8개 코어 분량 추적
  → directory size · 트래픽 모두 분산`}</div>

      <div className="callout warn">
        <span className="icon">⚠</span>
        <div><b>SW에서 보이는 흔적.</b> 워킹셋이 LLC보다 작은데도 cache miss가 많거나 코어를 늘렸더니 cache 효율이 오히려 떨어지면 — <b>snoop filter capacity 부족으로 inner cache가 강제 evict 당하는 중</b>일 가능성. ARM Neoverse PMU의 <code>LL_CACHE_FILTERED_HIT</code>, CMN PMU의 directory 통계로 추적 가능.</div>
      </div>

      <h2>Coherence 상태 — MOESI 변형 <span className="en">/ Cache Line States</span></h2>
      <p>CHI는 명칭이 다른 MOESI-계열. <b>Unique</b>(단독 보유) / <b>Shared</b>(공유) × <b>Clean</b>(메모리와 동일) / <b>Dirty</b>(수정됨) 조합.</p>

      <div className="table-wrap">
        <table>
          <thead><tr><th>CHI 상태</th><th>MOESI 대응</th><th>의미</th><th>전이 책임</th></tr></thead>
          <tbody>
            <tr><td><b>UC</b> (Unique Clean)</td><td>E</td><td>이 RN만 보유, 메모리와 동일</td><td>write 시 silent UC → UD</td></tr>
            <tr><td><b>UD</b> (Unique Dirty)</td><td>M</td><td>이 RN만 보유, 수정됨</td><td>evict 시 writeback 필수</td></tr>
            <tr><td><b>SC</b> (Shared Clean)</td><td>S</td><td>여러 RN 공유, 메모리와 동일</td><td>write 시 RFO + UD</td></tr>
            <tr><td><b>SD</b> (Shared Dirty)</td><td>O</td><td>공유, dirty — 한 RN이 ownership 보유</td><td>"passing dirty" 메시지로 책임 이양 가능</td></tr>
            <tr><td><b>I</b></td><td>I</td><td>없음/무효</td><td>—</td></tr>
          </tbody>
        </table>
      </div>

      <h3>Passing Dirty / Ownership Transfer</h3>
      <p>CHI의 디테일 중 하나 — 라인이 SD 상태일 때 ownership(writeback 책임)을 다른 RN에 넘길 수 있음. 이 RN이 evict될 때 writeback해야 하는데, "내가 곧 사라질 거면 다른 sharer에게 넘긴다"가 가능. ACE에 비해 메모리 트래픽 추가 절감.</p>

      <h2>Transaction Flow — Read/Write 시퀀스 <span className="en">/ End-to-End</span></h2>

      <h3>① Read miss with sharers</h3>
      <pre><code>
Core A: load addr=0x1000        <span className="cmt">{"// L1/L2 miss"}</span>{"\n\n"}
RN-F (Core A) → HN-F:           <span className="kw">REQ</span>: ReadShared{"\n"}
                                <span className="cmt">{"// HN-F directory 조회"}</span>{"\n"}
                                <span className="cmt">{"//   -> Core C가 SC 상태로 가지고 있음"}</span>{"\n"}
HN-F → Core C:                  <span className="kw">SNP</span>: SnpShared{"\n"}
Core C → HN-F:                  <span className="kw">DAT</span>: SnpRespData (라인 데이터){"\n"}
HN-F → Core A:                  <span className="kw">DAT</span>: CompData (Core C가 보낸 라인){"\n"}
                                <span className="cmt">{"// 또는 DCT(Direct Cache Transfer)로 Core C → Core A 직접"}</span>{"\n\n"}
결과: Core A = SC, Core C = SC (변화 없음)
      </code></pre>

      <h3>② Write miss with sharers (RFO)</h3>
      <pre><code>
Core A: store addr=0x1000        <span className="cmt">{"// 라인 없음"}</span>{"\n\n"}
RN-F (Core A) → HN-F:           <span className="kw">REQ</span>: ReadUnique <span className="cmt">{"// "}</span><span className="cmt">{"// 단독 소유 요청"}</span>{"\n"}
                                <span className="cmt">{"// HN-F directory: B, C가 SC로 보유"}</span>{"\n"}
HN-F → Core B, C:               <span className="kw">SNP</span>: SnpUnique <span className="cmt">{"// 둘 다 invalidate해라"}</span>{"\n"}
Core B → HN-F:                  <span className="kw">RSP</span>: SnpResp_I (라인 버림){"\n"}
Core C → HN-F:                  <span className="kw">RSP</span>: SnpResp_I{"\n"}
HN-F → Core A:                  <span className="kw">DAT</span>: CompData (UC로 받음){"\n"}
Core A: write 수행, UC → UD
      </code></pre>
      <p><b>이게 RFO의 정체</b> — invalidate broadcast는 "관련 코어"에만 갔지만, <b>모든 sharer 응답을 기다려야</b> write가 진행됨. 코어가 많을수록 ack 수집 시간 ↑.</p>

      <h3>③ Atomic at HN (Far Atomic)</h3>
      <pre><code>
Core A: <span className="kw">LDADD</span> w0, w1, [counter]    <span className="cmt">{"// LSE atomic, high contention 감지됨"}</span>{"\n\n"}
RN-F (Core A) → HN-F:           <span className="kw">REQ</span>: AtomicLoad ADD, val=w0{"\n"}
                                <span className="cmt">{"// HN-F가 SLC에서 직접 RMW 수행"}</span>{"\n"}
                                <span className="cmt">{"// 라인을 RN으로 옮기지 않음"}</span>{"\n"}
HN-F → Core A:                  <span className="kw">DAT</span>: CompData (old value){"\n\n"}
다른 코어가 같은 카운터 atomic 시도 시:{"\n"}
                                <span className="cmt">{"// 라인은 여전히 HN-F에 있음 → ping-pong 없음"}</span>{"\n"}
                                <span className="cmt">{"// HN-F의 RMW 처리량으로만 제한"}</span>
      </code></pre>

      <h2>주요 기능 <span className="en">/ Advanced Features</span></h2>

      <div className="grid2">
        <div className="card">
          <h4>DCT — Direct Cache Transfer</h4>
          <p>다른 RN이 가진 라인을 메모리 안 거치고 <b>cache → cache 직접 전송</b>. snoop 응답에 데이터 포함. read miss 응답을 빠르게.</p>
        </div>
        <div className="card">
          <h4>DMT — Direct Memory Transfer</h4>
          <p>메모리에서 받아오는 데이터를 HN-F를 거치지 않고 SN-F → RN-F 직접 전달. HN-F 부하 ↓ + latency ↓.</p>
        </div>
        <div className="card">
          <h4>Near vs Far Atomic</h4>
          <p><b>Near</b> — 라인을 자기 cache로 가져와 RMW (uncontended에서 빠름). <b>Far</b> — HN-F가 SLC에서 직접 수행 (high contention에서 라인 ping-pong 회피, 수배 throughput). LSE atomic이 동적 결정.</p>
        </div>
        <div className="card">
          <h4>Stash</h4>
          <p>"이 라인을 특정 RN의 L2에 push해줘". producer가 consumer에게 데이터 미리 보내기. NIC이 packet 도착 즉시 CPU L2로 stash → 처리 latency ↓. CHI Issue B+ 부터.</p>
        </div>
        <div className="card">
          <h4>DVM — Distributed Virtual Memory</h4>
          <p>TLB shootdown 등 시스템 레벨 sync 메시지를 mesh로 전달. Linux <code>flush_tlb_*()</code>가 결국 CHI DVM으로 변환. <code>TLBI</code> + <code>DSB ISH</code> 시퀀스의 인프라.</p>
        </div>
        <div className="card">
          <h4>Exclusive Monitor</h4>
          <p><code>LDXR</code>/<code>STXR</code>의 exclusive monitor를 CHI가 추적. 다른 RN이 같은 라인 건드리면 monitor lose 통보 → STXR 실패 응답. LL/SC의 멀티코어 정합성 유지.</p>
        </div>
      </div>

      <h2>한 줄 정리 <span className="en">/ Cheat Sheet</span></h2>
      <div className="callout">
        <span className="icon">📌</span>
        <div>
          <ul style={{margin: 0, paddingLeft: 18}}>
            <li><b>CHI = ARM의 directory-based coherent interconnect.</b> ACE의 broadcast 한계를 풀기 위해 mesh + 분산 directory로 설계.</li>
            <li><b>4-channel:</b> REQ(요청) · SNP(snoop) · RSP(ack) · DAT(데이터). AXI보다 coherence 의미가 직접 노출.</li>
            <li><b>Node 타입:</b> RN-F(코어) · HN-F(home+SLC+directory) · SN-F(메모리) · RN-I/HN-I(I/O) · MN(misc/DVM).</li>
            <li><b>Snoop filter (= directory):</b> "어느 RN-F가 어느 라인을 가졌나"를 set-associative SRAM으로 추적. coverage &lt; 1.0이면 inner cache 강제 evict 발생.</li>
            <li><b>상태:</b> UC(E)·UD(M)·SC(S)·SD(O)·I — MOESI algebra와 동일. SD에서 passing dirty로 ownership 이양 가능.</li>
            <li><b>핵심 기능:</b> DCT/DMT(직접 전송) · Far atomic(HN-F가 RMW) · Stash(미리 push) · DVM(TLB sync) · Exclusive monitor.</li>
            <li><b>CMN 인터커넥트와 짝:</b> CMN-600 ~ CMN-S3, 256+ 코어 + 512MB+ SLC까지 확장.</li>
          </ul>
        </div>
      </div>
    </>
  )
}
