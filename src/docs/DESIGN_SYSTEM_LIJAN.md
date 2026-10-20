# LIJAN Design System — token layer and primitives

Scope: presentation only. No business logic, authorization, data model or export behaviour was
changed. Noto Naskh Arabic remains the only Arabic face, and every RTL/LTR rule below is
direction-logical.

## 1. Token layer — `src/index.css` + `tailwind.config.js`

| Group | Tokens | Notes |
| --- | --- | --- |
| Field | `--background`, `--foreground`, `--field-wash-1/2` | `.lijan-field` paints one warm-white (or maroon-black) field with two very low-intensity institutional washes. Applied once per shell, never per card. |
| Institutional colour | `--primary` `#8A1538`, `--primary-dark`, `--accent` / `--gold` `#B59A5B`, `--gold-ink`, `--secondary`, `--muted` | Gold has its own role (`text-gold`, `text-gold-ink`) in addition to `accent`. |
| Surfaces | `--card`, `--popover`, `--glass-surface`, `--glass-surface-strong`, `--glass-border`, `--glass-highlight`, `--glass-blur` | Complete colour values (not HSL channels) because their consumers are `var()` passthrough classes: `bg-glass`, `bg-glass-strong`, `border-glass-border`. |
| Scrim | `--scrim` | One scrim for dialogs, sheets and drawers. It is a dark veil in **both** modes — a foreground tint turned into a light veil in dark mode, which was the old bug. |
| Radii | `--radius-xs` 6, `--radius-control` 10, `--card-radius` 18, `--radius-pill` | Three steps only. |
| Spacing rhythm | `--space-stack` 12, `--space-gutter` 16, `--space-section` 24 | Mapped as `gap-stack`, `p-gutter`, `mb-section`. |
| Elevation | `--elevation-1/2/3`, `--elevation-overlay`, `shadow-surface` | One family; a hovered or opened surface rises exactly one step. |
| Motion | `--ease-sovereign`, `--dur-fast/base/slow/enter`, `lijan-rise`, `lijan-fade`, `lijan-sweep` | One curve, four durations. |
| State | `--state-{neutral,info,progress,success,warning,danger,ceremonial}-{surface,ink}` | The single status vocabulary; dark values re-read, never inverted. |
| Chart | `--chart-1…5` | Institutional sequence. |

### Dark mode

Both modes are declared in one place and consumed by the same class names. The mode follows the
operating system (`prefers-color-scheme`), and an explicit `lijan-theme` entry in `localStorage`
(`dark` | `light`) overrides it; `/src/main.jsx` applies the class before first paint. No page
decides a colour for itself.

## 2. Primitives (reach every page)

| Surface | File | Change |
| --- | --- | --- |
| Card | `ui/card.jsx` | Unchanged API; still the glass card (`.raqeem-card`). |
| Static surface | `index.css` | New `.lijan-surface` / `.lijan-surface-flat` for dense, nested or loading surfaces that must not drift. |
| Table | `ui/table.jsx` | Tinted header band, hairline rows, one hover step, no zebra, no vertical rules, hairline horizontal scroll, logical alignment. |
| Dialog | `ui/dialog.jsx` | Scrim token, glass panel, card radius, close control at the reading edge (`end-4`). |
| Sheet | `ui/sheet.jsx` | Scrim token instead of `bg-black/80`, close control mirrored and token-styled. |
| Button | `ui/button.jsx` | Added `gold` and `glass` variants; existing variants untouched. |
| Badge | `ui/badge.jsx` | Added `gold` ceremonial variant. |
| Select | `ui/select.jsx` | Logical `ps/pe` padding and `end-2` indicator (RTL bug), control radius, token popover. |
| Input / Textarea | `ui/input.jsx`, `ui/textarea.jsx` | Already token-driven; left as is. |
| Page header | `raqeem/PageHeader.jsx` | Gold hairline closing rule, section rhythm. |
| Shell | `nav/AppShell.jsx` | `.lijan-field`, hairline scroll region, one entrance per paint, scrim token. |
| Sidebar | `nav/AppSidebar.jsx` | Gold seam under the platform header. |
| Empty state | `raqeem/EmptyState.jsx` | Ceremonial gold plate, card radius, text scale. |
| Skeletons | `raqeem/LoadingSkeleton.jsx` | Static surface instead of levitating cards. |

## 3. RTL / LTR

- Every new rule is direction-logical: `inset-inline`, `start`/`end`, `text-start`.
- The gold hairline and the specular sweep mirror with the writing direction; neither is a
  physical `left`/`right`.
- Arabic keeps letter-spacing 0 and is never tracked or shadowed; hierarchy is size and weight.
- `uppercase` on table headers has no effect in Arabic and never adds tracking.

## 4. Verified / not verified

- Production build: clean, no warnings.
- Structural check at 390 / 768 / 1366: the shell's single scroll region, the table's horizontal
  scroll and the fluid header are unchanged in behaviour and now token-driven.
- **Visual sign-off at 390 / 768 / 1366 px in both modes is not yet done** — it needs the Testing
  Agent pass. Deferred with it: stock shadcn menu families (`dropdown-menu`, `context-menu`,
  `menubar`) still use physical padding for their indicator column.