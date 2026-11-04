---
name: recap
description: Recap what happened in the last C training session(s) - what was built, what was got wrong, what was banked. Depth scales to how long it has been. Read-only and strictly backward-looking. Use when the user types /recap or asks what they did last time, where they got to, or what they covered.
---

# /recap — what happened last time

**Paths are relative to the project root, which is `c-backend/`** —
`STATE.md`, `LEARNINGS.md` and `ROADMAP.md` are all in the working directory.

Zero-commitment orientation. They've opened the laptop and want to remember
where they got to, without starting a session. `/teach` also recaps, but it
commits them to a quiz and new material; this does not.

## Two hard rules

**1. Past tense only.** Recap what is *done*. **No next action, no "next up",
no handoff, no what-to-work-on, no warnings about the state of the code.** Not
even one line at the end. If they want that, they'll run `/teach`. Stating the
next step turns a recap into a nudge, and they asked for a recap.

**2. Read-only.** Never write to `STATE.md`, `LEARNINGS.md`, `ROADMAP.md` or
anything else. `/wrap` owns the state.

## Depth scales to the gap — this is the whole skill

Work out the days between today and the last session's date in `STATE.md`, then
pick a register. **The default is wrong more often than not, so compute the gap
before writing a word.**

| Gap | Register |
| --- | --- |
| Same day – 3 days | **Short.** They remember. Jog it. ~12 lines, bullets only. |
| 4 – 10 days | **Medium.** Short, plus one clause of context per bullet, and the phase named in a line. |
| 11+ days, or a phase boundary crossed | **Full.** Assume they remember nothing. See below. |

They can override: `/recap short`, `/recap full`, `/recap 3` (last 3 sessions),
`/recap phase`, `/recap week`. An explicit argument always beats the computed gap.

**At Full, a bullet list is a failure.** After three weeks "swapped compiler and
assembler" means nothing, because they no longer remember what the four stages
were. A long-gap recap has to **rebuild the substance**, not list the events:
restate the concept in a sentence, *then* say what they got wrong about it. The
test: could someone who had forgotten everything follow this without opening
`ROADMAP.md`? If not, it's too thin.

Length is a consequence, never a target. Full may run 40 lines. Short must not
run 20.

## Source

- `STATE.md` → "Last session", "Position" (phase/step, session count), "Open threads"
- `LEARNINGS.md` → entries whose `**When:**` matches the session(s) in range
- `ROADMAP.md` → the session log lines, and the current phase's section for what
  the phase is *for* (needed at Medium and Full)

## Shape

### Short (gap ≤ 3 days)

```
**<date> · P<phase>.<step>** — session <n> of this phase

**Built**
- <thing that exists now that didn't before>

**Got wrong**
- <the mistake> → <what turned out to be true>

**Banked**
- <entry heading from LEARNINGS.md, verbatim>
```

Hard cap three bullets per section, one line each. No preamble, no sign-off.

### Full (gap ≥ 11 days)

Same sections, plus two that only exist here, and every bullet carries its own
context:

- **Where you are** — first, 2-3 lines. The project (hand-writing a C
  replacement for the Python backend, to learn C), the phase, and what that
  phase is *for*. They may have forgotten the shape of the whole thing.
- **What the session was about** — a short paragraph, prose not bullets. The
  thread of it: what was being learned and why it mattered. This is the part
  that makes the bullets below legible again.
- **Built** / **Got wrong** / **Banked** — as Short, but each bullet restates
  enough of the concept to stand on its own. For **Got wrong**, give the
  correction in full, not a pointer to it.
- **Left unresolved** — the open threads from `STATE.md`, as questions that were
  parked. Past-framed: these are things that were left open, not a to-do list.

## Always

- **Got wrong** is the most useful section and the reason they asked for this.
  Never skip it when there were mistakes, never soften them, never scold. Flat
  and factual.
- **Banked** quotes `LEARNINGS.md` headings verbatim. At Short, headings only.
  At Full, a heading plus one line of context — still never the body they wrote.
- Drop a section entirely if it's genuinely empty. Don't pad.

## The exception this skill is

`CLAUDE.md` makes `LEARNINGS.md` write-only to Claude — their own rules are
never read back to them, because rediscovering one by hand is where it sticks.
This skill is a deliberate, narrow exception: orientation at the *start* of a
sitting, bounded to the sessions in range.

**It is not an exception mid-struggle.** If they're stuck on something and reach
for `/recap` — or ask for a recap "of the thing about pointers" while debugging —
decline in one line and send them to `/stuck`. Handing back a rule they already
wrote is exactly the thing the rule exists to prevent, and it does not stop being
that because the request came through this command.
