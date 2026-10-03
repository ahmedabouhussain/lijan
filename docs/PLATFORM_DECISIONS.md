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

## D-15 — Bilingual record values: no cross-language fallback
- **Decision:** A stored value may only be rendered for the language it belongs to. Where a
  legacy single-language column exists (it holds Arabic), it is read as the **Arabic** value
  only and is never returned for English — the English page shows an empty state instead.
  A form always writes the **active language's own field**, so a value typed on an English
  page can never be stored as the Arabic reading.
- **Shared implementation:** `bilingualOrLegacy()` and the `L.value()` accessor in
  `src/lib/l10n.js`; `AgendaItem.presenter_ar` / `presenter_en`.
- **Affected surfaces:** meeting agenda (meeting detail, committee agenda), decision detail
  breadcrumb/header, every surface reading a legacy single-language column.
- **Migration:** implemented — `presenter` migrated to `presenter_ar` + `presenter_en` for every
  agenda item holding a presenter; `SubmitAgendaItem` accepts the explicit pair and treats the
  legacy body field as the Arabic reading.
- **Acceptance:** no Arabic value renders on an English page; no English value renders on an
  Arabic page; unknown legacy values resolve to an empty state, never to the other language.

## D-16 — Exploration role lenses
- **Decision:** Role journeys (Chair / Secretary / Member) are **lenses over the one governed
  session** — not additional personas and not additional datasets. A lens chooses where the
  session opens: the committee where that persona already holds the role in the provisioned
  dataset. The authority displayed is always the one the server resolves from the membership,
  so a lens can never grant a role.
- **Shared implementation:** `DEMO_ROLE_LENSES`, `resolveRoleLens()`, `roleLensPath()` in
  `src/lib/demoPersonas.js`; `src/components/demo/RoleLensSection.jsx`; `?lens=` on the existing
  stable route in `src/pages/ExploreSession.jsx`.
- **Affected surfaces:** `/explore`, `/explore/:personaSlug?lens=`.
- **Migration:** implemented — three lenses on the canonical persona (chair →
  `DEMO-COMM-QDB-DIGITAL`, secretary → `DEMO-COMM-QDB-INNOVATION`, member →
  `DEMO-COMM-QDB-INVESTMENT`). A lens whose persona is not on the page is not shown.
- **Acceptance:** every lens lands on a committee the persona actually holds that role in; the
  session lands only after the governed session is active; an unknown or mismatched `?lens=`
  opens the workspace normally instead; no new dataset is required.

## D-17 — Route-level code splitting and request cancellation
- **Decision:** The organization and committee shells load on entering them, not on first
  paint. A read that a navigation abandons is discarded, never allowed to write into the
  surface the user has moved to.
- **Shared implementation:** `src/App.jsx` (`lazy` + one `Suspense` around `Routes`);
  a request token in `src/lib/CommitteeContext.jsx` and `src/hooks/useCommitteeScoped.js`.
- **Affected surfaces:** the `/o/...` portal and every `/o/.../c/...` committee surface
  (54 split route modules), plus every consumer of `useCommitteeScopedData`.
- **Migration:** implemented.
- **Acceptance:** build passes; the entry route no longer carries the committee shell;
  switching committee while a read is in flight never leaves the previous committee's data
  on screen.

## D-18 — One governed page header
- **Decision:** Every committee surface presents the same page header: icon in the institutional
  badge, title, optional count badge, and its primary action on the same row. No surface
  re-implements its own header row.
- **Shared implementation:** `src/components/raqeem/PageHeader.jsx`.
- **Affected surfaces:** all committee surfaces except `CommitteeHome` (role dashboard with its
  own composition) and `DocumentationHub` (release hero), which keep their own headers by design.
- **Migration:** implemented — 36 committee surfaces migrated to `PageHeader`; the ad-hoc
  `text-lg font-bold` header rows are gone. The six hub files are tab containers that delegate to
  their children and correctly render no header of their own.
- **Acceptance:** one header component across the workspace; every migrated header keeps its
  count badge and its primary action on the same row.

## D-19 — Accessibility baseline (WCAG 2.2 AA, code-level criteria)
- **Decision:** The mechanically checkable AA criteria hold across the committee workspace:
  every control has an accessible name, every form control is programmatically labelled,
  decorative icons are hidden from assistive technology, tab sets expose tab semantics, the
  workspace has landmarks and a skip link, and loading regions announce their state.
- **Shared implementation:** `CrudFormDialog` (label association, `aria-required`, `role="alert"`,
  labelled close button), `CommitteeHubTabs` (`tablist` / `tab` / `tabpanel`, `aria-selected`,
  `aria-controls`), `CommitteeLayout` (skip link, `id="committee-main"`, navigation landmark,
  `aria-current="page"`, `aria-expanded`, labelled icon-only controls), `PageHeader`,
  `EmptyState` and `LoadingSkeleton` (`aria-hidden` on decorative icons, `role="status"` plus
  `aria-busy` on skeletons), `EntitySearchSelect` (`aria-expanded`, labelled clear control and
  search field), `CommitteeRoles` (`scope="col"` on table headers).
- **Affected surfaces:** the whole committee workspace plus every consumer of the shared
  components above.
- **Migration:** implemented at the code level. Contrast was verified against the tokens: muted
  text on the page background measures 4.61:1, so the palette passes AA for normal text and the
  failure is not systemic.
- **Acceptance:** no icon-only control without a name; no form field without a programmatic
  label; no decorative icon exposed to assistive technology.

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
| "Demo Persona Identity" title, "Demo" badge and fictional-persona disclaimer on `/profile` (three repetitions of the same label) | One "Exploration Session Identity" card with a single provenance line |
| `lijan_profile_affiliation` localStorage mirror (write-only after the entry hand-off was removed) | `base44.auth.updateMe` remains the single record of institutional affiliation |

**Retained with justification (no consumer, deliberately not deleted):**
`base44/functions/CheckUserRegistration` (server-side registration lookup, no longer called from
the entry page).

`/create-portal`, `/committees-registry`, `/governance-policies`, `/profile`,
`/national-adoption-showcase`, `/activity-log`, and every `/o/...` route are **unchanged**
and remain reachable.

## Deferred (not yet migrated)
- **Assistive-technology validation.** The AA criteria above are met in code; confirming them
  with a screen reader and at 200% zoom is a manual audit, not a further code change.
- **Page-body control audit.** Shared controls and every page header/loading/empty state are
  covered. Controls inside individual page bodies (in-row icon buttons, per-page filter inputs)
  are migrated as each surface is touched, not by a single sweep.
- **Two Arabic-only legacy surfaces.** `CommitteeAmendments` and `CommitteeEstablishment` hold
  hardcoded Arabic copy and force `dir="rtl"`, so they do not switch language. Fixing them means
  translating both surfaces, not changing a direction attribute.
- `LocalizedFileUpload` takes Arabic-only labels (including its accessible name). Making it
  bilingual changes its caller API and is not a one-line change.

**Closed since the previous pass:** role-lens journeys (D-16), route-level lazy loading and
request cancellation for the committee shell (D-17), the repeated demo labelling on `/profile`
(D-14), header unification (D-18) and the accessibility baseline (D-19).