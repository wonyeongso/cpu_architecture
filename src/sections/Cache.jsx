export default function Cache() {
  return (
    <>
      <h2>Cache Hierarchy</h2>
      <p>대부분의 Cortex-A는 <b>Harvard L1</b> (I/D 분리) + <b>Unified L2</b>, 일부는 shared <b>L3 / SLC</b>까지 보유.</p>

      <h2>인덱싱 방식 <span className="en">/ Indexing Schemes</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Type</th><th>Index</th><th>Tag</th><th>장단점</th></tr></thead>
          <tbody>
            <tr><td><code>VIVT</code></td><td>VA</td><td>VA</td><td>빠르지만 aliasing/homonym 문제 — 거의 안 씀</td></tr>
            <tr><td><code>VIPT</code></td><td>VA</td><td>PA</td><td>TLB와 병렬 동작 가능 — 보통 L1D</td></tr>
            <tr><td><code>PIPT</code></td><td>PA</td><td>PA</td><td>aliasing 없음, TLB 먼저 — L2/L3</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Shareability &amp; Coherency Points</h2>
      <div className="grid2">
        <div className="card">
          <h4>Shareability Domains</h4>
          <ul>
            <li><b>Non-shareable</b>: 단일 코어 로컬</li>
            <li><b>Inner Shareable (ISH)</b>: 같은 클러스터 내</li>
            <li><b>Outer Shareable (OSH)</b>: 클러스터 간 / 시스템 전역</li>
          </ul>
        </div>
        <div className="card">
          <h4>Coherency Points</h4>
          <ul>
            <li><b>PoU</b> (Point of Unification) — I/D가 같은 데이터를 보는 지점</li>
            <li><b>PoC</b> (Point of Coherency) — 모든 마스터(DMA 포함)가 보는 지점</li>
          </ul>
        </div>
      </div>

      <h2>Cache Maintenance Ops</h2>
      <pre><code>
<span className="kw">IC</span>   IALLU           <span className="cmt">{"// Invalidate all I-cache to PoU"}</span>{"\n"}
<span className="kw">DC</span>   IVAC, Xt        <span className="cmt">{"// Invalidate D-cache by VA to PoC"}</span>{"\n"}
<span className="kw">DC</span>   CVAC, Xt        <span className="cmt">{"// Clean by VA to PoC (writeback)"}</span>{"\n"}
<span className="kw">DC</span>   CIVAC, Xt       <span className="cmt">{"// Clean + Invalidate by VA to PoC"}</span>{"\n"}
<span className="kw">DC</span>   ZVA, Xt         <span className="cmt">{"// Zero a cache line (memset 가속)"}</span>
      </code></pre>

      <h2>Self-modifying Code 시퀀스</h2>
      <pre><code>
<span className="cmt">{"// 1) 데이터 쓰기 후:"}</span>{"\n"}
<span className="kw">DC</span>   CVAU, Xt        <span className="cmt">{"// Clean D to PoU"}</span>{"\n"}
<span className="kw">DSB</span>  ISH{"\n"}
<span className="kw">IC</span>   IVAU, Xt        <span className="cmt">{"// Invalidate I by VA to PoU"}</span>{"\n"}
<span className="kw">DSB</span>  ISH{"\n"}
<span className="kw">ISB</span>                   <span className="cmt">{"// pipeline resync"}</span>
      </code></pre>
    </>
  )
}
