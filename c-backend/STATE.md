# STATE — where we are

**Single source of truth for the C training.** Claude reads this first in every
session; `/wrap` rewrites it at the end of every session. If this file and my
memory disagree, this file wins.

Companions: `ROADMAP.md` (curriculum + protocol), `BUGS.md` (lab notebook),
`CLAUDE.md` (teaching contract).

---

## Position

- **Phase:** 0 — Toolchain and the mental model
- **Task in flight:** nothing yet — project just set up
- **Next action:** hand-write a Makefile for a multi-file skeleton with
  `build` / `test` / `asan` / `clean` targets, then deliberately break it four
  ways (misspelled header, missing object file, circular include, missing symbol)
  and learn to tell compiler errors from linker errors on sight
- **Sessions this phase:** 0
- **Phase exit test:** can explain the path from `clang a.c b.c` to a binary
  without notes, and can name a bug class from an ASan report alone

## Last session

**2026-10-17 — setup, no C written.** Built the scaffolding: roadmap with 8
phases, the teaching contract (Claude never writes my code), the bug journal
format, and this state file. Decided: hand-roll everything except libpq/OpenSSL/
pthreads/libc; exercise-drilled; strangler rewrite with no cutover day.

**Where I left off mid-thought:** nothing open — clean start.

## Open threads

*Things I half-understand, deferred questions, "come back to this". Claude
should offer to close one of these when a session has slack at the end.*

- (none yet)

## Recall queue

*Spaced repetition. `/teach` opens by asking me 2-3 of these cold, oldest-asked
first. If I can't answer, that's today's intake, not new material. Claude adds a
question here whenever I learn something load-bearing, and retires one after I've
answered it correctly twice on different days.*

| Question | Added | Last asked | Correct streak |
| --- | --- | --- | --- |
| *(seeds once Phase 0 starts)* | | | |

## Phase progress

- [ ] **P0** Toolchain and the mental model
- [ ] **P1** Core language, drilled
- [ ] **P2** Memory ★
- [ ] **P3** Data structures (`libcore`)
- [ ] **P4** The OS boundary
- [ ] **P5** Protocols hand-rolled (`libhttp`, `libjson`)
- [ ] **P6** Persistence + outside world
- [ ] **P7** Strangler rewrite
- [ ] **P8** Production hardening

## Bug tally to date

*Updated by `/wrap` from `BUGS.md`. The shape of this table over time is the
real measure of progress — mechanical categories should give way to structural
ones by Phase 5.*

| Category | Count |
| --- | --- |
| *(none yet)* | |
