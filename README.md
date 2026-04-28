# CPU Architecture Study

🌐 **Live site → https://wonyeongso.github.io/cpu_architecture/**

CPU 아키텍처 학습 노트. ARM AArch64 와 RISC-V 를 중심으로 ISA · Privilege · Memory model · MMU · Cache · Interrupt · Vector · 마이크로아키텍처 주제를 다룹니다. 각 주제에서 두 ISA를 대조해 공통 원리와 차이점을 드러내고, 실전 어셈 패턴과 시스템 SW 핵심을 별도 섹션으로 정리합니다.

A study site on CPU architecture, focused on ARM AArch64 and RISC-V. Each topic compares the two ISAs side by side to surface shared principles and divergences, with separate sections for real-world assembly patterns and systems-software essentials.

## 다루는 토픽 / Topics

- **General** — ISA Overview · Pipeline · Cache Fundamentals · Stack & Heap · Compilation Pipeline
- **Assembly** — Cache CMO · Atomics & Coherence · Barriers · MMU/TLB · Exception · Branch/PAC/BTI · NEON/SVE · ABI patterns
- **실전 (Real-World)** — Asm patterns (JIT · DMA · DMB/DSB/ISB · LSE · MMU/TLB) · Systems essentials (stack/heap, malloc, function call, MESI/MOESI)
- **ARM AArch64** — Registers · Exception Levels · Memory Model · MMU · Cache · GIC · TrustZone · Core Lineup
- **RISC-V** — ISA Family · M/S/U Privileges · Memory Model · Paging · PLIC/CLIC/AIA · Vector
- **Deep Dive** — Microarchitecture · Branch Predictor · Cache Coherence (CHI) · Cache Replacement & Prefetch · Power/DVFS · CXL/Chiplet · DRAM Controller
- **Compare** — ARM vs RISC-V vs x86 side-by-side

## 개발 / Development

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # static output → dist/
npm run preview   # local preview of the build
```

Vite 5 requires Node 18+.

## 배포 / Deployment

```bash
npm run build
# push the contents of dist/ to the gh-pages branch
```

GitHub Pages source: `gh-pages` branch / root.

## 구조 / Structure

```
src/
├── main.jsx                 # entry
├── App.jsx                  # sidebar groups + routing + theme + mobile drawer
├── App.css                  # theme variables + component styles
├── index.css                # fonts + global reset
└── sections/                # one component per topic page
    ├── general/             # ISA overview, Pipeline, Cache, Stack & Heap, Compilation
    ├── asm/                 # assembly-level recipes
    ├── arm/                 # ARM AArch64 specific
    ├── riscv/               # RISC-V specific
    ├── uarch/               # ISA-agnostic microarchitecture deep dive
    └── Compare.jsx          # three-way ISA comparison
```

## 면책 / Disclaimer

본 사이트는 학습용 요약입니다. 정확한 조항·비트 정의는 **ARM Architecture Reference Manual**, **RISC-V Privileged / Unprivileged Manuals**, 그리고 각 코어의 **TRM**을 참조하세요.

This site is a study summary. Always cross-check with the official **ARM ARM**, **RISC-V Manuals**, and core **TRMs** for precise spec details.

## 라이선스 / License

See [LICENSE](LICENSE).
