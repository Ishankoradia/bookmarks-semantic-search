# c-backend — learning C from scratch

Self-contained. **Start Claude sessions from this directory** — `CLAUDE.md` and
the `/teach` `/bug` `/review` `/stuck` `/wrap` commands only load when it's the project
root.

```
cd c-backend && claude
> /teach
```

`/bug` whenever something surprises you, `/wrap` when you stop.

That's the whole interface. `/teach` reads `STATE.md`, tells you where you were,
quizzes you on old material, and picks up from there. You never have to remember
anything between sessions — but you must run `/wrap` at the end, because it's
the only thing that saves state.

## The files

| | |
| --- | --- |
| `STATE.md` | **Where we are.** Position, last-session recap, open threads, recall queue, bug tally. Written only by `/wrap`. |
| `ROADMAP.md` | The curriculum — 8 phases, exit tests, reading list, session log. |
| `BUGS.md` | The lab notebook. One entry per surprise, written *before* the fix. The real deliverable. |
| `CLAUDE.md` | The teaching contract. Auto-loaded. |
| `.claude/skills/` | The five session commands. |
| `.claude/settings.json` | Pre-approved toolchain commands (clang, make, lldb, nm, leaks, test binaries) so sessions don't stall on permission prompts. |
| `.gitignore` | Build output, sanitizer artifacts, fuzz findings. |

## The deal

I write every line of C. Claude explains, questions, reviews, and hands me
failing test cases — and **never writes my code**, including when I ask for it
at midnight. The goal is fluency in C and manual memory management; the backend
rewrite is just the vehicle. Full terms in `CLAUDE.md`.

Permitted external deps: libpq, OpenSSL, pthreads, libc. Everything else —
HTTP server and parser, JSON, hash maps, strings, allocators, router, scheduler —
is hand-written, on purpose.

The Python backend in `../backend/` keeps serving production throughout. This is
a strangler rewrite with no cutover day.
