---
name: wrap
description: Close a C training session for the c-backend project - updates STATE.md, appends the session log, tallies bugs, and sets up the next session. Use when the user types /wrap or says they are done with a C session for today.
---

# /wrap — close the session and save the state

**Paths are relative to the project root, which is `c-backend/`** — sessions are
started from inside it, so `STATE.md`, `LEARNINGS.md`, `ROADMAP.md` and `CLAUDE.md`
are all in the working directory.

The point: they should be able to walk away for three weeks and resume with no
memory of what they were doing. Everything needed for that lives in
`STATE.md`, and this is the only thing that writes it.

## Do this in order

**1. Ask what happened**, if you weren't there for it: what they built, what
broke, what they're unsure about. Keep it to one round of questions.

**2. Check `LEARNINGS.md` is honest.** Did anything surprise them today that isn't
written down? Entries get written at the moment of surprise, but people forget —
catch the misses now, while it's still recoverable. If they describe a bug with
no entry, get it written before anything else.

**3. Rewrite `STATE.md`:**
- **Position** — phase, task in flight, **next action** (concrete enough to start
  cold: "write `arena_reset`, decide first whether it keeps the block"), sessions
  this phase
- **Last session** — date, what was covered, what they built, and *where they
  left off mid-thought*. Write this for a reader with no memory of today. This is
  the section that makes a 3-week gap survivable, so spend the words here.
- **Open threads** — add anything half-understood or deferred; remove what closed
- **Recall queue** — add a question for anything load-bearing they learned today;
  update last-asked dates and streaks from this session's quiz; retire anything
  answered correctly twice on different days
- **Tag tally** — recount from `LEARNINGS.md` by tag

**4. Append one line to the session log** at the bottom of `ROADMAP.md`:
`YYYY-MM-DD — P2 — arena alloc/reset, ASan clean — 4 bugs (2 overrun, 1 lifetime-design, 1 ownership)`

**5. If a phase just closed**, run the retro into the log: what they can do now
that they couldn't; the phase's bug tally; one thing they still don't understand
(carry it to open threads). Check the exit test actually passed — sanitizer-clean,
zero leaks, no partial credit — before ticking the box in the phase progress list.

**6. Sign off in 3 lines:** what they did today, what's next, one specific thing
to mull over before the next session. Nothing else — no encouragement padding.
