# STATE — where we are

**Single source of truth for the C training.** Claude reads this first in every
session; `/wrap` rewrites it at the end of every session. If this file and my
memory disagree, this file wins.

Companions: `ROADMAP.md` (curriculum + protocol), `LEARNINGS.md` (lab notebook),
`CLAUDE.md` (teaching contract), `TUNING.md` (course corrections).

---

## Position

- **Phase:** 0 — Toolchain and the mental model
- **Task in flight:** none — **0.1 is complete**, 0.2 not started
- **Next action:** **ROADMAP 0.2** — still one file, still compiled by hand every
  time. Variables and the basic types (`int`, `char`, `double`, `size_t`),
  `if`/`while`/`for`, writing and calling my own functions, arrays as a block of
  N things, `sizeof`. Four tiny drills: sum 1..n, print a triangle, find the max
  in an array, count vowels in a fixed `char` array.
  **First question to answer before writing any of it:** what does `5 / 2`
  evaluate to in C, and why is that not the same answer Python gives?
- **Sessions this phase:** 1
- **Phase exit test:** can explain the path from `clang a.c b.c` to a binary
  without notes, naming preprocessor / compiler / assembler / linker and what
  each consumed and produced. (ASan isn't a meaningful gate yet — nothing here
  allocates.)

## Last session

**2026-10-18 — Phase 0.1, `hello.c` built and run.** First C ever written.
Compiled by hand with `clang hello.c -o hello`, ran it, and then spent most of
the session deliberately breaking it, which is where everything actually came
from. Covered: the four-stage build pipeline; `main` as a contract with the OS
rather than a convention; exit status and `$?`; `printf`'s format string as a
*promise* rather than a description; undefined behaviour; `NULL` and the unmapped
guard page at address 0; Mach-O vs ELF; declarations vs definitions.

**Built and observed:**
- `hello.c` → `./hello`, `return 3` round-tripping out through `echo $?`
- a segfault from `%s` with an `int` — first bug, logged
- `%s` with `0` printing `(null)` — UB that *didn't* crash, which turned out to
  be the more important of the two
- `%d` and `%s` on the same `0` in one call → `hello, world 0 (null)`
- `file hello` → `Mach-O 64-bit executable arm64`
- `clang -E hello.c | wc -l` → 599 lines from a 4-line file
- deleted `return 0;` from `main`; still compiled, `$?` still `0` (C11 §5.1.2.2.3)

**Mid-session detour:** rebuilt the capture tooling. `/bug` and `BUGS.md` are
gone — replaced by `/learnings` + `LEARNINGS.md`, where the unit is a
*generalized rule* rather than a bug report, and memory categories survive as
tags. Also added `/tune` + `TUNING.md` for feedback on the teaching itself.
Both logged in `TUNING.md`.

**Where I left off mid-thought:** nothing open on the C side — 0.1 closed cleanly
and everything was observed, not just explained. `hello.c` is on disk in whatever
state the last experiment left it (no `return`, possibly still with a `%s` bug).
Start 0.2 fresh rather than trying to recover it.

## Open threads

*Things I half-understand, deferred questions, "come back to this". Claude
should offer to close one of these when a session has slack at the end.*

- **Why is a 4-line program's binary ~33KB?** I formed a theory but never
  checked it against `ls -l` properly. Comes back properly in Phase 3 with `nm`.
- **`int main(void)` — what is the `void` doing?** Asked, never answered. The
  real answer involves `argv`, which Phase 0 defers.
- **UB and the optimiser.** I know "the compiler may assume UB never happens"
  as a sentence, not as something I've seen happen. Revisit at `-O2` in Phase 2.

## Recall queue

*Spaced repetition. `/teach` opens by asking me 2-3 of these cold, oldest-asked
first. If I can't answer, that's today's intake, not new material. Seeded from
`LEARNINGS.md`. Claude retires one after I've answered it correctly twice on
different days.*

| Question | Added | Last asked | Correct streak |
| --- | --- | --- | --- |
| A C program ran, printed what you expected, and exited `0`. What does that prove? | 2026-10-18 | — | 0 |
| `printf` is handed a value. How does it work out what type it is — and what happens when you're wrong? | 2026-10-18 | — | 0 |
| Name the four stages between `hello.c` and `hello`. What does each one consume and produce? | 2026-10-18 | — | 0 |
| A function returning `int` reaches its closing brace with no `return`. When is that defined, and when is it not? | 2026-10-18 | — | 0 |
| A program returns `3`, but `echo $?` says `130`. What happened, and what does `130` decompose into? | 2026-10-18 | — | 0 |
| `clang -E hello.c` turns 4 lines into 599. What is in those lines — and what is definitely *not*? | 2026-10-18 | — | 0 |
| Your binary is arm64 and your EC2 box is arm64. Why won't it run there? | 2026-10-18 | — | 0 |
| Give three ways `#include` differs from `import`. | 2026-10-18 | — | 0 |
| Why does dereferencing `NULL` usually crash, and what is doing the checking? | 2026-10-18 | — | 0 |

## Phase progress

- [ ] **P0** Toolchain and the mental model — *0.1 done; 0.2-0.5 remain*
- [ ] **P1** Core language, drilled
- [ ] **P2** Memory ★
- [ ] **P3** Data structures (`libcore`)
- [ ] **P4** The OS boundary
- [ ] **P5** Protocols hand-rolled (`libhttp`, `libjson`)
- [ ] **P6** Persistence + outside world
- [ ] **P7** Strangler rewrite
- [ ] **P8** Production hardening

## Tag tally to date

*Updated by `/wrap` from `LEARNINGS.md`. The shape of this table over time is the
real measure of progress — mechanical memory tags should give way to structural
ones by Phase 5.*

| Tag | Count |
| --- | --- |
| `ub` | 4 |
| `python-collision` | 5 |
| `toolchain` | 3 |
| `types` | 2 |
| `process` | 2 |
| `standard` | 2 |
| `memory` | 1 |
| `alignment-aliasing` | 1 |
