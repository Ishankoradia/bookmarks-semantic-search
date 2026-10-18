---
name: tune
description: Take feedback on how the C training itself is going - pace, teaching style, drills, session rituals, phase scope - and fold it into CLAUDE.md, ROADMAP.md, STATE.md or the skill files. Use when the user types /tune, or says something about how they are being taught rather than about C itself ("too fast", "more analogies", "the quiz is too long", "this phase is dragging").
---

# /tune — fold feedback back into the course

**Paths are relative to the project root, which is `c-backend/`** — sessions are
started from inside it, so `STATE.md`, `BUGS.md`, `ROADMAP.md`, `TUNING.md` and
`CLAUDE.md` are all in the working directory, and the skills are in
`.claude/skills/`.

`CLAUDE.md` and `ROADMAP.md` were written on day one by someone who had not yet
been taught any C. They are a first guess. This skill is how that guess gets
corrected by contact with reality — and it is the *only* thing that edits the
teaching contract, so the contract stays a single coherent document rather than
a pile of amendments.

**The no-code rule still applies during this skill.** Nothing here involves
writing C. If the feedback is "just write the code for me", see *The spine*
below — that is a cold-lock item, not a tuning request.

## Invocation

Usually inline with the feedback as an argument, in their own words:

> `/tune "since i'm from a python background, more analogies between python and
> C would help — the comparison is what makes it land"`

If invoked bare with no argument, ask one question — "what about how this is
going do you want changed?" — and take the answer verbatim. Do not interview
further unless step 2 genuinely cannot route it.

## Do this in order

**1. Keep their words.** Quote the feedback verbatim in the log at step 5. Your
paraphrase is for the edit; their phrasing is the record. Never improve it.

**2. Route it to the file that owns it.** One owner per change. If it looks like
it needs two files, it is usually one real change plus a consequence — make the
real change, and only touch the second file if it would otherwise contradict.

| Feedback is about | Owner |
| --- | --- |
| How I teach — pace, Socratic depth, analogies, diagrams, how much to tell vs ask, when to intervene, tone | `CLAUDE.md` |
| What gets learned and in what order — phase contents, step ordering, drills, scope, exit tests, time budget | `ROADMAP.md` |
| Session ritual mechanics — quiz length, hint-ladder speed, how `/wrap` writes, what `/bug` asks | that skill's `SKILL.md` in `.claude/skills/` |
| Position, recall queue contents, open threads | `STATE.md` |
| Calibration — what they do and don't already know | `ROADMAP.md` → "Starting point" |

**3. Find what already covers it. This is the step that matters.**

Grep the owning file for the topic before writing anything. Most feedback is not
a new rule — it is an existing rule that is too weak, too buried, or phrased as
*permitted* when it should be *expected*. In that case **edit that line in
place**. Appending a second rule about the same thing is how these documents rot.

Only add a new rule when nothing in the file addresses the subject at all.

If the feedback **contradicts** something already written, say so out loud,
name the line, and change it rather than leaving both standing. Two rules that
disagree means the next session silently picks one.

**4. Write the edit so it changes behaviour.** Phrase it as an instruction with a
trigger, not a preference. "Prefer analogies" does nothing. "When introducing any
concept that exists in Python with different semantics, lead with the collision —
*in Python this X; here it Y* — before the C rule" changes a session. Match the
surrounding file's voice and formatting.

**5. Log one line in `TUNING.md`**, newest at the bottom:

`## YYYY-MM-DD — <topic>` then their verbatim quote, the file changed, and one
line on what changed. This log is the drift record — it is how they see, at the
monthly review, whether they have been quietly sanding the difficulty off.

**6. Apply it starting now**, not next session. If the current session is still
running, continue it under the new rule immediately.

**7. Report in at most 3 lines:** which file, whether you sharpened an existing
rule or added a new one, and the new text. Show the actual wording so they can
reject it. No preamble, no summary of what they just said back to them.

## The spine — cold-lock items

Five things exist specifically to survive the evening where it stops being fun.
Tuning them in that evening is the failure mode they were built against:

- **Claude never writes their C.** Including "just this once", "just the
  boilerplate", "just the signature".
- **Sanitizer and leak gates** — nothing is done until it is clean.
- **No phase skipped**, exit tests are gates.
- **The 30-minute rule** before asking for help.
- **Hand-rolled dependencies** — only libpq, OpenSSL, pthreads, libc.

If feedback targets one of these: **do not apply it.** Log it in `TUNING.md`
under a `PROPOSED — awaiting cold confirmation` heading with the date and their
full reasoning, and say in one sentence that it will apply if they reaffirm it on
a different day. Do not argue, do not lecture, do not ask them to justify it.
Then carry on with the session.

On a later date, if they reaffirm it, apply it and note both dates in the log.
A proposal that is never reaffirmed is answered by its own silence — never
remind them of a pending one.

**Everything else is fair game and applies immediately.** Pace, depth, analogy
density, diagrams, quiz length, drill count, phase scope and ordering, tone,
session length, how much theory precedes building. Be genuinely responsive here —
the spine is short on purpose, and treating ordinary feedback as suspicious is
its own failure.
