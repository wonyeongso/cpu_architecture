export default function AsmCompiledPatterns() {
  return (
    <>
      <h2>이 페이지의 범위 <span className="en">/ Scope</span></h2>
      <p>특정 CPU 서브시스템에 매이지 않는 일반 reference — <b>C → asm 패턴, ABI(calling convention), bit trick</b>. 다른 토픽 페이지(Cache/Coherence/MMU/Exception/Pipeline/SIMD)에서 자주 참조되는 공통 자료.</p>

      <h2>SECTION 1 — C → asm 패턴 도감 <span className="en">/ Compiled Patterns</span></h2>

      <h3>① if-else → csel <span className="en">/ Branchless</span></h3>
      <pre><code>
<span className="cmt">{"// C"}</span>{"\n"}
<span className="kw">int</span> max(<span className="kw">int</span> a, <span className="kw">int</span> b) {"{"} <span className="kw">return</span> a &gt; b ? a : b; {"}"}{"\n\n"}
<span className="cmt">{"// AArch64 -O2"}</span>{"\n"}
max:{"\n"}
{"  "}<span className="kw">cmp</span>   w0, w1{"\n"}
{"  "}<span className="kw">csel</span>  w0, w0, w1, gt{"\n"}
{"  "}<span className="kw">ret</span>{"\n\n"}
<span className="cmt">{"// x86-64"}</span>{"\n"}
max:{"\n"}
{"  "}<span className="kw">cmp</span>   edi, esi{"\n"}
{"  "}<span className="kw">mov</span>   eax, esi{"\n"}
{"  "}<span className="kw">cmovg</span> eax, edi{"\n"}
{"  "}<span className="kw">ret</span>
      </code></pre>
      <p>짧은 if-else는 컴파일러가 <b>branchless</b>로 변환해 mispredict cost 회피. side effect(store/call/fault)가 있으면 branch 유지.</p>

      <h3>② switch → jump table <span className="en">/ Dense Case</span></h3>
      <pre><code>
<span className="kw">cmp</span>   w0, <span className="num">#3</span>{"\n"}
<span className="kw">b.hi</span>  .Ldefault              <span className="cmt">{"// unsigned > 3 → default (음수도 거름)"}</span>{"\n"}
<span className="kw">adrp</span>  x1, .Ltab{"\n"}
<span className="kw">add</span>   x1, x1, :lo12:.Ltab{"\n"}
<span className="kw">ldrsw</span> x0, [x1, w0, <span className="kw">uxtw</span> <span className="num">#2</span>]{"\n"}
<span className="kw">add</span>   x0, x0, x1{"\n"}
<span className="kw">br</span>    x0
      </code></pre>
      <p>dense일 때만 jump table. 흩어진 case면 cmp cascade 또는 perfect hash. <code>cmp / b.hi</code>의 unsigned 비교로 음수까지 한 방에 거름.</p>

      <h3>③ struct field 접근 <span className="en">/ Padding & Offset</span></h3>
      <pre><code>
<span className="kw">struct</span> Foo {"{"} <span className="kw">int</span> a; <span className="kw">char</span> b; <span className="kw">long</span> c; {"};"}    <span className="cmt">{"// size 16, c at offset 8"}</span>{"\n\n"}
<span className="kw">long</span> get_c(<span className="kw">struct</span> Foo *f) {"{"} <span className="kw">return</span> f-&gt;c; {"}"}{"\n\n"}
get_c:{"\n"}
{"  "}<span className="kw">ldr</span>   x0, [x0, <span className="num">#8</span>]{"\n"}
{"  "}<span className="kw">ret</span>
      </code></pre>
      <p>면접 빈출: "이 struct sizeof는?" → 정렬·padding 직접 계산. field reorder(작은 것 뒤로)로 sizeof 줄이기.</p>

      <h3>④ Tail call vs normal call <span className="en">/ b vs bl</span></h3>
      <pre><code>
<span className="cmt">{"// tail call — frame 재사용"}</span>{"\n"}
<span className="kw">int</span> wrap(<span className="kw">int</span> a) {"{"} <span className="kw">return</span> work(a + <span className="num">1</span>); {"}"}{"\n\n"}
wrap:{"\n"}
{"  "}<span className="kw">add</span>   w0, w0, <span className="num">#1</span>{"\n"}
{"  "}<span className="kw">b</span>     work             <span className="cmt">{"// ← b, not bl"}</span>
      </code></pre>
      <p>함수 끝의 <code>b foo</code>는 tail call. caller frame 재사용 + RAS 안 깨짐. 재귀 stack overflow 회피의 핵심.</p>

      <h3>⑤ Virtual function <span className="en">/ vtable load</span></h3>
      <pre><code>
<span className="kw">int</span> call(Base *b) {"{"} <span className="kw">return</span> b-&gt;f(); {"}"}{"\n\n"}
call:{"\n"}
{"  "}<span className="kw">ldr</span>   x1, [x0]            <span className="cmt">{"// vptr"}</span>{"\n"}
{"  "}<span className="kw">ldr</span>   x1, [x1]            <span className="cmt">{"// vtable[0]"}</span>{"\n"}
{"  "}<span className="kw">br</span>    x1
      </code></pre>
      <p>두 번 indirect load + indirect branch — direct call보다 비싼 이유. devirtualization(final, 단일 구현, LTO)으로 직접 호출로 변환 가능.</p>

      <h3>⑥ -O0 vs -O2 <span className="en">/ Spill Density</span></h3>
      <pre><code>
<span className="cmt">{"// -O0: 모든 변수 stack에"}</span>{"\n"}
<span className="kw">sub</span>   sp, sp, <span className="num">#16</span>{"\n"}
<span className="kw">str</span>   w0, [sp, <span className="num">#12</span>]{"\n"}
<span className="kw">str</span>   w1, [sp, <span className="num">#8</span>]{"\n"}
<span className="kw">ldr</span>   w0, [sp, <span className="num">#12</span>]{"\n"}
<span className="kw">ldr</span>   w1, [sp, <span className="num">#8</span>]{"\n"}
<span className="kw">add</span>   w0, w0, w1{"\n"}
<span className="kw">add</span>   sp, sp, <span className="num">#16</span>{"\n"}
<span className="kw">ret</span>{"\n\n"}
<span className="cmt">{"// -O2"}</span>{"\n"}
<span className="kw">add</span>   w0, w0, w1{"\n"}
<span className="kw">ret</span>
      </code></pre>
      <p>-O0은 디버거가 모든 변수 보존 위해 spill — 6 vs 2 명령. 면접에서 무거운 코드면 -O0 신호.</p>

      <h2>SECTION 2 — Calling Convention <span className="en">/ ABI</span></h2>

      <h3>3 ABI 한눈에 <span className="en">/ Side-by-Side</span></h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th></th><th>AArch64 (AAPCS64)</th><th>x86-64 SysV</th><th>RISC-V (LP64)</th></tr></thead>
          <tbody>
            <tr><td>Args</td><td><code>X0 ~ X7</code></td><td><code>RDI, RSI, RDX, RCX, R8, R9</code></td><td><code>a0 ~ a7</code></td></tr>
            <tr><td>FP args</td><td><code>V0 ~ V7</code></td><td><code>XMM0 ~ XMM7</code></td><td><code>fa0 ~ fa7</code></td></tr>
            <tr><td>Return</td><td><code>X0</code> (or <code>X0/X1</code>)</td><td><code>RAX</code> (or <code>RAX/RDX</code>)</td><td><code>a0</code> (or <code>a0/a1</code>)</td></tr>
            <tr><td>Large struct ret</td><td><code>X8</code> hidden ptr</td><td><code>RDI</code> hidden ptr</td><td><code>a0</code> hidden ptr</td></tr>
            <tr><td>Caller-saved</td><td><code>X0~X18</code>, <code>V0~V7</code>, <code>V16~V31</code></td><td><code>RAX, RCX, RDX, RSI, RDI, R8~R11</code></td><td><code>a0~a7, t0~t6</code></td></tr>
            <tr><td>Callee-saved</td><td><code>X19~X28</code>, <code>V8~V15</code> low 64</td><td><code>RBX, RBP, R12~R15</code></td><td><code>s0~s11</code></td></tr>
            <tr><td>Frame ptr</td><td><code>X29</code></td><td><code>RBP</code></td><td><code>s0 (= fp)</code></td></tr>
            <tr><td>Return addr</td><td><code>X30 (LR)</code></td><td>stack top</td><td><code>ra</code></td></tr>
            <tr><td>Stack align</td><td>16 byte</td><td>16 byte at call</td><td>16 byte</td></tr>
            <tr><td>Red zone</td><td>없음</td><td>128 byte</td><td>없음</td></tr>
          </tbody>
        </table>
      </div>

      <h3>표준 prologue/epilogue <span className="en">/ AAPCS64</span></h3>
      <pre><code>
foo:{"\n"}
{"  "}<span className="kw">stp</span>   x29, x30, [sp, <span className="num">#-32</span>]!   <span className="cmt">{"// pre-index"}</span>{"\n"}
{"  "}<span className="kw">mov</span>   x29, sp{"\n"}
{"  "}<span className="kw">stp</span>   x19, x20, [sp, <span className="num">#16</span>]      <span className="cmt">{"// callee-saved"}</span>{"\n"}
{"  "}<span className="cmt">{"// ... body ..."}</span>{"\n"}
{"  "}<span className="kw">ldp</span>   x19, x20, [sp, <span className="num">#16</span>]{"\n"}
{"  "}<span className="kw">ldp</span>   x29, x30, [sp], <span className="num">#32</span>      <span className="cmt">{"// post-index"}</span>{"\n"}
{"  "}<span className="kw">ret</span>
      </code></pre>

      <h3>Stack frame 시각화 <span className="en">/ Frame Layout</span></h3>
      <div className="diagram">{`high address
   ┌───────────────────────────────┐
   │  caller's frame               │
   │  stack args (#9, #10, ...)    │
   ├───────────────────────────────┤
   │  saved LR  (x30)              │  ← return address
   │  saved FP  (x29)              │  ← previous FP — frame chain
   ├───────────────────────────────┤  ← current FP (x29)
   │  saved x19, x20, ... (callee) │
   │  local variables              │
   │  alloca / VLAs                │
   ├───────────────────────────────┤  ← current SP (16-byte aligned)
                  ↓
low address`}</div>

      <h3>면접 빠른 답 <span className="en">/ Quick Recall</span></h3>
      <div className="grid2">
        <div className="card">
          <h4>"X0에 뭐?"</h4>
          <p>함수 진입 직후 X0 = 첫 인자, X1 = 두 번째, ..., X7까지. 8번째 이후는 stack에 8 byte slot씩.</p>
        </div>
        <div className="card">
          <h4>"X9는 호출 후 보존?"</h4>
          <p>아니. X0~X18은 caller-saved → callee가 자유롭게 덮어씀. 보존은 X19~X28.</p>
        </div>
        <div className="card">
          <h4>"large struct 반환은?"</h4>
          <p>16 byte 초과면 caller가 X8에 hidden ptr 넘기고 callee가 거기 store. X0를 안 씀.</p>
        </div>
        <div className="card">
          <h4>"x86이랑 헷갈림"</h4>
          <p>memcpy(dst,src,n) → ARM: X0,X1,X2 / x86 SysV: RDI,RSI,RDX. 둘이 다른 거 자주 묻는 함정.</p>
        </div>
      </div>

      <h2>SECTION 3 — Bit Tricks <span className="en">/ Bit Manipulation</span></h2>

      <h3>① abs / min / max — branchless</h3>
      <pre><code>
<span className="cmt">{"// abs(x) — 보편 트릭"}</span>{"\n"}
<span className="kw">int</span> abs_v(<span className="kw">int</span> x) {"{"}{"\n"}
{"  "}<span className="kw">int</span> m = x &gt;&gt; <span className="num">31</span>;       <span className="cmt">{"// arith shift: -1 if neg, 0 if pos"}</span>{"\n"}
{"  "}<span className="kw">return</span> (x ^ m) - m;{"\n"}
{"}"}{"\n\n"}
<span className="cmt">{"// AArch64는 cneg single-instruction 지원"}</span>{"\n"}
abs_v:{"\n"}
{"  "}<span className="kw">cmp</span>   w0, <span className="num">#0</span>{"\n"}
{"  "}<span className="kw">cneg</span>  w0, w0, mi
      </code></pre>

      <h3>② Popcount 4가지</h3>
      <pre><code>
<span className="cmt">{"// (a) Brian Kernighan — O(set bits)"}</span>{"\n"}
<span className="kw">while</span> (x) {"{"} x &amp;= x - <span className="num">1</span>; c++; {"}"}{"\n\n"}
<span className="cmt">{"// (b) SWAR — O(log n)"}</span>{"\n"}
x = x - ((x &gt;&gt; <span className="num">1</span>) &amp; <span className="num">0x55555555</span>);{"\n"}
x = (x &amp; <span className="num">0x33333333</span>) + ((x &gt;&gt; <span className="num">2</span>) &amp; <span className="num">0x33333333</span>);{"\n"}
x = (x + (x &gt;&gt; <span className="num">4</span>)) &amp; <span className="num">0x0F0F0F0F</span>;{"\n"}
<span className="kw">return</span> (x * <span className="num">0x01010101</span>) &gt;&gt; <span className="num">24</span>;{"\n\n"}
<span className="cmt">{"// (c) HW intrinsic — 최선"}</span>{"\n"}
__builtin_popcount(x);     <span className="cmt">{"// AArch64: cnt v0.8b + addv"}</span>{"\n"}
                           <span className="cmt">{"// x86 SSE4.2:   popcnt eax, edi"}</span>{"\n"}
                           <span className="cmt">{"// RISC-V Zbb:   cpop  a0, a0"}</span>
      </code></pre>

      <h3>③ Power-of-2 / Alignment</h3>
      <pre><code>
<span className="cmt">{"// is_pow2"}</span>{"\n"}
x &amp;&amp; !(x &amp; (x - <span className="num">1</span>));{"\n\n"}
<span className="cmt">{"// align up (a is power of 2)"}</span>{"\n"}
(x + a - <span className="num">1</span>) &amp; ~(a - <span className="num">1</span>);{"\n\n"}
<span className="cmt">{"// log2(x) for power-of-2"}</span>{"\n"}
<span className="num">31</span> - __builtin_clz(x);{"\n\n"}
<span className="cmt">{"// next pow2"}</span>{"\n"}
<span className="num">1u</span> &lt;&lt; (<span className="num">32</span> - __builtin_clz(x - <span className="num">1</span>));
      </code></pre>

      <h3>④ Bit isolation</h3>
      <pre><code>
x &amp; -x          <span className="cmt">{"// lowest set bit isolated"}</span>{"\n"}
x &amp; (x - <span className="num">1</span>)     <span className="cmt">{"// lowest set bit cleared"}</span>{"\n"}
x | (x + <span className="num">1</span>)     <span className="cmt">{"// lowest cleared bit set"}</span>
      </code></pre>

      <h3>⑤ AArch64 conditional family</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>명령</th><th>의미</th></tr></thead>
          <tbody>
            <tr><td><code>csel</code></td><td>cond ? rn : rm</td></tr>
            <tr><td><code>cset</code></td><td>cond → {`{0,1}`}</td></tr>
            <tr><td><code>csinc</code></td><td>cond ? rn : rm + 1</td></tr>
            <tr><td><code>csneg</code></td><td>cond ? rn : -rm</td></tr>
            <tr><td><code>cneg</code></td><td>cond ? -rn : rn</td></tr>
            <tr><td><code>ccmp</code></td><td>chained cmp without branch</td></tr>
          </tbody>
        </table>
      </div>

      <h3>⑥ Sign / Zero extension</h3>
      <pre><code>
<span className="cmt">{"// AArch64: writing to W (32-bit) auto zero-extends to X"}</span>{"\n"}
<span className="kw">mov</span>   w0, w0              <span className="cmt">{"// effectively zero-extend (often elided)"}</span>{"\n\n"}
<span className="cmt">{"// 32→64 sign-extend"}</span>{"\n"}
<span className="kw">sxtw</span>  x0, w0              <span className="cmt">{"// (x86 movsxd)"}</span>
      </code></pre>

      <h3>⑦ Saturating / parity / reverse — 한 줄 정리</h3>
      <ul>
        <li><b>Saturating add:</b> AArch64 NEON <code>sqadd/uqadd</code>, scalar은 <code>__builtin_add_overflow</code></li>
        <li><b>Parity:</b> XOR fold + 4-bit lookup. AArch64는 <code>cnt; lsb</code></li>
        <li><b>Bit reverse:</b> <code>__builtin_bitreverse32</code> → AArch64 <code>rbit</code> single instruction</li>
        <li><b>XOR swap:</b> 면접 클래식이지만 <b>실무 안 씀</b> — register renaming 덕에 일반 swap이 더 빠름</li>
      </ul>

      <h2>한 줄 요약 <span className="en">/ Master Cheat Sheet</span></h2>
      <div className="callout">
        <span className="icon">📌</span>
        <div>
          <ul style={{margin: 0, paddingLeft: 18}}>
            <li><b>Patterns:</b> csel(branchless if), b(tail call), 2 indirect load + br(vtable), <code>cmp + b.hi</code>(unsigned 한도)</li>
            <li><b>ABI:</b> ARM X0~X7/X19~X28/X29(FP)/X30(LR)/SP 16B, x86 RDI~R9/RBP/RBX/R12~R15, RV a0~a7/s0~s11/ra</li>
            <li><b>Bit:</b> <code>x &amp; (x-1)==0</code>(pow2), <code>x &amp; -x</code>(lowest), <code>(x+a-1)&amp;~(a-1)</code>(align up), <code>__builtin_popcount</code>(HW)</li>
            <li><b>Mantra:</b> "control flow → data flow → 함정" 순서로 읽고, 가능하면 <b>__builtin_*</b>로 컴파일러에 맡긴다.</li>
          </ul>
        </div>
      </div>
    </>
  )
}
