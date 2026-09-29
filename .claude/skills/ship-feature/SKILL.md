---
name: ship-feature
description: Use whenever adding, building, or changing a user-facing feature, screen, component, or UI element in this product. Enforces that the change lands on BOTH the webapp (frontend/) and mobile (mobile/) with consistent styling, colors, behavior, and copy — never one surface only. Trigger on any "add/build/implement/change a feature/UI/screen/setting/flow" request.
---

# Ship a feature across both surfaces

This product has one shared backend and multiple clients. A user-facing change is
**not done until it exists on BOTH the webapp (`frontend/`) and mobile (`mobile/`)**,
looking and behaving consistently. Shipping to one surface only is the #1 mistake
this skill exists to prevent.

Reference map: `docs/DEVELOPMENT.md`. Cross-surface rule: `CLAUDE.md`.

## Non-negotiable rules

1. **Both clients, every time.** If the feature changes UX, implement it in
   `frontend/` AND `mobile/`. Do not stop after one. (Chrome extension only if the
   change clearly affects it — it changes rarely.)
2. **Backend once, shared.** Change the API in `backend/` a single time; both clients
   consume the same response shape. Verify both still match after the change.
3. **Never hardcode colors.** Use the theme tokens so the feature works in all four
   themes (light / dark / amoled / system):
   - **Web:** Tailwind token classes backed by CSS vars in `frontend/app/globals.css`
     — e.g. `bg-background`, `text-foreground`, `text-primary`,
     `text-muted-foreground`, `bg-card`, `border-border`, `bg-primary
     text-primary-foreground`, `text-destructive`. No raw hex / arbitrary values.
   - **Mobile:** `const { colors } = useTheme()` from `mobile/src/theme/ThemeContext`,
     then `colors.background`, `colors.foreground`, `colors.primary`,
     `colors.mutedForeground`, `colors.card`, `colors.border`, etc. No hex literals in
     styles.
4. **New color → add to every palette.** If the feature needs a color token that
   doesn't exist yet, add it in matching places on BOTH surfaces:
   - Web: a `--var` in `:root`, `.dark`, AND `.amoled` in `globals.css` (+ the
     `@theme inline` map).
   - Mobile: the key in `lightColors`, `darkColors`, AND `amoledColors` in
     `mobile/src/theme/colors.ts`.
   Skipping a palette = broken theme. There is no partial add.
5. **Parity.** Same behavior, states (loading / empty / error / disabled), and
   user-facing copy on both surfaces. Wording should match unless a platform idiom
   requires otherwise.

## Token parity (web ↔ mobile)

Keep these aligned when styling. Web class ← CSS var ↔ mobile `colors.*` key:

| Web (Tailwind) | mobile `colors.*` |
| --- | --- |
| `bg-background` / `text-foreground` | `background` / `foreground` |
| `bg-card` / `text-card-foreground` | `card` / `cardForeground` |
| `bg-primary` / `text-primary-foreground` | `primary` / `primaryForeground` |
| `bg-secondary` / `bg-muted` / `text-muted-foreground` | `secondary` / `muted` / `mutedForeground` |
| `bg-accent` / `border-border` / input | `accent` / `border` / `input` |
| `text-destructive` / success / warning / info | `destructive` / `success` / `warning` / `info` |

## Workflow

1. **Scope it.** State what changes on the backend (if anything) and what the UI is
   on each client. Note which existing patterns/components to mirror.
2. **Backend (if needed).** Model → schema → route → Alembic migration. Keep the
   response shape shared. Run `cd backend && uv run alembic upgrade head` if migrated.
   (Prefer `uv` directly; no wrapper scripts.)
3. **Webapp (`frontend/`).** Build with shadcn/Radix components and token classes.
   Match the surrounding app-router + component structure. Settings/toggles usually
   live on the profile page.
4. **Mobile (`mobile/`).** Build the RN equivalent in `mobile/src/`, styling only via
   `colors` from `useTheme()`. Mirror the web behavior and copy.
5. **Consistency pass.** Walk the two implementations side by side and confirm:
   same colors/tokens, same states, same copy, works in light/dark/amoled. Fix drift.
6. **Verify.** Web: `cd frontend && npm run lint`. Mobile: type-check / reload. The
   user prefers to run long builds themselves — don't kick those off; report what to
   run.

## Definition of done (check before declaring complete)

- [ ] Backend change (if any) made once; both clients match the response.
- [ ] Implemented in `frontend/` **and** `mobile/`.
- [ ] Zero hardcoded colors — only theme tokens on both surfaces.
- [ ] Any new color added to web `:root`/`.dark`/`.amoled` **and** mobile
      `lightColors`/`darkColors`/`amoledColors`.
- [ ] Renders correctly in light, dark, and AMOLED.
- [ ] Behavior, states, and copy match across surfaces.
- [ ] Told the user the exact lint/build commands to run to verify.

If you can only complete one surface in this pass, say so explicitly and list what
remains on the other — never let a half-shipped feature read as done.
