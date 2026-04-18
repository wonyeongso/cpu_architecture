export default function MemoryModel() {
  return (
    <>
      <h2>Weakly Ordered Model</h2>
      <p>ARM은 <b>weakly-ordered</b> 메모리 모델. Load/Store가 프로그램 순서와 다르게 관측될 수 있어, 순서가 중요한 경우 배리어 또는 acquire/release 명령이 필요합니다.</p>

      <div className="callout warn">
        <span className="icon">⚠️</span>
        <div><b>주의.</b> x86(TSO)에서 동작하던 lock-free 코드가 ARM에서는 깨질 수 있음. SMP 환경에서 공유 데이터 접근 시 반드시 확인.</div>
      </div>

      <h2>메모리 타입 <span className="en">/ Memory Types</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Type</th><th>특성</th><th>용도</th></tr></thead>
          <tbody>
            <tr><td><code>Normal</code></td><td>Reorder / Merge / Speculate 가능, cacheable</td><td>일반 RAM</td></tr>
            <tr><td><code>Device</code></td><td>순서 보장, cache 금지, speculate 제한</td><td>MMIO (nGnRnE / nGnRE / nGRE / GRE)</td></tr>
          </tbody>
        </table>
      </div>
      <p><span className="tag info">nG</span> non-Gathering &nbsp; <span className="tag info">nR</span> non-Reordering &nbsp; <span className="tag info">nE</span> non-Early write ack</p>

      <h2>배리어 명령 <span className="en">/ Barrier Instructions</span></h2>
      <pre><code>
<span className="kw">DMB</span>  {"<option>"}   <span className="cmt">{"// Data Memory Barrier — 메모리 접근 순서만 보장"}</span>{"\n"}
<span className="kw">DSB</span>  {"<option>"}   <span className="cmt">{"// Data Sync Barrier — 이전 메모리 접근 완료까지 대기"}</span>{"\n"}
<span className="kw">ISB</span>             <span className="cmt">{"// Instruction Sync Barrier — 파이프라인 flush, context sync"}</span>{"\n\n"}
<span className="cmt">{"// Options:"}</span>{"\n"}
<span className="cmt">{"//   Scope:     SY (full system), ISH (inner shareable), OSH (outer), NSH"}</span>{"\n"}
<span className="cmt">{"//   Direction: LD (load-load + load-store), ST (store-store)"}</span>
      </code></pre>

      <h2>Acquire / Release 의미론 <span className="en">/ One-way Barriers</span></h2>
      <pre><code>
<span className="kw">LDAR</span>  Wt, [Xn]    <span className="cmt">{"// Load-Acquire — 이후 접근은 이 load 후에 관측"}</span>{"\n"}
<span className="kw">STLR</span>  Wt, [Xn]    <span className="cmt">{"// Store-Release — 이전 접근은 이 store 전에 관측"}</span>{"\n"}
<span className="kw">LDAPR</span> Wt, [Xn]    <span className="cmt">{"// Load-AcquirePC (v8.3) — 약한 acquire"}</span>
      </code></pre>

      <h2>Atomic: LL/SC vs LSE</h2>
      <div className="grid2">
        <div className="card">
          <h4>LL/SC · Legacy (ARMv8.0)</h4>
          <pre style={{ margin: '8px 0 0' }}><code>
<span className="kw">loop:</span>{"\n"}
  <span className="kw">ldxr</span>  w1, [x0]{"\n"}
  <span className="kw">add</span>   w1, w1, <span className="num">#1</span>{"\n"}
  <span className="kw">stxr</span>  w2, w1, [x0]{"\n"}
  <span className="kw">cbnz</span>  w2, loop
          </code></pre>
        </div>
        <div className="card">
          <h4>LSE · Large System Ext. (ARMv8.1+)</h4>
          <pre style={{ margin: '8px 0 0' }}><code>
  <span className="kw">mov</span>   w1, <span className="num">#1</span>{"\n"}
  <span className="kw">ldadd</span> w1, w2, [x0]{"\n"}
  <span className="cmt">{"// single-instruction atomic"}</span>{"\n"}
  <span className="cmt">{"// 경쟁 심할 때 훨씬 효율적"}</span>
          </code></pre>
        </div>
      </div>
    </>
  )
}
