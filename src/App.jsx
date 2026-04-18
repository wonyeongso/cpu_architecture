import { useState, useEffect } from 'react'
// General
import IsaOverview from './sections/general/IsaOverview.jsx'
import PipelineBasics from './sections/general/PipelineBasics.jsx'
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
// Compare
import Compare from './sections/Compare.jsx'
import './App.css'

const GROUPS = [
  {
    group: 'General',
    items: [
      { id: 'isa-overview',    ko: 'ISA 개요',            en: 'ISA Overview',         C: IsaOverview,       tagline: 'RISC vs CISC, ARM · RISC-V · x86-64 한눈에 비교.' },
      { id: 'pipeline-basics', ko: 'Pipeline 기초',        en: 'Pipeline Basics',      C: PipelineBasics,    tagline: '5-stage 파이프, hazard, forwarding, ILP/TLP/DLP.' },
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
      { id: 'uarch', ko: '마이크로아키텍처', en: 'Microarchitecture', C: Microarchitecture, tagline: '파이프라인, 분기예측, OoO backend, LSU, 프리페처, SVE, PMU, 스펙 미티게이션.' },
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

const ThemeToggle = ({ theme, onToggle }) => (
  <button className="theme-toggle" onClick={onToggle} title="Toggle theme">
    {theme === 'dark' ? (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5"/>
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
      </svg>
    ) : (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    )}
  </button>
)

export default function App() {
  const [cur, setCur] = useState('isa-overview')
  const [theme, setTheme] = useState(() => localStorage.getItem('cpu-theme') || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('cpu-theme', theme)
  }, [theme])

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
          <div className="sub">ARM · RISC-V · 한글+English</div>
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
          <ThemeToggle theme={theme} onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
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
            <div className="tagline">{section.tagline}</div>
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
