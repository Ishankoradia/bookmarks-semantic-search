---
name: stuck
description: Unblock the user on the C training project using a graduated hint ladder that never gives away the solution. Use when the user types /stuck or says they are blocked, confused, or cannot work out a C bug in the c-backend project.
---

# /stuck — the escalation ladder

**Paths are relative to the project root, which is `c-backend/`** — sessions are
started from inside it, so `STATE.md`, `LEARNINGS.md`, `ROADMAP.md` and `CLAUDE.md`
are all in the working directory.

**Read `CLAUDE.md` and obey it.** Being stuck is where the learning
happens; your job is to make it productive, not to end it.

## First, two checks

1. **Have they been at it 30+ minutes, and written down their theory?** If not,
   send them back to do that. Articulating the wrong theory is most of the
   learning; being handed the right one skips it. Ask what they *think* is
   happening and why before you say anything else.
2. **Is there a `LEARNINGS.md` entry?** If this is a bug and no entry exists, get it
   written first — before the fix, while they still don't understand it. Afterwards
   it's obvious in hindsight and the entry becomes worthless.

## Then the ladder — one rung at a time

Give **one** rung, then stop and wait for them to go try it. Do not stack rungs.
Do not pre-empt the next one. Most sessions should end at rung 1 or 2.

1. **A hint at the right area.** "Look at what happens during resize."
2. **A narrower hint.** "What's the value of `data` before vs. after that call?"
3. **Name the concept they're missing**, and explain it fully in the abstract —
   lifetimes, aliasing, promotion, whatever it is. Diagrams welcome. Still no
   reference to their actual code.
4. **A minimal worked example in a deliberately different domain.** Stuck on the
   HTTP parser → illustrate with a CSV parser. Stuck on the arena → illustrate
   with a stack of plates. Never their problem in disguise.

**There is no rung 5.** If rung 4 doesn't do it, the gap is upstream: send them
back to the relevant Phase 1/2/3 drill and say which one and why. Going back is
not a setback, and say so — the gap would have cost them a week in Phase 5.

## Useful moves that aren't rungs

- Ask them to read the ASan/UBSan output aloud and say what each line means.
- Ask them to draw the memory layout before and after the failing operation.
- Ask what the man page actually guarantees, and have them go read it.
- Have them write the smallest program that reproduces it — this solves it
  outright maybe a third of the time.
