export default function MMU() {
  return (
    <>
      <h2>2-Stage Translation</h2>
      <p>게스트 VA → <b>Stage 1</b> → IPA (Intermediate PA) → <b>Stage 2</b> → PA. 가상화 시 EL2가 stage 2를 제어.</p>

      <h2>Translation Granules</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Granule</th><th>Level 구조</th><th>VA size</th></tr></thead>
          <tbody>
            <tr><td><code>4 KB</code></td><td>L0 / L1 / L2 / L3 (최대 4 레벨)</td><td>48-bit (또는 52-bit w/ LPA)</td></tr>
            <tr><td><code>16 KB</code></td><td>L0 ~ L3</td><td>48-bit</td></tr>
            <tr><td><code>64 KB</code></td><td>L1 ~ L3 (3 레벨)</td><td>48-bit (또는 52-bit)</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Translation Flow <span className="en">/ 4KB, 48-bit VA</span></h2>
      <div className="diagram">{`  VA[47:39] → L0 index (9 bits) → L0 entry → L1 table base
  VA[38:30] → L1 index (9 bits) → L1 entry → L2 table base
  VA[29:21] → L2 index (9 bits) → L2 entry → L3 table base
  VA[20:12] → L3 index (9 bits) → L3 entry → 4KB page PA
  VA[11:0]  → page offset`}</div>

      <h2>시스템 레지스터 <span className="en">/ MMU Control</span></h2>
      <pre><code>
<span className="reg">TTBR0_EL1</span>  <span className="cmt">{"// Translation Table Base 0 — 보통 user space (하위 VA)"}</span>{"\n"}
<span className="reg">TTBR1_EL1</span>  <span className="cmt">{"// Translation Table Base 1 — 보통 kernel space (상위 VA)"}</span>{"\n"}
<span className="reg">TCR_EL1</span>    <span className="cmt">{"// Translation Control — granule, TxSZ, cacheability"}</span>{"\n"}
<span className="reg">MAIR_EL1</span>   <span className="cmt">{"// Memory Attribute Indirection — AttrIndx → 실제 속성 매핑"}</span>{"\n"}
<span className="reg">SCTLR_EL1</span>  <span className="cmt">{"// System Control — M bit = MMU enable"}</span>
      </code></pre>

      <h2>Descriptor 형식 <span className="en">/ Stage 1, 4KB</span></h2>
      <pre><code>
<span className="cmt">{"// Bits [1:0]:"}</span>{"\n"}
<span className="num">00</span>  Invalid{"\n"}
<span className="num">01</span>  Block   <span className="cmt">{"// (L1/L2) large mapping (1GB, 2MB)"}</span>{"\n"}
<span className="num">11</span>  Table   <span className="cmt">{"// (L0~L2) points to next-level table"}</span>{"\n"}
<span className="num">11</span>  Page    <span className="cmt">{"// (L3) points to 4KB page"}</span>{"\n\n"}
<span className="cmt">{"// Upper attributes: XN, PXN, Contiguous, nG"}</span>{"\n"}
<span className="cmt">{"// Lower attributes: AF, SH[1:0], AP[2:1], NS, AttrIndx[2:0]"}</span>
      </code></pre>

      <h2>TLB Maintenance</h2>
      <pre><code>
<span className="kw">TLBI</span>  VMALLE1       <span className="cmt">{"// invalidate all stage-1 entries at EL1"}</span>{"\n"}
<span className="kw">TLBI</span>  VAE1, Xt      <span className="cmt">{"// by VA"}</span>{"\n"}
<span className="kw">TLBI</span>  ASIDE1, Xt    <span className="cmt">{"// by ASID"}</span>{"\n"}
<span className="kw">TLBI</span>  IPAS2E1, Xt   <span className="cmt">{"// by IPA (stage-2)"}</span>{"\n"}
<span className="kw">DSB</span>   ISH           <span className="cmt">{"// wait for completion"}</span>{"\n"}
<span className="kw">ISB</span>                 <span className="cmt">{"// context sync"}</span>
      </code></pre>
    </>
  )
}
