export default function AsmSIMD() {
  return (
    <>
      <h2>이 페이지의 범위 <span className="en">/ Scope</span></h2>
      <p>벡터 명령을 SW에서 다루는 도구들 — <b>NEON 레지스터 모델, intrinsic ↔ asm 매핑, SVE/SVE2 predicate 모델, RVV vsetvli 패턴, axpy/dot product 손코딩</b>. <code>uarch/Microarchitecture</code>·<code>riscv/Vector</code>가 ISA 자체를 다룬다면 여기는 <b>실제 코드를 어떻게 쓰나</b>.</p>

      <h2>① NEON 레지스터 모델 <span className="en">/ V0 ~ V31</span></h2>
      <p>32개의 128-bit 벡터 레지스터. 같은 물리 레지스터를 <b>여러 element 폭</b>으로 view.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>표기</th><th>의미</th><th>총 비트</th></tr></thead>
          <tbody>
            <tr><td><code>B0</code></td><td>V0의 lowest byte (8-bit)</td><td>8</td></tr>
            <tr><td><code>H0</code></td><td>V0의 lowest halfword (16-bit)</td><td>16</td></tr>
            <tr><td><code>S0</code></td><td>V0의 lowest single (32-bit float/int)</td><td>32</td></tr>
            <tr><td><code>D0</code></td><td>V0의 lowest double (64-bit)</td><td>64</td></tr>
            <tr><td><code>Q0</code></td><td>V0 전체 quadword (128-bit)</td><td>128</td></tr>
            <tr><td><code>V0.16B</code></td><td>16 × byte vector</td><td>128</td></tr>
            <tr><td><code>V0.8H</code></td><td>8 × halfword</td><td>128</td></tr>
            <tr><td><code>V0.4S</code></td><td>4 × single (가장 흔함, FP32)</td><td>128</td></tr>
            <tr><td><code>V0.2D</code></td><td>2 × double (FP64)</td><td>128</td></tr>
          </tbody>
        </table>
      </div>
      <div className="callout warn">
        <span className="icon">⚠</span>
        <div><b>면접 함정.</b> AAPCS64에서 <b>V8 ~ V15는 lower 64-bit만 callee-saved</b> — 위쪽은 호출 사이에 보존 안 됨. NEON 풀폭 코드는 모두 caller-saved처럼 다뤄야 안전.</div>
      </div>

      <h2>② NEON intrinsic ↔ asm 매핑 <span className="en">/ Reading Intrinsics</span></h2>
      <pre><code>
<span className="cmt">{"// C intrinsic"}</span>{"\n"}
<span className="kw">float32x4_t</span> v_a = vld1q_f32(a);          <span className="cmt">{"// load 4 float"}</span>{"\n"}
<span className="kw">float32x4_t</span> v_b = vld1q_f32(b);{"\n"}
<span className="kw">float32x4_t</span> v_c = vmlaq_f32(v_c, v_a, v_b);  <span className="cmt">{"// c += a * b"}</span>{"\n"}
vst1q_f32(c, v_c);                          <span className="cmt">{"// store"}</span>{"\n\n"}
<span className="cmt">{"// AArch64 asm equivalent"}</span>{"\n"}
<span className="kw">ld1</span>   {"{"}v0.4s{"}"}, [x0]                  <span className="cmt">{"// vld1q_f32(a)"}</span>{"\n"}
<span className="kw">ld1</span>   {"{"}v1.4s{"}"}, [x1]                  <span className="cmt">{"// vld1q_f32(b)"}</span>{"\n"}
<span className="kw">fmla</span>  v2.4s, v0.4s, v1.4s            <span className="cmt">{"// vmlaq_f32: v2 += v0 * v1"}</span>{"\n"}
<span className="kw">st1</span>   {"{"}v2.4s{"}"}, [x2]                  <span className="cmt">{"// vst1q_f32(c)"}</span>
      </code></pre>
      <p><b>매핑 규칙:</b> <code>v</code>(vector) + <code>op</code>(operation) + <code>q</code>(quadword=128-bit) + <code>_type</code>(f32, s16, u8, ...) → <code>op v.lanes, ...</code>. <code>vmlaq_f32</code>의 q가 128-bit, 빠지면 64-bit (D 레지스터).</p>

      <h2>③ axpy — 4가지 폭 비교 <span className="en">/ Same Algorithm</span></h2>
      <p><code>y[i] = a * x[i] + y[i]</code> — AXPY 패턴. scalar / NEON / SVE / RVV가 같은 알고리즘을 어떻게 쓰는지.</p>
      <pre><code>
<span className="cmt">{"// (1) Scalar AArch64"}</span>{"\n"}
.Lloop:{"\n"}
{"  "}<span className="kw">ldr</span>   s0, [x_x], <span className="num">#4</span>{"\n"}
{"  "}<span className="kw">ldr</span>   s1, [x_y]{"\n"}
{"  "}<span className="kw">fmadd</span> s1, s0, s_a, s1{"\n"}
{"  "}<span className="kw">str</span>   s1, [x_y], <span className="num">#4</span>{"\n"}
{"  "}<span className="kw">subs</span>  x_n, x_n, <span className="num">#1</span>{"\n"}
{"  "}<span className="kw">b.ne</span>  .Lloop{"\n\n"}
<span className="cmt">{"// (2) NEON 4-wide (FP32)"}</span>{"\n"}
.Lloop:{"\n"}
{"  "}<span className="kw">ld1</span>   {"{"}v0.4s{"}"}, [x_x], <span className="num">#16</span>{"\n"}
{"  "}<span className="kw">ld1</span>   {"{"}v1.4s{"}"}, [x_y]{"\n"}
{"  "}<span className="kw">fmla</span>  v1.4s, v0.4s, v_a.s[<span className="num">0</span>]   <span className="cmt">{"// scalar broadcast"}</span>{"\n"}
{"  "}<span className="kw">st1</span>   {"{"}v1.4s{"}"}, [x_y], <span className="num">#16</span>{"\n"}
{"  "}<span className="kw">subs</span>  x_n, x_n, <span className="num">#4</span>{"\n"}
{"  "}<span className="kw">b.gt</span>  .Lloop{"\n"}
<span className="cmt">{"// 주의: n이 4의 배수가 아니면 tail handling 필요"}</span>
      </code></pre>

      <h2>④ SVE — VL-agnostic <span className="en">/ Predicate Programming</span></h2>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>VL / Predicate — SVE 핵심 두 단어.</b><br/>
        <b>VL (Vector Length)</b> — 한 Z 레지스터의 비트 폭. 구현마다 128 / 256 / 512 / 1024 / 2048-bit 선택 가능, SW 컴파일 타임엔 모름. <b>같은 binary가 어느 VL에서도 동작</b> — VL-agnostic 모델.<br/>
        <b>Predicate (P0~P15)</b> — 각 lane이 활성인지 표시하는 마스크 레지스터. element 폭마다 1 bit씩 (예: VL=512 + 32-bit element면 16 bit predicate). <code>whilelo</code>로 "i+lane &lt; n"인 lane만 1로 set → <b>tail loop 없이</b> 마지막 iteration의 부분 처리 자동.<br/>
        <b>접미 /z vs /m</b> — 비활성 lane 처리 정책. <code>/z</code>(zeroing) 0으로 채움, <code>/m</code>(merging) 기존 값 유지.</div>
      </div>

      <pre><code>
<span className="cmt">{"// SVE는 vector length(VL)을 SW가 모름 — 128~2048-bit 사이 구현 선택"}</span>{"\n"}
<span className="cmt">{"// predicate p0가 활성 lane을 가리킴 → tail 자동 처리"}</span>{"\n\n"}
.Lloop:{"\n"}
{"  "}<span className="kw">whilelo</span> p0.s, x_i, x_n             <span className="cmt">{"// p0 = (i+lane < n)"}</span>{"\n"}
{"  "}<span className="kw">ld1w</span>    {"{"}z0.s{"}"}, p0/z, [x_x, x_i, <span className="kw">lsl</span> <span className="num">#2</span>]{"\n"}
{"  "}<span className="kw">ld1w</span>    {"{"}z1.s{"}"}, p0/z, [x_y, x_i, <span className="kw">lsl</span> <span className="num">#2</span>]{"\n"}
{"  "}<span className="kw">fmla</span>    z1.s, p0/m, z0.s, z_a.s    <span className="cmt">{"// merge: z1 = z1 + z0 * a"}</span>{"\n"}
{"  "}<span className="kw">st1w</span>    {"{"}z1.s{"}"}, p0, [x_y, x_i, <span className="kw">lsl</span> <span className="num">#2</span>]{"\n"}
{"  "}<span className="kw">incw</span>    x_i                        <span className="cmt">{"// i += VL/32 — VL-agnostic"}</span>{"\n"}
{"  "}<span className="kw">b.first</span> .Lloop                     <span className="cmt">{"// continue while p0 had any active lane"}</span>
      </code></pre>
      <div className="callout">
        <span className="icon">💡</span>
        <div><b>핵심 통찰.</b> 한 binary가 VL 128/256/512/1024-bit 구현 어디서든 그대로 작동 — <b>tail loop 없음</b>, <b>recompile 없음</b>. NEON은 4-lane 가정 → tail handling 분리, SVE는 마지막 iteration의 predicate가 자동으로 부분 활성. 학습 코스트는 높지만 future-proof.</div>
      </div>

      <h2>⑤ RISC-V V — 같은 사상 <span className="en">/ vsetvli Pattern</span></h2>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>SEW / LMUL / VL — RVV 세 매개변수.</b><br/>
        <b>SEW (Selected Element Width)</b> — 한 element의 비트 폭. <code>e8 / e16 / e32 / e64</code>.<br/>
        <b>LMUL (Length Multiplier)</b> — 몇 개의 V 레지스터를 묶어 하나의 logical group으로 쓸지. <code>m1 / m2 / m4 / m8</code> (또는 fractional <code>mf2 / mf4</code>). 큰 LMUL = 더 긴 effective vector but 더 적은 사용 가능 그룹.<br/>
        <b>VLEN</b> — 한 V 레지스터의 비트 폭(HW가 정함, SVE의 VL과 유사). <b>VL</b>은 매 iteration <code>vsetvli</code>가 돌려주는 "이번에 처리할 element 수".<br/>
        <b>관계식:</b> max VL = (VLEN × LMUL) / SEW. 예: VLEN=128, LMUL=8, SEW=32 → 최대 32 element를 한 iteration에 처리.</div>
      </div>

      <pre><code>
<span className="cmt">{"// axpy in RVV"}</span>{"\n"}
axpy:{"\n"}
.Lloop:{"\n"}
{"  "}<span className="kw">vsetvli</span>  t0, a0, e32, m8         <span className="cmt">{"// t0 = vl, SEW=32, LMUL=8"}</span>{"\n"}
{"  "}<span className="kw">vle32.v</span>  v0, (a2)                <span className="cmt">{"// load x[i..i+vl]"}</span>{"\n"}
{"  "}<span className="kw">vle32.v</span>  v8, (a3)                <span className="cmt">{"// load y[i..i+vl]"}</span>{"\n"}
{"  "}<span className="kw">vfmacc.vf</span> v8, fa0, v0           <span className="cmt">{"// y = a*x + y"}</span>{"\n"}
{"  "}<span className="kw">vse32.v</span>  v8, (a3){"\n"}
{"  "}<span className="kw">slli</span>     t1, t0, <span className="num">2</span>             <span className="cmt">{"// t1 = vl*4 bytes"}</span>{"\n"}
{"  "}<span className="kw">add</span>      a2, a2, t1{"\n"}
{"  "}<span className="kw">add</span>      a3, a3, t1{"\n"}
{"  "}<span className="kw">sub</span>      a0, a0, t0              <span className="cmt">{"// n -= vl"}</span>{"\n"}
{"  "}<span className="kw">bnez</span>     a0, .Lloop              <span className="cmt">{"// VL-agnostic — length unknown/irrelevant"}</span>
      </code></pre>
      <p><b>RVV 핵심.</b> <code>vsetvli rd, rs1, vtype</code> — "남은 길이 rs1을 받고, 이번 iteration에 처리 가능한 vl을 rd에 돌려줌". HW가 VLEN 따라 4 ~ 64 lanes 자유 선택. SVE의 <code>whilelo</code>와 비슷하지만 <b>predicate 대신 vl 자체를 줄임</b>.</p>

      <h2>⑥ NEON — Lane access <span className="en">/ INS / DUP / MOV</span></h2>
      <pre><code>
<span className="cmt">{"// scalar to vector — broadcast"}</span>{"\n"}
<span className="kw">dup</span>   v0.4s, w1                <span className="cmt">{"// all 4 lanes = w1"}</span>{"\n"}
<span className="kw">dup</span>   v0.4s, v1.s[<span className="num">0</span>]            <span className="cmt">{"// broadcast lane 0"}</span>{"\n\n"}
<span className="cmt">{"// vector to scalar — extract"}</span>{"\n"}
<span className="kw">mov</span>   w1, v0.s[<span className="num">2</span>]              <span className="cmt">{"// w1 = lane 2"}</span>{"\n\n"}
<span className="cmt">{"// lane insert"}</span>{"\n"}
<span className="kw">ins</span>   v0.s[<span className="num">3</span>], w1              <span className="cmt">{"// lane 3 = w1"}</span>{"\n\n"}
<span className="cmt">{"// register move (full)"}</span>{"\n"}
<span className="kw">mov</span>   v0.16b, v1.16b           <span className="cmt">{"// copy whole register"}</span>
      </code></pre>

      <h2>⑦ NEON — Reduction & Horizontal Op <span className="en">/ Sum / Max</span></h2>
      <pre><code>
<span className="cmt">{"// 4-way FP32 sum (horizontal)"}</span>{"\n"}
<span className="kw">faddp</span> v0.4s, v0.4s, v0.4s      <span className="cmt">{"// pair-wise add"}</span>{"\n"}
<span className="kw">faddp</span> v0.4s, v0.4s, v0.4s      <span className="cmt">{"// once more"}</span>{"\n"}
<span className="cmt">{"// → s0 holds the sum"}</span>{"\n\n"}
<span className="cmt">{"// dot product (single instruction in v8.2-DotProd)"}</span>{"\n"}
<span className="kw">sdot</span>  v2.4s, v0.16b, v1.16b    <span className="cmt">{"// 16x int8 → 4x int32 dot product"}</span>{"\n\n"}
<span className="cmt">{"// horizontal min/max"}</span>{"\n"}
<span className="kw">sminv</span> b0, v0.16b               <span className="cmt">{"// min across 16 byte lanes"}</span>{"\n"}
<span className="kw">addv</span>  s0, v0.4s                <span className="cmt">{"// add across 4 lanes"}</span>
      </code></pre>

      <h2>⑧ NEON — Structured load/store <span className="en">/ LD2 / LD3 / LD4</span></h2>
      <pre><code>
<span className="cmt">{"// AoS → SoA deinterleave on load"}</span>{"\n"}
<span className="cmt">{"// memory: r0 g0 b0 r1 g1 b1 r2 g2 b2 r3 g3 b3"}</span>{"\n\n"}
<span className="kw">ld3</span>  {"{"}v0.4s, v1.4s, v2.4s{"}"}, [x0]    <span className="cmt">{"// v0 = R, v1 = G, v2 = B"}</span>{"\n\n"}
<span className="cmt">{"// SoA → AoS interleave on store"}</span>{"\n"}
<span className="kw">st3</span>  {"{"}v0.4s, v1.4s, v2.4s{"}"}, [x0]
      </code></pre>
      <p><b>활용.</b> RGB → RGBA 변환, complex(re/im) 처리, AoS↔SoA 교환. 단일 명령으로 deinterleave/interleave — software emulation 대비 큰 win.</p>

      <h2>⑨ Auto-vectorization 신호 읽기 <span className="en">/ Compiler Output</span></h2>
      <p>"내 C 루프가 vectorize됐나?"를 asm에서 빠르게 판단:</p>
      <ul>
        <li><b>V0~V31 사용 + .4s/.16b 표기</b> → NEON 적용</li>
        <li><b>Z0~Z31, P0~P15 사용</b> → SVE 적용</li>
        <li><b><code>fmla v0.4s, ...</code></b> 같은 wide FP → vectorized AXPY 등</li>
        <li><b><code>cnt v0.16b, v0.16b</code></b> → SIMD popcount</li>
        <li><b>여전히 scalar (S0/D0/W0)</b> → vectorize 실패. 원인: 의존성, alignment 미상, 함수 호출 in-loop</li>
      </ul>
      <pre><code>
<span className="cmt">{"// GCC/Clang flags to inspect:"}</span>{"\n"}
<span className="cmt">{"//   -Rpass=loop-vectorize           # what got vectorized"}</span>{"\n"}
<span className="cmt">{"//   -Rpass-missed=loop-vectorize    # what failed and why"}</span>{"\n"}
<span className="cmt">{"//   -fopt-info-vec-missed           # GCC equivalent"}</span>
      </code></pre>

      <h2>⑩ Tail handling — NEON에선 명시적 <span className="en">/ Why SVE Wins</span></h2>
      <pre><code>
<span className="cmt">{"// NEON main loop: 4-element groups"}</span>{"\n"}
<span className="kw">cmp</span>   x_n, <span className="num">#4</span>{"\n"}
<span className="kw">b.lt</span>  .Ltail{"\n"}
.Lvec_loop:{"\n"}
{"  "}<span className="kw">ld1</span>   {"{"}v0.4s{"}"}, [x_x], <span className="num">#16</span>{"\n"}
{"  "}<span className="cmt">{"// ... vec ops ..."}</span>{"\n"}
{"  "}<span className="kw">subs</span>  x_n, x_n, <span className="num">#4</span>{"\n"}
{"  "}<span className="kw">b.ge</span>  .Lvec_loop{"\n"}
.Ltail:{"\n"}
{"  "}<span className="kw">add</span>   x_n, x_n, <span className="num">#4</span>            <span className="cmt">{"// restore"}</span>{"\n"}
{"  "}<span className="kw">cbz</span>   x_n, .Ldone{"\n"}
.Lscalar_loop:{"\n"}
{"  "}<span className="cmt">{"// process remaining 1~3 elements scalar..."}</span>{"\n"}
{"  "}<span className="kw">subs</span>  x_n, x_n, <span className="num">#1</span>{"\n"}
{"  "}<span className="kw">b.ne</span>  .Lscalar_loop
      </code></pre>
      <p><b>핵심.</b> NEON은 lane 수가 컴파일 타임에 고정 → tail loop가 항상 추가 코드. SVE / RVV는 predicate / vl 자동 처리 → 한 loop으로 끝. <b>코드 크기·branch density·instruction cache 측면에서 SVE가 유리</b>.</p>

      <h2>한 줄 요약 <span className="en">/ Cheat Sheet</span></h2>
      <div className="callout">
        <span className="icon">📌</span>
        <div>
          <ul style={{margin: 0, paddingLeft: 18}}>
            <li>NEON: V0~V31, 128-bit, lane view <code>.4s/.8h/.16b</code>. V8~V15 lower 64-bit만 callee-saved.</li>
            <li>intrinsic 매핑: <code>v + op + q(=128) + _type</code> ↔ <code>op v.lanes</code>.</li>
            <li>SVE: VL-agnostic, predicate <code>p0~p15</code>, <code>whilelo</code> + <code>b.first</code> 패턴, tail loop 없음.</li>
            <li>RVV: <code>vsetvli</code>로 매 iteration vl 갱신, LMUL로 lane 그룹화.</li>
            <li>Reduction은 <code>faddp</code> 반복 또는 <code>addv/sminv</code> 단일 명령.</li>
            <li>Structured load <code>ld3/ld4</code>로 AoS↔SoA 변환 한 방.</li>
            <li>Auto-vec 진단: V/Z 사용 보이면 OK, scalar S/D만 보이면 실패 — Rpass 플래그로 원인 추적.</li>
          </ul>
        </div>
      </div>
    </>
  )
}
