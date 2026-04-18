# cpu-study

CPU 아키텍처 학습 페이지. ARM AArch64 와 RISC-V 를 중심으로 ISA · Privilege · Memory model · MMU · Cache · Interrupt · Vector · 마이크로아키텍처 주제를 다룸. 각 주제에서 두 ISA를 대조해 공통 원리와 차이점을 드러낸다.

## 개발

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # 정적 결과물 → dist/
npm run preview   # 빌드 결과 로컬 프리뷰
```

## 배포

```bash
./deploy.sh
# → https://github.mangoboost.io/pages/wonyeong-so/cpu-study/
```

Vite 5 는 Node 18+ 가 필요합니다. `deploy.sh` 는 로컬 설치된 Node 20을 우선 PATH에 넣습니다:
```
~/tools/node-v20.19.4-linux-x64/bin
```

## 구조

```
src/
├── main.jsx               # 엔트리
├── App.jsx                # 사이드바 그룹 + 라우팅 + 테마 토글
├── App.css                # 테마 변수 + 모든 컴포넌트 스타일
├── index.css              # 폰트 + 전역 리셋
└── sections/              # 섹션별 컴포넌트
    ├── general/           # ISA 개요, Pipeline 기초
    ├── arm/               # ARM AArch64 전용
    ├── riscv/             # RISC-V 전용
    ├── uarch/             # ISA-agnostic μarch 심화
    └── Compare.jsx        # 3-way 비교 요약
```
