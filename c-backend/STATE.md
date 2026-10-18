# STATE — where we are

**Single source of truth for the C training.** Claude reads this first in every
session; `/wrap` rewrites it at the end of every session. If this file and my
memory disagree, this file wins.

Companions: `ROADMAP.md` (curriculum + protocol), `LEARNINGS.md` (lab notebook),
`CLAUDE.md` (teaching contract), `TUNING.md` (course corrections).

---

## Position

- **Phase:** 0 — Toolchain and the mental model
- **Task in flight:** none — 0.1 complete, the build pipeline now solid.
  **0.2 still not started** (it was displaced twice).
- **Next action:** **ROADMAP 0.2** — still one file, still compiled by hand every
  time. Variables and the basic types (`int`, `char`, `double`, `size_t`),
  `if`/`while`/`for`, writing and calling my own functions, declaration-before-use,
  arrays as a block of N things, `sizeof`. Four tiny drills: sum 1..n, print a
  triangle, find the max in an array, count vowels in a fixed `char` array.
  **First question to answer before writing any of it:** what does `5 / 2`
  evaluate to in C, and why is that not the answer Python gives?
- **Sessions this phase:** 2
- **Phase exit test:** can explain the path from `clang a.c b.c` to a binary
  without notes, naming preprocessor / compiler / assembler / linker and what
  each consumed and produced. **Close to passing** — see below. (ASan isn't a
  meaningful gate yet; nothing here allocates.)

## Last session

**2026-10-18 (session 2) — the build pipeline, properly.** Opened with the first
cold recall quiz. Got 2 of 3. The miss was *"name the four stages and what each
consumes and produces"* — the order and the names were right, but the
preprocessor was described as "copying the code of imported libraries" (it
copies *declarations*, never code) and the compiler and assembler were swapped.
So the pipeline became the session and 0.2 was pushed again.

**Covered:** the corrected four-stage pipeline with consume/produce for each;
that stages 1-2 emit **text** and the assembler is where it turns binary; that
the compiler is the only stage that understands C at all; warning vs error;
compiler diagnostics (`file:line`) vs linker diagnostics (`ld:` + symbol, no
line); a first look at dynamic linking.

**Built — ran all four stages separately for the first time:**
- `clang -E` → `hello.i`, `-S` → `hello.s`, `-c` → `hello.o`, then linked
- read `hello.s` and found the string literal in it — **the compiler's output is
  readable text**, which was the surprise of the session
- `file hello.o` → `Mach-O 64-bit object arm64` — *object*, not *executable*
- renamed `main` → `main123` and read the failure properly

**The accident worth remembering:** the rename produced *two* diagnostics —
a compiler **warning** (`hello.c:5:1: non-void function does not return a value`,
the leftover from last session's deleted `return 0;`) and a linker **error**
(`ld: Undefined symbols: _main`). I first read the warning as the failure. It
wasn't; the build died at the linker. And that warning only appeared *because*
the function was no longer called `main` — the toolchain independently proved
the C11 §5.1.2.2.3 rule I'd recited from memory ten minutes earlier.

**Where I left off mid-thought:** nothing open. `hello.c` is on disk with `main`
renamed to `main123` and no `return` statement, so **it does not currently
link** — fix or delete it before starting 0.2; don't debug it, it's deliberate
wreckage.

## Open threads

*Things I half-understand, deferred questions, "come back to this". Claude
should offer to close one of these when a session has slack at the end.*

- **Dynamic linking.** The linker may not copy `printf`'s body in at all — on
  macOS it records a reference that a *dynamic linker* resolves at launch, every
  run. I have the sentence, not the mechanism. Properly met in Phase 3 with
  `otool -L`, and it partly explains the 33KB thread below.
- **Why is a 4-line program's binary ~33KB?** Theory formed, never checked.
  Phase 3, with `nm`.
- **`int main(void)` — what is the `void` doing?** Asked twice, never answered.
  The real answer involves `argv`, which Phase 0 defers.
- **UB and the optimiser.** I know "the compiler may assume UB never happens" as
  a sentence, not as something I've watched happen. Revisit at `-O2` in Phase 2.
- **Not banked:** the second rule from the linker output — *the prefix on a
  diagnostic names the stage that produced it, and a warning and an error in one
  output can come from different stages.* Offered twice, not written up. It's in
  the recall queue anyway.

## Recall queue

*Spaced repetition. `/teach` opens by asking me 2-3 of these cold, oldest-asked
first. If I can't answer, that's today's intake, not new material. Seeded from
`LEARNINGS.md`. Claude retires one after I've answered it correctly twice on
different days.*

| Question | Added | Last asked | Correct streak |
| --- | --- | --- | --- |
| Name the four stages between `hello.c` and `hello`. What does each one consume and produce? | 2026-10-18 | 2026-10-18 | 0 — **missed, retaught** |
| `clang -E hello.c` turns 4 lines into 599. What is in those lines — and what is definitely *not*? | 2026-10-18 | — | 0 |
| Your binary is arm64 and your EC2 box is arm64. Why won't it run there? | 2026-10-18 | — | 0 |
| Give three ways `#include` differs from `import`. | 2026-10-18 | — | 0 |
| Why does dereferencing `NULL` usually crash, and what is doing the checking? | 2026-10-18 | — | 0 |
| `printf` is handed a value. How does it work out what type it is — and what happens when you're wrong? | 2026-10-18 | — | 0 |
| A program returns `3`, but `echo $?` says `130`. What happened, and what does `130` decompose into? | 2026-10-18 | — | 0 |
| A build prints a warning with a `file:line` and an error prefixed `ld:`. Which one stopped the build, and what does each prefix tell you? | 2026-10-18 | — | 0 |
| You rename `main` to `run` and rebuild. Which stage fails — and will the message name a file and line, or a symbol? | 2026-10-18 | — | 0 |
| Is `printf`'s machine code copied into your binary when you link? If not, what is, and when does the real thing arrive? | 2026-10-18 | — | 0 |
| Which of the four stages is the only one that understands C? What does that imply about where a syntax error can come from? | 2026-10-18 | — | 0 |
| A C program ran, printed what you expected, and exited `0`. What does that prove? | 2026-10-18 | 2026-10-18 | 1 |
| A function returning `int` reaches its closing brace with no `return`. When is that defined, and when is it not? | 2026-10-18 | 2026-10-18 | 1 |

## Phase progress

- [ ] **P0** Toolchain and the mental model — *0.1 done, pipeline solid; 0.2-0.5 remain*
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

13 entries.

| Tag | Count |
| --- | --- |
| `python-collision` | 6 |
| `ub` | 4 |
| `toolchain` | 4 |
| `process` | 3 |
| `types` | 2 |
| `standard` | 2 |
| `memory` | 1 |
| `alignment-aliasing` | 1 |
