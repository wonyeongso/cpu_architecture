export default function RiscvMmu() {
  return (
    <>
      <h2>Paging Scheme <span className="en">/ Sv32 · Sv39 · Sv48 · Sv57</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Scheme</th><th>XLEN</th><th>Level 수</th><th>VA bit</th><th>PA bit</th></tr></thead>
          <tbody>
            <tr><td><code>Sv32</code></td><td>32</td><td>2</td><td>32</td><td>34 (4 GB 이상 지원)</td></tr>
            <tr><td><code>Sv39</code></td><td>64</td><td>3</td><td>39</td><td>56</td></tr>
            <tr><td><code>Sv48</code></td><td>64</td><td>4</td><td>48</td><td>56</td></tr>
            <tr><td><code>Sv57</code></td><td>64</td><td>5</td><td>57</td><td>56</td></tr>
          </tbody>
        </table>
      </div>
      <p>모든 scheme 에서 페이지 크기 기본 <b>4 KB</b>. "Superpages" (2 MB Sv39 L1, 1 GB Sv39 L2 등) 는 PTE 의 leaf bit 로 표현.</p>

      <h2>satp 레지스터 <span className="en">/ Supervisor Address Translation &amp; Protection</span></h2>
      <pre><code>
<span className="cmt">{"// RV64 satp = [MODE(4) | ASID(16) | PPN(44)]"}</span>{"\n"}
<span className="reg">satp.MODE</span>:  <span className="num">0</span>=Bare, <span className="num">8</span>=Sv39, <span className="num">9</span>=Sv48, <span className="num">10</span>=Sv57{"\n"}
<span className="reg">satp.ASID</span>:  address-space identifier (TLB tagging){"\n"}
<span className="reg">satp.PPN</span>:   루트 페이지 테이블의 physical page#{"\n\n"}
<span className="cmt">{"// similar to ARM TTBR0/TTBR1 + TCR — but only one satp (no user/kernel split in RV)"}</span>
      </code></pre>

      <h2>Sv39 Translation Flow <span className="en">/ 3-level walk</span></h2>
      <div className="diagram">{`  VA[38:30]  (9b)  → L2 index → L2 PTE → L1 table
  VA[29:21]  (9b)  → L1 index → L1 PTE → L0 table  (또는 2MB superpage)
  VA[20:12]  (9b)  → L0 index → L0 PTE → 4KB page  (또는 1GB superpage)
  VA[11:0]   (12b) → page offset

  # 한 page walk 당 최대 3회 메모리 접근
  # ARM 4KB 48-bit (4 level) 대비 한 단계 적음`}</div>

      <h2>PTE 형식 <span className="en">/ 64-bit Page Table Entry</span></h2>
      <pre><code>
<span className="cmt">{"// Sv39/48 PTE (64-bit):"}</span>{"\n"}
<span className="cmt">{"//  63  62-54  53-10(PPN)  9-8(RSW)  7 6 5 4 3 2 1 0"}</span>{"\n"}
<span className="cmt">{"//   N   PBMT      PPN       SW      D A G U X W R V"}</span>{"\n\n"}
<span className="reg">V</span>  Valid{"\n"}
<span className="reg">R W X</span>  Read / Write / eXecute permission (R=0,W=0,X=0 이면 pointer to next-level){"\n"}
<span className="reg">U</span>  User — U mode 접근 허용{"\n"}
<span className="reg">G</span>  Global — 모든 ASID 에 유효 (TLB 핀){"\n"}
<span className="reg">A</span>  Accessed{"\n"}
<span className="reg">D</span>  Dirty{"\n"}
<span className="reg">PBMT</span>  Page-Based Memory Types (Svpbmt 확장 — Normal/NC/IO){"\n"}
<span className="reg">N</span>  Napot (Svnapot — Natural Aligned Power-of-Two, superpage의 유연한 크기)
      </code></pre>

      <div className="callout">
        <span className="icon">💡</span>
        <div><code>X=1, W=1</code> 은 RISC-V 에서 <b>reserved</b> — 즉 writable + executable 페이지를 한 PTE로 못 만듦 (W^X 강제). ARM에선 WXN(SCTLR) 설정으로 정책이 분리.</div>
      </div>

      <h2>TLB Maintenance <span className="en">/ SFENCE.VMA</span></h2>
      <pre><code>
<span className="kw">sfence.vma</span>                 <span className="cmt">{"// invalidate all TLB entries for all ASIDs"}</span>{"\n"}
<span className="kw">sfence.vma</span>  zero, a0      <span className="cmt">{"// ASID only — invalidate the entire ASID"}</span>{"\n"}
<span className="kw">sfence.vma</span>  a0           <span className="cmt">{"// VA only — invalidate that VA across all ASIDs"}</span>{"\n"}
<span className="kw">sfence.vma</span>  a0, a1       <span className="cmt">{"// both VA and ASID"}</span>
      </code></pre>
      <p>ARM <code>TLBI VAE1, Xt</code> + <code>DSB ISH</code> + <code>ISB</code> 시퀀스에 대응 (<code>sfence.vma</code> 가 synchronization도 포함).</p>

      <h2>H 확장: 2-stage 변환 <span className="en">/ Guest → Host</span></h2>
      <p><code>H</code> 확장 있으면 <code>hgatp</code> (guest address translation and protection) 가 추가되고, Guest VA → Guest PA → Host PA 두 단계를 독립 테이블로 수행. ARM stage-1 / stage-2 와 같은 구조.</p>
    </>
  )
}
