# Design system

Direction: a neutral, high-density developer tool with one accent — borders
over shadows, tabular numbers, keyboard-first. References: Apple Human Interface
Guidelines (contrast, dark-mode elevation, reduced motion, hit targets), Vercel's
Web Interface Guidelines and Geist, shadcn/ui tokens and the sidebar-07 shell,
and the restraint of Linear, Raycast and Supabase.

## Tokens (`src/index.css`)
Neutral surfaces tinted toward hue 270 with an iris accent (hue 275), defined in
oklch for light (`:root`) and dark (`.dark`). Contrast was computed (WCAG 2.x):

| Token | Dark | Light | Ratio on bg |
|---|---|---|---|
| `--fg` | 0.965 0.003 270 | 0.18 0.008 270 | ≈18:1 |
| `--fg-muted` | 0.72 0.012 270 | 0.47 0.014 270 | ≥5.8:1 |
| `--fg-subtle` | 0.62 0.012 270 | 0.535 0.014 270 | ≥4.6:1 |
| `--accent` | 0.70 0.15 275 | 0.52 0.20 275 | ≥5.7:1 with its fg |
| `--input` (borders) | 0.52 0.012 270 | 0.64 0.012 270 | ≥3:1 (WCAG 1.4.11) |

`prefers-contrast: more` raises muted text and borders; `prefers-reduced-transparency`
removes glass blur.

## Type
Geist (UI) and Geist Mono (code, slugs, numbers), self-hosted via Fontsource.
Scale: 12 / 13 / 14 (body) / 16 / 20 / 24 / 32, marketing 48–60. Weights 400/500/600.
Counts use `tabular-nums`. Mobile inputs are 16px to prevent zoom.

## Shape, space, elevation
Radius 4 (badges) · 6 (controls) · 10 (cards) · 12 (dialogs) · 16 (sheets).
4px spacing grid; controls 28/32/40px tall and at least 44px on touch devices.
Dark mode elevates with lighter surfaces and a 1px top highlight; light mode uses a
hairline border plus a two-layer soft shadow.

## Motion
Motion (`motion/react`): 120 ms micro, 160–200 ms menus/popovers (ease-out
`0.22,1,0.36,1`), spring `{stiffness 420, damping 34}` for dialogs and toasts,
exits faster than entries. Transform/opacity only. Respects
`prefers-reduced-motion` and a per-account "Reduce motion" setting.

## Accessibility checklist
Skip link · landmarks · focus moves to the page heading on navigation ·
visible `:focus-visible` rings · focus-trapped dialogs that restore focus ·
keyboard menus (arrows/Home/End/Esc) · combobox semantics in the command palette ·
polite live region for toasts · icon buttons always labelled · colour never the
only signal (icons + text for status) · `translate="no"` on repository names and
code.

## Effects used deliberately
A masked grid and soft accent glow on the landing hero only. No looping effects
inside the app.
