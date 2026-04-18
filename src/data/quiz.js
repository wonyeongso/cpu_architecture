export const QUIZ = [
  {
    q: 'AArch64에서 X30 레지스터의 일반적인 용도는?',
    opts: [
      'Frame Pointer (FP)',
      'Link Register (LR) — BL 명령의 반환 주소 저장',
      'Stack Pointer',
      'Zero Register',
    ],
    answer: 1,
    explain: 'X30 = LR. BL / BLR 시 반환 주소가 저장되며 RET 명령이 x30으로 분기합니다. FP는 관례적으로 X29.',
  },
  {
    q: 'EL0에서 Linux syscall을 호출하는 명령은?',
    opts: ['HVC', 'SMC', 'SVC', 'ERET'],
    answer: 2,
    explain: 'SVC → EL1 (OS kernel). HVC는 EL2 하이퍼바이저, SMC는 EL3 Secure Monitor로 진입.',
  },
  {
    q: 'ARM이 기본적으로 따르는 메모리 순서 모델은?',
    opts: [
      'Sequential Consistency',
      'Total Store Order (TSO)',
      'Weakly Ordered (배리어 필요)',
      'Release Consistency only',
    ],
    answer: 2,
    explain: 'ARM은 weakly ordered 모델. 메모리 접근 순서가 재정렬될 수 있어 DMB / DSB / ISB 또는 LDAR / STLR로 순서를 보장합니다.',
  },
  {
    q: 'GICv3에서 LPI (Locality-specific Peripheral Interrupt)의 목적은?',
    opts: [
      '코어 간 IPI 전송',
      '코어 로컬 타이머 인터럽트',
      'MSI 스타일 인터럽트 (ITS 경유)',
      'Secure world 전용 인터럽트',
    ],
    answer: 2,
    explain: 'LPI는 MSI와 유사. ITS (Interrupt Translation Service)가 DeviceID + EventID를 LPI INTID로 변환합니다.',
  },
  {
    q: 'AXI4에서 같은 ARID의 read 트랜잭션들은?',
    opts: [
      '항상 OoO로 완료될 수 있다',
      '순서대로 완료된다 (in-order)',
      'ARID는 순서와 무관하다',
      '버스트 안에서만 순서 보장',
    ],
    answer: 1,
    explain: 'AXI는 같은 ID 내에서는 순서 보장, 다른 ID 간에는 OoO 완료 허용. 이게 high-throughput의 핵심 메커니즘입니다.',
  },
  {
    q: 'I-cache와 D-cache가 일치해야 하는 지점 (self-modifying code 처리 기준)은?',
    opts: ['PoC', 'PoU', 'Inner shareable domain', 'L2 cache'],
    answer: 1,
    explain: 'PoU (Point of Unification) 가 I/D가 같은 데이터를 보는 지점. Self-modifying code는 DC CVAU → DSB → IC IVAU → DSB → ISB 시퀀스.',
  },
  {
    q: 'ARMv8.1-A에서 추가된 원자 연산 확장은?',
    opts: ['NEON', 'SVE', 'LSE (Large System Extensions)', 'MTE'],
    answer: 2,
    explain: 'LSE가 LDADD, CAS, SWP 등 single-instruction atomic을 도입. 경쟁이 심한 환경에서 LL/SC 루프보다 훨씬 효율적.',
  },
  {
    q: 'TrustZone에서 NS bit가 전파되는 최종 목적은?',
    opts: [
      'CPU 파이프라인 성능 향상',
      '버스·메모리·주변장치까지 Secure / Non-secure 격리',
      '캐시 coherency 개선',
      '전력 소비 감소',
    ],
    answer: 1,
    explain: 'NS는 AxPROT[1]로 AXI/CHI에 전파 → TZASC/TZPC로 메모리와 주변장치가 보안 상태를 인식. 시스템 전체 격리가 목적입니다.',
  },
  {
    q: 'Spectre-v1 (array bounds bypass) 을 최소 비용으로 차단할 수 있는 ARM 명령은?',
    opts: [
      'DSB SY — 전체 배리어',
      'ISB — context synchronization',
      'CSDB — consumption-of-speculative-data barrier',
      'DMB ISHST — store 배리어',
    ],
    answer: 2,
    explain: 'CSDB는 조건 체크 결과가 결정되기 전 speculative data에 의존한 load를 막는 전용 배리어. DSB/ISB 는 의미상 과도해 hot path에 부적합. 일반적으로 `cmp + b.ge` 뒤, 배열 index 파생 전에 CSDB 를 끼워 넣음.',
  },
  {
    q: "Top-down 방법론에서 'Backend Bound' slot이 높게 잡힐 때 가장 먼저 의심해야 할 곳은?",
    opts: [
      'Branch mispredict 율',
      'I-cache / ITLB miss',
      '메모리 계층 (L2/LLC/DRAM) miss 와 store queue full',
      'Decode width 부족',
    ],
    answer: 2,
    explain: 'Backend Bound는 실행·메모리 단계에서 dispatch가 막혔다는 뜻. 대표 원인은 LLC miss · DRAM BW 포화 · STQ/LDQ full · FP port contention. Frontend 이슈(BR mispred, I-cache)는 Bad Spec / Frontend Bound 버킷에서 잡힘.',
  },
]
