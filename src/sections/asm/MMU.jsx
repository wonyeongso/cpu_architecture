export default function AsmMMU() {
  return (
    <>
      <h2>이 페이지의 범위 <span className="en">/ Scope</span></h2>
      <p>MMU·TLB를 SW에서 다루는 명령들 — <b>TLBI 변형 표, AT (Address Translation) debug 명령, sfence.vma, page-table walk 수동 추적</b>. <code>arm/MMU</code>·<code>riscv/Mmu</code>가 페이지 테이블 형식을 다룬다면 여기는 <b>SW가 TLB를 어떻게 일관되게 유지하는가</b>.</p>

      <h2>① ARM TLBI 분류 <span className="en">/ TLB Invalidate Variants</span></h2>
      <p>TLBI 니모닉은 <b>대상 EL · 범위 · 매개변수</b> 조합. <code>VAE1IS</code> = "VA-based, EL1, Inner Shareable".</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>명령</th><th>의미</th><th>전형적 사용</th></tr></thead>
          <tbody>
            <tr><td><code>TLBI VMALLE1</code></td><td>EL1 stage-1 entries 전부 invalidate (이 코어)</td><td>크기 큰 변경 (PT 교체)</td></tr>
            <tr><td><code>TLBI VMALLE1IS</code></td><td>위 + inner shareable (모든 코어)</td><td>SMP 페이지 교체</td></tr>
            <tr><td><code>TLBI VAE1, Xt</code></td><td>VA Xt 의 entry, EL1, 이 코어</td><td>단일 매핑 변경</td></tr>
            <tr><td><code>TLBI VAE1IS, Xt</code></td><td>VA Xt, EL1, IS (모든 코어)</td><td>SMP 단일 매핑 변경 (가장 흔함)</td></tr>
            <tr><td><code>TLBI ASIDE1, Xt</code></td><td>ASID 매칭 entries 전부 invalidate</td><td>프로세스 종료 시</td></tr>
            <tr><td><code>TLBI VAAE1IS, Xt</code></td><td>VA Xt, all ASIDs, IS</td><td>커널 매핑 변경</td></tr>
            <tr><td><code>TLBI IPAS2E1IS, Xt</code></td><td>IPA 단위 (stage-2, hypervisor용)</td><td>VM 메모리 reclaim</td></tr>
            <tr><td><code>TLBI ALLE2 / ALLE3</code></td><td>EL2 / EL3 entries 전부</td><td>hypervisor / firmware</td></tr>
          </tbody>
        </table>
      </div>

      <h2>② TLBI 표준 시퀀스 <span className="en">/ The DSB+ISB Sandwich</span></h2>
      <pre><code>
<span className="cmt">{"// 페이지 테이블 변경 후 표준 TLB 무효화 시퀀스"}</span>{"\n"}
  <span className="kw">str</span>   x_new_pte, [x_pte]      <span className="cmt">{"// ① write new PTE"}</span>{"\n"}
  <span className="kw">dsb</span>   <span className="kw">ishst</span>                  <span className="cmt">{"// ② PTE store visible in memory"}</span>{"\n"}
  <span className="kw">tlbi</span>  <span className="kw">vae1is</span>, x_va            <span className="cmt">{"// ③ invalidate that VA on all cores"}</span>{"\n"}
  <span className="kw">dsb</span>   <span className="kw">ish</span>                    <span className="cmt">{"// ④ wait until invalidation completes"}</span>{"\n"}
  <span className="kw">isb</span>                          <span className="cmt">{"// ⑤ pipeline re-fetches with new mapping"}</span>
      </code></pre>
      <div className="callout warn">
        <span className="icon">⚠</span>
        <div><b>각 단계가 빠지면.</b> ② 빠짐 → page walker가 옛 PTE 읽음. ④ 빠짐 → 다른 코어가 아직 옛 TLB로 동작. ⑤ 빠짐 → 자기 파이프라인이 옛 TLB로 prefetch한 instruction 실행. <b>한 단계라도 빼면 디버깅 지옥</b>.</div>
      </div>

      <h2>③ ASID 활용 — TLB flush 회피 <span className="en">/ Context Switch</span></h2>
      <pre><code>
<span className="cmt">{"// context switch on AArch64"}</span>{"\n"}
<span className="cmt">{"// new process: TTBR0_EL1 base + ASID"}</span>{"\n\n"}
  <span className="kw">mrs</span>   x0, <span className="reg">TTBR0_EL1</span>           <span className="cmt">{"// preserve current ASID? no — replace whole reg"}</span>{"\n"}
  <span className="kw">orr</span>   x1, x_new_pgd, x_new_asid_lsl_48{"\n"}
  <span className="kw">msr</span>   <span className="reg">TTBR0_EL1</span>, x1{"\n"}
  <span className="kw">isb</span>                          <span className="cmt">{"// new translation regime active"}</span>{"\n"}
<span className="cmt">{"// no TLBI required! — TLB entries are tagged with ASID"}</span>
      </code></pre>
      <p><b>핵심.</b> ASID를 안 쓰면 매 context switch마다 <code>TLBI VMALLE1IS</code> → 다음 프로세스의 첫 N개 접근이 전부 walk → 큰 perf 손실. ASID 16-bit은 65536개 프로세스를 distinguish, allocator가 wrap-around 처리.</p>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>ASID — Address Space IDentifier.</b> 프로세스마다 부여되는 8-bit 또는 16-bit 식별자. TLB 엔트리에 ASID 태그가 함께 저장되어 <b>다른 ASID의 entry는 자동으로 매칭 안 됨</b> → context switch 시 TLB flush 불필요. <code>TTBR0_EL1</code>의 상위 비트에 인코딩되며, <code>TCR_EL1.AS</code>로 8/16-bit 폭 선택.</div>
      </div>

      <h2>④ Global vs ASID-tagged 매핑 <span className="en">/ nG bit</span></h2>
      <pre><code>
<span className="cmt">{"// PTE의 nG (not Global) bit"}</span>{"\n"}
<span className="cmt">{"//   nG = 0: global mapping — ASID 무시 (커널 공간 등)"}</span>{"\n"}
<span className="cmt">{"//   nG = 1: ASID-tagged    — 같은 ASID에서만 매칭"}</span>{"\n\n"}
<span className="cmt">{"// 커널 매핑은 nG=0 → context switch에 영향 없음"}</span>{"\n"}
<span className="cmt">{"// 유저 매핑은 nG=1 → ASID로 격리"}</span>{"\n\n"}
<span className="cmt">{"// 커널 매핑만 무효화하려면:"}</span>{"\n"}
  <span className="kw">tlbi</span>  <span className="kw">vaale1is</span>, x_va         <span className="cmt">{"// 'all ASIDs' variant for global pages"}</span>
      </code></pre>

      <h2>⑤ AT — Address Translation 디버그 <span className="en">/ Walk by HW</span></h2>
      <pre><code>
<span className="cmt">{"// AT instruction: ask the HW page walker to translate VA"}</span>{"\n"}
<span className="cmt">{"// result lands in PAR_EL1 (Physical Address Register)"}</span>{"\n\n"}
  <span className="kw">at</span>    <span className="kw">s1e1r</span>, x_va            <span className="cmt">{"// stage-1, EL1, read access"}</span>{"\n"}
  <span className="kw">isb</span>{"\n"}
  <span className="kw">mrs</span>   x0, <span className="reg">PAR_EL1</span>{"\n"}
  <span className="kw">tbnz</span>  x0, <span className="num">#0</span>, .Lfault         <span className="cmt">{"// bit 0 = 1 if translation faulted"}</span>{"\n"}
  <span className="cmt">{"// PAR_EL1[51:12] = PA[51:12]; combine with VA[11:0] for full PA"}</span>
      </code></pre>
      <div className="callout">
        <span className="icon">💡</span>
        <div><b>활용.</b> 커널 디버거가 "이 VA가 어떤 PA로 가나?" 답할 때 사용. <code>AT</code> variants — <code>S1E0R/W</code>(EL0 perspective), <code>S1E2R/W</code>(EL2), <code>S12E1R/W</code>(stage-1+2 결합) — fault 종류를 PAR_EL1에서 decode해 디버그.</div>
      </div>

      <h2>⑥ Page-table walk 수동 추적 <span className="en">/ Trace by Hand</span></h2>
      <pre><code>
<span className="cmt">{"// 4KB granule, 48-bit VA, Sv48 / AArch64 4-level"}</span>{"\n"}
<span className="cmt">{"// VA = 0x0000_8000_0123_4567"}</span>{"\n\n"}
<span className="cmt">{"// 비트 슬라이싱"}</span>{"\n"}
<span className="cmt">{"//   VA[47:39] = 0x101  → L0 index = 0x101 (= 257)"}</span>{"\n"}
<span className="cmt">{"//   VA[38:30] = 0x000  → L1 index = 0"}</span>{"\n"}
<span className="cmt">{"//   VA[29:21] = 0x009  → L2 index = 9"}</span>{"\n"}
<span className="cmt">{"//   VA[20:12] = 0x034  → L3 index = 0x34 (= 52)"}</span>{"\n"}
<span className="cmt">{"//   VA[11:0]  = 0x567  → page offset"}</span>{"\n\n"}
<span className="cmt">{"// walk 흐름"}</span>{"\n"}
<span className="cmt">{"//   1. L0_table = TTBR0/1_EL1 & ~0xFFF"}</span>{"\n"}
<span className="cmt">{"//   2. L0_pte = L0_table[257] → next-level table base"}</span>{"\n"}
<span className="cmt">{"//   3. L1_pte = L1_table[0]   → next-level"}</span>{"\n"}
<span className="cmt">{"//   4. L2_pte = L2_table[9]   → may be 2MB block here"}</span>{"\n"}
<span className="cmt">{"//   5. L3_pte = L3_table[52]  → 4KB page descriptor"}</span>{"\n"}
<span className="cmt">{"//   6. PA = (L3_pte[51:12] << 12) | VA[11:0]"}</span>
      </code></pre>
      <p><b>면접 단골.</b> "VA 0xDEADBEEF로 walk을 따라가라" — 비트 슬라이싱 + 한 단계씩 PTE 읽기. <b>2MB block</b>(L2 stop), <b>1GB block</b>(L1 stop) 가능성도 함께 답해야 점수 만점.</p>

      <h2>⑦ Descriptor 비트 — invalid 진단 <span className="en">/ PTE Format Quick</span></h2>
      <pre><code>
<span className="cmt">{"// AArch64 stage-1 4KB granule descriptor"}</span>{"\n"}
<span className="cmt">{"// bits[1:0]:"}</span>{"\n"}
<span className="cmt">{"//   00  Invalid"}</span>{"\n"}
<span className="cmt">{"//   01  Block   (L1=1GB, L2=2MB)"}</span>{"\n"}
<span className="cmt">{"//   11  Table   (L0~L2: pointer to next-level table)"}</span>{"\n"}
<span className="cmt">{"//   11  Page    (L3: 4KB final page)"}</span>{"\n\n"}
<span className="cmt">{"// Lower attributes (bits[11:2]): AF, SH, AP, NS, AttrIndx"}</span>{"\n"}
<span className="cmt">{"// Upper attributes (bits[63:51]): XN, PXN, Contiguous, nG"}</span>
      </code></pre>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>주요 attribute bit 풀이.</b><br/>
        <b>AF (Access Flag)</b> — 처음 접근 시 0, kernel이 set. AF=0이면 trap → access 추적용.<br/>
        <b>SH (Shareability)</b> — 00 non / 10 outer / 11 inner shareable.<br/>
        <b>AP (Access Permissions)</b> — 2-bit 권한: 00 EL1 RW, 01 EL0/1 RW, 10 EL1 RO, 11 EL0/1 RO.<br/>
        <b>AttrIndx</b> — <code>MAIR_EL1</code>의 8개 슬롯 중 어느 것을 사용할지 가리키는 3-bit 인덱스. 실제 cacheability/Device 속성은 MAIR가 정의.<br/>
        <b>XN / PXN</b> — eXecute Never (EL0) / Privileged eXecute Never (EL1). 1이면 그 권한에서 fetch 차단 → W^X 강제.<br/>
        <b>nG (not Global)</b> — 1이면 ASID-tagged, 0이면 global (커널 매핑).</div>
      </div>

      <p><b>SIGSEGV 진단.</b> ESR_EL1.EC + FAR_EL1으로 fault 주소를 얻고, 위 형식대로 PTE 비트 살피면 원인 식별: <code>AF=0</code>(처음 접근, kernel이 set), <code>AP</code>로 권한 어긋남, <code>XN/PXN</code>로 실행 차단 등.</p>

      <h2>⑧ RISC-V SFENCE.VMA <span className="en">/ Same Idea, Cleaner</span></h2>
      <pre><code>
<span className="kw">sfence.vma</span>                 <span className="cmt">{"// invalidate all TLB entries for all ASIDs"}</span>{"\n"}
<span className="kw">sfence.vma</span>  zero, a0      <span className="cmt">{"// ASID only — invalidate the entire ASID"}</span>{"\n"}
<span className="kw">sfence.vma</span>  a0           <span className="cmt">{"// VA only — invalidate that VA across all ASIDs"}</span>{"\n"}
<span className="kw">sfence.vma</span>  a0, a1       <span className="cmt">{"// VA + ASID"}</span>
      </code></pre>
      <p><b>ARM과 다른 점.</b> ARM의 TLBI + DSB + ISB 시퀀스가 <b>한 명령에 통합</b> — sfence.vma 자체가 synchronization 포함. 단, RISC-V 측은 <b>satp 변경 후 sfence.vma 안 쓰면 wrong</b> — fence.i와 비슷한 explicit sync 필요.</p>

      <h2>⑨ 2-stage translation — Hypervisor <span className="en">/ Stage-1 + Stage-2</span></h2>
      <pre><code>
<span className="cmt">{"// Guest VA → Stage 1 (Guest OS) → IPA → Stage 2 (Hypervisor) → PA"}</span>{"\n\n"}
<span className="cmt">{"// Hypervisor가 stage-2를 무효화할 때:"}</span>{"\n"}
  <span className="kw">tlbi</span>  <span className="kw">ipas2e1is</span>, x_ipa       <span className="cmt">{"// invalidate stage-2 entry by IPA"}</span>{"\n"}
  <span className="kw">dsb</span>   <span className="kw">ish</span>{"\n"}
  <span className="kw">tlbi</span>  <span className="kw">vmalle1is</span>             <span className="cmt">{"// also flush stage-1 (combined entries)"}</span>{"\n"}
  <span className="kw">dsb</span>   <span className="kw">ish</span>{"\n"}
  <span className="kw">isb</span>
      </code></pre>
      <p>TLB는 보통 <b>stage-1 + stage-2 결합</b> entry를 캐시. stage-2만 바꿔도 stage-1까지 함께 flush해야 안전한 구현이 많음 — <code>VMID</code>로 격리하는 게 정석.</p>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>IPA / VMID — 가상화 용어.</b><br/>
        <b>IPA (Intermediate Physical Address)</b> — Guest OS가 자기 stage-1 walk 끝에 얻는 "물리 주소" 같은 것. 실제 PA는 아니고 hypervisor의 stage-2 walk을 거쳐야 진짜 PA가 됨. Guest는 IPA가 진짜 PA라고 믿고 동작.<br/>
        <b>VMID (Virtual Machine ID)</b> — VM마다 부여되는 8/16-bit 식별자 (ASID의 가상화 버전). TLB 엔트리에 함께 태깅되어 VM 스위치 시 flush 없이도 격리 유지. <code>VTTBR_EL2</code>에 인코딩.<br/>
        <b>한 줄:</b> "ASID는 프로세스 격리, VMID는 VM 격리, IPA는 Guest와 Host 사이의 중간 주소".</div>
      </div>

      <h2>⑩ Self-snooping vs broadcast — 면접 함정 <span className="en">/ TLBI Scope</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>NSH (non-shareable)</h4>
          <p>이 코어만. UP 시스템 / self-modifying TLB 변경 한정. SMP에서 잘못 쓰면 다른 코어가 stale TLB.</p>
        </div>
        <div className="card">
          <h4>IS (inner shareable) — 디폴트</h4>
          <p>같은 inner-shareable domain의 모든 코어. 일반 SMP Linux의 디폴트.</p>
        </div>
        <div className="card">
          <h4>OS (outer shareable)</h4>
          <p>여러 inner domain 가로지름 — 멀티소켓 시스템.</p>
        </div>
        <div className="card">
          <h4>면접 답변 한 줄</h4>
          <p>"커널은 거의 항상 IS variant. NSH는 자기 코어 한정 캐시 변경(JIT 등)에 매우 드물게."</p>
        </div>
      </div>

      <h2>한 줄 요약 <span className="en">/ Cheat Sheet</span></h2>
      <div className="callout">
        <span className="icon">📌</span>
        <div>
          <ul style={{margin: 0, paddingLeft: 18}}>
            <li>TLBI 5단계 시퀀스: <b>STR PTE → DSB ISHST → TLBI → DSB ISH → ISB</b>.</li>
            <li>ASID로 context switch 시 TLB flush 회피. nG=1 매핑만 ASID 매칭.</li>
            <li>AT 명령 + PAR_EL1 으로 HW page walk 결과 확인 — 디버깅 핵심.</li>
            <li>Page walk by hand: VA 비트 슬라이싱 + 4단계 PTE 읽기 + block 가능성 체크.</li>
            <li>RISC-V <code>sfence.vma</code>는 sync 포함 — ARM 시퀀스보다 짧음.</li>
            <li>Hypervisor 환경: stage-1 + stage-2 결합 entry 주의.</li>
            <li>SMP는 거의 IS variant. NSH는 매우 드뭄.</li>
          </ul>
        </div>
      </div>
    </>
  )
}
