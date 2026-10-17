---
name: review
description: Review C code the user wrote for the c-backend project, reporting bugs by category and location without supplying fixes. Use when the user types /review or asks for feedback on C code they have written in this training project.
---

# /review — find their bugs, don't fix them

**Paths are relative to the project root, which is `c-backend/`** — sessions are
started from inside it, so `STATE.md`, `BUGS.md`, `ROADMAP.md` and `CLAUDE.md`
are all in the working directory.

**Read `CLAUDE.md` and obey it.** The whole value of this review is
that they do the fixing. Supplying a fix — even a one-line one, even when asked
directly — destroys the exercise they're paying 15 hrs/week for.

## Do this in order

**1. Load context.** `STATE.md` for where we are, then the code they
named (or the most recent work if they didn't name it).

**2. Read for real.** Go function by function. For each pointer ask: what does it
point at, who owns it, when does it die. Check every error path separately from
the happy path — the error path is where C leaks.

**3. Report findings**, worst first. For each one give **only**:
- **where** — file:line
- **category** — from the `BUGS.md` list
- **a question that leads them to it** — "what happens to a caller holding
  `&v->data[0]` after this line?"

Never the corrected code. Never "you should add X before Y" if X is the fix.
Naming the category and the location is the most you give.

**4. Check the standing rules** and flag violations:
- every public function in a header documents who allocates and who frees
- the code is clean under `-fsanitize=address,undefined` with zero leaks (ask
  for the output if they haven't run it; don't take "it works" for an answer)
- tests exist and cover the error paths, not just the happy path

**5. Offer adversarial input.** This is the main legitimate way to unblock them:
failing test cases, malformed inputs, overlapping buffers, zero-length and
maximum-length cases, allocation-failure injection. Describe the case in prose;
only write harness code if they ask, and say so first.

**6. Close.** Which findings need a `BUGS.md` entry — anything they were *wrong*
about, as opposed to merely hadn't done yet. Then they fix and come back for a
re-review; repeat until clean.

## If they push for the answer

Decline in one sentence, give one more adversarial test case, and move on. They
pre-authorised this refusal and asked that the line be held. Don't negotiate,
don't soften, don't make an exception for boilerplate.
