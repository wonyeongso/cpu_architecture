import { useState, useEffect } from 'react'
import Overview from './sections/Overview.jsx'
import Registers from './sections/Registers.jsx'
import ExceptionLevels from './sections/ExceptionLevels.jsx'
import MemoryModel from './sections/MemoryModel.jsx'
import MMU from './sections/MMU.jsx'
import Cache from './sections/Cache.jsx'
import GIC from './sections/GIC.jsx'
import TrustZone from './sections/TrustZone.jsx'
import Cores from './sections/Cores.jsx'
import Microarchitecture from './sections/Microarchitecture.jsx'
import './App.css'

const SECTIONS = [
  { id: 'overview',  ko: '개요',             en: 'Overview',            C: Overview,          tag: 'Intro',       tagline: 'ARM의 설계 철학과 ISA 계열, 버전별 특징 한눈에 보기.' },
  { id: 'registers', ko: '레지스터',         en: 'Registers',           C: Registers,         tag: 'Core',        tagline: 'AArch64 GPR, PSTATE, 시스템 레지스터, 함수 호출 규약.' },
  { id: 'el',        ko: 'Exception Level',  en: 'Privilege Levels',    C: ExceptionLevels,   tag: 'Core',        tagline: 'EL0 ~ EL3 네 단계 특권 모델과 Secure / Non-secure 월드.' },
  { id: 'memory',    ko: 'Memory Model',     en: 'Memory Ordering',     C: MemoryModel,       tag: 'Concurrency', tagline: 'Weakly-ordered 모델, 배리어 명령, Acquire / Release, LSE atomics.' },
  { id: 'mmu',       ko: 'MMU',              en: 'Address Translation', C: MMU,               tag: 'System',      tagline: '2-stage 주소 변환, Translation granule, TTBR, Descriptor 구조.' },
  { id: 'cache',     ko: 'Cache',            en: 'Cache Hierarchy',     C: Cache,             tag: 'System',      tagline: 'Harvard L1 / Unified L2, VIPT vs PIPT, PoU / PoC, Maintenance ops.' },
  { id: 'gic',       ko: 'GIC',              en: 'Interrupts',          C: GIC,               tag: 'System',      tagline: 'GICv3 구조, SGI / PPI / SPI / LPI, ITS, ICC_* 시스템 레지스터.' },
  { id: 'tz',        ko: 'TrustZone',        en: 'Secure World',        C: TrustZone,         tag: 'Security',    tagline: 'NS bit 전파, Secure EL3 Monitor, TEE, SMC, PSCI.' },
  { id: 'cores',     ko: '코어 제품군',       en: 'Core Lineup',         C: Cores,             tag: 'Reference',   tagline: 'Cortex-A / R / M, Neoverse, big.LITTLE / DynamIQ.' },
  { id: 'uarch',     ko: '마이크로아키텍처',    en: 'Microarchitecture',   C: Microarchitecture, tag: 'Deep Dive',   tagline: '파이프라인, 분기예측, OoO backend, LSU, 프리페처, SVE, PMU, 스펙 미티게이션.' },
]

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
  const [cur, setCur] = useState('overview')
  const [theme, setTheme] = useState(() => localStorage.getItem('arm-theme') || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('arm-theme', theme)
  }, [theme])

  const idx = SECTIONS.findIndex(s => s.id === cur)
  const section = SECTIONS[idx]
  const Current = section.C
  const prev = idx > 0 ? SECTIONS[idx - 1] : null
  const next = idx < SECTIONS.length - 1 ? SECTIONS[idx + 1] : null

  const goto = (id) => {
    setCur(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">
            <div className="logo-mark">AA</div>
            <span>ARM Study</span>
          </div>
          <div className="sub">AArch64 · 한글 + English</div>
        </div>
        <div className="nav-group">
          <div className="nav-label">Contents</div>
          {SECTIONS.map((s, i) => (
            <div
              key={s.id}
              className={'nav-item' + (cur === s.id ? ' active' : '')}
              onClick={() => goto(s.id)}
            >
              <span className="num">{String(i + 1).padStart(2, '0')}</span>
              <div className="titles">
                <span>{s.ko}</span>
                <span className="en">{s.en}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>v1.4</span>
          <ThemeToggle theme={theme} onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
        </div>
      </aside>

      <main className="main" key={cur}>
        <div className="fade-in">
          <div className="hero">
            <div className="breadcrumb">
              <span>ARM CPU</span>
              <span className="sep">›</span>
              <span>{section.tag}</span>
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
              <b>⚠️ 참고.</b> 본 페이지는 학습용 요약입니다. 정확한 조항과 비트 정의는 <b>ARM Architecture Reference Manual (ARM ARM)</b>과 각 코어의 <b>TRM</b>을 참조하세요.<br/>
              This page is a study summary — always cross-check with the official ARM ARM and core TRMs for precise spec details.
            </footer>
          </div>
        </div>
      </main>
    </div>
  )
}
