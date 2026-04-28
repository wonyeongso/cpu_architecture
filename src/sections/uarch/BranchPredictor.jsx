export default function BranchPredictor() {
  return (
    <>
      <h2>분기 예측이 뭔가요 <span className="en">/ What is Branch Prediction?</span></h2>
      <p>코드를 쭉 읽다 보면 <b>"여기서 어디로 갈지"</b>를 정해야 하는 지점들이 있어요 — <code>if/else</code>, <code>for</code>, <code>while</code>, 함수 호출, <code>return</code>.
      이걸 통틀어 <b>분기(branch)</b>라고 하고, CPU는 이 분기를 <b>미리 맞춰야</b> 빠르게 일할 수 있습니다.</p>

      <div className="grid2">
        <div className="card">
          <h4>분기의 종류</h4>
          <ul>
            <li><b>조건부 분기</b>: <code>if (x &gt; 0)</code>, <code>for</code>의 끝 검사 — taken? not-taken?</li>
            <li><b>무조건 분기</b>: <code>goto</code>, <code>break</code>, 함수 호출 — 항상 간다</li>
            <li><b>간접 분기</b>: <code>switch</code>, 가상 함수, 함수 포인터 — 어디로 가는지 주소를 <b>런타임에</b> 알아냄</li>
            <li><b>리턴</b>: <code>return</code> — 호출한 곳으로 돌아감</li>
          </ul>
        </div>
        <div className="card">
          <h4>C 코드로 보기</h4>
          <pre style={{ margin: '6px 0 0', fontSize: 11 }}><code>
<span className="kw">for</span> (<span className="kw">int</span> i=<span className="num">0</span>; i&lt;n; i++) {"{"}  <span className="cmt">{"// conditional branch on every iteration"}</span>{"\n"}
{"  "}<span className="kw">if</span> (arr[i] &gt; <span className="num">0</span>)        <span className="cmt">{"// conditional branch"}</span>{"\n"}
{"    "}process(arr[i]);       <span className="cmt">{"// function call (+ return)"}</span>{"\n"}
{"}"}
          </code></pre>
        </div>
      </div>

      <h3>왜 "예측"을 하나?</h3>
      <p>현대 CPU는 파이프라인으로 <b>여러 명령을 동시에 진행</b>합니다. 그런데 <code>if (x&gt;0) A else B</code>를 만나면 조건 계산이 끝날 때까지 다음 명령을 못 가져와요 —
      <b>파이프라인이 비어버림</b>(버블). 이게 아까워서 CPU는 조건이 결정되기 전에 "아마 taken이겠지?" <b>찍어서 미리 진행</b>합니다.</p>

      <div className="diagram">{` 시간 →

  if 조건 계산  ████████
  맞으면 A     ____________████████   ← 예측 성공: 그냥 진행
  틀리면 A     ____________xxxxxxxx   ← 예측 실패: 이 작업 전부 버림!
              (flush)
  다시 B       ____________________████████
                           ↑
                  15~20 cycle 낭비 (misprediction penalty)`}</div>

      <p><b>예측 성공</b>이면 "파이프라인이 놀지 않고 가득 참" → 빠름.
      <b>예측 실패</b>면 찍어놓고 한 일을 전부 버리고 다시 시작 → 느림(10~20 cycle 손해).</p>

      <h2>가장 쉬운 예측기 <span className="en">/ Simple Predictors</span></h2>

      <h3>① "항상 taken" / "항상 not-taken"</h3>
      <p>가장 단순한 방법. 예측 테이블 없이 그냥 한 방향으로 찍음.
      <code>for</code> 루프는 거의 다 taken이니까 "항상 taken"만 해도 정확도 80%가 나와요.
      옛날 프로세서(초기 ARM, 386)가 이 방식.</p>

      <h3>② Static prediction — "뒤로 가면 taken"</h3>
      <p>컴파일러나 CPU가 <b>분기 방향</b>을 보고 추측: <b>뒤로 가는 분기는 taken</b>(루프니까), <b>앞으로 가는 분기는 not-taken</b>(if의 예외 경로니까).
      테이블 없이도 90% 가까이 맞출 수 있음.</p>

      <h3>③ 1-bit 예측기 — "방금 그대로"</h3>
      <p>"마지막에 taken이었으면 이번에도 taken, not-taken이었으면 not-taken" — 분기마다 1-bit 저장.</p>
      <pre><code>
<span className="cmt">{"// the same branch executed 100 times"}</span>{"\n"}
T T T T T T N T T T T T T T ...{"\n"}
          ↑{"\n"}
 여기서 한 번 N이 나오면 다음 예측도 N → 또 틀림 (연속 2번 틀림)
      </code></pre>
      <p>문제: "거의 항상 taken인데 가끔 한 번 not-taken"인 루프에서 <b>두 번씩 틀림</b>.</p>

      <h3>④ 2-bit 포화 카운터 — "한 번 실수로는 안 바꾼다"</h3>
      <p>1-bit의 약점을 고친 버전. <b>00(strongly NT) — 01(weakly NT) — 10(weakly T) — 11(strongly T)</b> 네 상태.
      taken이면 +1, not-taken이면 -1(한쪽 끝에서 멈춤).</p>

      <div className="diagram">{`   +1        +1         +1
 00  ────>  01  ─────>  10  ────>  11
 strong      weak        weak       strong
 not-taken   not-taken   taken      taken
 <──────   <──────   <──────
   -1        -1         -1

 strong 상태에선 1번 틀려도 예측은 유지 → 변덕 분기에 강함`}</div>

      <p>이게 <b>바이모달(bimodal) 예측기</b>의 핵심이에요. PC를 해시해서 테이블에 2-bit씩 저장 — 하드웨어가 엄청 단순한데 정확도 90% 이상 나옴.
      이후 모든 고급 예측기의 <b>기반</b>이 됩니다.</p>

      <h3>예측기 정확도 — 어느 정도면 충분?</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>기법</th><th>하드웨어</th><th>대략 정확도</th></tr></thead>
          <tbody>
            <tr><td>항상 taken</td><td>0 bit</td><td>~70%</td></tr>
            <tr><td>Static (방향 기반)</td><td>0 bit</td><td>~85%</td></tr>
            <tr><td>1-bit</td><td>1 bit × N</td><td>~90%</td></tr>
            <tr><td>2-bit 포화</td><td>2 bit × N (바이모달)</td><td>~93%</td></tr>
            <tr><td>2-level (gshare)</td><td>PHT + GHR</td><td>~95%</td></tr>
            <tr><td>TAGE-SC-L (현대 코어)</td><td>수십 KB tagged tables</td><td>~98~99%</td></tr>
          </tbody>
        </table>
      </div>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>왜 99%도 아직 부족한가?</b> 분기는 5~7 명령마다 하나. 1% 틀려도 파이프라인 flush 한 번이 20 cycle. 1000 명령 실행 중 분기 150개 → 예측 실패 1.5개 → 30 cycle 손해.
        0.1%p 차이가 "빠르다/느리다"를 가르는 이유입니다.</div>
      </div>

      <h2>이제 어려운 얘기로 — <span className="en">Advanced</span></h2>
      <p>지금부터는 TAGE, ITTAGE, RAS, BTB, decoupled fetch 같은 최신 기법입니다. "왜 2-bit 포화 카운터로는 부족한가"를 생각하면서 따라오시면 좋아요. 간단히 말해: <b>분기의 결과는 PC뿐 아니라 "직전에 어떤 분기들을 지나왔는지(history)"에도 의존</b>하기 때문에, 히스토리를 같이 해시해서 더 정교하게 맞추는 방향으로 발전합니다.</p>

      <h2>왜 분기 예측이 중요한가 <span className="en">/ Why It Matters</span></h2>
      <p>8-wide · 15-stage OoO 코어에서 <b>mispredict 하나 = 15+ cycle pipeline flush</b>. 예측 정확도 1%p 개선이 IPC 수 %로 환산되는 이유이며, 현대 코어의 front-end 예산 대부분이 BPU에 투입됩니다.</p>
      <div className="grid3">
        <div className="card">
          <h4>Misprediction Penalty</h4>
          <p><b>pipeline depth</b>에 비례. X2/V2 급은 10 ~ 17 cycle. SMT·deep window 일수록 squash 비용이 큼.</p>
        </div>
        <div className="card">
          <h4>Fetch Bubble</h4>
          <p>BPU가 정확해도 지연되면 fetch stall. <b>decoupled fetch</b>로 BPU를 I-cache보다 앞세워 bubble 은폐.</p>
        </div>
        <div className="card">
          <h4>분기 빈도</h4>
          <p>평균 코드의 <b>5 ~ 7명령당 1개</b>가 분기. SPEC int·server 워크는 10% 이상이 indirect/ret.</p>
        </div>
      </div>

      <h2>예측기 종류 <span className="en">/ Predictor Types</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>예측 대상</th><th>질문</th><th>대표 알고리즘</th><th>자원</th></tr></thead>
          <tbody>
            <tr><td>Direction</td><td>taken? not-taken?</td><td><code>TAGE-SC-L</code>, perceptron</td><td>PHT / GHR / 다중 history table</td></tr>
            <tr><td>Target (direct)</td><td>어디로 점프?</td><td>BTB lookup</td><td>μBTB / L1-BTB / L2-BTB</td></tr>
            <tr><td>Target (indirect)</td><td><code>BR Xn</code> 어디로?</td><td><code>ITTAGE</code>, indirect target cache</td><td>path-history tagged table</td></tr>
            <tr><td>Return</td><td><code>RET</code> 어디로?</td><td>RAS (Return Address Stack)</td><td>LIFO ~16 ~ 32 entry</td></tr>
            <tr><td>Loop</td><td>몇 번 반복?</td><td>Loop Predictor</td><td>iteration counter</td></tr>
            <tr><td>Call / Ret 페어</td><td>짝 맞추기</td><td>RAS 보정</td><td>speculative push/pop</td></tr>
          </tbody>
        </table>
      </div>

      <h2>TAGE / TAGE-SC-L <span className="en">/ Tagged Geometric</span></h2>
      <p>현대 direction predictor의 de-facto 표준. 서로 다른 길이의 global history로 색인되는 <b>여러 개의 tagged table</b>을 쌓아 pattern 길이를 적응적으로 선택합니다.</p>
      <div className="diagram">{`PC ──┬──> T0 (bimodal, base)          ─┐
     ├──> T1  (history len h1, tag)   │
     ├──> T2  (history len h2, tag)   │  tag match된 가장 긴
     ├──> T3  (history len h3, tag)   │  history table이 우선
     └──> Tn  (history len hn, tag)   │  (provider)
                                      │
SC   ──> Statistical Corrector    ────┤  확률적 보정
L    ──> Loop Predictor           ────┘  루프 이탈 정확히 맞춤`}</div>
      <div className="grid2">
        <div className="card">
          <h4>Geometric history</h4>
          <p>h1, h2, … hn 을 기하급수로 배치 (예: 4, 8, 16, 32, 64, 128). 짧은 패턴과 긴 패턴 모두 커버.</p>
        </div>
        <div className="card">
          <h4>Useful counter</h4>
          <p>각 엔트리에 <code>u</code> (usefulness) 카운터 → 자주 도움된 엔트리만 살림. replacement에 핵심.</p>
        </div>
        <div className="card">
          <h4>Statistical Corrector</h4>
          <p>TAGE가 약한 <b>저확률 편향 분기</b>를 별도 table이 뒤집어줌. 2 ~ 3% 추가 정확도.</p>
        </div>
        <div className="card">
          <h4>Loop Predictor</h4>
          <p><code>for (i=0; i&lt;64; i++)</code> 같은 고정 횟수 루프의 마지막 반복을 정확히 예측 — TAGE 의 취약점 보완.</p>
        </div>
      </div>
      <div className="callout">
        <span className="icon">💡</span>
        <div>Arm 공식 자료가 <code>TAGE-SC-L</code> 사용을 직접 명시하진 않지만 Cortex-A77부터의 BPU 동작은 TAGE 계열과 부합하는 것으로 분석됨 (Chips and Cheese, Anandtech 기반).</div>
      </div>

      <h2>Perceptron 계열 <span className="en">/ Perceptron-based</span></h2>
      <p>AMD Zen이 채택한 방식. history 벡터를 입력으로 하는 선형 분류기를 bit별 saturating counter로 구현.</p>
      <div className="grid2">
        <div className="card">
          <h4>장점</h4>
          <p>긴 history를 선형 비용으로 커버. <b>Hashed Perceptron</b>으로 공간 효율 추가 확보.</p>
        </div>
        <div className="card">
          <h4>단점</h4>
          <p>선형 분리 가능한 패턴에만 강함 → non-linear 상관 패턴은 TAGE 대비 약함. Zen 도 근래는 <b>하이브리드</b> 경향.</p>
        </div>
      </div>

      <h2>BTB 계층 <span className="en">/ BTB Hierarchy</span></h2>
      <p>용량 ↑ = 레이턴시 ↑ 의 전형 트레이드오프. 멀티레벨 BTB로 hot path는 L0에서 단일 cycle 예측, miss 시 상위 레벨로 fallback.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>레벨</th><th>크기</th><th>레이턴시</th><th>용도</th></tr></thead>
          <tbody>
            <tr><td>μBTB / L0</td><td>~64 ~ 128 entry</td><td>0 cycle (overlap)</td><td>tight loop, hot path</td></tr>
            <tr><td>Main BTB / L1</td><td>~4K ~ 16K entry</td><td>1 ~ 2 cycle</td><td>일반 분기</td></tr>
            <tr><td>L2 BTB</td><td>~32K+ entry</td><td>수 cycle</td><td>code footprint 큰 서버 워크</td></tr>
          </tbody>
        </table>
      </div>
      <div className="callout">
        <span className="icon">💡</span>
        <div>서버 · DB 워크는 I-cache / BTB footprint가 크기 때문에 <b>대용량 L2 BTB + I-prefetch</b> 가 Neoverse 계열의 주된 front-end 투자 포인트.</div>
      </div>

      <h2>Indirect Branch & ITTAGE <span className="en">/ Indirect Prediction</span></h2>
      <p>가상 함수 / switch jump table / interpreter dispatch는 <code>BR Xn</code> — 같은 PC라도 상황마다 목적지가 다름. path history 기반 tagged predictor로 문맥을 구별.</p>
      <div className="grid2">
        <div className="card">
          <h4>핵심 아이디어</h4>
          <p>PC 뿐 아니라 <b>최근 분기 경로(path history)</b>를 해시 → 같은 간접분기의 상황별 타깃을 분리해 기억.</p>
        </div>
        <div className="card">
          <h4>왜 어려운가</h4>
          <p>targets가 수십 ~ 수백. direction(1 bit)와 달리 <b>완전 주소</b>를 맞춰야 함 → miss 페널티가 크고 학습이 느림.</p>
        </div>
      </div>

      <h2>RAS (Return Address Stack) <span className="en">/ Return Prediction</span></h2>
      <p>call 시 push, ret 시 pop — LIFO로 <code>RET</code>의 목적지를 거의 100% 맞출 수 있는 특수 구조.</p>
      <div className="grid2">
        <div className="card">
          <h4>깊이</h4>
          <p>보통 16 ~ 32 entry. 재귀 깊이가 이를 넘으면 overflow → 바닥 entry 상실 / 예측 실패.</p>
        </div>
        <div className="card">
          <h4>Speculative Push/Pop</h4>
          <p>speculative하게 push/pop 하므로 mispredict 시 <b>checkpoint & restore</b> 필요. 복원 누락 → 이후 ret 연쇄 실패.</p>
        </div>
        <div className="card">
          <h4>Setjmp / Tail-call</h4>
          <p>정상 LIFO를 깨는 코드 — 컴파일러가 <code>tail-call</code> 최적화로 call 생략하면 RAS 불균형 유발 가능.</p>
        </div>
        <div className="card">
          <h4>PAuth와의 상호작용</h4>
          <p>ARM PAuth는 LR에 PAC 삽입. RAS는 PAC stripping된 값을 push/pop — 정합성은 HW가 보장.</p>
        </div>
      </div>

      <h2>Decoupled Fetch & Next-Line Prefetch <span className="en">/ Front-end Flow</span></h2>
      <div className="diagram">{`  ┌── BPU (TAGE + BTB + RAS) ──┐
  │   cycle N: predict next PC  │ ─ fetch target queue (FTQ)
  └────────────┬────────────────┘          │
               │                            ▼
               │           ┌──── I-cache + ITLB ────┐
               │           │  cycle N+k: fetch bytes │
               │           └─────────────┬──────────┘
               │                          │
        (BPU 가 fetch 보다 k cycle 앞)     ▼
                                Decode → Rename → OoO`}</div>
      <div className="grid2">
        <div className="card">
          <h4>FTQ (Fetch Target Queue)</h4>
          <p>BPU가 예측해둔 PC를 큐에 쌓아 IFU가 소비. BPU가 stall 되어도 queue depth 만큼 fetch 지속.</p>
        </div>
        <div className="card">
          <h4>Next-line / BP-driven prefetch</h4>
          <p>예측된 PC를 활용해 I-cache miss를 <b>선제 prefetch</b>. 서버 워크의 L1I miss 회피에 결정적.</p>
        </div>
      </div>

      <h2>성능 지표 <span className="en">/ Metrics</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>지표</th><th>정의</th><th>관찰 포인트</th></tr></thead>
          <tbody>
            <tr><td>MPKI</td><td>1000 × mispredict / instruction</td><td>client ~1 ~ 3, server/DB ~5 ~ 10</td></tr>
            <tr><td>BTB MPKI</td><td>BTB miss / 1000 instr</td><td>code footprint 지표 — I-prefetch 효과 확인</td></tr>
            <tr><td>RAS mismatch</td><td>ret 오예측 비율</td><td>재귀 / longjmp / signal handler 영향</td></tr>
            <tr><td>Bad Spec (Top-down)</td><td>squash된 slot / 전체 slot</td><td>Frontend Bound 과 분리 가능</td></tr>
          </tbody>
        </table>
      </div>
      <div className="grid2">
        <div className="card">
          <h4>ARM PMU 이벤트</h4>
          <p><code>BR_RETIRED</code>, <code>BR_MIS_PRED_RETIRED</code>, <code>BR_INDIRECT_SPEC</code>, <code>BR_RETURN_SPEC</code> 등. Top-down에서 <b>Bad Spec</b> 카테고리에 매핑.</p>
        </div>
        <div className="card">
          <h4>Intel perf 상응</h4>
          <p><code>BR_MISP_RETIRED.ALL_BRANCHES</code>, <code>BACLEARS</code>, <code>FRONTEND_RETIRED.*</code> — 병목 분류 방식은 사실상 동일.</p>
        </div>
      </div>

      <h2>보안: BTB Poisoning & 미티게이션 <span className="en">/ Security Interactions</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>Spectre v2 (BTI 공격)</h4>
          <p>공격자가 BTB를 오염시켜 피해자 context의 indirect branch를 speculative하게 자신이 원한 gadget으로 점프시킴.</p>
        </div>
        <div className="card">
          <h4>ARM <code>CSV2</code> / <code>CSV3</code></h4>
          <p>branch/context 기반 predictor state가 <b>권한·context 경계를 넘지 않음</b>을 보장하는 feature bit — OS가 이에 따라 <code>BPB invalidate</code> 빈도 결정.</p>
        </div>
        <div className="card">
          <h4>ARM <code>BTI</code></h4>
          <p>indirect branch 타깃이 <b><code>BTI</code> 명령이 있는 위치</b>가 아니면 exception. JOP 계열 gadget 실행 차단.</p>
        </div>
        <div className="card">
          <h4>IBRS / IBPB (x86 참고)</h4>
          <p>Intel/AMD의 BPU flush MSR. ARM은 <code>ICIALLU</code> + context-synchronizing event + <code>CSV2</code> 조합으로 등가 보장.</p>
        </div>
      </div>

      <h2>한 줄 정리 <span className="en">/ Cheat Sheet</span></h2>
      <div className="callout">
        <span className="icon">📌</span>
        <div>
          <ul style={{margin: 0, paddingLeft: 18}}>
            <li><b>Direction</b> = TAGE-SC-L (+ Loop), <b>Target</b> = BTB 계층, <b>Indirect</b> = ITTAGE, <b>Return</b> = RAS.</li>
            <li>BPU 품질은 <b>MPKI · Bad Spec · Front-end Bound</b> 세 지표로 판별.</li>
            <li>Decoupled fetch + FTQ 가 없으면 예측이 정확해도 fetch bubble 이 IPC 를 깎음.</li>
            <li>Speculation side-channel 방어는 <code>CSV2/CSV3</code> + <code>BTI</code> + <code>PAuth</code> 조합.</li>
          </ul>
        </div>
      </div>
    </>
  )
}
