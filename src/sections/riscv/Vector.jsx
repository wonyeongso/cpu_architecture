export default function RiscvVector() {
  return (
    <>
      <h2>RVV 1.0 <span className="en">/ Vector Extension</span></h2>
      <p>RISC-V <code>V</code> 확장은 2021 ratified. ARM SVE 와 같은 <b>VL-agnostic</b> 철학 — 벡터 길이를 구현이 선택하고 SW 는 길이에 독립적으로 작성.</p>

      <div className="grid3">
        <div className="card">
          <h4>32 × Vector Reg</h4>
          <p><code>v0 – v31</code>, 각 VLEN bits (128 ~ 65536). <code>v0</code> 은 관례적으로 mask register.</p>
        </div>
        <div className="card">
          <h4>ELEN</h4>
          <p>벡터 안에서 다룰 수 있는 최대 element 크기 (보통 32 or 64 bits).</p>
        </div>
        <div className="card">
          <h4>LMUL</h4>
          <p>레지스터 그룹핑 (1, 2, 4, 8 또는 1/2, 1/4, 1/8) — 큰 vector 를 여러 레지스터로 묶거나 나누기.</p>
        </div>
      </div>

      <h2>vsetvli — 벡터 형태 설정 <span className="en">/ Dynamic Shape</span></h2>
      <pre><code>
<span className="cmt">{"// vsetvli  rd, rs1, vtype"}</span>{"\n"}
<span className="cmt">{"//   rs1 = application vector length (AVL)"}</span>{"\n"}
<span className="cmt">{"//   vtype = {SEW, LMUL, tail policy, mask policy}"}</span>{"\n"}
<span className="cmt">{"//   rd ← vl that the HW is willing to give (≤ rs1)"}</span>{"\n\n"}
<span className="kw">vsetvli</span>  t0, a0, e32, m1, ta, ma{"\n"}
<span className="cmt">{"//   SEW=32 (4-byte element)"}</span>{"\n"}
<span className="cmt">{"//   LMUL=1 (single reg)"}</span>{"\n"}
<span className="cmt">{"//   ta (tail agnostic), ma (mask agnostic)"}</span>
      </code></pre>

      <h2>Canonical Loop <span className="en">/ Stripmine Pattern</span></h2>
      <pre><code>
<span className="cmt">{"// void axpy(size_t n, float a, float *x, float *y):"}</span>{"\n"}
<span className="cmt">{"//   for (i=0; i<n; i++) y[i] = a*x[i] + y[i];"}</span>{"\n\n"}
<span className="kw">axpy:</span>{"\n"}
<span className="kw">loop:</span>{"\n"}
  <span className="kw">vsetvli</span>  t0, a0, e32, m8  <span className="cmt">{"// t0 = vl (this iteration)"}</span>{"\n"}
  <span className="kw">vle32.v</span>  v0, (a2)          <span className="cmt">{"// load x[i..i+vl]"}</span>{"\n"}
  <span className="kw">vle32.v</span>  v8, (a3)          <span className="cmt">{"// load y[i..i+vl]"}</span>{"\n"}
  <span className="kw">vfmacc.vf</span> v8, fa0, v0      <span className="cmt">{"// y = a*x + y (fused mul-add)"}</span>{"\n"}
  <span className="kw">vse32.v</span>  v8, (a3)          <span className="cmt">{"// store y"}</span>{"\n"}
  <span className="kw">slli</span>    t1, t0, <span className="num">2</span>         <span className="cmt">{"// t1 = vl*4 bytes"}</span>{"\n"}
  <span className="kw">add</span>     a2, a2, t1{"\n"}
  <span className="kw">add</span>     a3, a3, t1{"\n"}
  <span className="kw">sub</span>     a0, a0, t0        <span className="cmt">{"// n -= vl"}</span>{"\n"}
  <span className="kw">bnez</span>    a0, loop          <span className="cmt">{"// VL-agnostic — length unknown / irrelevant"}</span>{"\n"}
  <span className="kw">ret</span>
      </code></pre>
      <p>한 바이너리가 VLEN 128 / 256 / 512 / 1024-bit 구현에서 그대로 스케일링.</p>

      <h2>Masking <span className="en">/ v0 Predicate</span></h2>
      <pre><code>
<span className="cmt">{"// if (x[i] > 0) y[i] = sqrt(x[i])"}</span>{"\n\n"}
<span className="kw">vmfgt.vf</span>  v0, v8, fa0     <span className="cmt">{"// v0 = (x > 0)"}</span>{"\n"}
<span className="kw">vfsqrt.v</span>  v16, v8, v0.t   <span className="cmt">{"// masked: only lanes with v0[i]=1"}</span>{"\n"}
<span className="kw">vse32.v</span>   v16, (a1), v0.t
      </code></pre>

      <h2>SVE vs RVV — 비교 <span className="en">/ Two VL-Agnostic Designs</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>측면</th><th>ARM SVE / SVE2</th><th>RISC-V RVV 1.0</th></tr></thead>
          <tbody>
            <tr><td>벡터 길이 범위</td><td>128 ~ 2048 bit</td><td>128 ~ 65536 bit</td></tr>
            <tr><td>Predicate</td><td><code>P0-P15</code> 전용 predicate 레지스터 (16개)</td><td><code>v0</code> 를 mask 로 겸용 (관례)</td></tr>
            <tr><td>벡터 길이 설정</td><td>암묵적 — 각 명령이 predicate 로 tail 처리 (<code>whilelo</code>)</td><td>명시적 — <code>vsetvli</code> 로 매번 vl 지정</td></tr>
            <tr><td>Register 수</td><td>32 (<code>z0-z31</code>) — 큰 state</td><td>32 (<code>v0-v31</code>) + LMUL 그룹핑</td></tr>
            <tr><td>Scatter/Gather</td><td>직접 인코딩</td><td>indexed load/store (<code>vluxei</code>)</td></tr>
            <tr><td>Fault-first</td><td>지원 (ffr)</td><td>지원 (faultonlyfirst load)</td></tr>
            <tr><td>Type</td><td>data-width 을 element suffix (<code>.s/.d</code>)</td><td>SEW 를 vtype 에서 동적 설정</td></tr>
          </tbody>
        </table>
      </div>

      <div className="callout">
        <span className="icon">💡</span>
        <div>두 확장은 개념이 매우 유사하고, 많은 컴파일러(LLVM scalable vector types) 가 공통 IR 로 양쪽을 다룹니다. 세부 의미론은 다르니 <b>intrinsic / inline asm</b> 단계에서는 ISA 별 포팅이 불가피.</div>
      </div>
    </>
  )
}
