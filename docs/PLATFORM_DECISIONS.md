# LIJAN™ — Platform Decision Register

One register for decisions that must hold across **every** surface. A decision is only
complete when it lives in shared source, existing consumers are migrated, and Arabic +
English and desktop + mobile are both covered.

Status values: `implemented` | `partial` | `planned`.

---

## D-01 — Brand identity
- **Decision:** Product is LIJAN™ / لجان™; powered by CONNECTION™.
- **Shared implementation:** `src/lib/brand.js` (logo URL, names, descriptor, tagline),
  `src/components/raqeem/BrandLogo.jsx`, `src/components/brand/BrandWordmark.jsx`,
  `src/components/brand/PoweredByConnection.jsx`.
- **Affected surfaces:** entry, explore gateway, workspace header, org/committee shells,
  exported documents, email templates.
- **Migration:** implemented. Entry no longer hard-codes a separate logo file.
- **Acceptance:** logo aspect ratio preserved; ™ protected from bidi reversal.

## D-02 — Typography
- **Decision:** Noto Naskh Arabic (400 / 700, locally bundled) for Arabic; Inter for English;
  hierarchy from size + weight + spacing only; no shadow, outline, glow, or letter spacing in Arabic.
- **Shared implementation:** `src/index.css` (`@font-face`, `[dir="rtl"]` rules),
  `src/lib/arabicTypography.js`.
- **Affected surfaces:** all pages, dialogs, drawers, tables, exports.
- **Migration:** implemented (inherited).
- **Acceptance:** no synthesized weights; Arabic line height and alignment correct in RTL.

## D-03 — Colour system
- **Decision:** LIJAN maroon, white, warm neutrals, dark neutral text, restrained gold.
  No blue, cyan, navy, purple, neon, heavy glassmorphism, or strong shadows.
- **Shared implementation:** tokens in `src/index.css`, mapped in `tailwind.config.js`.
- **Affected surfaces:** all.
- **Migration:** implemented (inherited).
- **Acceptance:** no raw hex in JSX for brand surfaces; semantic tokens used.

## D-04 — Entry architecture
- **Decision:** The public entry offers exactly two primary paths — **Sign In** and
  **Explore LIJAN** — plus one tertiary text link to the Public Committees Registry.
  No institution-selection proof of identity, no separate "Enter Demo Workspace" button,
  no persona card on the public screen.
- **Shared implementation:** `src/pages/EntryPortal.jsx`.
- **Affected surfaces:** `/`.
- **Migration:** implemented.
- **Acceptance:** both buttons work; registry link works; no institution gate.

## D-05 — Exploration session model
- **Decision:** Exactly one governed exploration session. One gateway (`/explore`), one
  session mechanism (`EffectiveActorContext.enterDemo`), and a stable direct route per
  persona (`/explore/:personaSlug`). Personas are resolved from the registry only —
  never from a URL parameter, local storage value, or typed institution.
- **Shared implementation:** `src/pages/ExploreGateway.jsx`, `src/pages/ExploreSession.jsx`,
  `src/lib/demoPersonas.js`, `src/lib/EffectiveActorContext.jsx`.
- **Affected surfaces:** `/explore`, `/explore/:personaSlug`, and the workspace shell.
- **Migration:** implemented.
- **Acceptance:** unknown slug shows a governed unavailable state; entering a persona clears
  the previous persona's cached context.

## D-06 — Person and membership model
- **Decision:** One person, one account, many independent committee memberships.
  Organization employment and committee ownership are separate concerns.
- **Shared implementation:** `CommitteeMembership` (`represented_organization_id`),
  `WorkstreamMembership`, `base44/shared/demoPersonas.ts`.
- **Affected surfaces:** workspace, org portal, committee workspace, AMEEN context.
- **Migration:** implemented (inherited).
- **Acceptance:** primary organization does not change when switching committees.

## D-07 — Committee workspace architecture
- **Decision:** One committee shell and one set of domain components for every committee,
  driven by the active committee context; internal tabs and descendant routes.
- **Shared implementation:** `src/components/raqeem/CommitteeLayout.jsx`,
  `src/pages/committee/hubs/*`, `src/lib/CommitteeContext.jsx`.
- **Affected surfaces:** every `/o/:orgRef/c/:committeeRef/*` route.
- **Migration:** implemented (inherited).
- **Acceptance:** no committee-specific forked pages; authorization checked on the server.

## D-08 — Assistant identity
- **Decision:** One assistant only — أمين / AMEEN. No second assistant name or launcher.
- **Shared implementation:** `base44/agents/ameen.jsonc`, `src/components/ameen/AmeenLauncher.jsx`,
  `src/lib/AmeenContext.jsx`.
- **Affected surfaces:** all authenticated and exploration surfaces.
- **Migration:** implemented (inherited).
- **Acceptance:** one launcher mounted in `src/App.jsx`; context inherits person, org,
  committee, role, page, and language.

## D-09 — Organization identity
- **Decision:** Logos resolve from the organization record (`logo_url`) through one
  component; never hard-coded per page.
- **Shared implementation:** `src/components/raqeem/OrganizationIdentity.jsx`,
  `base44/shared/orgIdentityResolver.ts`.
- **Affected surfaces:** workspace, org portal, committee header, documents, exports.
- **Migration:** implemented (inherited).
- **Acceptance:** no stretch, crop, recolour, or generic coloured square.

## D-10 — Documents: two separate experiences
- **Decision:** The **Committee Document Center** (operational files linked to committee,
  meeting, agenda, decision, minutes, action, workstream, report) is separate from the
  **Documentation & Executive Pack** (the approved institutional package).
- **Shared implementation:** `src/pages/committee/DocumentationHub.jsx` (committee),
  `src/components/docs/*` (executive pack).
- **Affected surfaces:** committee document navigation, documentation hub.
- **Migration:** implemented (inherited).
- **Acceptance:** the committee document item never routes to the executive pack.

## D-11 — Language parity
- **Decision:** One language per page. Backend status keys never render; every status has an
  Arabic and an English label. No cross-language fallback text.
- **Shared implementation:** `src/lib/l10n.js`, `src/lib/LanguageContext.jsx`,
  bilingual label maps in `src/lib/raqeemUtils.js`.
- **Affected surfaces:** all.
- **Migration:** implemented (inherited). Committee mandate/scope bilingual fields migrated.
- **Acceptance:** English page never shows Arabic copy; RTL direction follows the language.

## D-12 — Governed states
- **Decision:** Distinct loading, empty, select-context, no-membership, no-authority,
  error, and confirmed-success states. Never one generic 403; never convert a backend
  failure into an empty state.
- **Shared implementation:** `src/components/raqeem/EmptyState.jsx`,
  `src/components/raqeem/LoadingSkeleton.jsx`.
- **Affected surfaces:** all data surfaces.
- **Migration:** partial — shared components exist; individual pages still migrate onto them.
- **Acceptance:** a failed request shows an error state, not an empty list.

## D-13 — Motion and feedback
- **Decision:** Functional motion 150–240 ms, reduced-motion respected, no decorative
  floating animation, no delay to task completion.
- **Shared implementation:** `src/index.css` (`--transition-sovereign`,
  `prefers-reduced-motion` rules).
- **Affected surfaces:** all.
- **Migration:** implemented (inherited).
- **Acceptance:** reduced-motion honoured; material actions wait for confirmed persistence.

## D-14 — Provenance without banner noise
- **Decision:** Exploration provenance is preserved internally (persona key, dataset), but
  the experience is not covered with repeated demo/synthetic banners. Entry through the
  exploration gateway is sufficient visible context.
- **Shared implementation:** `src/lib/EffectiveActorContext.jsx` (session payload),
  `base44/shared/demoDataset.ts`.
- **Affected surfaces:** exploration workspace, profile.
- **Migration:** implemented — banner removed from the exploration workspace and profile.
- **Acceptance:** no banner stack inside the experience; provenance still recorded in the
  session and in `AuditEvent`.

---

## Removed / replaced manifest

| Removed or replaced | Replaced by |
|---|---|
| Institution selection on entry (`EntitySearchSelect` on `/`) | Sign In → `/login`; institution resolved server-side after authentication |
| Separate "Enter Demo Workspace" button | `Explore LIJAN` → `/explore` |
| Dr. Hamad card on the public entry (persona as third auth method) | Featured journey inside `/explore`, direct route `/explore/dr-hamad` |
| "Already have an account?" block beneath a Sign In form | Removed — entry offers Sign In directly |
| "AI-Assisted Onboarding" badge and entity-matching indicator | Removed with the institution gate |
| Entry-page logo hard-coded to an unshared asset file | `BrandLogo` (single shared brand asset) |
| Repeated demo banner inside the exploration workspace (`EntryPortal`, `Profile`) | Internal session provenance only |
| `lijan_pending_entity` / `lijan_pending_email` entry hand-off | Server-resolved identity after authentication |
| `src/components/raqeem/DemoBanner.jsx` (deleted — no remaining consumer) | `src/components/showcase/DemoBanner.jsx` retained for the labelled National Adoption Showcase page |
| Persona classification label ("Governed Synthetic Demonstration Persona") inside `PersonaContextPath` | Context path and role retained; provenance kept in the session and in `AuditEvent` |

**Retained with justification (no consumer, deliberately not deleted):**
`base44/functions/CheckUserRegistration` (server-side registration lookup, no longer called from
the entry page) and the `lijan_profile_affiliation` profile record still written by `/profile`.

`/create-portal`, `/committees-registry`, `/governance-policies`, `/profile`,
`/national-adoption-showcase`, `/activity-log`, and every `/o/...` route are **unchanged**
and remain reachable.

## Deferred (not yet migrated)
- Role-lens journeys (Chair / Secretary / Member) on the exploration gateway — only journeys
  with provisioned presentation data are shown, so the gateway currently offers the
  multi-committee executive and the auditor journeys.
- Route-level lazy loading and request cancellation for the committee shell (section 24).
- Full WCAG 2.2 AA sweep across dialogs and tables (section 25).