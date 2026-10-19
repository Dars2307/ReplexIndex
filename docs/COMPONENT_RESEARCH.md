# Nexora — Component Research & Provenance Report

## Research Methodology & Evaluation Criteria
In accordance with Section 4 of the Nexora Specification, all interface components, primitives, and interaction patterns were researched prior to integration. Every evaluated dependency was audited against 10 strict criteria:
1. Official URL and verified repository source
2. Permissive licensing (MIT / ISC / Apache-2.0)
3. React 19 and Vite framework compatibility
4. Zero unvetted dependencies and minimal bundle footprint
5. Strict keyboard accessibility, ARIA compliance, and visible focus rings
6. High-density mobile viewport behavior (touch target $\ge 44\text{px}$)
7. Active upstream maintenance signals
8. Adaptation to the "Nexora — Precision Atlas" design system
9. Documented component provenance
10. Elimination of unnecessary pill containers, candy badges, and decorative telemetry tickers

---

## 1. Selected Components & Primitives

### Component 1: Lucide React (Vector Icon Primitives)
- **Official URL:** https://lucide.dev | https://github.com/lucide-icons/lucide
- **Intended Usage:** Unified UI iconography across navigation, metrics, statuses, and search controls.
- **License:** ISC License (100% commercially permissive).
- **Dependencies:** Zero external runtime dependencies. Tree-shakeable SVG exports.
- **Selection Rationale:** Consistent 24x24 grid geometry, adjustable stroke width, and strict accessibility labels (`aria-hidden` with paired text).
- **Adaptations Required:** Styled with Nexora semantic color tokens (`#52D5C5`, `#F2F6FA`, `#718296`).

### Component 2: Motion (Framer Motion Native Spring Primitives)
- **Official URL:** https://motion.dev | https://github.com/framer/motion
- **Intended Usage:** Purposeful route transitions, modal entrance animations, and reduced-motion fallback compliance.
- **License:** MIT License.
- **Dependencies:** Minimal compositor-only transforms (`transform`, `opacity`).
- **Selection Rationale:** Native hardware acceleration avoiding layout geometry thrashing (`width`/`height` on hover banned).
- **Adaptations Required:** Integrated with `prefers-reduced-motion` user toggle in Nexora Settings.

### Component 3: Tailwind CSS v4 Engine
- **Official URL:** https://tailwindcss.com | https://github.com/tailwindlabs/tailwindcss
- **Intended Usage:** Utility-first styling engine with native CSS variables for dark/light theme switching.
- **License:** MIT License.
- **Dependencies:** `@tailwindcss/vite`.
- **Selection Rationale:** Fast compilation, zero runtime CSS injection overhead, and standardized layout tokens.
- **Adaptations Required:** Configured with custom Nexora Precision Atlas dark and light color tokens in `index.css`.

---

## 2. Anti-Slop Audit & Rejected Paradigms
During the research phase, the following popular patterns were explicitly rejected:
- **Rejected:** Glassmorphism / heavy backdrop blur cards with thick glowing borders (obscures technical data legibility).
- **Rejected:** Static metadata pill boxes and candy badge clusters (replaced by clean unboxed text with `·` separators).
- **Rejected:** Mechanical code-comment section headers (e.g. `// 01 ARCHITECTURE` replaced with natural title prose).
- **Rejected:** Arbitrary AI hallucination scoreboards (e.g. "98/100 INNOVATION SCORE" replaced with transparent checklist of verified facts).
- **Rejected:** Continuous status dot pulses on static titles (status dots strictly reserved for real streaming connection telemetry).
