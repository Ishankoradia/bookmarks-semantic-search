# C Roadmap — learning C by rewriting the bookmarks backend

**Outcome being optimised for: my fluency in C and in manual memory management.**
A working C backend is the *vehicle*, not the goal. If a choice trades speed-of-
delivery for depth-of-understanding, take depth.

Companion files: `BUGS.md` (the lab notebook — the real deliverable of all this)
and `CLAUDE.md` (the teaching contract Claude is held to).

## Status

| | |
| --- | --- |
| **Current phase** | Phase 0 — Toolchain and the mental model |
| **Started** | 2026-10-17 |
| **Target: first C-served production endpoint** | ~April 2027 (Phase 6 exit) |
| **Budget** | 15-20 hrs/week |

Realistic end-to-end: **~6 months** to the first production endpoint served by
C, **~9-12 months** to a full replacement. Shorter is a sign I skipped the drills.

## Standing decisions

- **Permitted external deps: libpq, OpenSSL, pthreads, libc. Nothing else.**
  HTTP server and parser, JSON, hash maps, strings, allocators, router and
  scheduler are all hand-written. If this starts feeling unbearable, the answer
  is to cut features from the rewrite, not to relax this.
- **Exercise-drilled.** Concepts get drilled in isolation before they get used
  in anger. When I fall behind, cut scope from the *rewrite*, never the *drills*.
  Shipping less C backend is fine. Learning less C is not.
- **Production stays on Python** until a C endpoint has run 24h under synthetic
  load with flat RSS. Strangler pattern behind the existing nginx, one route at
  a time. There is no cutover day.
- **Migrations stay in Alembic.** Not being rewritten, not negotiable.
- **macOS for dev, Linux/EC2 for prod.** kqueue locally, epoll in prod — so the
  event loop gets an abstraction layer, and I build and test on Linux (container)
  from Phase 4 onward rather than discovering the gap in Phase 7.
- **Phase 7 step 6 (scraper, RSS, OpenAI client) is an off-ramp, not a finish
  line.** Reaching it with the judgement to leave those in Python counts as
  completing this project.

## How we work

**Four commands.** I never have to remember where we were — `STATE.md` holds it.

| | |
| --- | --- |
| `/teach` | Start or resume. Recaps last session, quizzes me cold on old material, then teaches the next concept. |
| `/bug` | Something surprised me. Interviews me for the four fields and appends to `BUGS.md`. 90 seconds. |
| `/review` | I've written something. Bugs reported by category and location, never the fix. |
| `/stuck` | 30+ min of banging on it. The hint ladder, one rung at a time. |
| `/wrap` | End of session. Saves state, updates the recall queue and bug tally, logs the line. |

`STATE.md` is the single source of truth for position, last-session recap, open
threads and the recall queue. `/wrap` is the only thing that writes it — so if I
skip `/wrap`, the next session starts blind. It's the one ritual not to drop.

**The 30-minute rule.** No asking for help until genuinely stuck for 30 minutes
*and* I've written down what I think is happening. Articulating the wrong theory
is where most of the learning is; being handed the right one skips it.

**Rhythm beats volume.** Five 3-hour evenings beats one 15-hour Saturday.
Pointer bugs are found by a rested brain. Roughly: 2 hrs reading + Socratic
intake, 10 hrs building alone, 2 hrs review, 2 hrs consolidation (BUGS.md
entries, ownership comments in headers, tests topped up).

**Claude never writes my code.** Not snippets, not "just the tricky bit", not a
skeleton to fill in — not even when I ask in a moment of weakness. Full contract
and the escalation ladder in `CLAUDE.md`.

## Gates

A phase closes only when its exit test passes **clean under
`-fsanitize=address,undefined`, zero leaks.** No partial credit, no "I'll come
back to it". Claude refuses to open the next phase otherwise.

At each phase close, 5 minutes in the session log: what I can do now that I
couldn't before; my `BUGS.md` category tally for the phase; one thing I still
don't really understand, carried forward.

**Monthly** (first of the month, 30 min): reread `BUGS.md`, tally categories,
check the mix is shifting from mechanical (leak, off-by-one) toward structural
(ownership-ambiguity, lifetime-design) — that shift is the actual measure of
progress. Then re-derive one thing cold from memory: the process address space,
or exactly what `realloc` guarantees. If I can't, that's next month's intake.

---

# Phase 0 — Toolchain and the mental model (week 1)

**Learn:** translation units, the preprocessor, compiling vs linking, why C has
no modules, header/implementation split, include guards, the ODR in practice.

**Build:** a multi-file project skeleton with a hand-written `Makefile`
(not CMake — I want to understand the build). Targets: `build`, `test`, `asan`,
`clean`. Standard flags:

```
-std=c11 -Wall -Wextra -Werror -Wshadow -Wconversion -g -O0
-fsanitize=address,undefined -fno-omit-frame-pointer
```

**Tools to be fluent in:** `clang`, `make`, `lldb` (breakpoints, `bt`, `frame
variable`, watchpoints), ASan/UBSan output format, `nm`, `otool -L`, `leaks`.
(Valgrind is unreliable on Apple Silicon — ASan is the daily driver; keep
Valgrind for the Linux/EC2 side later.)

**Exit test:** I can explain, without notes, what happens between `clang a.c b.c`
and a binary existing, and I can read an ASan report and name the bug class from
it alone.

---

# Phase 1 — Core language, drilled (weeks 2-4)

**Learn:** integer types and promotion, signed overflow is UB vs unsigned wrap,
`sizeof`/alignment/padding, arrays vs pointers and array decay, pointer
arithmetic, NUL-terminated strings, struct layout, unions, enums, function
pointers, `const` correctness, storage duration (automatic / static / allocated),
`static` at file scope vs block scope, variadic functions.

**Drills (write every one from scratch, no libc):** `strlen`, `strcpy`,
`strncpy` (and explain why its semantics are a trap), `strcmp`, `memcpy`,
`memmove` (overlap!), `strdup`, in-place string reverse, word tokeniser without
`strtok`, `atoi`, a bitset, generic `swap`, generic bubble-sort over `void*` with
a comparator, a 2D matrix with one allocation vs array-of-pointers, a struct
whose padding I predict *before* printing `sizeof`.

**Exit test:** given any of my drills, I can state for each pointer: what it
points at, who owns that memory, and when it dies.

---

# Phase 2 — Memory, the heart of it (weeks 5-8) ★ the most important phase

**Learn:** the process address space (text/rodata/data/bss/heap/stack — draw it
from memory); `malloc`/`calloc`/`realloc`/`free` exact semantics; `realloc`
invalidating every pointer into the block; allocation failure handling; the
error-path leak (the single most common real-world C leak); ownership discipline
and naming conventions (`_create`/`_destroy`, borrowed vs owned parameters,
documented in every header); dangling pointers to dead stack frames; fragmentation;
alignment; strict aliasing; `restrict`.

**Build, in order:**
1. `vec` — a growable array. Learn amortised growth and pointer invalidation.
2. `arena` — a bump allocator over a big `malloc`/`mmap` block, free-all-at-once.
   This will change how I think about memory for the rest of the project.
3. `str` — a length-prefixed string + string builder on top of the arena.
4. A ref-counted buffer; then write down why refcounting is usually the wrong
   answer for a request-scoped server.
5. **My own `malloc`** over `mmap`: free list, splitting, coalescing, alignment.
   Then benchmark it against system malloc and be humbled.

**Exit test:** a 500-line program using all five, running a randomised stress
workload for 60s, ASan+UBSan clean, zero leaks, and an `ownership` comment on
every public function in every header.

---

# Phase 3 — Data structures I'll actually need (weeks 9-11)

**Build `libcore`,** a static library, each with unit tests:
hash map (open addressing, FNV-1a, tombstones, resize), dynamic string map,
singly/doubly linked list (and a written note on when it beats `vec`: rarely),
ring buffer, binary min-heap (this becomes the job scheduler's timer queue),
tagged union (`core_value`) that will later back JSON.

**Memory themes:** who owns keys vs values in a map; interning strings into an
arena; the cost of pointer-chasing; cache lines and why `vec` usually wins.

**Exit test:** `libcore` has >80% line coverage from my own hand-written test
runner (I write the runner too), and the whole suite is sanitizer-clean.

---

# Phase 4 — The OS boundary (weeks 12-14)

**Learn:** `errno` discipline, syscalls vs libc wrappers, partial `read`/`write`
loops, `EINTR`, file descriptors and their lifetimes (an fd is memory too),
`fork`/`exec`, signals and async-signal-safety, **`SIGPIPE`** (every C server
author gets killed by this once), sockets, blocking vs non-blocking, `EAGAIN`,
`select` → `poll` → `kqueue` (macOS dev) / `epoll` (Linux prod), pthreads,
mutex/condvar, atomics, a thread pool, and the basics of the memory model.

**Build:** TCP echo server, three times —
(a) blocking, one connection at a time;
(b) thread-per-connection with a bounded pool;
(c) single-threaded event loop on kqueue.
Then write down which one this product should use, and why.

**Exit test:** (c) survives 10k connections from a load generator without leaking
fds or memory.

---

# Phase 5 — Protocols, hand-rolled (weeks 15-19)

**`libhttp`:** HTTP/1.1 request parser — request line, headers, `Content-Length`,
chunked transfer-encoding, keep-alive, pipelining. Design decision to make
deliberately: **zero-copy slices into the read buffer vs. copying strings out.**
Argue it in writing, then implement the one I chose. Response writer. Router with
path params (`/bookmarks/:id`) over my hash map.

**`libjson`:** parser + serialiser, arena-allocated, built on `core_value`.
Must not leak on *any* malformed input — that's the whole exercise.

**Fuzzing starts here:** libFuzzer harnesses for both parsers, corpus committed
to the repo. Fuzzing is where C stops being theoretical. Expect a bad week.

**Exit test:** 1M fuzz iterations on each parser, zero crashes, zero leaks.
Correctness checked against a small suite of real captured requests.

---

# Phase 6 — Persistence and the outside world (weeks 20-23)

**Learn:** `libpq` — connection lifecycle, `PQexecParams` (never string
concatenation), **result ownership and `PQclear`**, binary vs text params,
`pgvector` values over the wire. Then a connection pool I write myself on the
Phase 4 primitives. OpenSSL as a TLS *client* for outbound calls: contexts,
cert verification (do not skip it), BIO lifetimes.

Also: config/env loading, a structured logger, and an error type that carries
context without leaking on the way up.

**Exit test:** `GET /bookmarks` (list, paginated, auth'd) served from C against
the real database, benchmarked against the FastAPI version, running 24h under a
synthetic load with flat RSS.

---

# Phase 7 — Strangler rewrite, endpoint by endpoint (months 6+)

Run C and FastAPI side by side behind the existing nginx; move one route at a
time. Alembic stays Python — migrations are not being rewritten.

Port order (easiest/highest-value first, each with load + leak verification):
1. Read-only bookmark/category endpoints.
2. Auth — JWT verification (HMAC-SHA256 via OpenSSL; constant-time compare).
3. Bookmark writes + the follow graph.
4. Feed read endpoints.
5. Background jobs — scheduler on the Phase 3 heap, worker pool from Phase 4.
6. **Last, and only if still worth it:** RSS/HN ingestion, HTML scraping, and
   the OpenAI embedding client. These are the weakest candidates for C and the
   most work. Reaching here and deciding to leave them in Python is a *success*,
   not a failure.

---

# Phase 8 — Production hardening (ongoing from Phase 6)

ASan/UBSan builds and the fuzz corpus in CI; `clang --analyze` and `cppcheck`;
`-D_FORTIFY_SOURCE=2 -fstack-protector-strong` in release builds; graceful
shutdown; timeouts everywhere; backpressure and bounded queues; rlimits;
a crash handler that dumps a backtrace.

---

# Reading list

- **Modern C** — Jens Gustedt (free PDF). Primary text; actually current C.
- **K&R, 2nd ed.** — for the exercises, not the idioms. Its style is dated.
- **C Interfaces and Implementations** — Hanson. The best book on *ownership
  discipline* and designing C APIs. Read during Phase 3.
- **Expert C Programming: Deep C Secrets** — van der Linden. Arrays-vs-pointers
  and declarator syntax, finally clear.
- **Computer Systems: A Programmer's Perspective**, ch. 9-12 — memory, linking,
  I/O, concurrency. Read alongside Phases 2 and 4.
- **Beej's Guide to Network Programming** — Phase 4.
- `man` pages are primary sources: `malloc`, `realloc`, `read`, `recv`, `poll`,
  `kqueue`, `pthread_mutex_lock`, `signal`.
- RFC 9112 (HTTP/1.1 syntax) — Phase 5. Read it, don't guess it.

---

# How I'll know it's working

- `BUGS.md` entries shift over time from *leak/double-free* to *design/ownership
  ambiguity*. That shift is the whole curriculum.
- I stop reaching for `malloc` reflexively and start asking "what's this
  allocation's **lifetime**, and whose arena does it belong to?"
- I can read someone else's C and immediately ask the right question: who frees this?

---

# Session log

One line per session. Date — phase — what I built — bugs logged.
Phase-close entries get the three-question retro above.

<!-- e.g. 2026-10-18 — P0 — Makefile w/ asan target, broke it 4 ways — 0 bugs -->
