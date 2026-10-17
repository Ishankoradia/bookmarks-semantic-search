# Bug journal

Written **at the moment of surprise, before the fix.** The fix lives in git;
this file holds the misunderstanding that caused it.

Entry = 4 fields. Symptom (what the tool printed) / Root cause (the false thing
I believed, one sentence) / Category (from the list) / Rule I now hold (general,
not specific to this bug).

## Categories

Tally these monthly. The mix matters more than the count.

| Category | Means |
| --- | --- |
| `leak` | allocated, never freed on the success path |
| `error-path-leak` | freed on success, leaked on an early return |
| `double-free` | freed twice, or freed something not owned |
| `use-after-free` | read/wrote through a pointer to released memory |
| `dangling-stack` | kept a pointer to a dead stack frame |
| `pointer-invalidation` | held a pointer across a realloc/resize/mutation |
| `buffer-overrun` | wrote past the end of a block |
| `off-by-one` | the NUL byte, the `<=`, the length-vs-capacity confusion |
| `uninitialised-read` | read memory before writing it |
| `integer` | overflow, signed/unsigned mix, bad truncating conversion |
| `alignment-aliasing` | cast to an incompatible type, unaligned access |
| `ownership-ambiguity` | the API never said who frees it, so nobody/both did |
| `lifetime-design` | the structure outlived or underlived what it pointed at |
| `concurrency` | race, missing lock, lock ordering, non-atomic access |
| `fd-leak` | file descriptors are memory too |

Phases 1-3 should be dominated by the mechanical ones. If `ownership-ambiguity`
and `lifetime-design` aren't the majority by Phase 5, the drills didn't take.

## Two rules about how this file is used

**Claude never reads this back to me.** Not as a hint, not mid-debugging, not
"you've hit this before". Rediscovering a mistake by hand is the point; being
handed back my own rule skips it. This file is read at the monthly review, by me.

**Repeats are expected and get their own entry.** Hitting the same category
again in a new disguise isn't a failure — it's the normal path, and I debug it
from scratch each time. The recurrence count is the data: three
`pointer-invalidation` entries in month two and none after month five is how I
know it stuck.

## Monthly review

First of the month: reread everything, tally by category, and write one line
about what the top category is telling me to change *structurally* — not which
bug to fix, which habit to replace.

---

# Log

<!-- newest at the bottom; copy the template, fill all four fields -->

## YYYY-MM-DD — <one-line title: the bug, where>

- **Symptom:**
- **Root cause:** I believed that ...
- **Category:**
- **Rule I now hold:**
