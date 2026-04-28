import { useState, useEffect } from 'react'
// General
import IsaOverview from './sections/general/IsaOverview.jsx'
import PipelineBasics from './sections/general/PipelineBasics.jsx'
import CacheBasics from './sections/general/CacheBasics.jsx'
import StackHeap from './sections/general/StackHeap.jsx'
import StackHeapInterview from './sections/general/StackHeapInterview.jsx'
import Compilation from './sections/general/Compilation.jsx'
// Assembly (topic-aligned)
import AsmCache from './sections/asm/Cache.jsx'
import AsmCoherence from './sections/asm/Coherence.jsx'
import AsmMemoryModel from './sections/asm/MemoryModel.jsx'
import AsmMMU from './sections/asm/MMU.jsx'
import AsmException from './sections/asm/Exception.jsx'
import AsmPipeline from './sections/asm/Pipeline.jsx'
import AsmSIMD from './sections/asm/SIMD.jsx'
import AsmCompiledPatterns from './sections/asm/CompiledPatterns.jsx'
import InterviewCache from './sections/asm/InterviewCache.jsx'
// ARM AArch64
import ArmOverview from './sections/arm/Overview.jsx'
import ArmRegisters from './sections/arm/Registers.jsx'
import ArmExceptionLevels from './sections/arm/ExceptionLevels.jsx'
import ArmMemoryModel from './sections/arm/MemoryModel.jsx'
import ArmMMU from './sections/arm/MMU.jsx'
import ArmCache from './sections/arm/Cache.jsx'
import ArmGIC from './sections/arm/GIC.jsx'
import ArmTrustZone from './sections/arm/TrustZone.jsx'
import ArmCores from './sections/arm/Cores.jsx'
// RISC-V
import RiscvIsaFamily from './sections/riscv/IsaFamily.jsx'
import RiscvPrivilege from './sections/riscv/Privilege.jsx'
import RiscvMemoryModel from './sections/riscv/MemoryModel.jsx'
import RiscvMmu from './sections/riscv/Mmu.jsx'
import RiscvInterrupts from './sections/riscv/Interrupts.jsx'
import RiscvVector from './sections/riscv/Vector.jsx'
// Deep Dive
import Microarchitecture from './sections/uarch/Microarchitecture.jsx'
import BranchPredictor from './sections/uarch/BranchPredictor.jsx'
import Coherence from './sections/uarch/Coherence.jsx'
import CacheAdvanced from './sections/uarch/CacheAdvanced.jsx'
import PowerDvfs from './sections/uarch/PowerDvfs.jsx'
import CxlChiplet from './sections/uarch/CxlChiplet.jsx'
import DramController from './sections/uarch/DramController.jsx'
// Compare
import Compare from './sections/Compare.jsx'
import './App.css'

const GROUPS = [
  {
    group: 'General',
    items: [
      { id: 'isa-overview',    ko: 'ISA 개요',            en: 'ISA Overview',         C: IsaOverview,       tagline: 'RISC vs CISC, ARM · RISC-V · x86-64 한눈에 비교.' },
      { id: 'pipeline-basics', ko: 'Pipeline 기초',        en: 'Pipeline Basics',      C: PipelineBasics,    tagline: '5-stage 파이프, hazard, forwarding, ILP/TLP/DLP.' },
      { id: 'cache-basics',    ko: 'Cache 기본',           en: 'Cache Fundamentals',   C: CacheBasics,       tagline: 'line/set/way, 연관도, 주소 분해, 3C miss, write policy.' },
      { id: 'stack-heap',      ko: 'Stack & Heap',        en: 'Stack & Heap',         C: StackHeap,         tagline: '프로세스 메모리 레이아웃, 프레임, malloc 내부, 완화책.' },
      { id: 'compilation',     ko: '컴파일 과정',          en: 'Compilation Pipeline', C: Compilation,       tagline: '전처리 · 컴파일 · 어셈블 · 링크, Arm Compiler/GCC/Clang, LTO.' },
    ],
  },
  {
    group: 'Assembly',
    items: [
      { id: 'asm-cache',     ko: 'Cache asm',       en: 'Cache Instructions',    C: AsmCache,             tagline: 'CMO 분류, DC ZVA, PRFM, false sharing 진단, NEON streaming.' },
      { id: 'asm-coh',       ko: 'Coherence asm',   en: 'Atomics & Coherence',   C: AsmCoherence,         tagline: 'LL/SC vs LSE vs cmpxchg, spinlock, CAS, ABA, lock-free.' },
      { id: 'asm-memory',    ko: 'Memory asm',      en: 'Barriers & Ordering',   C: AsmMemoryModel,       tagline: 'DMB/DSB/ISB, LDAR/STLR, fence options, memory_order 매핑.' },
      { id: 'asm-mmu',       ko: 'MMU asm',         en: 'TLB & Translation',     C: AsmMMU,               tagline: 'TLBI 변형, AT/PAR, page walk by hand, sfence.vma.' },
      { id: 'asm-exception', ko: 'Exception asm',   en: 'Vectors & Trap Path',   C: AsmException,         tagline: 'Vector table, SVC/HVC/SMC, ESR decode, ERET, GIC ISR.' },
      { id: 'asm-pipeline',  ko: 'Pipeline asm',    en: 'Branch · BTI · PAC',    C: AsmPipeline,          tagline: 'csel 가족, RAS, BTI/PAC, CSDB/SB, ILP recovery.' },
      { id: 'asm-simd',      ko: 'SIMD asm',        en: 'NEON · SVE · RVV',      C: AsmSIMD,              tagline: 'V0~V31 lane view, intrinsic 매핑, axpy 4가지, predicate.' },
      { id: 'asm-patterns',  ko: '공통 patterns',    en: 'C → asm · ABI · Bits',  C: AsmCompiledPatterns,  tagline: 'Cross-topic reference: 컴파일 패턴, calling convention, bit tricks.' },
    ],
  },
  {
    group: '실전',
    items: [
      { id: 'real-asm',       ko: '실전 asm',         en: 'Real-World Asm Patterns',  C: InterviewCache,     tagline: 'JIT 6단계 · DMA 시퀀스 · DMB/DSB/ISB · LL/SC vs LSE · MMU/TLB 시퀀스, 함정 질문 모음.' },
      { id: 'real-essentials', ko: '실전 핵심',       en: 'Real-World Essentials',     C: StackHeapInterview, tagline: '' },
    ],
  },
  {
    group: 'ARM AArch64',
    items: [
      { id: 'arm-overview',  ko: 'ARM 개요',         en: 'ARM Overview',            C: ArmOverview,        tagline: 'ARM의 설계 철학과 ISA 계열, 버전별 특징.' },
      { id: 'arm-regs',      ko: 'ARM 레지스터',     en: 'ARM Registers',           C: ArmRegisters,       tagline: 'AArch64 GPR, PSTATE, 시스템 레지스터.' },
      { id: 'arm-el',        ko: 'Exception Level',  en: 'ARM Privilege Levels',    C: ArmExceptionLevels, tagline: 'EL0 ~ EL3 네 단계 특권 모델.' },
      { id: 'arm-memory',    ko: 'ARM Memory',       en: 'ARM Memory Model',        C: ArmMemoryModel,     tagline: 'Weakly-ordered, 배리어, Acquire/Release, LSE.' },
      { id: 'arm-mmu',       ko: 'ARM MMU',          en: 'ARM Address Translation', C: ArmMMU,             tagline: '2-stage, granule, TTBR, Descriptor.' },
      { id: 'arm-cache',     ko: 'ARM Cache',        en: 'ARM Cache Hierarchy',     C: ArmCache,           tagline: 'Harvard L1, VIPT/PIPT, PoU/PoC, maintenance.' },
      { id: 'arm-gic',       ko: 'ARM GIC',          en: 'ARM Interrupts',          C: ArmGIC,             tagline: 'GICv3 구조, SGI/PPI/SPI/LPI, ITS.' },
      { id: 'arm-tz',        ko: 'TrustZone',        en: 'ARM Secure World',        C: ArmTrustZone,       tagline: 'NS bit 전파, EL3 Monitor, TEE, PSCI.' },
      { id: 'arm-cores',     ko: 'ARM 코어 제품군',   en: 'ARM Core Lineup',         C: ArmCores,           tagline: 'Cortex-A/R/M, Neoverse, big.LITTLE/DynamIQ.' },
    ],
  },
  {
    group: 'RISC-V',
    items: [
      { id: 'rv-isa',     ko: 'RISC-V ISA',        en: 'RISC-V ISA Family',    C: RiscvIsaFamily,    tagline: 'RV32I/64I + 표준 확장 (MAFDCV/B/H), 명령 포맷.' },
      { id: 'rv-priv',    ko: 'RISC-V Privilege',  en: 'RISC-V M/S/U Modes',   C: RiscvPrivilege,    tagline: 'M·S·U 모드, H 확장, CSR, trap 시퀀스, SBI.' },
      { id: 'rv-memory',  ko: 'RISC-V Memory',     en: 'RISC-V Memory Model',  C: RiscvMemoryModel,  tagline: 'RVWMO, fence, LR/SC, AMO, aq/rl, Ztso.' },
      { id: 'rv-mmu',     ko: 'RISC-V MMU',        en: 'RISC-V Paging',        C: RiscvMmu,          tagline: 'Sv39/48/57, satp, PTE, SFENCE.VMA.' },
      { id: 'rv-intr',    ko: 'RISC-V 인터럽트',    en: 'RISC-V Interrupts',    C: RiscvInterrupts,   tagline: 'PLIC, CLIC, AIA (IMSIC/APLIC).' },
      { id: 'rv-vector',  ko: 'RISC-V Vector',     en: 'RISC-V RVV 1.0',       C: RiscvVector,       tagline: 'VL-agnostic, vsetvli, LMUL, masking.' },
    ],
  },
  {
    group: 'Deep Dive',
    items: [
      { id: 'uarch',   ko: '마이크로아키텍처', en: 'Microarchitecture',     C: Microarchitecture, tagline: '파이프라인, 분기예측, OoO backend, LSU, 프리페처, SVE, PMU, 스펙 미티게이션.' },
      { id: 'bp-deep', ko: '분기 예측기',      en: 'Branch Predictor',      C: BranchPredictor,   tagline: 'TAGE-SC-L, ITTAGE, RAS, BTB 계층, decoupled fetch, BPU 보안.' },
      { id: 'coh',     ko: '캐시 코히어런스',  en: 'Cache Coherence · CHI', C: Coherence,         tagline: 'MESI/MOESI, ACE/CHI, CMN mesh, snoop filter, LSE near/far atomics.' },
      { id: 'cache',   ko: 'Cache 심화',        en: 'Cache · Replacement · Prefetch', C: CacheAdvanced, tagline: 'Replacement heuristic(LRU→RRIP→SHiP), Inclusion, CAT/MPAM, prefetcher 계보, MSHR.' },
      { id: 'pwr',     ko: '전력 · DVFS',       en: 'Power · DVFS · Idle',   C: PowerDvfs,         tagline: 'V/F 곡선, OPP, governor, WFI/WFE, C-state, PSCI, EAS, turbostat.' },
      { id: 'cxl',     ko: 'CXL · Chiplet',     en: 'CXL · Chiplets',        C: CxlChiplet,        tagline: 'UCIe, Infinity Fabric, CXL.io/.cache/.mem, Type1/2/3, pooling, fabric.' },
      { id: 'dram',    ko: 'DRAM 컨트롤러',     en: 'DRAM Controller',       C: DramController,    tagline: 'tRCD/tRP/tCL, bank group, row policy, FR-FCFS, refresh, DDR5 sub-channel, RowHammer.' },
    ],
  },
  {
    group: 'Compare',
    items: [
      { id: 'compare', ko: '종합 비교', en: 'ARM vs RISC-V vs x86', C: Compare, tagline: 'ISA · Privilege · Memory · MMU · Vector · Interrupt 한 표로.' },
    ],
  },
]

const FLAT = GROUPS.flatMap((g) =>
  g.items.map((it) => ({ ...it, group: g.group }))
)


export default function App() {
  const [cur, setCur] = useState('isa-overview')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'gruvbox')
  }, [])

  const idx = FLAT.findIndex((s) => s.id === cur)
  const section = FLAT[idx]
  const Current = section.C
  const prev = idx > 0 ? FLAT[idx - 1] : null
  const next = idx < FLAT.length - 1 ? FLAT[idx + 1] : null

  const goto = (id) => {
    setCur(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  let globalIdx = 0

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">
            <div className="logo-mark">CP</div>
            <span>CPU Study</span>
          </div>
        </div>
        <div className="nav-group">
          {GROUPS.map((g) => (
            <div key={g.group}>
              <div className="nav-label">{g.group}</div>
              {g.items.map((s) => {
                globalIdx += 1
                const n = globalIdx
                return (
                  <div
                    key={s.id}
                    className={'nav-item' + (cur === s.id ? ' active' : '')}
                    onClick={() => goto(s.id)}
                  >
                    <span className="num">{String(n).padStart(2, '0')}</span>
                    <div className="titles">
                      <span>{s.ko}</span>
                      <span className="en">{s.en}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>v2.0</span>
        </div>
      </aside>

      <main className="main" key={cur}>
        <div className="fade-in">
          <div className="hero">
            <div className="breadcrumb">
              <span>CPU Study</span>
              <span className="sep">›</span>
              <span>{section.group}</span>
              <span className="sep">›</span>
              <span className="cur">{section.en}</span>
            </div>
            <h1>{section.ko}<span className="en">{section.en}</span></h1>
            {section.tagline && <div className="tagline">{section.tagline}</div>}
          </div>

          <div className="section-body">
            <Current />

            <div className="page-nav">
              {prev ? (
                <button className="btn-nav prev" onClick={() => goto(prev.id)}>
                  <span className="label">← 이전 / Previous</span>
                  <span className="title">{prev.ko} · {prev.en}</span>
                </button>
              ) : <div className="btn-nav disabled" />}
              {next ? (
                <button className="btn-nav next" onClick={() => goto(next.id)}>
                  <span className="label">다음 / Next →</span>
                  <span className="title">{next.ko} · {next.en}</span>
                </button>
              ) : <div className="btn-nav disabled" />}
            </div>

            <footer>
              <b>⚠️ 참고.</b> 본 페이지는 학습용 요약입니다. 정확한 조항·비트 정의는 <b>ARM Architecture Reference Manual (ARM ARM)</b>, <b>RISC-V Privileged / Unprivileged Manual</b>, 그리고 각 코어의 <b>TRM</b> 을 참조하세요.<br/>
              This page is a study summary — always cross-check with the official ARM ARM, RISC-V Manuals, and core TRMs for precise spec details.
            </footer>
          </div>
        </div>
      </main>
    </div>
  )
}
