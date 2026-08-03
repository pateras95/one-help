# OneHelp Complete Visual Direction Proposal

This is a planning document only — no files were modified, no packages installed. It's grounded in direct inspection of the current codebase (`BrandLogo.vue`, `main.css` tokens, `vuetify.js` theme, `ActionCard.vue`, `HomeView.vue`, `AppNavigation.vue`, `AppBottomNavigation.vue`, `AppFooter.vue`, `LoginView.vue`/`RegisterView.vue`, `OrganizerDashboardView.vue`, `AdminDashboardView.vue`, `AdminSummaryCard.vue`, `ActionsListView.vue`, `EmptyState.vue`, `LoadingState.vue`, `actionCategories.js`) plus the ten confirmed problems and the screenshots provided at the time of this analysis.

---

## Current Visual Problems

**Header.** Flat white app bar, thin grey border, text/underline nav links. Functionally fine, but there's no texture, weight, or brand signature — it reads as "a Vuetify app bar with a logo dropped in," not "OneHelp's header." *Global.*

**Home hero.** Headline + lead + two buttons + a CSS-built "illustration" (a white circle with the logo mark and three small colored dots orbiting it). The orbiting dots are meant to suggest categories but read as decoration with no story. The radial-gradient wash behind the hero is barely perceptible at typical screen brightness. Net effect: still feels like a hero template, not a considered opening statement. *Component-specific (`HomeView.vue`), but sets the tone for everything else.*

**Category section.** The bento-grid treatment (one featured 2×2 tile + four smaller tiles) is genuinely one of the more distinctive things in the app today. Weakness: every tile uses the same white-card-plus-colored-circle-icon formula as everything else in the product (empty states, step icons, admin summary cards), so despite the clever grid, it doesn't feel like *its own* moment. *Component-specific, but the icon-in-colored-circle motif is global and overused.*

**How It Works.** Three icon-in-circle steps with a connecting line on desktop. Clean, but generically "SaaS onboarding stepper" — no sense of a real person's journey (find → join → show up), no urgency variant, no motion when it scrolls into view. *Component-specific.*

**CTA (closing section).** A primary→secondary gradient panel with white text and a button — the single boldest surface in the app, which is telling: gradient is used exactly once, only at the very bottom, and nowhere else in the visual system reinforces it. It reads as an isolated "template CTA block," not a recurring brand device. *Global gap.*

**Action Cards.** Structurally now well-aligned (fixed-height title/description/meta/status regions, button always pinned via `mt-auto`) — the *alignment* complaint is largely fixed. What's still weak: every card is visually identical in weight regardless of urgency or category — a routine Saturday clean-up and an urgent blood-drive card differ only by a small chip's color, not by any structural emphasis. Category color reuse is also a real problem: `actionCategories.js` maps categories straight onto the five *semantic* theme roles (`emergency→error`, `health→primary`, `environment→success`, `social→secondary`, `animals→warning`), so the "animals" category chip and an "urgent" priority badge can render the exact same amber — two unrelated meanings sharing one color. *Global data/styling mismatch, fixable without touching the category data model.*

**Filters (Actions list).** Three plain outlined `VSelect`s in a row plus a text-only "reset" link — textbook default Vuetify form chrome, no different from category dropdowns in an admin CRUD screen. *Component-specific.*

**Map page.** Functionally solid (Leaflet + a rich selected-action side panel), but visually it's "a Leaflet map in a bordered card" — no branded chrome around it, no distinctive marker style, the selected-panel card looks identical to every other card in the app. *Component-specific.*

**Login/Register.** This is the most disconnected screen in the product today, exactly as flagged. A big centered logo, a plain white card, outlined text fields, a full-width button — a textbook auth template with the OneHelp logo pasted on top. Nothing about the surrounding space, the card shape, or the background says "OneHelp" versus "any Vuetify starter." *Global pattern — needs a shared `AuthLayout` treatment, not per-field tweaks.*

**Footer.** A 3px gradient seam was added at the top, which is a start, but the four-column white block beneath it is otherwise identical to every other flat surface in the app — no visual anchor, no personality. *Component-specific.*

**Mobile bottom navigation.** Functionally good (a small colored bar marks the active tab — genuinely one of the nicer existing details). Weakness: it's the *only* place that detail exists; the equivalent desktop nav only recently got a matching underline, and neither reads as an intentional "OneHelp" signature versus a default Vuetify bottom-nav.

**Organizer dashboard.** Four plain white stat cards (`text-h5` number over `text-caption` label, no icon, no color) sit directly above a grid of `OrganizerActionCard`s that *do* have icon+color avatars via `AdminSummaryCard`-style treatment elsewhere. This is an internal inconsistency: the *admin* dashboard's summary cards (`AdminSummaryCard.vue`) have a colored icon avatar; the *organizer* dashboard's inline stat cards do not, despite showing conceptually the same kind of data. *Global inconsistency between two features that should share one "stat card" language.*

**Admin dashboard.** Best-treated dashboard in the app today (icon+color avatar stat cards, a nav-tab strip, a recent-activity list) — but the visual language stops at the dashboard; `AdminNavTabs`, list/table rows, and dialogs elsewhere in `/admin/*` fall back to plain Vuetify defaults. *Component-specific spillover, not a dashboard-level problem.*

**Empty/loading states.** Both were given a small branded touch this session (a tinted icon badge; a pulsing mark inside the spinner). They're consistent with each other now, but both are still fundamentally "a centered icon, a headline, a caption" — there's no illustration, no personality, no differentiation between "no actions yet" vs "no search results" vs "an error." *Global, single-component fix cascades everywhere.*

**Logo.** The current `BrandLogo.vue` — three rotated identical petal shapes around a hub — is, on honest re-inspection, exactly the kind of "abstract shape with no obvious meaning" the brief warns against. It was designed to *avoid* clichés (hearts/hands/crosses) but overcorrected into pure abstraction: nothing about three identical rotated petals specifically says "people," "volunteering," "coordination," or "movement." It needs to be replaced with something that keeps the abstraction (good instinct) but re-anchors it in a legible, describable idea. *Global — logo touches header, footer, auth, about, empty/loading states, and (per this brief) potentially a favicon.*

---

## Direction 1

### Name
**Signal**

### Core feeling
Warm urgency without alarm. The feeling of someone raising a hand and someone else immediately turning toward them. Confident, editorial, a little bit civic-campaign-poster — but modern, not government-issue. Works equally as "here's a Saturday park clean-up" and "we need blood donors tonight."

### Color approach
- **Primary — Deep Ink Navy** (`#132A4D`, close to today's `#1B3A6B` but slightly deepened): the "trust and calm" anchor. Used for headline text, primary buttons, the app bar wordmark.
- **Secondary — Signal Coral** (`#E85C3F`): a warm, energetic red-orange — *not* the same hue as the error/urgent color, which is critical (today primary/secondary/error are close enough in temperature that urgency doesn't stand out). Used sparingly: the logo's second mark color, hover accents, the CTA panel, the relay-motif highlight.
- **Accent — Warm Amber** (`#F0A93A`): a genuinely distinct third hue for "attention without alarm" contexts — badges, the "featured" category tile, in-progress states.
- **Background** stays close to today's `#F7F9FA` — a warm-neutral off-white (nudge very slightly warmer, e.g. `#F8F7F4`) rather than the cooler blue-grey it leans toward now.
- **Surfaces**: white cards on the warm background, but *sections* alternate between plain white and a very light coral-tinted wash (like today's `surfaceVariant`, recolored warm instead of teal) so scrolling through Home has visible rhythm instead of one long white page.
- **Text**: keep the existing navy-based `textPrimary`/`textSecondary` — no change needed, already good contrast.
- **Category colors**: give each category its *own* hue instead of borrowing the five semantic roles — e.g. Health → a muted rose, Environment → forest green (kept), Social support → the navy primary, Animals → a warm ochre distinct from the Amber accent, Emergency → Signal Coral (and *only* emergency uses that hue, so it's never ambiguous with an unrelated "urgent" badge elsewhere).
- **Emergency color**: Signal Coral, reserved *exclusively* for emergency-category and urgent-priority contexts — nothing else in the UI may use this exact hue, so the one time it appears, it means something.

### Typography
No new fonts (Roboto stays). Headline style: bold, tight letter-spacing, slightly larger than today's `oh-display` scale, set in navy — treated as a short, punchy statement (one line where possible), not a paragraph-length hero headline. Body style: current `text-body-1`/`text-body-2` scale unchanged — this app's Greek/English body copy already reads well at that size/weight. Navigation style: medium-weight, uppercase-free (today's nav is already sentence case, correct call for Greek — small caps and uppercase both hurt Greek diacritics' legibility). Button style: bold, slightly wider letter-spacing on primary CTAs only, never uppercase (again, Greek diacritics). Greek/English compatibility: Roboto already has full Greek coverage: no risk.

### Shape language
Cards keep today's rounded-lg corners but gain a slightly asymmetric top-left "notch" accent on featured/emphasis cards only (a small coral quarter-circle tucked into one corner) — a repeatable, low-cost signature shape rather than decorating every card. Sections alternate flat and gently curved dividers (a shallow SVG wave or angled edge between two full-bleed sections, used once or twice per page, not everywhere). Borders: keep the existing thin `border` on `VCard` (it already reads as "restrained," don't lose that). Shadows: soft and warm-tinted (reuse the `--oh-shadow-*` tokens already built this session — they're already the right instinct, just underused). Icon containers: replace the plain colored circle (used everywhere today — hero, categories, steps, empty states, stat cards) with a softly-rounded *squircle* (superellipse) exclusively for this direction, so "Signal" has one instantly recognizable container shape nothing else in the current app uses. Decorative elements: a single recurring "relay arc" motif — a thin, incomplete circular arc with a small dot at each end — used as a section-divider accent or hero background element, never as clipart.

### Motion language
Page entry: content fades up 8–12px, staggered slightly by section (not per element — avoid "confetti" staggering). Card hover: the existing `oh-card-interactive` lift (translateY + soft shadow) stays, plus the squircle icon container scales up ~4% on hover. Button interaction: a brief coral underglow ring on focus/press rather than Vuetify's default ripple alone. Navigation state changes: the existing underline-indicator slides between tabs (animate `left`/`width`, not just opacity) instead of snapping. Loading: the current pulsing logo mark stays; add a slow (3–4s) rotation of the relay-arc motif behind it for longer loads. Empty states: the branded icon badge gets a one-time gentle "settle" animation on mount (scale 0.9→1, opacity 0→1), not a loop. Reduced-motion fallback: every transform-based effect above collapses to an opacity-only or instant state change, exactly matching the `prefers-reduced-motion` pattern already established in this codebase (`AppBottomNavigation`, `.oh-card-interactive`).

### Home page concept
Hero keeps its two-column layout, but the illustration side becomes a simple animated "relay" moment: two squircle nodes with the arc motif between them, one lit navy, one lit coral, suggesting a handoff — legible at a glance, not abstract soup. The category grid keeps its bento layout (it's genuinely good) but each tile gets its own category hue instead of the five recycled semantic colors. "How It Works" steps get the squircle icon containers and the relay-arc as the connecting line instead of a plain grey line. The closing CTA keeps the gradient panel but the gradient becomes navy→coral (matching the new secondary) instead of navy→teal, so it visually rhymes with the hero and the logo.

### Action Cards concept
Same fixed-region skeleton already built this session — it's structurally correct and should be kept:
- **Badge/header zone**: fixed-height row, category chip (now category-specific hue) + optional urgency chip. Emergency-category and "urgent" priority visually converge on Signal Coral *only* here — since it's now the one reserved hue, that convergence is intentional and readable, not a collision.
- **Title zone**: fixed 2-line reserve (unchanged).
- **Description zone**: fixed 2-line reserve (unchanged).
- **Metadata zone**: unchanged three-row date/location/organizer block.
- **Participation/status zone**: unchanged, but the status chip's "open" green could shift to use the squircle badge shape at `x-small` for consistency with the new container language.
- **Action button zone**: unchanged large tonal button, `mt-auto`-pinned.

The one addition: an emergency/urgent card variant gets a 3px coral left-edge stripe (via a pseudo-element, not a layout change) — a cheap, consistent way to make urgent cards *feel* different without breaking the shared grid alignment.

### Login concept
Replace the plain centered-card `AuthLayout` with a two-panel layout on tablet+ screens: the form stays in a white card on the right, but the left half (hidden on mobile) carries a navy surface with the relay-arc motif, the stacked logo, and a short rotating line of copy ("Two hours can change someone's Saturday." / "Someone needs this today.") pulled from existing translated strings — same login logic, same fields, same validation, just no longer "a form floating in white space." On mobile, that panel collapses to a compact navy header strip above the form instead of disappearing entirely, so the brand moment isn't lost on the majority-mobile audience this app is built for.

### Organizer/Admin concept
Both dashboards adopt the same squircle-icon stat card as the *one* shared "metric card" component — replacing the plain-text organizer summary cards *and* restyling (not replacing) `AdminSummaryCard.vue`'s existing avatar so they're visually one family instead of two. No change to what data each shows or how it's computed. Table/list rows and nav tabs stay Vuetify-plain (deliberately) — the brand language shows up in headers, stat cards, and primary actions only, exactly where the brief asks for "shared language without becoming decorative or difficult to use."

### Logo concept
**Icon meaning**: two simple, asymmetric arcing forms mid-handoff — like a baton passed between two runners, or one open hand's gesture passing something to the next, abstracted into two clean curved shapes (not literal fingers) with a small connecting dot where the "pass" happens. Reads as: *help moving from one person to the next* — directly answers "coordinated help" and "movement toward shared purpose" without becoming a literal hand or heart.
**Horizontal lockup**: mark on the left, "One" (navy, bold) + "Help" (coral, bold) wordmark on the right — same two-tone idea already built, just recolored.
**Monochrome**: both arc shapes render in one `currentColor` at two opacities (100%/70%) so the handoff is still legible in silhouette — this technique already exists in the current `BrandLogo.vue` and can be reused directly.
**Favicon behavior**: the icon-only mark at 32×32/16×16 — since it's two bold arcs rather than three thin overlapping petals, it survives being shrunk far better than the current mark (the current triad becomes a muddy blob at 16px; two clean arcs remain legible).
**Loading-state behavior**: the "pass" animates — the dot travels along the arc from the first shape to the second in a 1.5–2s loop, literally depicting a handoff instead of a generic pulse. Reduces to a static mid-point position under `prefers-reduced-motion`.

---

## Direction 2

### Name
**Hearth**

### Core feeling
Grassroots warmth. The feeling of a community kitchen, a neighborhood cleanup, a shared table — approachable, unhurried, human in a cozy rather than corporate way. Best suited to the everyday-volunteering side of the product; needs deliberate handling to not feel *too* soft for the emergency-response side.

### Color approach
- **Primary — Terracotta** (`#B5573A`): warm clay red, replacing navy as the dominant "confidence" color.
- **Secondary — Olive** (`#5C6B3F`): grounded, natural, pairs with terracotta the way real earth pigments do.
- **Accent — Warm Cream/Gold** (`#D9A441`): for highlights, badges, the "featured" category tile.
- **Background**: warm off-white/linen (`#FAF6F0`), noticeably warmer than today's cool `#F7F9FA`.
- **Surfaces**: cards get a very subtle warm paper-grain texture (a low-opacity noise/grain PNG or CSS-only faux-grain via layered gradients) instead of flat white — the single most distinctive surface treatment of the three directions.
- **Text**: a warm near-black (`#2B2118`) instead of navy-tinted `textPrimary`, to stay in the same warm family as everything else.
- **Category colors**: each category gets an earth-toned hue (rust, moss, ochre, clay-pink, sand) — all clearly related to each other (same "earth palette" family), unlike Direction 1's more contrasting hues.
- **Emergency color**: a controlled break from the palette — a clear, slightly desaturated red (`#C23B2E`) that reads as "this one is different" precisely *because* it's the only cool-adjacent, high-saturation color in an otherwise warm-earth system.

### Typography
Headline style: warmer, slightly rounded numeral/letterforms feel (Roboto again — no new font — but leaning on Roboto's regular/medium weights rather than bold-heavy, for a gentler voice). Body style: unchanged scale, slightly increased line-height for a relaxed, unhurried reading feel. Navigation style: lower-key, text-only, no bold-weight active state — active state shown by color + a small dot rather than weight change. Button style: fully rounded (pill) buttons throughout, reinforcing the organic, non-corporate feel. Greek/English: unaffected, same font.

### Shape language
Cards get visibly rounded corners (increase `--oh-radius-lg` usage further, toward pill-like corners on smaller elements). Sections use soft "blob" dividers (organic asymmetric curves via SVG, like a torn-paper or hand-drawn edge) between full-bleed sections instead of hard rectangular breaks. Icon containers: soft irregular blob shapes (each subtly different via 2–3 blob variants) instead of perfect circles/squircles — reinforces "handmade, human, not corporate template." Decorative elements: concentric ripple rings (thin, single-color, radiating outward from a point) as a recurring background motif — appears behind the hero, behind empty states, faintly behind the login panel.

### Motion language
Page entry: gentle scale-in (0.97→1) rather than fade-up, slower (~350ms) for an unhurried feel. Card hover: a soft warm shadow bloom rather than a lift (no translateY, just shadow growth) — feels calmer than Direction 1's lift. Button interaction: a ripple that visibly radiates outward (reinforcing the ripple motif) rather than Vuetify's default. Navigation state: active tab gets a small filled dot (not an underline bar) that fades in. Loading: the ripple motif animates outward from the logo mark in a continuous slow loop. Empty states: the blob icon container "breathes" (very subtle scale pulse, 4s cycle) rather than a one-time entrance. Reduced motion: all of the above degrade to instant/opacity-only exactly as in Direction 1.

### Home page concept
Hero background carries a very faint multi-ring ripple pattern radiating from behind the illustration. The illustration itself becomes concentric rings with the logo mark at the center — literally "one help, rippling outward," directly illustrating the product name. Category tiles become soft blob-cornered cards in the earth palette. "How It Works" steps sit inside blob-shaped icon containers connected by a dotted (not solid) line, reinforcing the organic feel. CTA panel uses terracotta→olive gradient with a large, very faint ripple-ring watermark behind the text.

### Action Cards concept
Same fixed-region structure as Direction 1 (this part of the redesign is direction-agnostic and should be kept regardless of which visual direction is chosen):
- **Badge/header zone**: category chip in its earth-tone hue + urgency chip only for genuinely urgent items, in the reserved red.
- **Title/description zones**: same fixed-height reserves.
- **Metadata zone**: unchanged.
- **Participation/status zone**: unchanged; the "open" status pill becomes fully rounded (pill) to match the button-shape language.
- **Action button zone**: unchanged position; button becomes a pill shape.

Risk specific to this direction: extremely rounded, soft, warm cards risk under-signaling urgency for the emergency category — mitigated by making the reserved emergency red the *only* sharp-cornered, non-blob element that appears on an otherwise soft card (a deliberate, rare exception reads as "this one's different," rather than the whole card losing its calm identity).

### Login concept
The auth card sits on top of the full ripple-ring background pattern (rendered behind `AuthLayout`, not per-view) so Login/Register are visually continuous with Home rather than a blank canvas. The card itself keeps soft blob corners instead of a plain rectangle. A single warm illustrative element (the ripple rings, already used elsewhere) ties it back to the rest of the product without needing a two-panel layout.

### Organizer/Admin concept
Same shared stat-card unification as Direction 1, but rendered in the earth palette with blob icon containers. The bigger risk here: blob/organic shapes and pill buttons in a dense admin table context can read as *too* playful/soft for a moderation queue or a suspend-account action. Mitigation: admin/organizer *data* surfaces (tables, list rows, forms) stay rectangular and Vuetify-plain; only stat cards, page headers, and primary CTAs pick up the organic language — the same "brand shows up at the edges, not in the data" principle as Direction 1, just harder to hold the line on given how organic this direction is.

### Logo concept
**Icon meaning**: three (or four) unevenly-sized concentric rings, offset slightly off-center — like ripples from a single stone dropped in water, but the offset avoids feeling like a corporate "target" logo. Reads as: *one action creates a widening circle of impact* — directly ties to the product name "OneHelp" and to "community action," though it leans more toward "impact spreading" than literally "people connecting."
**Horizontal lockup**: rings on the left, wordmark in terracotta/olive two-tone on the right.
**Monochrome**: rings rendered as line-only (stroke, not fill) in `currentColor` — reads cleanly on any single background.
**Favicon behavior**: concentric rings survive small sizes reasonably well (better than the current triad, though a single-color version is safer at 16px than the two-tone).
**Loading-state behavior**: rings animate outward continuously (opacity fades as each ring reaches the edge) — a natural, literal loading loop.

---

## Direction 3

### Name
**Grid & Pulse**

### Core feeling
Contemporary and coordinated — the feeling of a well-run operations room that still cares. Leans into the app's existing map/coordination strength rather than away from it. The most "tech-forward" of the three, which is also its biggest risk (closest to the "generic SaaS" territory the brief explicitly warns against).

### Color approach
- **Primary — Deep Teal-Navy** (`#123B4A`, closer to today's teal-leaning secondary than today's navy primary): cooler, more "operations dashboard" than Direction 1.
- **Secondary — Electric Teal** (`#1FB6A6`): a brighter, more saturated version of today's secondary — the "alive, contemporary" note.
- **Accent — Vivid Coral** (`#FF6B4A`): used exclusively for urgency/emergency and for the single "pulse" motif, kept rare on purpose.
- **Background**: cool near-white (`#F5F8F8`), close to today's.
- **Surfaces**: a very light grid/dot pattern (barely visible, like graph paper) as a full-bleed section background option — the distinctive surface idea of this direction, echoing the map/coordination theme.
- **Text**: keep current `textPrimary`/`textSecondary`, they already suit a cooler palette.
- **Category colors**: five distinct, evenly-spaced hues around the color wheel (a genuine categorical palette, not five reused semantic roles) — health teal-blue, environment green, social violet, animals amber, emergency coral.
- **Emergency color**: Vivid Coral, reserved exclusively for emergency/urgent — same "only one place uses this hue" discipline as Direction 1.

### Typography
Headline style: tight, technical-feeling, medium-bold (not as heavy as Direction 1) — headlines read like dashboard labels elevated in scale, reinforcing "coordinated" over "editorial." Body style: unchanged. Navigation style: monospaced-feeling letter-spacing on nav labels only (still Roboto, just wider tracking) for a "systems" feel. Button style: sharp-ish rounded corners (smaller radius than the other two directions) with a small connector-notch detail on primary CTAs. Greek/English: unaffected.

### Shape language
Cards use a smaller corner radius than today (more rectangular, "data card" feeling) with a thin 1–2px accent-color top border instead of an all-around border. Sections divide with a thin dotted/dashed rule (echoing a map route line) rather than solid rules or organic curves. Icon containers: small rounded squares connected by thin lines when shown in a sequence (steps, categories) — literally drawing a "route" between them. Decorative elements: a recurring "node path" motif — 2–4 small dots connected by a bent line, used as a background accent behind the hero and CTA. This is the most map/route-literal of the three directions.

### Motion language
Page entry: content slides in slightly from the direction of the connecting line (left-to-right for LTR reading), reinforcing the "path" motif. Card hover: a thin accent-colored border "draws itself" around the card outline on hover (using an animated border/box-shadow trick) rather than a lift. Button interaction: the connector-notch briefly pulses. Navigation state: active tab's node dot pulses once when selected. Loading: the node-path motif animates a dot traveling along the path, looping. Empty states: the icon container's connecting lines draw in (stroke-dashoffset animation) on mount. Reduced motion: identical opacity/instant fallback pattern.

### Home page concept
Hero background carries the faint node-path/graph-paper texture. The illustration becomes a small abstract "route" — 3 connected nodes with the logo mark as the final/central node, suggesting "your help completes the route." Category tiles keep the bento grid, now connected by thin route-lines between tiles on desktop (an actual visual link between the grid cells, not just proximity). "How It Works" steps sit on connected route-nodes instead of a plain line. CTA panel uses teal→coral gradient with the node-path as a subtle background layer.

### Action Cards concept
Same fixed-region structure, again kept as direction-agnostic:
- **Badge/header zone**: category chip in its distinct hue; urgency in the reserved coral.
- **Title/description zones**: unchanged fixed reserves.
- **Metadata zone**: unchanged; consider a thin dotted rule above it (echoing the section-divider language) to visually separate "what/who" from "when/where."
- **Participation/status zone**: unchanged.
- **Action button zone**: unchanged position; button gets the small connector-notch detail as a signature.

This direction's smaller card corner radius and thin top border make categories/urgency easiest to scan at a glance in a dense grid — arguably the strongest of the three for the Actions list specifically, where users are scanning many cards quickly.

### Login concept
The form card sits on top of the node-path texture, with a thin animated route-line drawing itself from the logo mark down to the email field on page load (a one-time, reduced-motion-safe flourish) — a small but concrete way to make Login feel like "the start of your route through the product" rather than an isolated form. Same fields, same logic.

### Organizer/Admin concept
This direction has a natural advantage here: its whole visual grammar (thin borders, small radius, connector lines, restrained color) already looks like "operations tooling," so unifying the organizer/admin stat cards into one shared component requires *less* stylistic compromise than the other two directions — the brand language and the admin-usability requirement are naturally aligned rather than in tension.

### Logo concept
**Icon meaning**: 3–4 small solid nodes connected by a single bent line forming a simple, deliberate path (not a busy network) — with the end node emphasized (larger/filled) to suggest "arriving to help." Reads as: *people/points connected in a coordinated route toward one destination* — a very literal answer to "coordinated help" and "movement toward shared purpose," and it reinforces the app's actual Map feature.
**Horizontal lockup**: node-path mark on the left, teal/coral two-tone wordmark on the right.
**Monochrome**: nodes + line in one `currentColor`, end node solid, others outlined — still reads clearly as a path in one color.
**Favicon behavior**: needs care — at 16px, more than 3 nodes will blur into a smudge; the favicon variant should drop to exactly 2 nodes + 1 line for legibility, distinct from the full 3–4 node mark used elsewhere.
**Loading-state behavior**: a small dot travels from the first node to the last along the path, looping — same "literal progress" idea as Direction 1's handoff, but framed as a route rather than a pass.

**Honest risk flag**: connected-dots/network iconography is one of the *most* common tropes in generic tech/SaaS branding today. This direction only avoids the "generic AI-generated SaaS template" trap if the path stays asymmetric, small (2–4 nodes, never a dense network), and is paired with the warmer teal/coral palette rather than the cold blue/grey most SaaS logos default to. Executed carelessly, this is the direction most likely to accidentally recreate the exact problem being solved.

---

## Comparison

| Criterion | Direction 1 — Signal | Direction 2 — Hearth | Direction 3 — Grid & Pulse |
|---|---|---|---|
| Uniqueness | High — relay/handoff motif is rare in this space | Medium — ripple motif is warm but a known nonprofit trope | Medium-Low — connected-node motifs are extremely common in tech branding |
| Trust | High — navy anchor + restrained coral use reads credible | Medium — very warm/soft can under-signal "verified organizations, moderated content" | High — cool, structured palette reads credible and orderly |
| Emotional appeal | High — energetic and human, good for both everyday and urgent | High — warmest, most "human community" feeling of the three | Medium — more cerebral/systems-feeling than emotionally warm |
| Accessibility | Good, needs contrast-checking coral-on-navy combinations | Good, but pastel/earth tones need care at small text sizes | Good, teal/coral against light backgrounds checks well |
| Suitability for mobile | High — bold shapes and squircles read well at small sizes | Medium — blob shapes and grain texture can look muddy on small/low-end screens | High — thin lines and small radius scale down cleanly |
| Suitability for admin screens | Medium — needs deliberate restraint to avoid the editorial boldness leaking into dense tables | Low-Medium — organic/pill shapes are in real tension with dense operational UI | High — the visual grammar already resembles operations tooling |
| Implementation complexity | Medium — new logo, new category colors, two-panel auth layout, squircle system | Medium-High — grain texture, blob-shape variants, and organic dividers are the most bespoke asset work of the three | Medium — mostly borders/lines/small radius changes, fewer bespoke shapes |
| Risk of looking generic | Low | Medium (ripple/nonprofit-warmth is a familiar territory) | Medium-High (connected-dots is the most-used generic tech motif) |
| Logo clarity | High — two shapes, one clear "handoff" story | Medium — reads as "impact/ripples" more than "people/coordination" specifically | High — reads as "connected path," but overlaps with generic tech iconography if not executed carefully |

## Recommended Direction

**Direction 1 — Signal.**

It's the direction that best satisfies the brief's explicit instruction not to default to the safest option. Hearth is the warmest and most emotionally appealing, but its organic/pill/blob language is in real tension with the admin and organizer screens this product actually depends on — it would either compromise on usability there or end up visually split between "the pretty public pages" and "the plain admin pages," recreating problem #8 rather than solving it. Grid & Pulse is the most naturally suited to admin/organizer screens and ties in nicely with the existing Map feature, but its core motif (connected nodes/a path) is the one most likely to be mistaken for exactly the kind of generic AI-generated SaaS branding this whole exercise is trying to escape — the risk column is explicit about that.

Signal threads the needle: the relay/handoff logo idea is legible, rare, and directly answers "coordinated help" and "movement toward a shared purpose" without leaning on hearts, hands, crosses, or an overused network trope. Its color system introduces genuine differentiation (a real secondary hue distinct from the emergency red, which today's palette doesn't have) while keeping the existing navy anchor, so it doesn't discard the parts of the current identity that already work (the flat/bordered card language, the sticky-footer/fixed-region Action Card work, the reduced-motion discipline already built into this codebase). It scales down to admin screens by design — the brand shows up in stat cards, headers, and primary buttons, not in every table row — which is exactly the "shared language without becoming decorative or difficult to use" balance the brief asks for.

---

## Logo Recommendation

Adopt **Signal**'s relay/handoff mark as the one logo concept to move forward with, replacing the current three-petal `BrandLogo.vue` mark entirely (keep the component's variant API — `primary`/`horizontal`/`icon`/`monochrome` — since that structure is sound; only the SVG path content and the two brand hues need to change):

- Two simple, asymmetric arcing shapes mid-handoff, with a small connecting dot at the pass point — communicates one person's help reaching the next person, legible even as a description read aloud (a good sanity check the current mark fails).
- Two-tone wordmark stays ("One" in Ink Navy, "Help" in Signal Coral), same technique already built, just recolored.
- Monochrome variant reuses the exact opacity-layering trick already implemented for the current mark (two shapes, 100%/70% `currentColor`) — no new technical approach needed, just new paths.
- Favicon: the two-arc mark alone survives 16–32px far better than the current three-overlapping-petal mark, which is a concrete, testable improvement.
- Loading state: the connecting dot travels from one arc to the other and back, a literal "handoff in progress" loop, replacing the current generic pulse — same animation infrastructure (`LoadingState.vue`'s existing spinner + mark composition), new keyframe content.

---

## Proposed Implementation Phases

This is a sequencing proposal only — no code in this task.

1. **Global tokens & theme.** Update `branding.js` colors (primary/secondary/accent hues per Signal), extend `main.css` tokens (a distinct emergency-only color variable, squircle/shape tokens, refined shadow/motion tokens already partly in place), give `actionCategories.js` its own per-category accent hues instead of reusing the five semantic roles.
2. **Brand/logo.** Redesign `BrandLogo.vue`'s SVG content for the relay/handoff mark; verify favicon behavior at small sizes; update the loading-state animation.
3. **Auth pages.** Build the two-panel `AuthLayout` treatment (navy/relay-motif panel + form card) shared by Login and Register — no change to form fields, validation, or auth logic.
4. **Public pages.** Home hero illustration and category-tile recoloring; "How It Works" squircle icons; CTA gradient recolor; footer visual refinement.
5. **Action cards and lists.** Recolor category chips to the new per-category hues; add the emergency/urgent left-edge stripe variant; apply the squircle icon-container language where relevant; refine Actions-list filter row styling.
6. **Map.** Branded chrome around the map container and selected-action panel; no change to Leaflet behavior, coordinates, or map data.
7. **Organizer/Admin.** Unify the organizer dashboard's plain stat cards with `AdminSummaryCard.vue` into one shared, squircle-icon stat-card component (visual only — no change to what each dashboard computes or displays); leave tables/forms/nav tabs on the existing Vuetify-plain treatment.
8. **Feedback/loading/empty states.** Differentiate `EmptyState.vue` presentation slightly by context (no-results vs. no-data-yet vs. error) if warranted; keep the single shared component approach.
9. **Motion and accessibility.** Apply the entry/hover/loading motion patterns described above; verify all new motion has a `prefers-reduced-motion` fallback (following the pattern already established in `AppBottomNavigation.vue` and `.oh-card-interactive`); contrast-check new coral/navy combinations against WCAG AA.

## Files Likely Affected

**1. Global tokens/theme**
`src/config/branding.js`, `src/plugins/vuetify.js`, `src/styles/main.css`, `src/constants/actionCategories.js`

**2. Brand/logo**
`src/components/common/BrandLogo.vue`, `src/components/common/OHLogo.vue` (variant/size call sites only, not its structure)

**3. Public pages**
`src/views/HomeView.vue`, `src/views/AboutView.vue`, `src/components/common/OHSection.vue`

**4. Auth pages**
`src/layouts/AuthLayout.vue`, `src/features/auth/views/LoginView.vue`, `src/features/auth/views/RegisterView.vue`

**5. Action cards and lists**
`src/features/actions/components/ActionCard.vue`, `src/features/participation/components/MyActionCard.vue`, `src/features/organizer/components/OrganizerActionCard.vue`, `src/features/actions/views/ActionsListView.vue`

**6. Map**
`src/features/map/components/ActionsMap.vue`, `src/features/map/components/ActionMapMarkerPopup.vue`, `src/features/map/views/MapView.vue`

**7. Organizer/Admin**
`src/features/organizer/views/OrganizerDashboardView.vue`, `src/features/admin/views/AdminDashboardView.vue`, `src/features/admin/components/AdminSummaryCard.vue` (plus a possible new shared stat-card component consumed by both)

**8. Feedback/loading/empty states**
`src/components/feedback/EmptyState.vue`, `src/components/feedback/LoadingState.vue`

**9. Motion and accessibility**
`src/styles/main.css` (motion tokens), `src/components/layout/AppNavigation.vue`, `src/components/layout/AppBottomNavigation.vue`, `src/components/layout/AppFooter.vue` — no dedicated new files expected; accessibility verification is a testing pass, not a file change.
