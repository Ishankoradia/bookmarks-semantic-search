# Learnings

Generalized rules, banked as I go. Written by `/learnings`. This is the lab
notebook and the real deliverable of the whole project — the C backend is the
vehicle.

**The unit is the rule, not the incident.** Each heading is a rule stated so it
applies to code I haven't written yet. A reader scanning only the headings
should get a usable summary of everything I know. If a heading can't carry its
rule alone, it isn't general enough yet.

Everything lands here: Python collisions, toolchain behaviour, what the standard
does and doesn't promise, experiments that came out the other way, and the
lesson from every bug I debug.

Every entry carries **When** — the date and the phase it came from. The date
makes the recurrence gap measurable (a rule arriving twice, six months apart, is
different from twice in a week); the phase makes it possible to ask what each
phase actually taught me when it closes.

## Bugs

A segfault, leak or sanitizer hit gets an entry **at the moment of surprise,
before the fix** — the fix lives in git, this file holds the misunderstanding
that caused it. Same three fields; the memory category goes in the tags.

**Memory tags:** `leak` · `error-path-leak` · `double-free` · `use-after-free` ·
`dangling-stack` · `pointer-invalidation` · `buffer-overrun` · `off-by-one` ·
`uninitialised-read` · `integer` · `alignment-aliasing` · `ownership-ambiguity` ·
`lifetime-design` · `concurrency` · `fd-leak`

**Other tags:** `ub` · `toolchain` · `types` · `memory` · `process` ·
`python-collision` · `standard`

## Review

Monthly, with `/review`. Two questions:

1. **Is the memory-tag mix shifting?** Phases 1-3 should be dominated by the
   mechanical tags (`leak`, `off-by-one`, `buffer-overrun`). If
   `ownership-ambiguity` and `lifetime-design` aren't the majority by Phase 5,
   the drills didn't take. That shift is the actual measure of progress.
2. **Are rules recurring?** The same rule arriving twice from a different
   direction means it hadn't landed. Repeats get their own entry and are
   expected — the lengthening gap between them is the evidence it's sticking.

Claude never reads entries back to me mid-struggle — not in `/teach`, not in
`/stuck`, not as a hint. Rediscovering a rule by hand is where it gets
internalised. This file is read by me at review, and by `/wrap` when seeding the
recall queue. It is also the source for `/teach`'s quiz.

---

# Log

<!-- newest at the bottom -->

## A C program running without complaining proves nothing

- **I used to assume:** that if a program ran and didn't error, it was legal —
  the way Python guarantees me an `IndexError` or a traceback when I break a
  rule. In C the rules live in a document, and nothing at runtime enforces them
  on my behalf. "It worked" and "it is correct" are unrelated claims.
- **Found out by:** `printf` with `%s` and an integer `0` printed `(null)` and
  exited `0`. Undefined behaviour that a polite libc happened to absorb.
- **When:** 2026-10-18 · P0.1
- **Tags:** `ub`, `python-collision`

## A crash is the good outcome; silent undefined behaviour is the dangerous one

- **I used to assume:** that a segfault was the worst thing that could happen.
  It's the best — loud, immediate, found in seconds. UB that silently works is
  what ships, runs for months, and breaks on an OS upgrade or at `-O2`.
- **Found out by:** `%s` with `3` segfaulted instantly; `%s` with `0` printed
  `(null)` and looked fine. Same category of mistake, opposite visibility.
- **When:** 2026-10-18 · P0.1
- **Tags:** `ub`

## Undefined behaviour means the standard imposes no requirements at all

- **I used to assume:** that "undefined" meant "unspecified result" — that I'd
  get *some* answer, just not a guaranteed one. It means the implementation may
  do anything: crash, print, work, or have the compiler assume the code is
  unreachable and delete it.
- **Found out by:** C11 §5.1.2.2.3 explicitly guarantees that `main` falling off
  the end returns `0`, while nothing guarantees anything about `%s` with a null
  pointer. Both "worked". Only one was promised.
- **When:** 2026-10-18 · P0.1
- **Tags:** `ub`, `standard`

## At runtime there are only bytes — types exist for the compiler and are gone

- **I used to assume:** values carry their type with them, as Python objects do.
  They don't. The compiler uses types to decide which instructions to emit, then
  erases them. Nothing downstream can inspect what it was handed.
- **Found out by:** one `printf` call rendered the same `0` as `0` and as
  `(null)` in the same line of output, with no way to notice the contradiction.
- **When:** 2026-10-18 · P0.1
- **Tags:** `types`, `python-collision`

## C does no implicit conversion at a call — a format string is a promise, not a description

- **I used to assume:** that `printf` would convert whatever I gave it to text,
  the way Python's `print` asks the object to render itself. The format string
  is the *only* source of truth about the arguments; `printf` acts on it blindly
  and cannot verify it. A wrong specifier is me lying to a function that has no
  way to catch me.
- **Found out by:** `%s` with an `int` — segfault, because `printf` took the
  integer as an address and tried to read from it.
- **When:** 2026-10-18 · P0.1
- **Tags:** `types`, `python-collision`, `alignment-aliasing`

## `main`'s return value is the process exit status, and the outside world reads it

- **I used to assume:** a program's return value was an internal detail, the way
  `main()`'s is in Python. It's the one number a process can say to the world as
  it dies: `0` is success, non-zero is failure, and the shell, `&&`, `make` and
  CI all branch on it. `$?` is the shell's `subprocess.returncode`.
- **Found out by:** `return 3` from `main`, then `echo $?` printing `3`.
- **When:** 2026-10-18 · P0.1
- **Tags:** `process`, `python-collision`

## An exit status above 128 means the process was killed, not that it returned

- **I used to assume:** `$?` always held a value my program chose. `128+N` means
  it was killed by signal N and never returned at all — `130` is `128+2`,
  SIGINT, Ctrl-C. `$?` is also clobbered by *every* command, so it has to be
  read immediately after the one I care about.
- **Found out by:** `echo $?` printing `130` after a program that returned `3`.
- **When:** 2026-10-18 · P0.1
- **Tags:** `process`

## Falling off the end of a function is a trap everywhere except `main`

- **I used to assume:** a missing `return` would be a compile error, or a
  guaranteed zero. C11 §5.1.2.2.3 special-cases `main` alone to return `0`. Any
  other `int` function that reaches its closing brace hands the caller garbage,
  and using that value is undefined.
- **Found out by:** deleting `return 0;` from `main`; it compiled, ran, and
  `$?` was `0`.
- **When:** 2026-10-18 · P0.1
- **Tags:** `standard`, `ub`

## A header carries the shape of a function, never its body

- **I used to assume:** `#include` fetched the code, the way `import` does.
  `stdio.h` is ~595 lines of declarations, typedefs and macros and contains not
  one line of `printf`'s implementation. The compiler needs only the shape to
  emit a correct call; the linker supplies the body later from libc. That split
  is why a C build fails in two unrelated ways.
- **Found out by:** `clang -E hello.c | wc -l` → 599 lines from a 4-line file.
- **When:** 2026-10-18 · P0.1
- **Tags:** `toolchain`

## `#include` is text substitution, not `import`

- **I used to assume:** include and import were the same idea. `import` runs a
  module once, caches it, and gives me a namespace. `#include` pastes the file's
  text in, every time, into the global scope, with no cache and no namespace —
  which is why include guards have to exist.
- **Found out by:** scrolling `clang -E hello.c` and finding my four lines at
  the bottom of 595 pasted ones.
- **When:** 2026-10-18 · P0.1
- **Tags:** `toolchain`, `python-collision`

## A binary is tied to its OS's executable format, not just to the CPU

- **I used to assume:** matching architecture meant a binary would run. macOS
  loads Mach-O, Linux loads ELF, and the kernel won't recognise the other as a
  program at all — same arm64 CPU or not.
- **Found out by:** `file hello` → `Mach-O 64-bit executable arm64`, then
  working out what would happen if I `scp`'d it to the arm64 EC2 box.
- **When:** 2026-10-18 · P0.1
- **Tags:** `toolchain`

## Address 0 is left unmapped on purpose, so null dereferences fail loudly

- **I used to assume:** `NULL` was a value like `None`, checked by the runtime.
  It's address `0`, and the OS deliberately leaves the bottom of the address
  space unmapped so that touching it traps instead of silently corrupting
  something. The hardware is the check — there is no runtime doing it.
- **Found out by:** `%s` with `3` segfaulting: the read was refused by the
  memory unit, not by `printf`.
- **When:** 2026-10-18 · P0.1
- **Tags:** `memory`

## `main` is the contract with the OS, not a convention

- **I used to assume:** that main could be named anything else, just like in
  Python, and it would still be compiled and invoked.
- **Found out by:** renaming `main` to `main123`. Renaming it breaks at the
  **linker** stage, because the linker adds the startup code and that is what
  calls `main` — `ld: Undefined symbols: _main, referenced from:
  <initial-undefines>`. The compiler had no objection at all.
- **When:** 2026-10-18 · P0.1 (pipeline rebuild)
- **Tags:** `toolchain`, `python-collision`, `process`
