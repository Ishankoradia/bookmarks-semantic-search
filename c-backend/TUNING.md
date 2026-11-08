# Tuning log — how the course changed, and why

`CLAUDE.md` and `ROADMAP.md` were written before I had been taught a single line
of C. They are a first guess. This file is the record of that guess being
corrected by contact with reality.

Written only by `/tune`. Each entry: the date, my feedback **in my own words**,
the file that changed, and what changed in it.

## What this log is for

Read it at the monthly review, alongside `LEARNINGS.md`. Two questions:

1. **Is the same feedback recurring?** Three entries about pace means the fix
   isn't a pacing line, it's that a phase is scoped wrong.
2. **Am I sanding the difficulty off?** Tuning should mostly make the teaching
   *fit* better — more analogies, better diagrams, different drill order. If the
   entries trend toward less drilling, fewer gates and more being told the
   answer, the course is being tuned into a tutorial and the fluency goal is
   quietly gone.

Items in **the spine** (no-code rule, sanitizer gates, no phase skipped, the
30-minute rule, hand-rolled deps) can't be changed in the moment. They land here
as `PROPOSED` and apply only if I reaffirm them on a different day.

---

# Log

<!-- newest at the bottom -->

## 2026-10-18 — lead with Python↔C analogies

> "since i am from pytohn background, its good give more such analogies between
> python & C. it makes me understand the comparison between both the languages."

**Changed:** `ROADMAP.md` → "Starting point". Sharpened the existing line rather
than adding a new rule — the file already permitted Python↔C collisions as "a
legitimate and useful teaching move". Promoted from *permitted* to *default, and
lead with it*: the comparison now comes before the C rule, not after, and gets
reached for by default rather than only when I flag confusion.

## 2026-10-18 — replace the bug journal with a learnings journal

> "i am not liking this bug entry format. I think we should rather have some
> sort of /learnings - where all this can go. and yes keep them generalized as
> much as possible."
>
> "i want to go way with BUGS.md" / "remove the bugs stuff"

**Changed:** `BUGS.md` and the `/bug` skill **deleted** (recoverable from git at
`5e05638`). Replaced by `LEARNINGS.md` + `/learnings`, and every reference
across `CLAUDE.md`, `ROADMAP.md`, `STATE.md`, `README.md` and the five remaining
skills repointed.

**What changed in substance, not just naming:**
- The unit is now **the generalized rule**, not the incident. The entry heading
  *is* the rule, so scanning headings gives a summary of everything I know.
- Three fields instead of four: the rule, the belief it replaced, and how I
  found out. The separate "category" field is gone.
- Scope widened — it now takes Python collisions, toolchain behaviour and things
  that simply clicked, not only bugs. Today's session produced 12 entries under
  the new format and exactly 1 under the old one, which is the evidence for it.
- The 15 memory categories survive as **tags**, so the mechanical→structural
  drift metric for Phases 2-5 is preserved.
- New: `LEARNINGS.md` is now the **source for `/teach`'s recall quiz**. Entries
  are already generalized rules, so each converts into a question for free.

**Evidence the old format was wrong, not just disliked:** today's `printf`
format-string mistake got filed as `alignment-aliasing` because the category
list was memory-flavoured and nothing else fit. The template forced a bad
classification, and buried the one line that mattered — the general rule.

**Flagged at the time, overruled:** I argued for narrowing `BUGS.md` to Phase 1B+
rather than deleting it, on the grounds that Phase 0 and 1A allocate nothing so
there are no memory bugs to log yet. Ishan reaffirmed the deletion. Tags carry
the metric instead.

## 2026-10-18 — tag learnings with date and phase

> "i think we need to tag learnings with the phase etc"

**Changed:** `LEARNINGS.md` and `.claude/skills/learnings/SKILL.md`. Added a
`**When:** YYYY-MM-DD · P<phase>` field to the entry format and backfilled all
13 existing entries.

**Added the date unprompted**, because the file already promised a metric it
couldn't compute: "the lengthening gap between occurrences is the evidence it's
sticking" is unmeasurable without dates. The phase enables the other half — a
phase-close retro can now ask what that phase actually taught.

## 2026-10-20 — added `/recap`

> "i need some sort of way or a commmand or skill to recp what i did in the my
> last session. just some highlights , super concise, some mistakes i made &
> learnt also if possible"
>
> "we recap things that are done, not the things we will do today or in the
> future."

**Changed:** new `.claude/skills/recap/SKILL.md`; command tables in `CLAUDE.md`,
`ROADMAP.md` and `README.md` updated to seven commands.

Zero-commitment orientation, distinct from `/teach`'s recap, which drags a quiz
and new material behind it. Three sections — Built / Got wrong / Banked — hard
capped at three bullets each. Read-only; `/wrap` still owns all state.

**Past tense only, as an enforced rule**, on Ishan's correction: no next action,
no handoff, not even a closing line. A recap that ends in "next up..." is a
nudge, and that wasn't what was asked for.

**Note:** this is a deliberate exception to the rule that `LEARNINGS.md` is
write-only to Claude. Scoped to headings only, last session only, and explicitly
refused mid-struggle — reaching for `/recap` while stuck routes to `/stuck`
instead.

## 2026-11-08 — teach handoff preps the work folder

> "can you add this in my workflow, if its a new session or new phase - make the
> folder ready for me and then ask me the question to build"

**File:** `.claude/skills/teach/SKILL.md` (step 5, Hand off to building).
**Added** a new rule: on a new step or new phase, `/teach` creates the step's
work folder (`mkdir -p p<phase>.<step>/`) before asking the build question, so
no session starts with the builder setting up scaffolding.

## 2026-11-08 — spend depth on C's nuances, move fast through the trivial

> "lets move a bit quickly through all this. we should spend time when we are
> comparing things between languages or looking at internals or how the languages
> works. basically spend more time on the nuances of C, memory, pointers. stuff
> thats not so trivial or is abstracted in python"

**File:** `CLAUDE.md` (What Claude does instead → item 1, Explain concepts).
**Sharpened** the existing "go deep; this is unlimited" line — which said to go
deep but not *where* — into a depth-allocation rule: move briskly through
mechanical/Python-like syntax (stop once correct), and bank the time for memory,
pointers, stack/heap, UB, internals, and Python↔C divergences. Name which kind of
topic is in play.

## 2026-11-08 — recall is gap-gated, not every-session

> "also recall makes sense when i done something today & i come later maybe
> tomorrow or after a few days. because i will definiltey need brushin there"

**File:** `.claude/skills/teach/SKILL.md` (step 3), + a one-line consequence fix
in `STATE.md`'s recall-queue note so it doesn't contradict.
**Changed** step 3 from "do not skip this" (every session) to **gap-gated**:
same-day / hours-later resumes skip the quiz (or ask ≤1 older item); the full
cold 2-3-question quiz runs only after an overnight-or-longer gap. Reason: four
same-day sessions today each opened with a quiz on hours-old material — badgering,
not spaced repetition.
