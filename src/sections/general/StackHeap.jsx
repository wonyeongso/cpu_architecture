export default function StackHeap() {
  return (
    <>
      <h2>Stack과 Heap이 뭔가 <span className="en">/ What are Stack &amp; Heap?</span></h2>
      <p>프로그램이 실행 중에 <b>데이터를 어디에 둘지</b> 결정할 때 쓰는 두 가지 메모리 영역.
      둘 다 같은 가상 주소 공간 안에 있지만, <b>관리 방식</b>과 <b>사용 패턴</b>이 완전히 다릅니다.</p>

      <div className="grid2">
        <div className="card">
          <h4>Stack — 쌓아놓는 서류더미</h4>
          <p><b>함수가 호출될 때마다 한 장씩 위에 쌓고, 리턴할 때 맨 위 한 장을 치우는</b> 구조 (LIFO).
          지역 변수, 함수 인자, 복귀 주소가 여기 올라감. 크기가 <b>컴파일 타임에 정해지고</b>, <b>자동</b>으로 생기고 사라져서 따로 관리할 필요 없음.</p>
        </div>
        <div className="card">
          <h4>Heap — 자유롭게 쓰는 창고</h4>
          <p>필요할 때 <b>원하는 크기만큼 집어가고</b>(<code>malloc/new</code>), 다 쓰면 <b>명시적으로 반납</b>(<code>free/delete</code>)해야 하는 공간.
          크기를 런타임에 결정할 수 있고 오래 살릴 수도 있지만, <b>반납을 깜빡하면 새어나감</b>(메모리 누수).</p>
        </div>
      </div>

      <h3>코드로 비교</h3>
      <pre><code>
<span className="kw">void</span> example() {"{"}{"\n"}
  <span className="kw">int</span> a = <span className="num">42</span>;              <span className="cmt">{"// ← Stack: created automatically on function entry"}</span>{"\n"}
  <span className="kw">int</span> arr[<span className="num">100</span>];             <span className="cmt">{"// ← Stack: part of the 400-byte frame"}</span>{"\n"}
{"\n"}
  <span className="kw">int</span> *p = malloc(<span className="num">100</span> * <span className="kw">sizeof</span>(<span className="kw">int</span>));{"\n"}
                             <span className="cmt">{"// ← Heap: explicitly request 400 bytes"}</span>{"\n"}
  p[<span className="num">0</span>] = <span className="num">7</span>;{"\n"}
  free(p);                   <span className="cmt">{"// ← must free! (otherwise leaks)"}</span>{"\n"}
{"}"}                            <span className="cmt">{"// ← a, arr disappear automatically here (SP restored)"}</span>
      </code></pre>

      <h3>왜 두 개를 분리하나</h3>
      <div className="grid2">
        <div className="card">
          <h4>수명이 다르니까</h4>
          <p>지역 변수는 함수가 끝나면 불필요 — <b>스택 프레임 통째로 버리면 끝</b>(포인터 하나만 움직임).
          반면 "함수가 반환해도 살아있어야 하는 데이터"(예: 링크드 리스트 노드, 파일 버퍼)는 힙에 둬야 함.</p>
        </div>
        <div className="card">
          <h4>크기를 미리 알 수 있나</h4>
          <p>컴파일 타임에 크기 확정 → 스택(빠름). 사용자 입력·파일 크기처럼 <b>런타임에만 아는 크기</b>는 힙.
          <code>int arr[n]</code>(VLA)처럼 스택에 동적 할당도 가능하지만 크기 폭주 위험.</p>
        </div>
        <div className="card">
          <h4>속도 차이</h4>
          <p>스택 할당은 SP 감산 <b>1 cycle</b>. 힙은 allocator가 bin 탐색·락·시스템콜 가능성 — <b>수십~수백 cycle</b>.
          그래서 "가능하면 스택"이 기본 원칙.</p>
        </div>
        <div className="card">
          <h4>공유 가능성</h4>
          <p>스택은 <b>스레드마다 따로</b> 있어 공유 어려움. 힙은 프로세스 전체가 공유하는 공간이라
          스레드 간 데이터 전달은 보통 "힙에 두고 포인터만 넘긴다".</p>
        </div>
      </div>

      <h3>언어별 차이</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>언어</th><th>Stack 할당</th><th>Heap 할당</th><th>해제</th></tr></thead>
          <tbody>
            <tr><td>C</td><td>지역 변수 · <code>alloca()</code></td><td><code>malloc()</code></td><td>수동 <code>free()</code></td></tr>
            <tr><td>C++</td><td>지역 객체</td><td><code>new</code> · <code>make_unique</code></td><td>수동 <code>delete</code> 또는 RAII(스마트 포인터)</td></tr>
            <tr><td>Rust</td><td>기본값</td><td><code>Box::new</code> · <code>Vec</code> 등</td><td>소유권으로 자동 (컴파일 타임)</td></tr>
            <tr><td>Java / C#</td><td>프리미티브 · 로컬 참조</td><td>모든 <code>new</code> 객체</td><td>GC 자동</td></tr>
            <tr><td>Go</td><td>escape analysis가 결정</td><td>나머지 전부</td><td>GC 자동</td></tr>
            <tr><td>Python</td><td>(구현상 거의 전부 힙)</td><td>모든 객체</td><td>레퍼런스 카운트 + GC</td></tr>
          </tbody>
        </table>
      </div>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>한 줄 요약.</b> <b>Stack</b>은 "함수가 알아서 치워주는 빠른 임시 공간", <b>Heap</b>은 "내가 책임지고 관리하는 자유로운 공간". 나머지 모든 디테일(프레임, malloc 내부, 페이지 폴트)은 이 두 성격에서 파생됩니다.</div>
      </div>

      <h2>프로세스 가상 주소 공간 <span className="en">/ Process Address Space</span></h2>
      <p>Linux x86-64 / AArch64 유저 프로세스의 전형적인 VA 레이아웃. 커널은 별도 페이지 테이블(상위 반쪽)에 매핑되며 유저 모드에선 접근 불가.</p>
      <div className="diagram">{` high  +----------------------------+  0xFFFF_FFFF_FFFF_FFFF
       |      Kernel space          |  <- TTBR1_EL1 (kernel only)
       +----------------------------+  0x0000_8000_0000_0000
       |      (unmapped)            |
       +----------------------------+
       |      Stack                 |  grows DOWN (SP decreases)
       |         |                  |
       |         v                  |
       +----------------------------+
       |      (free)                |
       +----------------------------+
       |      mmap / shared libs    |  libc.so, large malloc, anon mmap
       +----------------------------+
       |      (free)                |
       +----------------------------+
       |      Heap                  |  grows UP (brk increases)
       |         ^                  |
       |         |                  |
       +----------------------------+  <- program break
       |      .bss    (zero-init)   |
       |      .data   (initialized) |
       |      .rodata (read-only)   |
       |      .text   (code)        |
 low   +----------------------------+  0x0000_0000_0040_0000`}</div>

      <div className="grid2">
        <div className="card">
          <h4>.text / .rodata</h4>
          <p>실행 코드와 상수. <b>R-X</b> / <b>R--</b> 권한. 여러 프로세스가 <code>libc.so</code>를 동시에 로드해도 물리 페이지는 공유(COW 없이).</p>
        </div>
        <div className="card">
          <h4>.data / .bss</h4>
          <p>전역/정적 변수. <b>RW-</b>. <code>.data</code>는 초기값 포함(파일에서 로드), <code>.bss</code>는 0 초기화(디스크엔 크기만 기록 — 페이지 폴트 시 zero page).</p>
        </div>
        <div className="card">
          <h4>Heap</h4>
          <p><code>brk()</code>로 연속 확장하거나 <code>mmap()</code>으로 불연속 블록. malloc의 원천.</p>
        </div>
        <div className="card">
          <h4>Stack</h4>
          <p>스레드당 하나씩(main 스택 + pthread 스택). 함수 호출 프레임, 지역 변수, 인자. 기본 8MB(<code>ulimit -s</code>).</p>
        </div>
      </div>

      <h2>ELF 섹션과 메모리 매핑 <span className="en">/ ELF Sections</span></h2>
      <p>컴파일러/링커가 코드와 데이터를 성격별로 <b>섹션(section)</b>에 나눠 저장하고,
      로더(kernel + ld.so)가 이를 메모리에 매핑하면서 섹션마다 다른 <b>권한(R/W/X)</b>을 부여.
      실행 중 권한은 하드웨어(MMU page attribute)로 강제됨 — 위반 시 SIGSEGV.</p>

      <div className="table-wrap">
        <table>
          <thead><tr><th>섹션</th><th>내용</th><th>권한</th><th>예시</th></tr></thead>
          <tbody>
            <tr><td><code>.text</code></td><td>실행 코드 (기계어 명령)</td><td>R-X</td><td>함수 본문, 컴파일된 명령어</td></tr>
            <tr><td><code>.rodata</code></td><td>읽기 전용 데이터</td><td>R--</td><td>문자열 리터럴 <code>"hello"</code>, <code>const</code> 전역, switch 점프 테이블</td></tr>
            <tr><td><code>.data</code></td><td>초기값 있는 전역 · 정적 변수</td><td>RW-</td><td><code>int g = 42;</code>, <code>static char buf[] = "x";</code></td></tr>
            <tr><td><code>.bss</code></td><td>0 초기화 전역 · 정적</td><td>RW-</td><td><code>int g;</code>, <code>static int arr[1024];</code> — 파일엔 크기만 기록</td></tr>
            <tr><td><code>.got / .plt</code></td><td>동적 링크 테이블</td><td>RW- / R-X</td><td>공유 라이브러리 함수 간접 호출 (lazy binding)</td></tr>
            <tr><td><code>.init / .fini</code></td><td>프로그램 시작 · 종료 코드</td><td>R-X</td><td>C++ 전역 생성자 · 소멸자 실행 포인트</td></tr>
            <tr><td><code>.debug_*</code></td><td>DWARF 디버그 정보</td><td>로드 안 됨</td><td>변수 이름, 라인 매핑 — <code>strip</code>으로 제거 가능</td></tr>
            <tr><td><code>.symtab / .strtab</code></td><td>심볼 테이블</td><td>로드 안 됨</td><td>함수/변수 이름 → 주소 매핑</td></tr>
          </tbody>
        </table>
      </div>

      <h3>왜 이렇게 나누나</h3>
      <div className="grid2">
        <div className="card">
          <h4>W^X — 쓰기와 실행 분리</h4>
          <p><code>.text</code>는 <b>X 필요 / W 불필요</b> → NX 비트로 쓰기 차단. 유저 입력을 <code>.text</code>에 주입해 실행시키는 고전 공격(shellcode injection) 차단.</p>
        </div>
        <div className="card">
          <h4>상수 보호</h4>
          <p><code>.rodata</code>는 <b>W 불필요</b>. <code>char *p = "hi"; p[0] = 'H';</code> 같은 코드는 컴파일은 되지만 런타임에 SIGSEGV — 버그를 즉시 탐지.</p>
        </div>
        <div className="card">
          <h4>바이너리 크기 절약</h4>
          <p><code>.bss</code>는 <b>값이 0</b>이므로 파일엔 "크기 N바이트" 메타만 기록 — 10MB 0 배열도 디스크 0바이트. 로딩 시 커널이 zero page로 lazy 매핑.</p>
        </div>
        <div className="card">
          <h4>공유와 COW</h4>
          <p><code>.text</code>는 프로세스 간 <b>물리 페이지 공유</b>(동일 libc.so를 1000 프로세스가 써도 한 벌). <code>.data</code>는 Copy-on-Write로 시작, 쓰기 시점에 분기.</p>
        </div>
      </div>

      <h3>확인 명령</h3>
      <pre><code>
<span className="kw">readelf</span> -S ./a.out          <span className="cmt">{"// all section headers (name, size, perms, offset)"}</span>{"\n"}
<span className="kw">readelf</span> -l ./a.out          <span className="cmt">{"// program headers (segment view used by the loader)"}</span>{"\n"}
<span className="kw">size</span> ./a.out                <span className="cmt">{"// summary of text/data/bss sizes"}</span>{"\n"}
<span className="kw">objdump</span> -s -j .rodata ./a.out   <span className="cmt">{"// hex dump of .rodata"}</span>{"\n"}
<span className="kw">nm</span> ./a.out | <span className="kw">grep</span> ' T '    <span className="cmt">{"// only .text symbols"}</span>{"\n"}
<span className="kw">cat</span> /proc/$PID/maps         <span className="cmt">{"// live memory map of a running process"}</span>
      </code></pre>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>Section vs Segment.</b> <code>readelf -S</code>의 <b>section</b>은 링커의 관점(세밀한 구분), <code>readelf -l</code>의 <b>segment</b>는 로더의 관점(실제 메모리 매핑 단위). 여러 섹션이 한 segment로 묶여 같은 권한의 페이지에 올라감 — 예: <code>.text + .rodata + .init</code> → R-X segment.</div>
      </div>

      <h2>스택 — Call Stack <span className="en">/ LIFO per Thread</span></h2>
      <p>함수 호출마다 <b>스택 프레임</b>이 push되고 리턴 시 pop. <code>SP</code>(Stack Pointer)가 현재 top, <code>FP</code>(Frame Pointer, AArch64의 <code>X29</code>)는 현재 프레임 시작 — 디버거가 체인을 거슬러 올라갈 때 사용.</p>

      <div className="diagram">{` high address
   +-----------------------+
   |  caller's frame       |
   |  ...                  |
   |  stack args #7, #8..  |  <- args that didn't fit in X0-X7
   +-----------------------+
   |  saved LR  (x30)      |  <- return address
   |  saved FP  (x29)      |  <- previous FP (frame chain)
   +-----------------------+  <- current FP (x29)
   |  saved x19 .. x28     |  <- callee-saved regs
   |  local variables      |
   |  alloca() area        |
   +-----------------------+  <- current SP
   |  (unused)             |
            v
 low address`}</div>

      <h3>AArch64 함수 prologue / epilogue</h3>
      <pre><code>
<span className="cmt">{"// prologue"}</span>{"\n"}
<span className="kw">stp</span>   x29, x30, [sp, <span className="num">#-32</span>]!    <span className="cmt">{"// save FP, LR + SP -= 32"}</span>{"\n"}
<span className="kw">mov</span>   x29, sp                   <span className="cmt">{"// FP = SP (new frame begins)"}</span>{"\n"}
<span className="kw">stp</span>   x19, x20, [sp, <span className="num">#16</span>]      <span className="cmt">{"// save callee-saved regs"}</span>{"\n"}
<span className="cmt">{"// ... function body ..."}</span>{"\n"}
<span className="cmt">{"// epilogue"}</span>{"\n"}
<span className="kw">ldp</span>   x19, x20, [sp, <span className="num">#16</span>]{"\n"}
<span className="kw">ldp</span>   x29, x30, [sp], <span className="num">#32</span>      <span className="cmt">{"// restore FP, LR + SP += 32"}</span>{"\n"}
<span className="kw">ret</span>
      </code></pre>

      <div className="grid2">
        <div className="card">
          <h4>호출 규약 (AAPCS64 요약)</h4>
          <p>인자 <code>X0~X7</code>, 반환 <code>X0</code>(또는 <code>X0/X1</code>), caller-saved <code>X0~X18</code>, callee-saved <code>X19~X28</code>, <b>SP는 항상 16B 정렬</b>, 프레임 레코드는 {'{FP, LR}'} 페어.</p>
        </div>
        <div className="card">
          <h4>Red Zone</h4>
          <p>x86-64 System V는 SP 아래 <b>128B</b>를 signal handler가 건드리지 않음을 보장 — leaf 함수가 SP 조정 없이 사용 가능. <b>AArch64 AAPCS64에는 red zone 없음</b>(대신 <code>stp pre-index</code>로 한 명령에 할당).</p>
        </div>
        <div className="card">
          <h4>Stack Guard Page</h4>
          <p>스택 맨 끝에 접근 불가(PROT_NONE) 페이지 1장. 오버플로로 이 페이지를 건드리면 <b>SIGSEGV</b>. glibc는 여러 페이지를 두어 "스택 클래시(Stack Clash)" 공격 완화.</p>
        </div>
        <div className="card">
          <h4>Stack Canary (SSP)</h4>
          <p><code>-fstack-protector</code>. prologue에서 리턴 주소 바로 앞에 랜덤 값 심고 epilogue에서 검증. 버퍼 오버플로로 LR이 덮이면 <code>__stack_chk_fail</code>로 abort.</p>
        </div>
      </div>

      <h2>힙 — Heap <span className="en">/ Dynamic Allocation</span></h2>
      <p>커널은 <b>페이지 단위</b>로만 메모리를 준다 — <code>brk()</code>(연속 확장) 또는 <code>mmap()</code>(임의 위치). 유저는 <code>malloc()</code>으로 바이트 단위 할당을 원하므로, <b>allocator</b>가 페이지를 잘게 쪼개 관리.</p>

      <div className="grid2">
        <div className="card">
          <h4>brk / sbrk</h4>
          <p>프로세스의 <b>data segment 끝(program break)</b>을 올리거나 내림. 연속된 한 덩어리. 작은 할당에 유리하지만 해제 순서가 LIFO여야 실제 OS로 반환. glibc는 기본 heap에 사용.</p>
        </div>
        <div className="card">
          <h4>mmap (MAP_ANONYMOUS)</h4>
          <p>아무 주소에 익명 페이지 블록. 큰 할당(<code>M_MMAP_THRESHOLD</code>, 보통 128KB↑)은 바로 mmap — <code>free()</code> 시 <code>munmap()</code>으로 즉시 OS로 반환. 페이지 폴트까지 물리 메모리 소비 X(오버커밋).</p>
        </div>
      </div>

      <h3>malloc 내부 — ptmalloc2 (glibc)</h3>
      <div className="diagram">{` +-----------------+-------------------+
 |  prev_size      |  size  | A | M | P |   <- A=non-main_arena, M=mmap, P=prev_inuse
 +-----------------+-------------------+
 |  fd, bk  (when free: bin list ptrs) |
 |  user payload  (malloc returns ->)  |
 +-------------------------------------+`}</div>

      <div className="grid2">
        <div className="card">
          <h4>Bin 구조</h4>
          <p><b>fastbin</b>(≤80B, LIFO, 병합 안함) → <b>tcache</b>(thread-local, 빠른 재사용) → <b>small/large bin</b>(크기별 FIFO) → <b>unsorted bin</b>(방금 free된 것 임시 보관). 매 malloc마다 이 순서로 탐색.</p>
        </div>
        <div className="card">
          <h4>Arena</h4>
          <p>코어 수만큼 <b>multiple arena</b> — 락 경합 감소. 각 arena는 독립된 brk/mmap 공간과 bin. main arena만 brk를 쓸 수 있고 나머지는 mmap.</p>
        </div>
        <div className="card">
          <h4>jemalloc / tcmalloc / mimalloc</h4>
          <p>대체 할당자. <b>size-class</b> 기반으로 단편화 제어, per-thread cache, radix tree / sharded page map으로 메타데이터 분리. 대용량 서버/브라우저(Firefox, Chrome) 기본값.</p>
        </div>
        <div className="card">
          <h4>단편화 (Fragmentation)</h4>
          <p><b>외부</b> — free 공간은 합쳐도 큰 요청을 못 받음(연속성 부족). <b>내부</b> — 요청보다 큰 size-class가 배정돼 남는 공간. compaction이 가능한 GC 언어(Java, Go)는 이를 완화.</p>
        </div>
      </div>

      <h2>스택 vs 힙 <span className="en">/ Head-to-Head</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>측면</th><th>Stack</th><th>Heap</th></tr></thead>
          <tbody>
            <tr><td>할당 속도</td><td>SP 한 번 감소 — O(1), ~1 cycle</td><td>allocator 경로 — 수십~수백 cycle</td></tr>
            <tr><td>해제 방식</td><td>return 시 자동(LIFO)</td><td>명시적 <code>free</code> 또는 GC</td></tr>
            <tr><td>크기 제한</td><td>스레드당 8MB (조정 가능)</td><td>가상 주소 공간 전체(수 TB)</td></tr>
            <tr><td>수명</td><td>함수 스코프 내</td><td>명시적 해제까지</td></tr>
            <tr><td>스레드 안전</td><td>스레드마다 독립</td><td>공유 — 락/arena 필요</td></tr>
            <tr><td>캐시 지역성</td><td>매우 높음(hot SP 주변)</td><td>낮음(임의 위치)</td></tr>
            <tr><td>단편화</td><td>없음</td><td>외부·내부 단편화 발생</td></tr>
            <tr><td>전형적 용도</td><td>지역 변수, 인자, 반환 주소</td><td>가변 크기, 긴 수명, 다른 스레드와 공유</td></tr>
          </tbody>
        </table>
      </div>

      <h2>메모리 접근과 페이지 폴트 <span className="en">/ Demand Paging</span></h2>
      <p><code>malloc(1GB)</code>이 성공해도 그 순간엔 물리 메모리 1GB를 먹지 않음 — 가상 매핑만 예약되고, <b>첫 접근 때</b> 페이지 폴트 → 커널이 물리 프레임(보통 zero page) 할당.</p>

      <div className="grid2">
        <div className="card">
          <h4>Minor fault</h4>
          <p>물리 프레임만 바꿔 끼우면 되는 폴트(zero page, COW 분기, 이미 페이지 캐시에 있음). 빠름 — μs 단위.</p>
        </div>
        <div className="card">
          <h4>Major fault</h4>
          <p>디스크에서 읽어와야 함(스왑 인, 매핑된 파일의 첫 접근). 밀리초 단위 — 성능 낭떠러지.</p>
        </div>
        <div className="card">
          <h4>오버커밋</h4>
          <p>Linux 기본(<code>vm.overcommit_memory=0</code>)은 합계가 RAM+swap을 넘어도 매핑 허용. 실제 사용 시점에 부족하면 <b>OOM killer</b> 발동.</p>
        </div>
        <div className="card">
          <h4>Huge Pages</h4>
          <p>2MB / 1GB 페이지. TLB 엔트리 하나로 더 큰 범위 커버 → 대용량 heap(DB, JVM) TLB miss율 급감. Transparent Huge Pages(THP)가 자동 병합.</p>
        </div>
      </div>

      <h2>보안 완화 <span className="en">/ Mitigations</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>ASLR</h4>
          <p>스택/힙/mmap/라이브러리 베이스를 부팅마다(PIE면 .text까지) 랜덤화. 리턴 주소 덮어써도 타깃 주소를 모름. 엔트로피는 아키/설정에 따라 28~40 bit.</p>
        </div>
        <div className="card">
          <h4>NX / W^X</h4>
          <p>페이지는 <b>Write 또는 eXecute 중 하나</b>만. 스택/힙은 NX → injected shellcode 실행 차단. 대신 ROP(리턴 가젯 체인)가 등장.</p>
        </div>
        <div className="card">
          <h4>PAC — Pointer Authentication (ARMv8.3)</h4>
          <p>LR/데이터 포인터 상위 비트에 <b>서명 태그</b>를 삽입(<code>PACIASP</code>), 역참조 전 <code>AUTIASP</code>로 검증. 스택 LR 조작·ROP 방어. Apple M1이 적극 활용.</p>
        </div>
        <div className="card">
          <h4>MTE — Memory Tagging (ARMv8.5)</h4>
          <p>물리 메모리 16B 단위에 4-bit 태그 부착, 포인터 상위에도 같은 태그. 불일치면 하드웨어가 예외 — use-after-free, 버퍼 오버플로 탐지. ASAN을 HW로.</p>
        </div>
        <div className="card">
          <h4>Heap Hardening</h4>
          <p>glibc의 <code>tcache safe-linking</code>(포인터를 위치와 XOR), unlink 체크, double-free detection. jemalloc은 guard page를 chunk 사이 삽입 가능.</p>
        </div>
        <div className="card">
          <h4>Shadow Stack (ARMv9 GCS · Intel CET)</h4>
          <p>별도 보호 페이지에 LR 복사본을 유지. epilogue에서 두 값 비교 — 불일치면 abort. 스택 카나리보다 강한 리턴 주소 무결성.</p>
        </div>
      </div>

      <h2>전형적 버그 패턴 <span className="en">/ Classic Bugs</span></h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>버그</th><th>영역</th><th>증상 / 탐지</th></tr></thead>
          <tbody>
            <tr><td>Stack buffer overflow</td><td>Stack</td><td>LR/카나리 덮어씀 → <code>__stack_chk_fail</code> / 크래시</td></tr>
            <tr><td>Stack overflow (recursion)</td><td>Stack</td><td>guard page 터치 → SIGSEGV</td></tr>
            <tr><td>Use-after-free</td><td>Heap</td><td>해제된 chunk 재사용 — ASAN/MTE가 탐지</td></tr>
            <tr><td>Double free</td><td>Heap</td><td>ptmalloc이 bin 체크로 abort</td></tr>
            <tr><td>Heap buffer overflow</td><td>Heap</td><td>인접 chunk 메타데이터 손상 → malloc 내부에서 SIGABRT</td></tr>
            <tr><td>Memory leak</td><td>Heap</td><td>free 누락 — valgrind / heaptrack으로 추적</td></tr>
            <tr><td>Dangling pointer</td><td>both</td><td>스코프 벗어난 지역 변수 주소 반환 → UB</td></tr>
          </tbody>
        </table>
      </div>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>Tip.</b> "지역 변수는 스택, <code>new/malloc</code>은 힙"이 개념적 구분이지만, <b>컴파일러가 escape analysis로 스택 할당으로 승격</b>하거나(Go, HotSpot JIT) <b>인라인 오브젝트 pool</b>을 쓰는 경우가 많음. 디어셈블리 전에 단정하지 말 것.</div>
      </div>

      <div className="callout warn">
        <span className="icon">⚠</span>
        <div><b>주의.</b> <code>alloca()</code>는 스택에서 동적 할당 — 빠르지만 크기를 잘못 주면 guard page를 뛰어넘어 다른 영역을 침범(<b>Stack Clash</b>). glibc 2.25+는 큰 alloca를 페이지별로 probe해 완화.</div>
      </div>
    </>
  )
}
