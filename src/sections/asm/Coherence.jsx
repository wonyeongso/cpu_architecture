export default function AsmCoherence() {
  return (
    <>
      <h2>이 페이지의 범위 <span className="en">/ Scope</span></h2>
      <p>코히어런스를 SW에서 다루는 도구들 — <b>atomic primitive (LL/SC vs LSE vs cmpxchg), spinlock, CAS, ABA, 메모리 순서</b>. <code>uarch/Coherence</code> 페이지가 MESI/MOESI HW protocol을 다룬다면 여기는 <b>HW protocol 위에서 프로그래머가 어떻게 쓰나</b>.</p>

      <h2>① 3 ISA atomic primitive 비교 <span className="en">/ Side-by-Side</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th></th><th>AArch64 LL/SC</th><th>AArch64 LSE (v8.1+)</th><th>x86-64</th><th>RISC-V (A)</th></tr></thead>
          <tbody>
            <tr><td>Atomic add</td><td><code>ldxr / add / stxr</code> loop</td><td><code>ldadd</code></td><td><code>lock xadd</code></td><td><code>amoadd.w</code></td></tr>
            <tr><td>Compare-and-swap</td><td><code>ldxr / cmp / stxr</code> loop</td><td><code>cas</code></td><td><code>lock cmpxchg</code></td><td><code>lr.w / sc.w</code> loop</td></tr>
            <tr><td>Acquire variant</td><td><code>ldaxr</code></td><td><code>ldaddal</code></td><td>(TSO 기본)</td><td><code>.aq</code> suffix</td></tr>
            <tr><td>Release variant</td><td><code>stlxr</code></td><td><code>ldaddl</code></td><td>(TSO 기본)</td><td><code>.rl</code> suffix</td></tr>
            <tr><td>Memory model</td><td>weak</td><td>weak</td><td>TSO (강함)</td><td>weak (RVWMO)</td></tr>
          </tbody>
        </table>
      </div>

      <h2>② LL/SC vs LSE — 같은 atomic add <span className="en">/ Two Worlds</span></h2>
      <pre><code>
<span className="cmt">{"// LL/SC (ARMv8.0) — retry loop"}</span>{"\n"}
atomic_add:{"\n"}
.Lretry:{"\n"}
{"  "}<span className="kw">ldxr</span>  w1, [x0]            <span className="cmt">{"// load-exclusive"}</span>{"\n"}
{"  "}<span className="kw">add</span>   w1, w1, w2{"\n"}
{"  "}<span className="kw">stxr</span>  w3, w1, [x0]        <span className="cmt">{"// store-exclusive, w3 = 0 if OK"}</span>{"\n"}
{"  "}<span className="kw">cbnz</span>  w3, .Lretry         <span className="cmt">{"// retry on contention"}</span>{"\n"}
{"  "}<span className="kw">ret</span>{"\n\n"}
<span className="cmt">{"// LSE (ARMv8.1+) — single instruction"}</span>{"\n"}
atomic_add:{"\n"}
{"  "}<span className="kw">ldadd</span> w2, w1, [x0]        <span className="cmt">{"// atomic *x0 += w2, old in w1"}</span>{"\n"}
{"  "}<span className="kw">ret</span>
      </code></pre>
      <div className="callout warn">
        <span className="icon">⚠</span>
        <div><b>면접 함정.</b> LL/SC는 contention 상태에서 <b>정직하게 retry</b>. 코어 16개가 같은 라인을 공격하면 한 코어를 빼고 모두 spin → throughput 급감 + livelock 위험. LSE의 <code>ldadd/cas</code>는 controller에 atomic 의도를 직접 전달해 <b>near/far atomic policy</b> (요청자에 가까이 두든, LLC/HBM 근처에서 한 방에 처리하든)로 처리 — 큰 시스템에서 LL/SC 대비 ~10배 차이 흔함.</div>
      </div>

      <h2>③ Spinlock — 직접 짜기 <span className="en">/ Acquire / Release</span></h2>
      <pre><code>
<span className="cmt">{"// AArch64 LSE — naive spinlock"}</span>{"\n"}
<span className="cmt">{"// lock = 0 free, 1 held"}</span>{"\n\n"}
spin_lock:{"\n"}
{"  "}<span className="kw">mov</span>   w1, <span className="num">#1</span>{"\n"}
.Lretry:{"\n"}
{"  "}<span className="kw">swpa</span>  w1, w2, [x0]        <span className="cmt">{"// atomic swap with ACQUIRE"}</span>{"\n"}
{"  "}<span className="kw">cbnz</span>  w2, .Lretry         <span className="cmt">{"// old != 0 → still held, spin"}</span>{"\n"}
{"  "}<span className="kw">ret</span>{"\n\n"}
spin_unlock:{"\n"}
{"  "}<span className="kw">stlr</span>  wzr, [x0]           <span className="cmt">{"// store-release 0"}</span>{"\n"}
{"  "}<span className="kw">ret</span>
      </code></pre>
      <p><b>왜 acquire/release?</b></p>
      <ul>
        <li><b>Acquire</b>: lock을 얻은 <i>이후</i>의 critical section 접근이 lock 획득 <b>전</b>에 관측되면 안 됨 — 보호받는 데이터가 보호 밖으로 새 나옴.</li>
        <li><b>Release</b>: critical section의 모든 store가 unlock <i>이전</i>에 관측되어야 함 — 다음 lock 획득자가 일관된 상태를 봄.</li>
        <li>하나라도 빠지면 <b>"x86에선 잘 도는데 ARM에선 가끔 깨지는"</b> 클래식 버그.</li>
      </ul>

      <h2>④ Spinlock 개선 — pause / WFE <span className="en">/ Backoff</span></h2>
      <pre><code>
<span className="cmt">{"// 더 좋은 spin: 일반 load로 먼저 polling"}</span>{"\n"}
spin_lock_v2:{"\n"}
.Lretry:{"\n"}
{"  "}<span className="kw">ldaxr</span> w2, [x0]            <span className="cmt">{"// load-acquire-exclusive"}</span>{"\n"}
{"  "}<span className="kw">cbnz</span>  w2, .Lwait          <span className="cmt">{"// held → wait without exclusive"}</span>{"\n"}
{"  "}<span className="kw">mov</span>   w1, <span className="num">#1</span>{"\n"}
{"  "}<span className="kw">stxr</span>  w3, w1, [x0]{"\n"}
{"  "}<span className="kw">cbnz</span>  w3, .Lretry{"\n"}
{"  "}<span className="kw">ret</span>{"\n"}
.Lwait:{"\n"}
{"  "}<span className="kw">wfe</span>                       <span className="cmt">{"// power-saving wait — wakes on event"}</span>{"\n"}
{"  "}<span className="kw">b</span>     .Lretry{"\n\n"}
<span className="cmt">{"// x86 등가물"}</span>{"\n"}
.Lloop:{"\n"}
{"  "}<span className="kw">pause</span>                     <span className="cmt">{"// hint: I'm spinning"}</span>{"\n"}
{"  "}<span className="kw">cmp</span>   <span className="kw">byte ptr</span> [rdi], <span className="num">0</span>{"\n"}
{"  "}<span className="kw">jne</span>   .Lloop
      </code></pre>
      <div className="callout">
        <span className="icon">💡</span>
        <div><b>면접 포인트.</b> naive spin은 cache line을 다른 코어들과 <b>핑퐁</b>시켜 시스템 전체 BW를 낭비. <code>pause</code>(x86) / <code>wfe</code>(ARM)는 "기다리는 중"임을 HW에 알려 <b>전력·BW를 양보</b>. unlock 시 <code>sev</code>(또는 implicit STLR event)로 깨움.</div>
      </div>

      <h2>⑤ CAS — Compare-And-Swap <span className="en">/ The Workhorse</span></h2>
      <pre><code>
<span className="cmt">{"// C — atomic_compare_exchange_strong"}</span>{"\n"}
<span className="kw">bool</span> tryswap(<span className="kw">_Atomic int</span> *p, <span className="kw">int</span> *expected, <span className="kw">int</span> desired) {"{"}{"\n"}
{"  "}<span className="kw">return</span> atomic_compare_exchange_strong(p, expected, desired);{"\n"}
{"}"}{"\n\n"}
<span className="cmt">{"// AArch64 LSE -O2"}</span>{"\n"}
tryswap:{"\n"}
{"  "}<span className="kw">ldr</span>   w3, [x1]            <span className="cmt">{"// w3 = *expected"}</span>{"\n"}
{"  "}<span className="kw">mov</span>   w4, w3              <span className="cmt">{"// keep old"}</span>{"\n"}
{"  "}<span className="kw">casal</span> w3, w2, [x0]        <span className="cmt">{"// CAS-acq-rel: if (*x0==w3) *x0=w2"}</span>{"\n"}
{"  "}<span className="kw">cmp</span>   w3, w4{"\n"}
{"  "}<span className="kw">cset</span>  w0, eq              <span className="cmt">{"// w0 = (success ? 1 : 0)"}</span>{"\n"}
{"  "}<span className="kw">str</span>   w3, [x1]            <span className="cmt">{"// *expected = actual_old"}</span>{"\n"}
{"  "}<span className="kw">ret</span>
      </code></pre>
      <p><b>핵심 의미.</b> CAS는 "값이 X였으면 Y로 바꾸고 성공 신호" — lock-free 자료구조의 거의 모든 update 단위. <b>실패 시 expected에 actual_old를 써준다</b>는 부분이 ABA 검출의 첫 단추.</p>

      <h2>⑥ ABA 문제 <span className="en">/ The Classic Trap</span></h2>
      <p>"값을 비교해서 같으면 swap"은 <b>중간에 다른 값이 있다 돌아왔는지</b> 알 수 없다.</p>
      <div className="diagram">{`Time →
 T1:  read  HEAD → A           (using node A)
 T1:  ...                       (pending)
 T2:  pop A,  free A
 T2:  alloc → A',  push A'      (allocator reuses same address — looks like A)
 T1:  CAS(HEAD, A, B)  succeeds (value matches — but semantics are A' !)
                                ↑ ABA: different node treated as same`}</div>
      <p><b>대처법 4가지:</b></p>
      <div className="grid2">
        <div className="card">
          <h4>① Tagged pointer / generation count</h4>
          <p>포인터 + 카운터를 한 워드로. CAS가 (ptr, tag) 쌍을 비교 → A로 돌아와도 tag가 다름. <b>AArch64 128-bit CAS</b>(<code>casp</code>), <b>x86 cmpxchg16b</b> 활용.</p>
        </div>
        <div className="card">
          <h4>② Hazard pointer</h4>
          <p>각 thread가 "지금 보고 있는 노드"를 publish. retiring thread가 모든 hazard list 검사 후에만 free → A를 free 못 함.</p>
        </div>
        <div className="card">
          <h4>③ RCU / epoch reclaim</h4>
          <p>모든 reader가 grace period 통과 후 free. 단순·빠름, <b>reader가 sleeping 호출 못 함</b>.</p>
        </div>
        <div className="card">
          <h4>④ LL/SC (RISC-V, ARM legacy)</h4>
          <p>SC는 "주소가 한 번이라도 다른 코어에 의해 modify되면" 실패. ABA가 본질 불가능 — false-negative도 발생.</p>
        </div>
      </div>

      <h2>⑦ Memory order ↔ asm 매핑 <span className="en">/ C++ → ARM</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>C++ memory_order</th><th>의미</th><th>AArch64 코드젠</th></tr></thead>
          <tbody>
            <tr><td><code>relaxed</code></td><td>순서 보장 없음, 단원자성만</td><td><code>ldr / str</code> + <code>ldxr/stxr</code></td></tr>
            <tr><td><code>acquire</code> (load)</td><td>이후 접근이 이 load 뒤에 보임</td><td><code>ldar / ldaxr</code></td></tr>
            <tr><td><code>release</code> (store)</td><td>이전 접근이 이 store 전에 보임</td><td><code>stlr / stlxr</code></td></tr>
            <tr><td><code>acq_rel</code> (RMW)</td><td>acquire + release 합집합</td><td><code>casal / ldaddal</code></td></tr>
            <tr><td><code>seq_cst</code></td><td>전 thread가 합의하는 단일 순서</td><td><code>ldar / stlr</code> + <code>dmb ish</code> (드물게)</td></tr>
          </tbody>
        </table>
      </div>
      <div className="callout warn">
        <span className="icon">⚠</span>
        <div><b>가장 흔한 실수.</b> "내 code는 잘 도는데 ARM에선 가끔 깨진다" — 거의 항상 <b>relaxed로 두면 안 되는 자리에 relaxed를 쓴 경우</b>. 핸드오프 플래그(<code>ready=1</code>)는 <b>release/acquire 페어</b>가 디폴트. 의심나면 <code>seq_cst</code>로 시작 → 프로파일링으로 약화.</div>
      </div>

      <h2>⑧ 면접 단골 — Double-Checked Locking <span className="en">/ Why It Breaks</span></h2>
      <pre><code>
<span className="cmt">{"// 흔한 잘못된 버전"}</span>{"\n"}
<span className="kw">Singleton</span>* get() {"{"}{"\n"}
{"  "}<span className="kw">if</span> (instance == <span className="kw">nullptr</span>) {"{"}        <span className="cmt">{"// ① relaxed read"}</span>{"\n"}
{"    "}lock(mu);{"\n"}
{"    "}<span className="kw">if</span> (instance == <span className="kw">nullptr</span>) {"{"}{"\n"}
{"      "}instance = <span className="kw">new</span> Singleton();    <span className="cmt">{"// ② relaxed write — trap"}</span>{"\n"}
{"    "}{"}"}{"\n"}
{"    "}unlock(mu);{"\n"}
{"  "}{"}"}{"\n"}
{"  "}<span className="kw">return</span> instance;{"\n"}
{"}"}
      </code></pre>
      <p><b>왜 깨지나.</b> ②의 publication에서 컴파일러/CPU가 reorder하면 <code>instance</code> 포인터가 set된 시점에 객체 내부가 <b>아직 초기화 안 됨</b>. ①의 relaxed read를 통과한 다른 thread가 <i>반쯤 만들어진</i> Singleton을 본다.</p>
      <p><b>고치는 법.</b> ①은 <code>acquire</code> load, ②는 <code>release</code> store. 또는 <code>std::call_once</code> / <code>std::atomic&lt;T*&gt;</code> 정공법.</p>

      <h2>⑨ Lock-free queue 구조 한 컷 <span className="en">/ SPSC / MPSC / MPMC</span></h2>
      <ul>
        <li><b>SPSC</b>: head/tail 각자 release / acquire만 — CAS 불필요</li>
        <li><b>MPSC</b>: producer가 tail을 <code>fetch_add</code>(LSE면 한 명령) → 슬롯 예약, 데이터 채운 후 ready 플래그 release</li>
        <li><b>MPMC</b>: tag/sequence 번호로 슬롯 상태 추적, ABA 방지에 generation 사용</li>
      </ul>
      <p>면접에서 종이에 짜야 한다면 <b>SPSC 먼저, MPSC 변형, MPMC는 sequence number만 언급</b>해도 충분. 모든 것을 한 번에 짜려고 하지 말 것.</p>

      <h2>한 줄 요약 <span className="en">/ Cheat Sheet</span></h2>
      <div className="callout">
        <span className="icon">📌</span>
        <div>
          <ul style={{margin: 0, paddingLeft: 18}}>
            <li>LSE 가능하면 LSE — 큰 SoC에서 LL/SC 대비 압도적.</li>
            <li>Spinlock: <b>acquire on lock, release on unlock</b>. 둘 중 하나 빠지면 ARM에서 깨진다.</li>
            <li>spinning 시 <code>wfe / pause</code> — cache 핑퐁과 전력 낭비 회피.</li>
            <li>CAS는 lock-free 만능 — 단, ABA 가능. tagged ptr / hazard / RCU 중 하나로 막는다.</li>
            <li>C++ <code>memory_order</code>: 의심나면 seq_cst → 프로파일 후 release/acquire로 약화.</li>
            <li>Double-checked locking은 <b>release publish + acquire read</b> 없으면 깨짐.</li>
            <li>면접 한 줄: <b>"같은 라인에 자주 쓰는 atomic은 false sharing — 64B 정렬로 분리."</b></li>
          </ul>
        </div>
      </div>
    </>
  )
}
