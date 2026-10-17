---
name: bug
description: Log an entry in the C training bug journal (BUGS.md) by interviewing the user for the four fields and appending a formatted entry. Use when the user types /bug, or says they hit a segfault, leak, sanitizer error, or something in C that surprised them and needs logging.
---

# /bug — log a journal entry

**Paths are relative to the project root, which is `c-backend/`** — sessions are
started from inside it, so `BUGS.md` is in the working directory.

Capture one entry in `BUGS.md`. **Every word of substance is theirs.** You format
and append; you do not think for them. This skill exists to delete markdown
friction, nothing else.

## Absolute rules

- **Never propose the root cause, the category, or the rule.** Not as a guess,
  not as "sounds like X?", not as a multiple-choice list narrowed to the right
  answer. If they can't name it, the entry stays incomplete — that is a correct
  outcome, not a problem to solve.
- **Never read other entries back to them.** You'll see the file when appending.
  Do not mention that a category has come up before, do not say "again", do not
  hint that this resembles an earlier entry. Not even if it obviously does.
  Recurrence is expected and the recognition must be theirs. (`CLAUDE.md`.)
- **Never fix the bug**, or move toward fixing it, during this skill. If they
  start asking how to fix it, log the entry and point them at `/stuck`.

## Flow

Ask **one question at a time**, conversationally. Accept terse answers; this
should take 90 seconds, not 10 minutes. If they invoked it as `/bug <something>`,
treat that as the title and start from the first unanswered field.

**1. Symptom.** "What did the tool actually print?" Paste of ASan/UBSan/lldb
output is ideal — capture it verbatim in a fenced block, trimmed to the signal
lines. If there was no tool output (wrong answer, garbage data), their description
of the observed behaviour.

**2. Root cause — the false belief.** Ask: **"What did you believe that turned
out not to be true?"** Push for the belief, not the mechanism. If they answer
with what the code did ("the pointer was dangling"), ask once more: "right — and
what did you expect it to do instead, before this happened?" The sentence you
want starts with *I thought* or *I assumed*.

- If they genuinely don't know yet — common, because entries are written
  *before* the fix — write `**Root cause:** TBD — not yet understood` plus their
  current theory, and mark the entry `[OPEN]` in its title. Tell them to run
  `/bug` again once they've cracked it and you'll complete it.

**3. Category.** Show the category list from the top of `BUGS.md` and let them
pick. If they're unsure between two, that's theirs to settle — say so and let
them pick one, or write `?` and leave it for the monthly review. Do not steer.

**4. Rule I now hold.** Ask: "What's the general rule, stated so it applies to
code you haven't written yet?"

This is the one place you push back, because it's the one place a bad entry is
worthless. **Reject fix-shaped rules** — "I should free the buffer in
`arena_destroy`" is a fix, not a rule. Say so and ask again, without supplying
the general form. The test to state to them: *would this sentence have helped me
in a completely different file?* Push at most twice, then take what they give.

## Appending

Append to the end of `BUGS.md`, after the last entry, newest at the bottom:

```
## YYYY-MM-DD — <short title: the bug, where it was>

- **Symptom:**
- **Root cause:** I believed that ...
- **Category:** `category-name`
- **Rule I now hold:**
```

Use today's real date. Then confirm in **one line** — what was logged and its
category. No summary, no encouragement, no observations about the entry. They
have a bug to go fix.

## Completing an OPEN entry

If they return to finish one, find the `[OPEN]` entry, ask fields 2 and 4 (and 3
if unset), fill them in, drop the `[OPEN]` marker. Same rules — their words.
