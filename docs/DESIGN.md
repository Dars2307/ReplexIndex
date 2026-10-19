# Nexora — Precision Atlas Design System (DESIGN.md)

## 1. Design Philosophy
**Nexora — Precision Atlas** combines editorial clarity, software research tools, spatial topology, and a premium developer workspace. The interface avoids generic "AI slop" aesthetics in favor of high-density technical utility.

## 2. Core Visual Invariants & Anti-Slop Rules
1. **Zero-Pill Metadata Discipline:** Metadata (categories, languages, licenses, timestamps) must be rendered as clean, unboxed text separated by subtle typographic dots (`·`) or slashes (`/`). Bordered pills or colored capsules are reserved strictly for interactive clickable buttons or filter tabs.
2. **Top Bar Contract:** Exactly three zones separated by `gap-8`:
   - Zone 1: Brand title wordmark, single line
   - Zone 2: 4–5 single-line navigation links (`whitespace-nowrap shrink-0`)
   - Zone 3: 1 primary action or tool group (PWA Install, Ingestion, Theme, Settings)
3. **No Fake Mechanical Clutter:** No `// 01` comment headers, no fake version tags ("SYNTHEX v4.8"), no decorative status dots pulsing next to static headlines, and no fabricated telemetry tickers.
4. **No Hallucinated Scoreboards:** Agent Readiness is presented as a transparent, checklist-backed calculation with verifiable facts, not an arbitrary 0-100 vanity score.
5. **Mobile Sticky Cap $\le 15\%$:** Bottom navigation and fixed bars are kept ultra-compact ($\le 56\text{px}$) with touch targets $\ge 44\text{px}$.

## 3. Color Palette Tokens

### Dark Theme (Default)
- **Canvas:** `#0B1018`
- **Primary Surface (Surface 1):** `#131B27`
- **Secondary Surface (Surface 2):** `#1A2533`
- **Raised Surface:** `#223044`
- **Subtle Border:** `#1E2B3C`
- **Strong Border:** `#2D3E54`
- **Primary Text:** `#F2F6FA`
- **Secondary Text:** `#A4B3C3`
- **Muted Text:** `#718296`
- **Accent (Teal Cyan):** `#52D5C5`
- **Accent Hover:** `#75E5D7`
- **Success:** `#34D399`
- **Warning:** `#FBBF24`
- **Conflict / Danger:** `#F87171`

### Light Theme
- **Canvas:** `#F5F7F8`
- **Primary Surface:** `#FFFFFF`
- **Secondary Surface:** `#EAF0F2`
- **Primary Text:** `#16232C`
- **Muted Text:** `#526471`
- **Accent:** `#0D9488`

## 4. Typography Scale & Tabular Discipline
- **Display / Brand:** *Plus Jakarta Sans* (Weight: 700–800)
- **Body & Controls:** *DM Sans* (Weight: 400–600, Line-height: 1.5–1.6)
- **Data, Telemetry & Code:** *JetBrains Mono* (`font-mono tabular-nums`)
- All numbers, star counts, dates, and scores use tabular numerals to prevent layout jitter.
