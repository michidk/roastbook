# Roastbook Design System

## 1. Atmosphere & Identity

Roastbook should feel like a calm, tactile coffee journal: warm paper beneath crisp white cards, dark roasted-coffee ink, and amber actions. Its signature is the contrast between quiet cream surfaces and compact, confident brewing data. Reliability is part of the visual identity: media, charts, and maps must always resolve to useful content or an intentional state, never a browser-broken placeholder.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
|---|---|---|---|---|
| Page | `--background` | `#f6eddf` | `#1f1a14` | App background |
| Ink | `--foreground` | `#3a2a1e` | `#f6eddf` | Primary text |
| Card | `--card` | `#ffffff` | `#2a2219` | Elevated surfaces |
| Secondary | `--secondary` | `#fbf5eb` | `#36281c` | Rows and quiet controls |
| Muted text | `--muted-foreground` | `#7a6a58` | `#b8a78f` | Metadata and hints |
| Primary action | `--primary` | `#d2873e` | `#d2873e` | Calls to action and focus |
| Coffee surface | `--coffee` | `#6f4e37` | `#b07a45` | Hero metrics and coffee identity |
| Border | `--border` | `#ead9bf` | `#3c2e20` | Input and structural boundaries |
| Control boundary | `--input` | `#9f7548` | `#9f7548` | Form-control outlines with at least 3:1 adjacent contrast |
| Destructive | `--destructive` | `#c0573a` | `#c0573a` | Irreversible actions and errors |
| Positive | `--positive` | `#6b8a3d` | `#8aa850` | Success and healthy status |

### Rules

- Use semantic CSS variables from `src/styles.css`; add new roles there before use.
- Amber identifies interaction and current state, not decoration.
- Media/error placeholders use existing muted, border, and destructive tokens.
- Roast gradients, badges, taste states, and chart marks derive from semantic coffee, accent, positive, destructive, and chart tokens.
- Body text must meet WCAG 2.2 AA contrast on its actual surface.

## 3. Typography

### Font stack

- Display: `Bricolage Grotesque`, sans-serif.
- Body: `Hanken Grotesk`, sans-serif.
- Data: body or display face with tabular numerals enabled where values align.

### Scale

| Level | Size | Weight | Usage |
|---|---:|---:|---|
| Page title | `2.25rem` mobile / `3rem` desktop | 800 | Route headings |
| Section title | `1.125rem` | 700 | Cards and major groups |
| Body | `1rem` | 400–600 | Controls and content |
| Small | `0.875rem` | 400–600 | Metadata and descriptions |
| Navigation caption | `0.625rem` | 600 | Mobile bottom navigation only |

### Rules

- Display text uses `font-display` and tight tracking.
- Data columns use tabular numerals.
- Body content never drops below 14px. Compact tertiary metadata, map attribution, helper/status copy, and labels inside controls may use 12–13px when they remain legible and nonessential; mobile navigation captions and the uppercase status inside the oversized timer may use 10px because each is reinforced by a larger visual affordance.

## 4. Spacing & Layout

- Base unit: 4px.
- Content maximum: `80rem` (`max-w-7xl`).
- Page gutter: 16px mobile, 32px from the `md` breakpoint.
- Route rhythm: 24px mobile, 32px desktop.
- Cards: 20px default internal spacing and `1rem` base radius with larger route-card radii.
- Breakpoints follow Tailwind defaults: `sm` 640, `md` 768, `lg` 1024, `xl` 1280.
- Fixed mobile navigation requires enough bottom clearance for the full navigation height plus safe-area inset.
- Dense tables may scroll horizontally but must have a mobile-specific readable representation when they are a primary route.

## 5. Components

### Card
- **Structure**: semantic content grouped in the shared shadcn Card primitives.
- **States**: default, interactive hover/focus, loading, empty, and error.
- **Accessibility**: cards are not interactive by themselves; navigable cards use a real Link.
- **Depth**: coffee-tinted soft shadow with tonal background separation.

### Resilient image
- **Structure**: fixed-aspect media wrapper, image, and token-driven fallback.
- **Variants**: thumbnail and gallery/detail.
- **States**: loading, loaded, unavailable; no native broken-image glyph.
- **Accessibility**: meaningful media has useful alt text; decorative thumbnails use empty alt text.
- **Layout**: preserves dimensions through every state to prevent layout shift.

### Data visualization
- **Structure**: title, optional description/legend, fixed responsive plot area.
- **States**: loading, rendered data, no data, and unavailable/error.
- **Accessibility**: visible summary or text equivalent accompanies charts and maps.
- **Layout**: plot containers always have an explicit height and width.

### Café explorer map
- **Structure**: warm-toned MapLibre surface on `/visits`, automatically loaded OpenStreetMap cafés for the visible map area, persistent saved/discovered legend, 44px custom café markers, search control, and a React-rendered place inspector. `/places` remains a focused saved-place list without a map.
- **Variants**: saved places use the filled coffee marker; OpenStreetMap discoveries use the cream outlined marker.
- **States**: loading, ready, visible-area discovery loading/error, zoom-in prompt, search loading, selected saved place, selected discovery, added discovery, no results, and unavailable.
- **Accessibility**: every marker is a named button, selection is mirrored in the inspector, map search has a persistent label and live status, and every primary action retains a 44px target.
- **Interaction**: marker selection uses the standard 200ms state transition and a short camera ease; reduced motion makes camera changes immediate. The inspector appears through opacity and transform only.
- **Layout**: the map owns a fixed responsive height; the inspector follows the map in normal flow below `lg` and becomes a compact lower-left map overlay at `lg` and above.

### Form field
- **Structure**: persistent label, native/shadcn control, optional helper or error.
- **States**: default, focus, disabled, invalid, loading where relevant.
- **Accessibility**: deterministic server/client markup, label association, visible focus, and no hidden caret.

### Picture uploader
- **Structure**: preview grid, mobile-safe file picker, dashed drop target, explicit clipboard action, URL input, and contextual helper/status copy.
- **States**: empty, drag-active, queued previews, URL downloading, clipboard unavailable, invalid file, and ready.
- **Accessibility**: every action is keyboard reachable, the drop target opens the native picker, status changes are announced, and coarse-pointer controls retain a 44px minimum target.
- **Interaction**: dropping, selecting, pasting, and URL import all feed the same preview queue; color and border transitions use the standard motion token without decorative animation.

### Mobile bottom navigation
- **Structure**: three primary destinations, a centered create action, and a More menu for secondary destinations.
- **States**: default, active, focus, menu open.
- **Accessibility**: full-width touch zones, visible labels, 44px minimum actionable region.
- **Layout**: fixed to the viewport; development tooling must never overlap or intercept it.

### Navigation overflow menu
- **Structure**: a labeled More trigger and a compact list of icon-led links to Roasters, Gear, Recipes, Stats, and Settings on desktop and mobile.
- **States**: default, hover, focus, open, and active when the current route is inside the menu.
- **Accessibility**: uses the shared dropdown primitive, exposes the active destination through the trigger, and preserves 44px mobile menu targets.

### Responsive record list
- **Structure**: compact cards on mobile and a shared data table from the `md` breakpoint upward.
- **States**: populated and empty, with the same values and navigation available in both representations.
- **Accessibility**: primary row actions and important related links remain explicit 44px touch targets.
- **Layout**: primary data never requires two-dimensional scrolling below the `md` breakpoint.

## 6. Motion & Interaction

- Micro interaction: 100–150ms ease-out for press/focus feedback.
- Standard transition: 200ms ease-in-out for dropdowns and state changes.
- Motion geometry uses only transform and opacity. Brief color, background, border, and shadow transitions are allowed for real hover, focus, selection, and open-state feedback; layout and size do not animate.
- Hover and focus communicate real interactivity; decorative motion is excluded.
- Respect `prefers-reduced-motion` for non-essential motion.

## 7. Depth & Surface

Roastbook uses a mixed strategy: cream/card tonal shifts for hierarchy, coffee-tinted soft shadows for elevation, and borders for controls or structural separation. Errors and empty states remain integrated within the same card geometry instead of introducing unrelated alert styling.

- `--coffee-shadow` is the standard card elevation.
- `--coffee-shadow-inline` gives attached trailing actions a coffee-tinted shadow toward their input content.
- `--coffee-shadow-strong` is reserved for coffee-colored focal surfaces.

## 8. Accessibility Constraints & Accepted Debt

### Constraints

- Target WCAG 2.2 AA: 4.5:1 body text, 3:1 large text and graphical controls.
- Full keyboard reachability and visible focus on every interactive element.
- All fixed overlays must preserve access to product navigation at 375px, 768px, and 1280px widths.
- Interactive controls provide at least a 44px target on coarse-pointer/mobile layouts.
- Broken external/media resources must degrade to intentional, labeled states.

### Accepted debt

| Item | Location | Why accepted | Owner / Exit |
|---|---|---|---|
| The current muted foreground is borderline on the cream page surface. | `src/styles.css` | Existing visual identity; recorded by the audit but outside the P0 reliability batch. | Address in P2 contrast pass. |
