export default function Compilation() {
  return (
    <>
      <h2>"컴파일"이 뭔가요 <span className="en">/ What is Compilation?</span></h2>
      <p>CPU는 <code>printf("hello")</code> 같은 글을 못 읽습니다. 오직 <b>0과 1의 명령</b>만 실행해요.
      그래서 우리가 쓴 C 코드를 CPU가 먹을 수 있게 <b>번역</b>해주는 과정이 필요한데, 이게 컴파일입니다.</p>

      <p>번역은 한 번에 끝나지 않고 <b>4번에 걸쳐서</b> 단계적으로 변환해요. 비유하자면 이런 느낌:</p>

      <div className="grid2">
        <div className="card">
          <h4>1️⃣ 전처리 — "원고 정리"</h4>
          <p><code>#include &lt;stdio.h&gt;</code> 같은 지시문을 실제 내용으로 바꿔치기. 주석 지우고, 매크로 펼치고.
          <b>순수한 C 텍스트</b>로 다듬는 단계.</p>
        </div>
        <div className="card">
          <h4>2️⃣ 컴파일 — "외국어로 번역"</h4>
          <p>C 코드를 <b>어셈블리어</b>(CPU 명령어를 사람이 읽을 수 있게 쓴 형태)로 번역.
          여기서 속도 최적화, 레지스터 배정 등 중요한 작업이 다 일어남.</p>
        </div>
        <div className="card">
          <h4>3️⃣ 어셈블 — "타자 치기"</h4>
          <p>어셈블리어를 <b>실제 0과 1</b>로 인코딩. ARM은 명령 하나당 딱 4바이트.
          결과는 <code>.o</code>(오브젝트) 파일 — 아직 조각난 상태.</p>
        </div>
        <div className="card">
          <h4>4️⃣ 링크 — "책으로 제본"</h4>
          <p>여러 <code>.o</code> 조각과 라이브러리(<code>printf</code> 같은 것)를 합쳐 <b>하나의 실행 파일</b>로 묶음.
          서로의 함수 주소도 이때 연결돼요.</p>
        </div>
      </div>

      <h3>전체 흐름</h3>
      <div className="diagram">{` foo.c   (내가 쓴 C 코드)
   |
   | 1. 전처리  (#include, #define 펼침)
   v
 foo.i   (순수 C 텍스트)
   |
   | 2. 컴파일  (최적화 + 어셈블리 생성)
   v
 foo.s   (어셈블리어)
   |
   | 3. 어셈블  (0과 1로 인코딩)
   v
 foo.o   (기계어 조각, 아직 불완전)
   |
   | 4. 링크  (여러 조각 + 라이브러리 합치기)
   v
 a.out   (실행 가능한 완제품!)`}</div>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>실제로는.</b> <code>gcc foo.c</code> 한 줄이면 이 4단계가 한 번에 일어나요. 내부적으로 컴파일러 드라이버가 네 개의 도구를 순서대로 호출할 뿐. 각 단계 결과물을 보고 싶으면 플래그로 중간에 멈출 수 있어요.</div>
      </div>

      <h2>각 단계 자세히 보기 <span className="en">/ Step by Step</span></h2>

      <h3>1단계 — 전처리 (Preprocess)</h3>
      <p>"원고의 빈 자리를 채우고 주석을 지우는" 작업. <code>#include</code>는 <b>실제 파일 내용으로 통째로 교체</b>되고, <code>#define MAX 100</code>의 <code>MAX</code>는 전부 <code>100</code>으로 바뀝니다.</p>
      <pre><code>
<span className="cmt">{"// preprocessed output only"}</span>{"\n"}
<span className="kw">gcc</span> -E foo.c -o foo.i{"\n"}
{"\n"}
<span className="cmt">{"// foo.i is usually tens of thousands of lines — even one stdio.h pulls in tons of declarations"}</span>
      </code></pre>

      <h3>2단계 — 컴파일 (Compile)</h3>
      <p><b>가장 복잡하고 가장 중요한 단계.</b> 컴파일러는 C 코드를 읽어서 머릿속에 <b>구조(AST)</b>로 만들고,
      불필요한 계산을 없애고, 루프를 펴고, 함수를 인라인으로 집어넣는 등 <b>수십 가지 최적화</b>를 거친 뒤 어셈블리를 뱉어요.</p>

      <pre><code>
<span className="cmt">{"// assembly output only"}</span>{"\n"}
<span className="kw">gcc</span> -S -O2 foo.c -o foo.s{"\n"}
{"\n"}
<span className="cmt">{"// tune for a specific ARM core"}</span>{"\n"}
<span className="kw">gcc</span> -S -O2 -mcpu=cortex-a78 foo.c
      </code></pre>

      <h4>예시 — 간단한 C 코드가 어떻게 변환되나</h4>
      <pre><code>
<span className="cmt">{"// C"}</span>{"\n"}
<span className="kw">int</span> add(<span className="kw">int</span> a, <span className="kw">int</span> b) {"{"} <span className="kw">return</span> a + b; {"}"}{"\n"}
{"\n"}
<span className="cmt">{"// → AArch64 assembly (-O2)"}</span>{"\n"}
add:{"\n"}
    <span className="kw">add</span>   w0, w0, w1      <span className="cmt">{"// w0(a) + w1(b) → w0"}</span>{"\n"}
    <span className="kw">ret</span>                   <span className="cmt">{"// return value is in w0"}</span>
      </code></pre>

      <h3>3단계 — 어셈블 (Assemble)</h3>
      <p>어셈블리는 사람이 읽기 위한 표현이고, 실제 CPU는 <b>숫자</b>만 읽습니다.
      이 단계는 "<code>add w0, w0, w1</code>" 같은 명령을 <b><code>0x0B010000</code></b> 같은 4바이트 숫자로 인코딩.</p>
      <pre><code>
<span className="cmt">{"// peek inside the .o file"}</span>{"\n"}
<span className="kw">objdump</span> -d foo.o{"\n"}
{"\n"}
0000000000000000 &lt;add&gt;:{"\n"}
   0:  <span className="num">0b010000</span>    add  w0, w0, w1    <span className="cmt">{"// ← 4-byte machine code"}</span>{"\n"}
   4:  <span className="num">d65f03c0</span>    ret
      </code></pre>

      <h3>4단계 — 링크 (Link)</h3>
      <p><code>.o</code> 파일 하나는 아직 <b>완성품이 아닙니다.</b> 예를 들어 <code>foo.o</code>에서 <code>printf</code>를 부르면,
      "<code>printf 주소에 점프하라</code>"라고 써있지만 <b>그 주소가 비어있어요</b>(재배치 자리).</p>
      <p>링커가 하는 일: 여러 <code>.o</code>와 라이브러리를 모아서 <b>빈 주소들을 실제 주소로 채워 넣음</b>.
      동시에 섹션(.text/.data 등)을 메모리 어디에 둘지도 결정.</p>

      <pre><code>
<span className="cmt">{"// what gcc actually does behind the scenes"}</span>{"\n"}
<span className="kw">gcc</span> foo.c -o app{"\n"}
{"  ="} <span className="kw">cc1</span> foo.i → foo.s       <span className="cmt">{"// compile"}</span>{"\n"}
{"  +"} <span className="kw">as</span>  foo.s → foo.o       <span className="cmt">{"// assemble"}</span>{"\n"}
{"  +"} <span className="kw">ld</span>  foo.o + crt*.o + libc.so → app   <span className="cmt">{"// link"}</span>
      </code></pre>

      <h2>어떤 컴파일러를 쓰나요 <span className="en">/ Which Compiler?</span></h2>
      <p>ARM 타깃 프로그램을 만들 때 주로 쓰는 세 가지 툴체인이 있어요. 기능은 거의 비슷하고, <b>어떤 환경에서 쓰느냐</b>에 따라 선택합니다.</p>

      <div className="table-wrap">
        <table>
          <thead><tr><th>툴체인</th><th>누가 만드나</th><th>주로 쓰이는 곳</th><th>특징</th></tr></thead>
          <tbody>
            <tr><td><b>GCC</b> (Arm GNU Toolchain)</td><td>GNU / Arm</td><td>Linux 커널, 유저 앱, 임베디드 대부분</td><td>무료 오픈소스, 가장 보편적. 배포판 기본값.</td></tr>
            <tr><td><b>Clang / LLVM</b></td><td>LLVM 커뮤니티</td><td>Android, iOS, 서버(Neoverse)</td><td>빠른 빌드, 에러 메시지 친절, 모던 C++.</td></tr>
            <tr><td><b>Arm Compiler 6</b> (<code>armclang</code>)</td><td>Arm 본사</td><td>자동차 · 의료 · Cortex-M 펌웨어</td><td>상용. 인증(MISRA)·안전성 보장이 필요할 때.</td></tr>
          </tbody>
        </table>
      </div>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>재밌는 사실.</b> Arm Compiler 6은 사실 <b>Clang을 기반</b>으로 만들어졌어요. 그래서 <code>armclang</code>과 <code>clang</code>의 기본 동작은 거의 같고, 차이는 링커(<code>armlink</code>)와 전용 라이브러리(microlib 등)에 있습니다.</div>
      </div>

      <h2>자주 쓰는 옵션 <span className="en">/ Common Flags</span></h2>

      <h3>최적화 레벨 — <code>-O</code></h3>
      <p>"얼마나 공격적으로 빠르게 만들까"를 결정. 숫자가 클수록 빠르지만 컴파일이 오래 걸리고 디버깅이 어려워져요.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>옵션</th><th>의미</th><th>언제 쓰나</th></tr></thead>
          <tbody>
            <tr><td><code>-O0</code></td><td>최적화 안 함</td><td>디버깅 중 — 변수가 그대로 보여야 할 때</td></tr>
            <tr><td><code>-O2</code></td><td>생산 빌드 표준</td><td>거의 모든 배포 빌드의 기본값</td></tr>
            <tr><td><code>-O3</code></td><td>더 공격적</td><td>수학·게임 엔진 등 성능이 생명일 때</td></tr>
            <tr><td><code>-Os</code></td><td>코드 크기 최소화</td><td>MCU 펌웨어처럼 Flash가 작을 때</td></tr>
            <tr><td><code>-Og</code></td><td>디버깅 + 약간 최적화</td><td>"-O0은 너무 느리지만 변수는 보고 싶어"</td></tr>
          </tbody>
        </table>
      </div>

      <h3>타깃 지정 — <code>-march</code> vs <code>-mcpu</code></h3>
      <div className="grid2">
        <div className="card">
          <h4><code>-march=armv8.2-a</code></h4>
          <p>"이 <b>명령어 집합</b>까지 쓸 수 있다고 가정해" — 최소 요구사항만 정함. 여러 CPU에서 다 돌아야 할 때.</p>
        </div>
        <div className="card">
          <h4><code>-mcpu=cortex-a78</code></h4>
          <p>"정확히 <b>이 코어</b>용이야" — 명령어 집합 + 스케줄링까지 최적화. 해당 코어에서 가장 빠르지만 다른 코어에선 덜 최적.</p>
        </div>
        <div className="card">
          <h4>확장 기능 켜기</h4>
          <p><code>-march=armv8-a+crypto+sve</code>처럼 <code>+</code>로 덧붙여 <b>선택적 명령</b>을 허용. 주요 확장:
          <code>+crypto</code>(AES/SHA), <code>+sve</code>(벡터), <code>+lse</code>(원자 연산), <code>+fp16</code>(반정밀도).</p>
        </div>
        <div className="card">
          <h4>디버그 심볼 — <code>-g</code></h4>
          <p>DWARF 형식의 <b>디버그 정보</b>를 바이너리에 심음. 변수 이름, 타입, 소스 라인 매핑. gdb가 이걸 읽고 "이 주소는 main.c의 42번 줄"이라고 알려줌.</p>
        </div>
      </div>

      <h2>크로스 컴파일이 뭔가요 <span className="en">/ Cross Compilation</span></h2>
      <p>개발 PC는 x86-64(인텔/AMD)인데, 만들고 싶은 건 ARM 바이너리 — 이런 상황이 정말 많아요(라즈베리파이, 스마트폰, 임베디드 보드 등).
      이때 <b>x86-64 PC에서 ARM용 바이너리를 만드는 것</b>을 크로스 컴파일이라고 합니다.</p>

      <p>해결법은 간단: <b>ARM 전용 툴체인</b>을 설치해서 씁니다. 이름에 타깃이 박혀 있어요.</p>

      <pre><code>
<span className="cmt">{"// install on Ubuntu/Debian"}</span>{"\n"}
sudo apt install gcc-aarch64-linux-gnu{"\n"}
{"\n"}
<span className="cmt">{"// usage"}</span>{"\n"}
aarch64-linux-gnu-gcc hello.c -o hello{"\n"}
<span className="cmt">{"// ↑ this binary won't run on an x86 PC — copy it to an ARM device to execute"}</span>{"\n"}
{"\n"}
<span className="kw">file</span> hello{"\n"}
hello: ELF 64-bit LSB executable, <span className="kw">ARM aarch64</span>, ...   <span className="cmt">{"// check it!"}</span>
      </code></pre>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>QEMU로 실행해보기.</b> <code>qemu-aarch64 ./hello</code> 하면 x86 PC에서도 ARM 바이너리를 에뮬레이션으로 돌려볼 수 있어요. 실제 보드 없이 테스트할 때 편리합니다.</div>
      </div>

      <h2>실전 — 실제로 해보는 예시 <span className="en">/ Try It</span></h2>

      <h3>단계별로 멈춰가며 보기</h3>
      <pre><code>
<span className="cmt">{"// stage 1 only"}</span>{"\n"}
gcc -E hello.c -o hello.i    <span className="cmt">{"// preprocessed"}</span>{"\n"}
{"\n"}
<span className="cmt">{"// up to stage 2"}</span>{"\n"}
gcc -S hello.c -o hello.s    <span className="cmt">{"// assembly"}</span>{"\n"}
{"\n"}
<span className="cmt">{"// up to stage 3"}</span>{"\n"}
gcc -c hello.c -o hello.o    <span className="cmt">{"// object file"}</span>{"\n"}
{"\n"}
<span className="cmt">{"// all the way"}</span>{"\n"}
gcc hello.c -o hello         <span className="cmt">{"// executable"}</span>
      </code></pre>

      <h3>결과물을 들여다보기</h3>
      <pre><code>
<span className="kw">objdump</span> -d hello           <span className="cmt">{"// machine code → assembly (disassemble)"}</span>{"\n"}
<span className="kw">nm</span> hello                   <span className="cmt">{"// list symbols in the binary"}</span>{"\n"}
<span className="kw">readelf</span> -h hello          <span className="cmt">{"// ELF header (target CPU, entry address, etc.)"}</span>{"\n"}
<span className="kw">size</span> hello                 <span className="cmt">{"// size of .text/.data/.bss"}</span>{"\n"}
<span className="kw">ldd</span> hello                  <span className="cmt">{"// shared library dependencies"}</span>
      </code></pre>

      <h2>자주 만나는 상황 <span className="en">/ FAQ</span></h2>
      <div className="grid2">
        <div className="card">
          <h4>"undefined reference to `foo'"</h4>
          <p>링커 에러. <code>foo</code> 함수를 <b>선언만 하고 정의가 어디에도 없음</b>. 해당 <code>.c</code>를 빌드에 포함했는지, 라이브러리(<code>-lm</code> 같은)를 걸었는지 확인.</p>
        </div>
        <div className="card">
          <h4>"-O0은 되는데 -O2가 깨져요"</h4>
          <p>대부분 C의 <b>Undefined Behavior</b>(초기화 안 한 변수, 배열 밖 접근 등). 컴파일러가 "이건 일어나지 않는다"고 가정하고 날려버림. <code>-fsanitize=undefined</code>로 검사.</p>
        </div>
        <div className="card">
          <h4>"이건 x86에선 되는데 ARM에선 왜..."</h4>
          <p>정렬(<code>-Wcast-align</code>), 엔디안, <code>char</code>의 signed/unsigned 기본값, 정수 오버플로 동작 등이 아키텍처마다 다름. C 표준이 "구현 정의"로 둔 부분.</p>
        </div>
        <div className="card">
          <h4>"빌드는 되는데 기기에서 안 돌아요"</h4>
          <p>CPU 기능이 부족. <code>-mcpu</code>를 너무 높게 잡으면 오래된 기기가 모르는 명령이 나옴. <code>-march=armv8-a</code>처럼 하한선을 낮추거나 실제 타깃에 맞춰 조정.</p>
        </div>
      </div>

      <div className="callout warn">
        <span className="icon">⚠</span>
        <div><b>핵심 한 줄.</b> 컴파일은 "C → 어셈블리 → 기계어 → 합치기" 4단계. 어느 단계든 문제가 생기면, 그 단계 결과물을 직접 열어 확인하는 게 디버깅의 기본기.</div>
      </div>
    </>
  )
}
