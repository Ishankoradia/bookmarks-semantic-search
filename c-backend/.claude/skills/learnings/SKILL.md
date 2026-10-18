---
name: learnings
description: Capture a generalized learning from the C training into LEARNINGS.md - a rule stated so it applies to code not yet written, plus the belief it replaced. Use when the user types /learnings, or says something clicked, surprised them, or turned out not to work the way they assumed.
---

# /learnings — bank a generalized rule

**Paths are relative to the project root, which is `c-backend/`** —
`LEARNINGS.md`, `STATE.md`, `ROADMAP.md` and `TUNING.md` are all in the working
directory.

This is the **only** capture mechanism for the training — the lab notebook and
the real deliverable. Bugs, Python collisions, toolchain behaviour and things
that simply clicked all land here, in the same format.

**The unit is the rule, not the incident.** An entry is worth writing only if it
would help in a file they haven't written yet. "`printf` needs `%d` for an int"
is an incident. "C does no implicit conversion — `printf` believes the format
string, not the bytes" is a rule.

## What belongs here

Anything that changed their model of how C or the toolchain works:

- A Python instinct that turned out to be wrong.
- Something the standard guarantees, or pointedly doesn't.
- Toolchain behaviour — what a flag does, what an error actually means, what
  a stage of the build consumes and produces.
- A surprise that wasn't a bug: an experiment that came out the other way.
- **Bugs.** A segfault, leak or sanitizer hit gets an entry at the moment of
  surprise, *before* the fix — the fix lives in git, this file holds the
  misunderstanding. Put the memory category in the tags (the list is at the top
  of `LEARNINGS.md`); the tag mix over time is the progress metric. Nag about
  this one: it is the core practice.

## Entry format

Three fields. Append to `LEARNINGS.md`, newest at the bottom.

```
## <the rule, stated generally, as the heading itself>

- **I used to assume:** ...
- **Found out by:** <one line - the concrete thing that proved it>
- **Tags:** `tag`, `tag`
```

The heading **is** the rule — a reader scanning only the headings should get a
usable summary of everything they know. If a heading can't carry the rule on its
own, the rule isn't general enough yet.

Tags are free-form but reuse existing ones; grep `LEARNINGS.md` before inventing
a new one. Current spine: `ub`, `toolchain`, `types`, `memory`, `process`,
`python-collision`, `standard`.

## Flow

Fast. This should take under a minute per entry.

**1. Get the rule.** Ask for it generalized. Push back **once** if it's
incident-shaped — state the test ("would this sentence help you in a completely
different program?") and ask again. Do not supply the general form yourself.
After one push, take what they give; a mediocre entry beats friction that stops
them writing entries at all.

**2. Get the belief it replaced.** "What did you assume instead?" If there was
no prior belief — genuinely new information rather than a corrected one — write
`**I used to assume:** nothing — new ground.` and move on. Don't manufacture a
misconception.

**3. Tags.** Suggest from the existing set, they confirm. This one you may lead
on; it's filing, not learning.

**4. Append and confirm in one line.** Nothing else.

## Whose words

**Theirs, by default** — the phrasing is part of the retention. Draft on their
behalf only when capturing retroactively (typically during `/wrap`, for things
that happened hours earlier in the session), and then **show the draft and get
it approved or edited before appending.** Never silently author an entry.

## Feeding the recall queue

`LEARNINGS.md` is the source for `/teach`'s spaced-repetition quiz. Every entry
should be answerable as a question.

When `/wrap` seeds the recall queue in `STATE.md`, it draws from entries added
since the last session — converting the heading into a question whose answer is
the rule. The rule *is* the answer; don't write questions that can be answered
by reciting the heading verbatim. Ask for the mechanism or a prediction:

- Entry: *"Falling off the end of `main` returns 0 — but only `main`."*
- Bad question: *"What happens when you fall off the end of `main`?"*
- Good question: *"A function returning `int` reaches its closing brace with no
  `return`. When is that defined, and when is it not?"*

## Rules

- **Never read entries back to them mid-struggle.**
  not in `/teach`, not in `/stuck`, not as a hint, not as "you wrote this one
  down already". Rediscovery is the point. This file is read by them, during
  review, and by `/wrap` when seeding the queue — nowhere else.
- **Duplicates are a signal, not a mess.** The same rule arriving twice from a
  different direction means it hadn't landed the first time. Log it again and
  note the earlier entry's date in `Found out by`. Don't dismiss it as known.
- **Never fix anything during this skill.** If they drift into debugging, bank
  the entry and point them at `/stuck`.
