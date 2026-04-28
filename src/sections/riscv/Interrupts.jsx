export default function RiscvInterrupts() {
  return (
    <>
      <h2>세 가지 Interrupt Controller <span className="en">/ PLIC · CLIC · AIA</span></h2>
      <p>RISC-V 는 ARM GIC 하나로 수렴한 것과 달리, 용도별로 <b>세 가지</b> 표준 interrupt controller 가 공존합니다.</p>

      <div className="grid3">
        <div className="card">
          <h4>PLIC · Platform-Level</h4>
          <p>서버/AP 용. MMIO 기반, single-priority 라우팅. 모든 external interrupt 가 여기로 모임. ARM <b>GICv2</b> 급 단순함.</p>
        </div>
        <div className="card">
          <h4>CLIC · Core-Local</h4>
          <p>MCU / real-time 용. nested preemption · vectored 진입 지원 — ARM <b>NVIC (Cortex-M)</b> 스타일. Low-latency embedded 에 최적.</p>
        </div>
        <div className="card">
          <h4>AIA · Advanced Interrupt Architecture</h4>
          <p>2023 비준. <b>IMSIC</b> (CPU-local MSI receiver) + <b>APLIC</b> (wired-to-MSI bridge). MSI-first, virtualization-aware — ARM <b>GICv3 + ITS</b> 대응.</p>
        </div>
      </div>

      <h2>Trap 분류 <span className="en">/ mcause Encoding</span></h2>
      <pre><code>
<span className="cmt">{"// mcause = [interrupt(1) | cause#(XLEN-1)]"}</span>{"\n\n"}
<span className="cmt">{"// Interrupts (bit 63 = 1):"}</span>{"\n"}
<span className="num">1</span>   Supervisor software  <span className="cmt">{"// SSIP — IPI via SBI"}</span>{"\n"}
<span className="num">3</span>   Machine software     <span className="cmt">{"// MSIP"}</span>{"\n"}
<span className="num">5</span>   Supervisor timer{"\n"}
<span className="num">7</span>   Machine timer{"\n"}
<span className="num">9</span>   Supervisor external  <span className="cmt">{"// from PLIC/APLIC"}</span>{"\n"}
<span className="num">11</span>  Machine external{"\n\n"}
<span className="cmt">{"// Exceptions (bit 63 = 0):"}</span>{"\n"}
<span className="num">0</span>   Instruction address misaligned{"\n"}
<span className="num">2</span>   Illegal instruction{"\n"}
<span className="num">3</span>   Breakpoint{"\n"}
<span className="num">8</span>   ECALL from U{"\n"}
<span className="num">9</span>   ECALL from S{"\n"}
<span className="num">11</span>  ECALL from M{"\n"}
<span className="num">12</span>  Instruction page fault{"\n"}
<span className="num">13</span>  Load page fault{"\n"}
<span className="num">15</span>  Store/AMO page fault
      </code></pre>

      <h2>PLIC 구조 <span className="en">/ Distributor + Targets</span></h2>
      <div className="diagram">{`    External devices (UART, eth, storage, ...)
              │
              v
   ┌──────────────────────────────────┐
   │          PLIC                    │
   │  - Priority registers            │
   │  - Pending / Enable bitmaps      │
   │  - Per-context Claim/Complete    │
   └────┬─────────┬────────────────┬──┘
        │         │                │
     Hart0     Hart1            HartN
     M/S       M/S              M/S
    context   context          context

   # 하나의 interrupt ID → 여러 hart에 fan-out
   # Claim 한 hart가 소유, 완료 시 Complete write`}</div>

      <h2>기본 ISR 시퀀스 <span className="en">/ S-mode External</span></h2>
      <pre><code>
<span className="cmt">{"// stvec = vectored mode (1): dispatch via mcause-indexed table"}</span>{"\n"}
<span className="cmt">{"// stvec = direct mode (0):  all traps land in one handler"}</span>{"\n\n"}
<span className="kw">s_ext_handler:</span>{"\n"}
  <span className="kw">lw</span>    t0, <span className="num">0x200004</span>(sp)   <span className="cmt">{"// PLIC claim register"}</span>{"\n"}
  <span className="cmt">{"// ... device-specific dispatch on t0 (INTID) ..."}</span>{"\n"}
  <span className="kw">sw</span>    t0, <span className="num">0x200004</span>(sp)   <span className="cmt">{"// PLIC complete (written value = INTID)"}</span>{"\n"}
  <span className="kw">sret</span>
      </code></pre>

      <h2>AIA · IMSIC + APLIC <span className="en">/ Modern MSI Path</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>IMSIC</h4>
          <p>CPU-local MSI receiver. 각 hart에 붙어 있어 device가 직접 MSI write 로 interrupt 전달 — no shared lock. Virtualization 시 guest-view IMSIC 독립.</p>
        </div>
        <div className="card">
          <h4>APLIC</h4>
          <p>Wired interrupt 를 MSI 로 변환하는 bridge. 레거시 device 를 AIA 체계에 수용. ARM <b>ITS</b> 역할과 비슷.</p>
        </div>
      </div>

      <div className="callout">
        <span className="icon">💡</span>
        <div>Linux/RISC-V 는 PLIC 지원이 먼저 안정화됐고, AIA 지원은 6.x 대에 들어왔습니다. 신규 SoC 는 AIA 를 선호 — virtualization 성능과 scale out 관점에서 PLIC 한계가 명확하기 때문.</div>
      </div>
    </>
  )
}
