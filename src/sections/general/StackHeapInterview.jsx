export default function StackHeapInterview() {
  return (
    <>
      <h2>Stack vs Heap — the core difference</h2>
      <p>Both live in the same virtual address space, but they're managed differently. The <b>stack</b> grows and shrinks automatically with function calls — the CPU just moves SP, so allocation is one cycle. Each thread has its own stack, typically 8 MB. Sizes are known at compile time. The <b>heap</b> is allocated explicitly with <code>malloc</code> and freed with <code>free</code>. It's shared across the whole process, can grow to gigabytes, and goes through an allocator that searches free lists and may take tens to hundreds of cycles. The rule of thumb: <b>use the stack by default</b>, and reach for the heap when you need a runtime-determined size, a lifetime longer than the function, or shared access across threads.</p>

      <h4>Side-by-side</h4>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Aspect</th><th>Stack</th><th>Heap</th></tr></thead>
          <tbody>
            <tr><td>Allocation cost</td><td>SP decrement — ~1 cycle</td><td>Allocator path — tens to hundreds of cycles</td></tr>
            <tr><td>Deallocation</td><td>Automatic on return (LIFO)</td><td>Explicit <code>free</code> or GC</td></tr>
            <tr><td>Size limit</td><td>~8 MB per thread</td><td>Whole virtual address space (TBs)</td></tr>
            <tr><td>Lifetime</td><td>Function scope</td><td>Until explicitly freed</td></tr>
            <tr><td>Thread safety</td><td>Per-thread, no sharing</td><td>Shared — needs locks / arenas</td></tr>
            <tr><td>Cache locality</td><td>Very high (hot SP region)</td><td>Lower (arbitrary placement)</td></tr>
            <tr><td>Fragmentation</td><td>None</td><td>Internal + external</td></tr>
          </tbody>
        </table>
      </div>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>Why stack allocation is so much faster.</b> It's just <code>sub sp, sp, #N</code> — no metadata, no free list, no lock. The heap allocator has to find a free block of the right size, possibly split it, possibly take a per-arena lock, and possibly call <code>brk</code>/<code>mmap</code> if the arena is empty.</div>
      </div>

      <h2>When to use which</h2>
      <p><b>Default to the stack.</b> Reach for the heap when any one of these is true:</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Condition</th><th>Why stack fails</th><th>Typical example</th></tr></thead>
          <tbody>
            <tr><td>Size known only at runtime</td><td>Stack frame size must be a compile-time constant (VLAs aside)</td><td>Buffer sized by user input or file length</td></tr>
            <tr><td>Lifetime outlives the function</td><td>The frame is reclaimed on return — pointers dangle</td><td>Return a node, register a callback, build a data structure</td></tr>
            <tr><td>Large (more than a few KB)</td><td>Thread stacks are typically 8 MB and have a guard page — overflow → SIGSEGV</td><td>Image/video buffers, big lookup tables</td></tr>
            <tr><td>Shared across threads</td><td>Each thread has its own stack — no other thread can address yours</td><td>Producer–consumer queues, shared caches, work-stealing pools</td></tr>
          </tbody>
        </table>
      </div>

      <h4>The pattern in practice</h4>
      <pre><code>
<span className="kw">void</span> foo(<span className="kw">int</span> n) {"{"}{"\n"}
{"    "}<span className="kw">int</span> x;                       <span className="cmt">{"// stack — fixed size, scope-local"}</span>{"\n"}
{"    "}<span className="kw">char</span> buf[<span className="num">256</span>];               <span className="cmt">{"// stack — small, short-lived"}</span>{"\n"}
{"    "}<span className="kw">int</span> big[<span className="num">1000000</span>];            <span className="cmt">{"// ✗ ~4 MB on stack — overflow risk"}</span>{"\n"}
{"                                "}<span className="cmt">{"//   move to heap or make static"}</span>{"\n\n"}
{"    "}<span className="kw">int</span> *p = malloc(n * <span className="kw">sizeof</span>(<span className="kw">int</span>));  <span className="cmt">{"// heap — size known only at runtime"}</span>{"\n"}
{"    "}Node *node = make_node();   <span className="cmt">{"// heap — must survive after return"}</span>{"\n\n"}
{"    "}std::vector&lt;<span className="kw">int</span>&gt; v(n);         <span className="cmt">{"// hybrid: handle on stack, elements on heap"}</span>{"\n"}
{"}"}{"\n\n"}
Node *create() {"{"}{"\n"}
{"    "}Node n;                     <span className="cmt">{"// ✗ stack — disappears at return"}</span>{"\n"}
{"    "}<span className="kw">return</span> &amp;n;                  <span className="cmt">{"//   caller gets a dangling pointer"}</span>{"\n\n"}
{"    "}<span className="kw">return</span> malloc(<span className="kw">sizeof</span>(Node)); <span className="cmt">{"// ✓ heap — caller takes ownership and frees"}</span>{"\n"}
{"}"}
      </code></pre>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>One-line decision rule.</b> "Does anyone need to see this data after the function returns?" — yes ⇒ heap. No, and the size is a compile-time constant and small ⇒ stack. Everything else (large or runtime-sized or shared) ⇒ heap.</div>
      </div>

      <h2>Where each variable lives</h2>
      <p>Walk through the code line by line.</p>
      <pre><code>
<span className="kw">int</span> g       = <span className="num">42</span>;        <span className="cmt">{"// .data    (RW, initialized)"}</span>{"\n"}
<span className="kw">int</span> g0;                 <span className="cmt">{"// .bss     (RW, zero-init, no disk space)"}</span>{"\n"}
<span className="kw">const int</span> c = <span className="num">7</span>;         <span className="cmt">{"// .rodata  (R only)"}</span>{"\n"}
<span className="kw">static int</span> s;            <span className="cmt">{"// .bss     (file scope only, but storage is global)"}</span>{"\n\n"}
<span className="kw">void</span> foo(<span className="kw">int</span> x) {"{"}{"\n"}
{"    "}<span className="kw">int</span> local = <span className="num">1</span>;       <span className="cmt">{"// stack"}</span>{"\n"}
{"    "}<span className="kw">int</span> arr[<span className="num">100</span>];        <span className="cmt">{"// stack (400 bytes in this frame)"}</span>{"\n"}
{"    "}<span className="kw">int</span> *q = malloc(<span className="num">8</span>); <span className="cmt">{"// q is on the stack; *q is on the heap"}</span>{"\n"}
{"    "}<span className="kw">char</span> *p = <span className="str">"hello"</span>;   <span className="cmt">{"// p is on the stack; \"hello\" is in .rodata"}</span>{"\n"}
{"    "}<span className="kw">char</span> a[] = <span className="str">"hello"</span>;   <span className="cmt">{"// the whole array is copied onto the stack"}</span>{"\n"}
{"    "}<span className="kw">static int</span> once;     <span className="cmt">{"// .bss — block scope, but storage is global"}</span>{"\n"}
{"}"}
      </code></pre>

      <h4>The Trap Question</h4>
      <pre><code>
<span className="kw">char</span> *p = <span className="str">"hi"</span>;{"\n"}
p[<span className="num">0</span>] = <span className="str">'H'</span>;        <span className="cmt">{"// compiles, but SIGSEGV at runtime — .rodata is read-only"}</span>{"\n\n"}
<span className="kw">char</span> a[] = <span className="str">"hi"</span>;{"\n"}
a[<span className="num">0</span>] = <span className="str">'H'</span>;        <span className="cmt">{"// fine — a is a stack array initialized from the literal"}</span>
      </code></pre>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>Why so many sections?</b> Because the OS enforces permissions per-region via the MMU: <code>.text</code> is <b>R-X</b> (no write — blocks shellcode injection), <code>.rodata</code> is <b>R--</b> (catches accidental writes to literals), <code>.bss</code> takes <b>zero disk space</b> (the file just records the size; the kernel maps zero pages on first touch).</div>
      </div>

      <h2>Inside malloc</h2>
      <p>The kernel only hands out <b>whole pages</b> via <code>brk</code> (extending the data segment) or <code>mmap</code> (anonymous pages anywhere). User code wants byte-granularity allocation, so the C library sits in between as an <b>allocator</b>. For small requests it pulls from per-thread caches and size-class bins; for large requests (typically &gt; 128 KB) it calls <code>mmap</code> directly and returns those pages on <code>free</code> via <code>munmap</code>. Critically, <code>malloc(1GB)</code> doesn't actually consume 1 GB of physical memory — only the virtual mapping is reserved. Physical pages are allocated lazily on first touch, by page fault.</p>

      <h4>The allocator path (glibc ptmalloc2)</h4>
      <div className="diagram">{`  malloc(N) request
        |
        v
  +-----------------+
  | tcache (per-thread, lock-free, ~64 entries) |  ← hit: instant return
  +-----------------+
        | miss
        v
  +-----------------+
  | fastbin (LIFO, no coalescing)               |
  +-----------------+
        | miss
        v
  +-----------------+
  | small / large bins (size-class buckets)     |
  +-----------------+
        | miss
        v
  +-----------------+
  | unsorted bin (recently freed, scanned linearly) |
  +-----------------+
        | miss
        v
  +-----------------+
  | top chunk — extend via brk() or mmap()      |  ← syscall, page fault on first touch
  +-----------------+`}</div>

      <h4>Key details</h4>
      <div className="grid2">
        <div className="card">
          <h4>brk vs mmap</h4>
          <p><code>brk</code> moves a single contiguous boundary — cheap, but memory only returns to the OS when the <i>topmost</i> chunk is freed. <code>mmap</code> gives independent regions and can be returned at any time. glibc switches at <code>M_MMAP_THRESHOLD</code> (default 128 KB).</p>
        </div>
        <div className="card">
          <h4>Multiple arenas</h4>
          <p>To reduce lock contention, glibc creates up to <code>8 × CPU_count</code> arenas, each with its own bins and lock. Threads pick arenas adaptively. Only the main arena uses <code>brk</code>; the rest use <code>mmap</code>.</p>
        </div>
        <div className="card">
          <h4>Demand paging</h4>
          <p>A successful <code>malloc</code> is just bookkeeping — the kernel hasn't touched physical RAM yet. The first store into the buffer triggers a <b>minor page fault</b>; the kernel allocates a physical frame (often a zero page) and updates the page table.</p>
        </div>
        <div className="card">
          <h4>Why free doesn't shrink RSS</h4>
          <p>Freed chunks normally go back to the allocator's bins, not to the OS. <code>brk</code>-backed memory only returns to the OS when the top of the heap is freed. <code>mmap</code>-backed allocations <i>do</i> return immediately via <code>munmap</code>.</p>
        </div>
      </div>

      <div className="callout">
        <span className="icon">💡</span>
        <div><b>Thread safety.</b> glibc, jemalloc, and tcmalloc are all thread-safe — concurrent <code>malloc</code>/<code>free</code> calls from different threads are safe. That does <b>not</b> mean two threads can use the same pointer concurrently. Under heavy contention even thread-safe allocators can become a bottleneck — jemalloc/tcmalloc beat glibc here with larger per-thread caches.</div>
      </div>

      <h2>The function call</h2>
      <p>On entry, the function executes a <b>prologue</b> that pushes the previous frame pointer and link register onto the stack and adjusts SP downward to reserve space for locals. The frame pointer is set to the new frame's base, forming a chain that debuggers walk for backtraces. Arguments arrive in registers (X0–X7 on AArch64, RDI–R9 on x86-64) — only the spillover goes on the stack. On return, the <b>epilogue</b> reverses everything: locals are reclaimed by moving SP back up, FP and LR are popped, and <code>ret</code> jumps to the saved LR.</p>

      <h4>AArch64 prologue / epilogue</h4>
      <pre><code>
foo:{"\n"}
  <span className="kw">stp</span>   x29, x30, [sp, <span className="num">#-32</span>]!   <span className="cmt">{"// push FP+LR pair, pre-decrement SP by 32"}</span>{"\n"}
  <span className="kw">mov</span>   x29, sp                  <span className="cmt">{"// FP = SP — new frame base"}</span>{"\n"}
  <span className="kw">stp</span>   x19, x20, [sp, <span className="num">#16</span>]     <span className="cmt">{"// save callee-saved regs we'll use"}</span>{"\n"}
  <span className="cmt">{"// ... function body — locals at [sp, #...] ..."}</span>{"\n"}
  <span className="kw">ldp</span>   x19, x20, [sp, <span className="num">#16</span>]{"\n"}
  <span className="kw">ldp</span>   x29, x30, [sp], <span className="num">#32</span>     <span className="cmt">{"// pop FP+LR, post-increment SP"}</span>{"\n"}
  <span className="kw">ret</span>                            <span className="cmt">{"// branch to LR"}</span>
      </code></pre>

      <h4>Frame layout (AArch64, growing down)</h4>
      <div className="diagram">{` high address
   +-----------------------+
   |  caller's frame       |
   +-----------------------+
   |  saved LR  (x30)      |  ← return address
   |  saved FP  (x29)      |  ← previous FP — frame chain link
   +-----------------------+  ← current FP (x29)
   |  saved x19 .. x28     |  ← callee-saved registers used
   |  local variables      |
   |  outgoing stack args  |
   +-----------------------+  ← current SP (16-byte aligned)
            v
 low address`}</div>

      <h4>Key details</h4>
      <div className="grid2">
        <div className="card">
          <h4>Calling convention (AAPCS64)</h4>
          <p>Args in <code>X0–X7</code>, return in <code>X0</code> (or <code>X0/X1</code> for 128-bit). Caller-saved: <code>X0–X18</code>. Callee-saved: <code>X19–X28</code>. <code>SP</code> must stay 16-byte aligned at all public entry points.</p>
        </div>
        <div className="card">
          <h4>FP / LR pair</h4>
          <p><code>X29</code> (FP) and <code>X30</code> (LR) are stored together as a pair so <code>STP</code>/<code>LDP</code> can save both in one instruction. The chain of saved FPs is what <code>gdb bt</code> walks.</p>
        </div>
        <div className="card">
          <h4>Stack guard page</h4>
          <p>A <code>PROT_NONE</code> page sits at the bottom of every thread's stack. A runaway recursion or huge VLA touches it and the CPU raises a fault → <code>SIGSEGV</code>. That's how stack overflow is detected.</p>
        </div>
        <div className="card">
          <h4>Stack canary (<code>-fstack-protector</code>)</h4>
          <p>The compiler inserts a random value just before the saved LR and checks it in the epilogue. A buffer overflow that overwrites LR also overwrites the canary, so the check fails and the program aborts via <code>__stack_chk_fail</code>.</p>
        </div>
        <div className="card">
          <h4>PAC — pointer authentication (ARMv8.3)</h4>
          <p><code>PACIASP</code> in the prologue signs LR using SP as a modifier; <code>RETAA</code> verifies the signature on return. An attacker who overwrites LR can't forge a valid signature, so ROP chains break. Apple silicon and recent Android builds use this by default.</p>
        </div>
        <div className="card">
          <h4>Tail call optimization</h4>
          <p>If the last action of a function is <code>return f(...)</code>, the compiler can replace the <code>BL</code> with a plain <code>B</code> after restoring the frame. The callee's <code>ret</code> then jumps directly to the original caller — one stack frame saved.</p>
        </div>
      </div>

      <div className="callout warn">
        <span className="icon">⚠</span>
        <div><b>Returning the address of a local variable is undefined behavior.</b> The frame is reclaimed when the function returns (SP moves back up), so the next function call will overwrite the same region. The dangling pointer may appear to work briefly, then corrupt silently. <code>-Wreturn-local-addr</code> catches the obvious cases at compile time.</div>
      </div>

      <h2>MESI and MOESI</h2>
      <p>Every modern multicore CPU runs a <b>cache coherence protocol</b> so that a write on one core is eventually visible to every other core. Each cache line carries a few state bits, and bus or interconnect messages drive the state machine. MESI is the textbook baseline; MOESI adds one extra state to avoid an unnecessary writeback. Intel uses MESIF (with a Forward state instead of Owned); ARM CHI and AMD use MOESI variants.</p>

      <h4>The four MESI states</h4>
      <div className="table-wrap">
        <table>
          <thead><tr><th>State</th><th>Clean / Dirty</th><th>Exclusive?</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td><b>M</b>odified</td><td>Dirty</td><td>Yes (sole copy)</td><td>This cache has the only up-to-date copy. Memory is stale. Must writeback before evict.</td></tr>
            <tr><td><b>E</b>xclusive</td><td>Clean</td><td>Yes (sole copy)</td><td>Same value as memory, no one else has it. Can be silently upgraded to M on write.</td></tr>
            <tr><td><b>S</b>hared</td><td>Clean</td><td>No (others may have it)</td><td>Same value as memory and as other caches. Read-only without invalidating others first.</td></tr>
            <tr><td><b>I</b>nvalid</td><td>—</td><td>—</td><td>Not present (or stale). Any access is a miss.</td></tr>
          </tbody>
        </table>
      </div>

      <h4>Key transitions and their cost</h4>
      <div className="grid2">
        <div className="card">
          <h4>I → E (read miss, no sharers)</h4>
          <p>Load a line nobody else has. Fetched from memory or LLC. Cheap subsequent writes since E → M is silent (no bus traffic).</p>
        </div>
        <div className="card">
          <h4>I → S (read miss, sharers exist)</h4>
          <p>Snoop tells us another cache has it. Get a clean copy; both caches are now S.</p>
        </div>
        <div className="card">
          <h4>S → M / E → M (write hit)</h4>
          <p>If S, must broadcast <b>invalidate</b> so others go to I — this is <b>RFO</b> (read-for-ownership) and is what writes to shared data really pay. If E, the transition is silent — no bus traffic at all.</p>
        </div>
        <div className="card">
          <h4>M → S (another core reads our dirty line)</h4>
          <p><b>The expensive case in MESI.</b> The dirty line must be written back to memory so both caches can hold a clean S copy. This is exactly the writeback that MOESI avoids.</p>
        </div>
      </div>

      <h4>What MOESI's Owned state adds</h4>
      <p>In MESI, when a core holding M is asked to share, it has to writeback to memory before transitioning to S. MOESI adds an <b>O</b> (Owned) state: <b>dirty but shared</b>. The owner keeps the line dirty (no writeback yet), other caches get S copies, and the owner promises to write the line back when it eventually evicts the line. The savings: every M → shared transition skips a memory write, which matters a lot for producer-consumer patterns where the consumer reads but doesn't write.</p>

      <div className="diagram">{` MESI:    M ────read by other────► S      (forced writeback to memory)

 MOESI:   M ────read by other────► O      (no writeback; owner stays dirty)
                                  │
                                  └────► S in other caches

          O ────evicted──────────► I      (writeback happens here, lazily)`}</div>

      <h4>Why this matters in real code</h4>
      <div className="grid2">
        <div className="card">
          <h4>False sharing — the canonical pathology</h4>
          <p>Two cores write to different variables that happen to share a 64-byte line. Each write forces an RFO that drives the other core's line to I. The line ping-pongs in M between the two caches at full coherence speed, and both threads stall waiting for ownership. Fix: <code>alignas(64)</code> or padding so the variables sit on separate lines.</p>
        </div>
        <div className="card">
          <h4>RFO is the real cost of writes</h4>
          <p>A write to a line that other caches hold (state S in this cache) issues an invalidate to every sharer and waits. On a many-core CPU, "atomic increment of a global counter" can take hundreds of cycles not because the increment is hard, but because every other core must move that line to I.</p>
        </div>
        <div className="card">
          <h4>Producer–consumer wins under MOESI</h4>
          <p>One core writes, another reads. Under MESI, every read by the consumer drains the producer's M state to S via writeback. Under MOESI, M → O keeps the line dirty in the producer; only when the producer is finally evicted does the line go back to memory. Half the memory traffic.</p>
        </div>
        <div className="card">
          <h4>Atomic operations live in this state machine</h4>
          <p>An atomic <code>compare-and-swap</code> needs the line in M. If it's currently S anywhere else, an invalidate has to fire first — that's why uncontended atomics are cheap (E → M, silent) but contended atomics on the same line are dramatically slower.</p>
        </div>
      </div>

      <h2>Cheat Sheet</h2>
      <div className="callout">
        <span className="icon">📌</span>
        <div>
          <ul style={{margin: 0, paddingLeft: 18}}>
            <li><b>Stack = automatic, fast (1 cycle), per-thread, fixed size.</b> Heap = explicit, slow (allocator path), shared, virtually unlimited.</li>
            <li><b>Variable placement:</b> globals → <code>.data</code>/<code>.bss</code>, constants → <code>.rodata</code>, locals → stack, <code>malloc</code> → heap. <code>static</code> locals live in <code>.bss</code> despite block scope.</li>
            <li><b>malloc internals:</b> tcache → fastbin → small/large bins → unsorted → top chunk (<code>brk</code>/<code>mmap</code>). Multiple arenas to reduce lock contention. Physical RAM is allocated lazily on page fault.</li>
            <li><b>Function call:</b> prologue saves FP+LR with <code>STP</code>, sets new FP, reserves locals; epilogue reverses with <code>LDP</code> and <code>RET</code>. SP stays 16-byte aligned.</li>
            <li><b>Protections:</b> guard page (overflow → SIGSEGV), canary (LR overwrite detection), PAC (LR signing), ASLR (random base), W^X (no execute on stack).</li>
            <li><b>Coherence:</b> MESI = M/E/S/I; writes to shared lines pay an RFO. MOESI adds <b>O</b> (dirty + shared) so M → shared skips a writeback. False sharing ping-pongs a line in M between cores — fix with 64-byte alignment.</li>
          </ul>
        </div>
      </div>
    </>
  )
}
