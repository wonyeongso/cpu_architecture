# arm-study

ARM CPU 아키텍처 학습 페이지 (AArch64 중심). 개요부터 레지스터/EL/메모리 모델/MMU/Cache/GIC/TrustZone/코어 제품군/마이크로아키텍처까지 한 페이지로 훑어볼 수 있도록 구성.

## 개발

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # 정적 결과물 → dist/
npm run preview   # 빌드 결과 로컬 프리뷰
```

## 배포 (Mangoboost GH Enterprise Pages)

```bash
./deploy.sh
# → https://github.mangoboost.io/pages/wonyeong-so/arm-study/
```

master 브랜치 push 시 `.github/workflows/deploy.yml` 이 자동으로 `gh-pages` 브랜치를 갱신합니다.

## 구조

```
src/
├── main.jsx               # 엔트리
├── App.jsx                # 사이드바 + 라우팅 + 테마 토글
├── App.css                # 테마 변수 + 모든 컴포넌트 스타일
├── index.css              # 폰트 + 전역 리셋
└── sections/              # 섹션별 컴포넌트 (10개)
    ├── Overview.jsx
    ├── Registers.jsx
    ├── ExceptionLevels.jsx
    ├── MemoryModel.jsx
    ├── MMU.jsx
    ├── Cache.jsx
    ├── GIC.jsx
    ├── TrustZone.jsx
    ├── Cores.jsx
    └── Microarchitecture.jsx
```
