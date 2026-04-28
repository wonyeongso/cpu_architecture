export default function AsmPipeline() {
  return (
    <>
      <h2>이 페이지의 범위 <span className="en">/ Scope</span></h2>
      <p>파이프라인 친화적 코드를 짜는 도구들 — <b>csel 가족(branchless), BTI/PAC(branch hardening), RAS(return address stack), speculative barrier(CSDB/SB), dependency break</b>. <code>uarch/BranchPredictor</code>·<code>general/PipelineBasics</code>가 HW 동작을 다룬다면 여기는 <b>SW가 어떻게 mispredict와 spec attack을 회피하나</b>.</p>

      <h2>① csel 가족 — Branchless 5종 <span className="en">/ Conditional Family</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>명령</th><th>의미</th><th>활용</th></tr></thead>
          <tbody>
            <tr><td><code>csel</code></td><td>cond ? rn : rm</td><td>basic select (max, min, ternary)</td></tr>
            <tr><td><code>cset</code></td><td>cond → {`{0,1}`}</td><td>boolean materialize</td></tr>
            <tr><td><code>csinc</code></td><td>cond ? rn : rm + 1</td><td>conditional increment</td></tr>
            <tr><td><code>csneg</code></td><td>cond ? rn : -rm</td><td>signed select with negation</td></tr>
            <tr><td><code>cneg</code></td><td>cond ? -rn : rn</td><td>conditional negate (abs)</td></tr>
            <tr><td><code>ccmp</code></td><td>cond ? cmp(rn, rm) : flags=imm</td><td>chained compare without branch</td></tr>
          </tbody>
        </table>
      </div>
      <pre><code>
<span className="cmt">{"// max(a, b) — branchless"}</span>{"\n"}
<span className="kw">cmp</span>   w0, w1{"\n"}
<span className="kw">csel</span>  w0, w0, w1, gt{"\n\n"}
<span className="cmt">{"// abs(x) — branchless"}</span>{"\n"}
<span className="kw">cmp</span>   w0, <span className="num">#0</span>{"\n"}
<span className="kw">cneg</span>  w0, w0, mi{"\n\n"}
<span className="cmt">{"// 0..3 clamp — chained ccmp"}</span>{"\n"}
<span className="kw">cmp</span>   w0, <span className="num">#0</span>{"\n"}
<span className="kw">ccmp</span>  w0, <span className="num">#3</span>, <span className="num">#0</span>, ge      <span className="cmt">{"// if ge, do cmp w0, #3 else flags=0 (lt)"}</span>{"\n"}
<span className="kw">csel</span>  w0, w0, wzr, le        <span className="cmt">{"// in range? keep : 0"}</span>
      </code></pre>
      <div className="callout">
        <span className="icon">💡</span>
        <div><b>왜 branchless가 좋은가.</b> 분기는 misprediction 시 파이프라인 flush(15~20 cycle 손해). csel은 <b>두 input 모두 계산</b>하지만 mispredict cost가 0. <b>예측 가능성이 낮은 분기</b>(데이터 의존)일수록 branchless가 유리.</div>
      </div>

      <h2>② Branchless가 항상 좋진 않다 <span className="en">/ When Branch Wins</span></h2>
      <ul>
        <li><b>한 갈래에 side effect</b> — store / call / fault 가능 → branch 유지 필수</li>
        <li><b>매우 잘 예측되는 분기</b>(loop 끝 검사, 99% taken) — branch 거의 무료, csel은 dependency chain 추가</li>
        <li><b>한 갈래가 비싼 계산</b> — branch면 조건 안 맞을 때 안 함, csel은 무조건 계산</li>
      </ul>
      <pre><code>
<span className="cmt">{"// 이 코드는 branchless로 바꾸면 안 됨"}</span>{"\n"}
<span className="kw">if</span> (p) *p = <span className="num">42</span>;          <span className="cmt">{"// p가 NULL일 수 있음"}</span>{"\n\n"}
<span className="cmt">{"// AArch64 -O2 — 분기 유지"}</span>{"\n"}
<span className="kw">cbz</span>   x0, .Lskip           <span className="cmt">{"// skip the store"}</span>{"\n"}
<span className="kw">mov</span>   w1, <span className="num">#42</span>{"\n"}
<span className="kw">str</span>   w1, [x0]{"\n"}
.Lskip:
      </code></pre>

      <h2>③ Indirect branch & RAS <span className="en">/ Return Address Stack</span></h2>
      <p>CPU는 <code>BL</code> 호출마다 return address를 <b>RAS</b>(Return Address Stack)에 push, <code>RET</code>에서 pop해 예측. RAS는 <b>SW가 잘못 다루면 폭발</b>.</p>
      <div className="grid2">
        <div className="card">
          <h4>정상 패턴 — bl/ret 짝</h4>
          <p><code>bl foo</code> → RAS push. foo 안 <code>ret</code> → RAS pop. 깊이 ~16~32 정도라 깊은 재귀에선 overflow되어 BTB로 fallback.</p>
        </div>
        <div className="card">
          <h4>Tail call — 안전</h4>
          <p>함수 끝에 <code>b foo</code>(아니라 <code>bl + ret</code>) → RAS 안 변함. caller의 return으로 직접 ret.</p>
        </div>
        <div className="card">
          <h4>망가뜨리는 패턴 ①</h4>
          <p><code>bl</code> 없이 <code>ret</code> — 예: setjmp/longjmp 직접 구현 시 stack에서 LR 복구. RAS와 mismatch → 다음 ret 다 misprediction.</p>
        </div>
        <div className="card">
          <h4>망가뜨리는 패턴 ②</h4>
          <p>indirect branch로 trampoline jump — <code>br x0</code>는 BTB로 예측 시도하지만 RAS는 안 씀. Linux retpoline-like 패턴이 의도적으로 BTB 우회.</p>
        </div>
      </div>

      <h2>④ BTI — Branch Target Identification <span className="en">/ ARMv8.5</span></h2>
      <pre><code>
<span className="cmt">{"// Indirect branch (br x0, blr x0) 만 jump 가능한 위치를 명시"}</span>{"\n"}
<span className="cmt">{"// → ROP/JOP gadget 차단"}</span>{"\n\n"}
foo:{"\n"}
{"  "}<span className="kw">bti</span>   c                  <span className="cmt">{"// 'c' = call target (blr OK)"}</span>{"\n"}
{"  "}<span className="cmt">{"// ... function body ..."}</span>{"\n"}
{"  "}<span className="kw">ret</span>{"\n\n"}
.Ljump_table_entry:{"\n"}
{"  "}<span className="kw">bti</span>   j                  <span className="cmt">{"// 'j' = jump target (br OK, blr NOT)"}</span>{"\n"}
{"  "}<span className="cmt">{"// ..."}</span>{"\n\n"}
.Lboth:{"\n"}
{"  "}<span className="kw">bti</span>   jc                 <span className="cmt">{"// both"}</span>
      </code></pre>
      <p><b>구조.</b> Page에 <b>GP(Guard Page)</b> 비트가 있는 영역에서, indirect branch 도착지가 <code>bti</code> instruction이 아니면 <b>SIGILL</b>. 공격자가 임의 함수 중간으로 점프 못 함. 일반 분기 영향 없음(NOP 동작).</p>

      <h2>⑤ PAC — Pointer Authentication <span className="en">/ ARMv8.3</span></h2>
      <pre><code>
<span className="cmt">{"// Function prologue/epilogue with PAC"}</span>{"\n"}
foo:{"\n"}
{"  "}<span className="kw">paciasp</span>                  <span className="cmt">{"// sign LR with key A, modifier=SP → store in upper bits"}</span>{"\n"}
{"  "}<span className="kw">stp</span>   x29, x30, [sp, <span className="num">#-16</span>]!{"\n"}
{"  "}<span className="cmt">{"// ... body ..."}</span>{"\n"}
{"  "}<span className="kw">ldp</span>   x29, x30, [sp], <span className="num">#16</span>{"\n"}
{"  "}<span className="kw">autiasp</span>                  <span className="cmt">{"// verify signature; corrupt LR if invalid"}</span>{"\n"}
{"  "}<span className="kw">ret</span>                      <span className="cmt">{"// uses LR — fails on tamper"}</span>
      </code></pre>
      <p><b>핵심.</b> stack에 저장된 LR을 공격자가 덮어써도 <b>signature가 안 맞아</b> autiasp이 LR을 corrupt시킴 → ret 시 SIGSEGV. ROP 차단의 강력한 방어. Apple M1/M2가 적극 활용.</p>
      <div className="callout warn">
        <span className="icon">⚠</span>
        <div><b>면접 함정.</b> PAC와 BTI 차이? <b>PAC는 return address(LR)의 무결성</b> — stack overflow 방어. <b>BTI는 indirect branch 도착지 제한</b> — JOP/ROP gadget 차단. 보완 관계 — 둘 다 켜는 게 정석.</div>
      </div>

      <h2>⑥ Speculative side-channel — 기본 <span className="en">/ Spectre-style</span></h2>
      <pre><code>
<span className="cmt">{"// 흔한 취약 패턴"}</span>{"\n"}
<span className="kw">if</span> (idx &lt; size) {"{"}{"\n"}
{"  "}val = arr1[idx];          <span className="cmt">{"// 첫 access — speculative may bypass bound check"}</span>{"\n"}
{"  "}leak = arr2[val * <span className="num">256</span>];    <span className="cmt">{"// timed cache access — leaks val"}</span>{"\n"}
{"}"}
      </code></pre>
      <p><b>왜 위험.</b> CPU가 <code>idx &lt; size</code> 분기를 mispredict하면 <code>arr1[idx]</code>가 <b>경계 밖</b>의 비밀 값을 speculatively 읽음. 이후 cache footprint를 timing으로 관측 → 비밀 leak.</p>

      <h2>⑦ CSDB / SB — Speculative Barrier <span className="en">/ Mitigation</span></h2>
      <pre><code>
<span className="cmt">{"// CSDB: data value speculation 차단 (ARMv8.0 확장)"}</span>{"\n"}
<span className="cmt">{"// SB:   instruction stream speculation 차단 (ARMv8.5)"}</span>{"\n\n"}
<span className="kw">cmp</span>   x_idx, x_size{"\n"}
<span className="kw">b.hs</span>  .Lout_of_bounds{"\n"}
<span className="kw">csdb</span>                       <span className="cmt">{"// no speculative load past this until cmp resolves"}</span>{"\n"}
<span className="kw">ldr</span>   x_val, [x_arr1, x_idx]{"\n"}
<span className="kw">ldr</span>   x_leak, [x_arr2, x_val, <span className="kw">lsl</span> <span className="num">#8</span>]
      </code></pre>
      <p><b>실용.</b> Linux 커널의 <code>array_index_nospec()</code> 매크로가 안전한 인덱스 마스킹 + CSDB로 컴파일. 흔한 Spectre v1 mitigation 패턴.</p>

      <h2>⑧ Dependency break — ILP 회복 <span className="en">/ Move-Elimination</span></h2>
      <pre><code>
<span className="cmt">{"// BAD — 긴 dependency chain"}</span>{"\n"}
.Lloop:{"\n"}
{"  "}<span className="kw">add</span>   x0, x0, x1{"\n"}
{"  "}<span className="kw">add</span>   x0, x0, x2{"\n"}
{"  "}<span className="kw">add</span>   x0, x0, x3            <span className="cmt">{"// 3 dependent adds — serialized"}</span>{"\n"}
{"  "}<span className="kw">subs</span>  x4, x4, <span className="num">#1</span>{"\n"}
{"  "}<span className="kw">b.ne</span>  .Lloop{"\n\n"}
<span className="cmt">{"// BETTER — 2 accumulators (loop unroll variant)"}</span>{"\n"}
.Lloop:{"\n"}
{"  "}<span className="kw">add</span>   x0, x0, x1            <span className="cmt">{"// chain A"}</span>{"\n"}
{"  "}<span className="kw">add</span>   x5, x5, x2            <span className="cmt">{"// chain B (independent)"}</span>{"\n"}
{"  "}<span className="kw">subs</span>  x4, x4, <span className="num">#1</span>{"\n"}
{"  "}<span className="kw">b.ne</span>  .Lloop{"\n"}
{"  "}<span className="kw">add</span>   x0, x0, x5            <span className="cmt">{"// merge at the end"}</span>
      </code></pre>
      <p><b>핵심.</b> OoO core는 <b>독립 명령을 동시 실행</b>하지만 dependency chain이 길면 직렬화. 2 accumulator로 chain 분리 → ILP ↑. <b>FP reduction에선 결합 법칙 깨질 수 있음</b>(<code>-ffast-math</code> 필요).</p>

      <h2>⑨ Move elimination & zero idiom <span className="en">/ Front-end Tricks</span></h2>
      <pre><code>
<span className="cmt">{"// x86: xor eax, eax → CPU가 dependency 인식하고 0으로 rename"}</span>{"\n"}
<span className="cmt">{"// AArch64: mov w0, wzr  또는  mov x0, xzr"}</span>{"\n"}
<span className="cmt">{"//          또는 직접 0 store"}</span>{"\n\n"}
<span className="kw">mov</span>   w0, <span className="kw">wzr</span>           <span className="cmt">{"// dependency-free zero (no read)"}</span>{"\n"}
<span className="kw">mov</span>   x0, x1              <span className="cmt">{"// register move — often eliminated in rename"}</span>
      </code></pre>
      <p>Modern CPU는 <b>register rename에서 mov / xor self를 free로 처리</b>. dependency chain을 자르는 데 사용 — 컴파일러가 자동으로 활용하지만 inline asm 짤 때 의식하면 좋음.</p>

      <h2>⑩ Loop alignment & branch density <span className="en">/ Front-end</span></h2>
      <pre><code>
<span className="kw">.p2align</span> <span className="num">4</span>            <span className="cmt">{"// align to 16-byte boundary"}</span>{"\n"}
.Lhot_loop:{"\n"}
{"  "}<span className="cmt">{"// loop body"}</span>{"\n"}
{"  "}<span className="kw">b.ne</span>  .Lhot_loop
      </code></pre>
      <p><b>왜.</b> Front-end의 fetch는 <b>cache line 단위</b>(보통 64 byte). 루프가 라인 경계를 가로지르면 매 iteration마다 추가 fetch → bandwidth 손실. <code>-falign-loops</code>가 자동 처리하지만 hot loop 수동 align이 미세 perf 차이를 만듦.</p>

      <h2>⑪ 흔한 면접 질문 묶음 <span className="en">/ Quick Q&A</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>Q. <code>cmp / b.cond</code>이 보이는데 왜 <code>csel</code>이 안 쓰였나?</h4>
          <p>두 갈래 중 하나에 store/call/fault 가능성이 있어 양쪽을 다 실행할 수 없음. branch 유지가 정답.</p>
        </div>
        <div className="card">
          <h4>Q. PAC와 stack canary 차이?</h4>
          <p>Canary는 stack에 마법 값을 두고 epilogue에서 비교 — 우회 가능. PAC는 LR 자체를 서명 — <b>키를 모르면 우회 불가</b>. PAC가 더 강함.</p>
        </div>
        <div className="card">
          <h4>Q. Spectre v1 mitigation 한 줄?</h4>
          <p>인덱스를 <code>array_index_nospec()</code>로 mask + CSDB. 또는 SLH(speculative load hardening, LLVM)로 컴파일러가 자동 처리.</p>
        </div>
        <div className="card">
          <h4>Q. recursion이 깊을 때 RAS는?</h4>
          <p>Overflow → BTB로 fallback. 일부 mispredict 발생. <b>tail-recursion 변환</b>이 가능하면 RAS 불사용으로 안정.</p>
        </div>
      </div>

      <h2>한 줄 요약 <span className="en">/ Cheat Sheet</span></h2>
      <div className="callout">
        <span className="icon">📌</span>
        <div>
          <ul style={{margin: 0, paddingLeft: 18}}>
            <li>csel/cset/csinc/csneg/cneg + ccmp 6종을 알면 AArch64 branchless 거의 다 읽힘.</li>
            <li>branchless가 항상 좋진 않다 — side effect / 잘 예측 / 비싼 계산은 branch 유지.</li>
            <li>RAS는 bl/ret 짝으로 push/pop. tail call(b foo)은 RAS 안 변함.</li>
            <li>BTI는 indirect branch 도착지 제한, PAC는 LR 무결성 — 보완 관계.</li>
            <li>Spectre v1: <code>array_index_nospec</code> + <code>CSDB</code>. 커널 코드 디폴트.</li>
            <li>긴 dependency chain은 multiple accumulator로 분리해 ILP 회복.</li>
            <li>Hot loop는 16-byte align — front-end fetch 효율.</li>
          </ul>
        </div>
      </div>
    </>
  )
}
