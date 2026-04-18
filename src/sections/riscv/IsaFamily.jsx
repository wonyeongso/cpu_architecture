export default function RiscvIsaFamily() {
  return (
    <>
      <h2>철학 <span className="en">/ Philosophy</span></h2>
      <p>RISC-V 는 UC Berkeley 에서 2010 시작된 <b>오픈 표준 ISA</b>. 작은 베이스 + 모듈식 확장이 핵심. 특정 회사가 통제하지 않아 연구·스타트업·하이퍼스케일러(NVIDIA, Alibaba, Meta 등) 가 자유롭게 칩 설계.</p>

      <div className="grid3">
        <div className="card">
          <h4>Open Standard</h4>
          <p>스펙은 CC-BY-SA 공개. 구현은 상업·오픈소스 모두 자유. 로열티 없음.</p>
        </div>
        <div className="card">
          <h4>Modular</h4>
          <p>Base ISA (<code>I</code>) + 필요한 확장만 선택. MCU~server 까지 공통 도구체인.</p>
        </div>
        <div className="card">
          <h4>Simple</h4>
          <p>Base 명령 ~50개, 고정 32-bit, 명령 포맷 6종뿐. 교육·검증·구현 모두 깔끔.</p>
        </div>
      </div>

      <h2>Base ISA <span className="en">/ Word Width</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Base</th><th>XLEN</th><th>용도</th></tr></thead>
          <tbody>
            <tr><td><code>RV32I</code></td><td>32-bit</td><td>MCU / embedded — 47 base 명령</td></tr>
            <tr><td><code>RV64I</code></td><td>64-bit</td><td>AP / server — RV32I 상위호환, 명령 포맷 동일</td></tr>
            <tr><td><code>RV128I</code></td><td>128-bit</td><td>미래 대응, 스펙에 frozen (거의 미사용)</td></tr>
            <tr><td><code>RV32E</code></td><td>32-bit</td><td>Embedded 최소 — GPR <b>16개</b>만 (초저자원)</td></tr>
          </tbody>
        </table>
      </div>

      <h2>표준 확장 <span className="en">/ Standard Extensions</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>확장</th><th>이름</th><th>내용</th></tr></thead>
          <tbody>
            <tr><td><code>M</code></td><td>Integer Mul/Div</td><td>MUL, MULH, DIV, REM</td></tr>
            <tr><td><code>A</code></td><td>Atomic</td><td>LR/SC (load-reserved / store-conditional), AMOADD/SWAP 등</td></tr>
            <tr><td><code>F</code></td><td>Single-precision FP</td><td>32-bit float (<code>f0-f31</code>)</td></tr>
            <tr><td><code>D</code></td><td>Double-precision FP</td><td>64-bit double</td></tr>
            <tr><td><code>Q</code></td><td>Quad-precision FP</td><td>128-bit (드묾)</td></tr>
            <tr><td><code>C</code></td><td>Compressed</td><td>16-bit 인코딩, 가장 흔한 명령에만 적용 — 코드 크기 ~30% ↓</td></tr>
            <tr><td><code>V</code></td><td>Vector</td><td>RVV 1.0, VL-agnostic SIMD</td></tr>
            <tr><td><code>B</code></td><td>Bit Manipulation</td><td>Zba/Zbb/Zbc/Zbs — count, reverse, population 등</td></tr>
            <tr><td><code>H</code></td><td>Hypervisor</td><td>HS/VS/VU 모드, 2-stage translation</td></tr>
            <tr><td><code>Zicsr</code></td><td>CSR access</td><td>CSRRW/RS/RC — 제어 레지스터</td></tr>
            <tr><td><code>Zifencei</code></td><td>Instruction fence</td><td><code>fence.i</code> (I-stream sync)</td></tr>
          </tbody>
        </table>
      </div>
      <p><span className="tag info">G = IMAFD_Zicsr_Zifencei</span> "General-purpose" 조합. 리눅스 부팅 최소.</p>

      <h2>Profiles <span className="en">/ RVA / RVI / RVB</span></h2>
      <p>특정 target 시장이 반드시 포함해야 할 확장 묶음.</p>
      <div className="grid2">
        <div className="card">
          <h4>RVA23 (Application)</h4>
          <p>2024 확정. Linux-capable AP 용 baseline. G + C + V + B + 가상화·보안 확장 다수.</p>
        </div>
        <div className="card">
          <h4>RVA22</h4>
          <p>이전 세대. Zicbom, Zicboz 등 cache mgmt 포함. 리눅스 distro가 우선 타겟팅.</p>
        </div>
      </div>

      <h2>명령 포맷 <span className="en">/ Instruction Formats</span></h2>
      <div className="diagram">{` 31                    25 24    20 19    15 14  12 11    7 6     0
┌────────────────────────┬────────┬────────┬──────┬────────┬───────┐
│        funct7          │  rs2   │  rs1   │funct3│   rd   │opcode │  R-type   (add, sub)
├────────────────────────┴────────┼────────┼──────┼────────┼───────┤
│        imm[11:0]                │  rs1   │funct3│   rd   │opcode │  I-type   (addi, ld)
├────────────────────────┬────────┼────────┼──────┼────────┼───────┤
│      imm[11:5]         │  rs2   │  rs1   │funct3│imm[4:0]│opcode │  S-type   (sw, sd)
├──┬───────────────────┬─┼────────┼────────┼──────┼─┬──────┼───────┤
│12│   imm[10:5]       │ │  rs2   │  rs1   │funct3│ │imm[4:│opcode │  B-type   (beq)
├──┴───────────────────┴─┴────────┴────────┴──────┴─┴──────┼───────┤
│                  imm[31:12]                              │   rd  │  U-type   (lui, auipc)
├──┬───────┬──┬─────────────────────┬──────────────────────┴───────┤
│20│imm[10:│11│     imm[19:12]      │         rd               │opcode│  J-type (jal)
└──┴───────┴──┴─────────────────────┴──────────────────────────┴────┘`}</div>
      <p>6 개 포맷만 존재하는 것이 RISC-V 의 큰 매력. Immediate bit 위치는 조금씩 꼬여 있지만, decoder가 더 적은 와이어로 muxing 가능하도록 배려된 설계.</p>

      <h2>ABI 레지스터 이름 <span className="en">/ Calling Convention</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Reg</th><th>ABI name</th><th>용도</th></tr></thead>
          <tbody>
            <tr><td><code>x0</code></td><td><code>zero</code></td><td>hardwired 0</td></tr>
            <tr><td><code>x1</code></td><td><code>ra</code></td><td>return address (ARM LR 대응)</td></tr>
            <tr><td><code>x2</code></td><td><code>sp</code></td><td>stack pointer</td></tr>
            <tr><td><code>x3</code></td><td><code>gp</code></td><td>global pointer</td></tr>
            <tr><td><code>x4</code></td><td><code>tp</code></td><td>thread pointer (TLS)</td></tr>
            <tr><td><code>x5-x7, x28-x31</code></td><td><code>t0-t6</code></td><td>temporary (caller-saved)</td></tr>
            <tr><td><code>x8</code></td><td><code>fp/s0</code></td><td>frame pointer / saved</td></tr>
            <tr><td><code>x10-x17</code></td><td><code>a0-a7</code></td><td>argument / return</td></tr>
            <tr><td><code>x9, x18-x27</code></td><td><code>s1-s11</code></td><td>saved (callee-saved)</td></tr>
          </tbody>
        </table>
      </div>

      <div className="callout">
        <span className="icon">💡</span>
        <div>RISC-V 는 ARM의 <code>PSTATE</code> 같은 flag 레지스터가 없습니다. 비교는 <code>beq/bne/blt/bge</code> 처럼 비교와 분기를 한 명령에 합치거나, <code>slt</code> (set-less-than) 로 결과를 레지스터에 저장. → μarch에서 flag rename 오버헤드 없음.</div>
      </div>
    </>
  )
}
