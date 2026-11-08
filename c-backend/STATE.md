# STATE — where we are

**Single source of truth for the C training.** Claude reads this first in every
session; `/wrap` rewrites it at the end of every session. If this file and my
memory disagree, this file wins.

Companions: `ROADMAP.md` (curriculum + protocol), `LEARNINGS.md` (lab notebook),
`CLAUDE.md` (teaching contract), `TUNING.md` (course corrections).

---

## Position

- **Phase:** 0 — Toolchain and the mental model
- **Task in flight:** **0.2 in progress.** Two drills done — `sum 1..n`
  (`p0.2/sum.c`, prints `Sum = 55`) and the **triangle** (`p0.2/triangle.c`,
  nested loop, correct output). **Two drills remain: max-in-an-array and
  count-vowels** — both need the thing 0.2 hasn't covered yet: **arrays** (a block
  of N things, `sizeof`, an array that doesn't know its own length).
- **Next action:** **teach arrays** (declaration, indexing, that the length is
  *not* carried with the array, `sizeof` on an array vs a pointer), then build
  **find-the-max-in-an-array**, then **count-vowels in a fixed `char` array**.
  Folder `p0.2/` ready. Per the new depth rule: arrays/`sizeof` is where C and
  Python *diverge* (no bounds checks, no `len()`) — slow down there, it's not
  trivial. **First question before the max drill:** given a C array doesn't store
  its own length, how will the function know where to stop?
- **Sessions this phase:** 6
- **Phase exit test:** can explain the path from `clang a.c b.c` to a binary
  without notes, naming preprocessor / compiler / assembler / linker and what
  each consumed and produced. **Now passing cold** — the four-stage question was
  answered clean this session (see recall queue). (ASan isn't a meaningful gate
  yet; nothing here allocates.)

## Last session

**2026-11-08 (session 6) — nested loops, finally: the triangle built.** Quick
2-question quiz (only the pipeline "which stage understands C" one got asked —
answered correctly, "compiler only"; I over-drilled it, which prompted the pacing
feedback below). Then taught **nested loops** via the clock model (outer = hours,
inner = minutes runs a full cycle per outer step), with the triangle's twist: the
inner loop's bound is **not constant** — it's the *current outer counter*. Built
`p0.2/triangle.c` — `for i`, inner `for j` with `j <= i`, `\n` after each row —
correct 4-row output, unaided. Review finding (not fixed): `int n = 4` is declared
but unused; the loop hard-codes `i <= 4` (magic number) instead of `n`, so `n` is
dead and the triangle won't respond if you change it.

**Two course-corrections tuned in today (both live):**
- `CLAUDE.md` item 1 — **spend depth where C is hard** (memory/pointers/internals/
  Python-divergence), move briskly through trivial Python-like syntax; name which
  kind of topic we're on.
- `/teach` step 3 — **recall is gap-gated**: same-day resumes skip the quiz; the
  cold 2-3-question quiz only fires after an overnight-or-longer gap. (Today was
  4 same-day sessions each opening with a quiz — that's what prompted it.)

**Where I left off mid-thought:** nothing open. Two real drills done (`sum.c`,
`triangle.c`); throwaway experiment files (`sigint.c`, `segv.c`, `collision.c`)
still in `p0.2/`, bin-able. `p0.1/hello.c` still missing `return 0;` (harmless).
The `git mv` into `p0.1/`/`p0.2/` is **still staged, not committed** (now also
several new `p0.2/` files + the triangle). Next up is **arrays**.

**2026-11-08 (session 5) — recall reteach (exit status / signals), then a real
surprise (divide-by-zero on arm64).** Cold quiz Q1 was *"`return 3` but `echo $?`
says 130 — decompose it."* Missed: said `127 + 3` and "above 127 isn't an error
code" — wrong boundary and vague meaning. Reteach landed the model: `$?` is one
8-bit number saying *how* a process died — **path 1** it returned its own code
(`0` success), **path 2** it was killed by signal `N`, which the shell reports as
**`128 + N`**. So `130 = 128 + 2` = SIGINT (Ctrl-C); predicted `139 = 128 + 11`
for SIGSEGV correctly. Then the planned signal experiments turned up something
better: my divide-by-zero experiment (meant to SIGFPE → `136`) **didn't crash on
arm64** — it printed `0` and exited `0`. That's the banked surprise: integer
÷0 is UB, and arm64 defines it as "return 0" where x86 traps. Also had to
re-explain what **UB** even is from scratch — the acronym hadn't stuck despite
three entries using it. Nested loops deferred again.

**Built — throwaway experiments in `p0.2/` (safe to delete):**
- `sigint.c` (infinite loop, Ctrl-C → `130`), `segv.c` (actually divide-by-zero,
  printed `0`, exited `0` on arm64 — no trap), `collision.c` (the global-`FILE`
  redefinition from last session). None are drills.
- **Review note on `segv.c`:** first version computed `int c = a/b;` but never
  *used* `c`, so the division was dead code the compiler could delete; had to add
  a `printf` of `c` to make it observable — and even then, no crash (the arm64
  point).

**One banked learning:** *integer divide-by-zero is UB — may or may not crash,
depending on the machine* (`ub`, `integer`, `python-collision`).

**Where I left off mid-thought:** nothing open; the real drill (`p0.2/sum.c`) is
still the only one done. `p0.1/hello.c` still missing its `return 0;` (harmless).
The `git mv` into `p0.1/`/`p0.2/` is **still staged, not committed.** Throwaway
experiment files are sitting in `p0.2/` and can be binned.

**2026-11-08 (session 4) — a recall reteach: `#include` vs `import`.** Short
session. Opened the cold quiz with *"give three ways `#include` differs from
`import`"* and drew a blank — **couldn't retrieve it at all**, though it was
banked back on 2026-10-18. Per protocol that miss became the whole session; the
planned new material (nested loops) was pushed to next time. Fully recovered by
rebuilding it from the `clang -E` fact (4 lines → 599):

- **Difference 1 — caching.** `import` runs once and caches; `#include` text-pastes
  the header *every time*, no cache (→ why include guards exist; `stdio.h` has
  them internally). I got this one by reasoning, not recall.
- **Difference 2 — no namespace** (the one I kept missing). `#include` dumps every
  name flat into my file's global scope — no `stdio.` prefix. I first mis-blamed
  guards for a name collision; needed a "one sheet of paper, two things named
  `FILE`" picture before it landed. This is the same *one-name-one-scope* rule
  that bit `sum` last session, now at file scope.
- **Difference 3 — shape vs code.** `import` brings runnable code; `#include`
  brings only *declarations* (shapes). The body arrives later from the linker.

**Did — no new binary, a confirming experiment instead:** declared a global
`FILE` after `#include <stdio.h>` and compiled it; got the expected **compile-time**
redefinition error (identified the stage correctly from the `file:line`, applying
last session's prefix rule), with clang's "previous definition is here" pointing
into `stdio.h`. Prediction matched — nothing surprising, no `LEARNINGS.md` entry.

**Where I left off mid-thought:** nothing open. No new code written this session;
`p0.2/sum.c` still the only drill done. `p0.1/hello.c` still has no `return 0;`
(harmless warning). The `git mv` into `p0.1/`/`p0.2/` is **still staged, not
committed**. Nested loops + the triangle are the very next thing.

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

*Spaced repetition. **After a real gap (overnight or longer — not a same-day
session),** `/teach` opens by asking me 2-3 of these cold, oldest-asked first; a
same-day resume skips the quiz or asks at most one older item. If I can't answer,
that's today's intake, not new material. Seeded from `LEARNINGS.md`. Claude
retires one after I've answered it correctly twice on different days.*

| Question | Added | Last asked | Correct streak |
| --- | --- | --- | --- |
| Name the four stages between `hello.c` and `hello`. What does each one consume and produce? | 2026-10-18 | 2026-11-08 | 1 |
| `clang -E hello.c` turns 4 lines into 599. What is in those lines — and what is definitely *not*? | 2026-10-18 | — | 0 |
| Your binary is arm64 and your EC2 box is arm64. Why won't it run there? | 2026-10-18 | 2026-11-08 | 0 — recovered w/ nudge, re-ask |
| Give three ways `#include` differs from `import`. | 2026-10-18 | 2026-11-08 | 0 — **missed cold, retaught** (no-namespace one was the sticky part) |
| Why does dereferencing `NULL` usually crash, and what is doing the checking? | 2026-10-18 | — | 0 |
| `printf` is handed a value. How does it work out what type it is — and what happens when you're wrong? | 2026-10-18 | — | 0 |
| A program returns `3`, but `echo $?` says `130`. What happened, and what does `130` decompose into? | 2026-10-18 | 2026-11-08 | 0 — **missed cold, retaught** (said `127+3`; it's `128+2` = killed by SIGINT) |
| A build prints a warning with a `file:line` and an error prefixed `ld:`. Which one stopped the build, and what does each prefix tell you? | 2026-10-18 | 2026-11-08 | 1 |
| You rename `main` to `run` and rebuild. Which stage fails — and will the message name a file and line, or a symbol? | 2026-10-18 | — | 0 |
| Is `printf`'s machine code copied into your binary when you link? If not, what is, and when does the real thing arrive? | 2026-10-18 | — | 0 |
| Which of the four stages is the only one that understands C? What does that imply about where a syntax error can come from? | 2026-10-18 | 2026-11-08 | 1 |
| A C program ran, printed what you expected, and exited `0`. What does that prove? | 2026-10-18 | 2026-10-18 | 1 |
| A function returning `int` reaches its closing brace with no `return`. When is that defined, and when is it not? | 2026-10-18 | 2026-10-18 | 1 |
| `double r = 5 / 2;` — what is `r`, and why isn't it `2.5`? | 2026-11-08 | — | 0 |
| You declare a local variable with the same name as the function it lives in. What can you no longer do below it, and what error names the problem? | 2026-11-08 | — | 0 |
| `sum(100000)` returns a positive number far below the true sum and exits `0`. Where did the missing value go, and why did nothing complain? | 2026-11-08 | — | 0 |
| You divide an `int` by a variable holding `0` and run it on your arm64 Mac. Does it crash? What would an x86 box do, and what one concept explains why both are "correct"? | 2026-11-08 | — | 0 |
| What does *undefined behaviour* mean in C — and why is it a different claim from "you'll get an unpredictable result"? | 2026-11-08 | — | 0 |

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

17 entries.

| Tag | Count |
| --- | --- |
| `python-collision` | 9 |
| `ub` | 6 |
| `toolchain` | 4 |
| `process` | 3 |
| `types` | 3 |
| `standard` | 3 |
| `integer` | 2 |
| `memory` | 1 |
| `alignment-aliasing` | 1 |
