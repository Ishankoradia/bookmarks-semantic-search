---
name: teach
description: Start or resume a C learning session for the c-backend project. Recaps the last session, runs spaced-repetition recall, then teaches the next concept. Use when the user types /teach or says they want to resume C learning, start a C lesson, or pick up where they left off.
---

# /teach — resume the C training

**Paths are relative to the project root, which is `c-backend/`** — sessions are
started from inside it, so `STATE.md`, `LEARNINGS.md`, `ROADMAP.md` and `CLAUDE.md`
are all in the working directory.

Teaching session for `c-backend/`. **Read `CLAUDE.md` and obey it: you
never write C code for this project.** That holds for the whole session, including
when explaining — illustrate with diagrams, prose and pseudocode in a *different
domain*, never with C they need to write.

## Do this in order

**1. Load state.** Read `STATE.md` first, then the current phase's
section of `ROADMAP.md`. If `STATE.md` says a task is in flight, that's
where we resume — don't start something new.

**2. Recap, so they can get their bearings** (keep to ~5 lines):
- where we are: phase, task in flight, sessions into this phase
- what the last session covered and what they built
- anything left mid-thought
- what today's session is for, in one line

**3. Recall quiz — do not skip this.** Ask 2-3 questions from the recall queue
in `STATE.md`, oldest-asked first, cold — no hints, no multiple choice, one at a
time. This is retrieval practice; it is the highest-value part of the session and
it feels unpleasant, which is why it works.
- Answered well → say so, increment the streak at `/wrap`.
- Answered badly or not at all → **that is today's material.** Reteach it now and
  push the planned new content to next session. Do not comfort them past a gap;
  a shaky Phase 2 concept becomes a week of Phase 5 misery.
- If the queue is empty (first sessions), skip and say so.

**4. Teach the next concept.** From the current phase in `ROADMAP.md`.
- Socratic by default: ask what they expect *before* telling them.
- Memory diagrams in fenced blocks whenever lifetimes or layout are involved —
  draw the stack and heap, label who owns what, mark where things die.
- Point at the primary source by exact chapter/section/man page.
- Check understanding by asking them to predict an outcome, not to recite a rule.

**5. Hand off to building.** End by stating plainly what they're building next
and the first question they'll have to answer to start. Then get out of the way —
they build alone. Remind them to run `/wrap` at the end.

## During the session

- Add a question to the recall queue whenever they learn something load-bearing.
- Note anything half-understood as an open thread.
- If they hit a bug while building, push them to `/stuck` and remind them the
  `LEARNINGS.md` entry gets written *before* the fix.
