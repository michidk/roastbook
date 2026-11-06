# Roastbook design system

Roastbook is a calm, tactile coffee journal: warm paper, white cards, dark
coffee ink and amber actions, with compact, confident brewing data. Media,
charts and maps always show useful content or an intentional state. General UI
rules (shadcn/ui, Lucide, 44px targets, focus, real links) are in `AGENTS.md`.

## Color

Semantic tokens in `src/styles.css` (light / dark, default Roast palettes):

| Role | Token | Light | Dark |
| --- | --- | --- | --- |
| Page | `--background` | `#f6eddf` | `#241b17` |
| Ink | `--foreground` | `#3a2a1e` | `#ecdbc5` |
| Card | `--card` | `#ffffff` | `#332720` |
| Popover | `--popover` | `#ffffff` | `#48382d` |
| Secondary | `--secondary` | `#fbf5eb` | `#403128` |
| Muted text | `--muted-foreground` | `#796957` | `#c6af96` |
| Primary action | `--primary` | `#aa612f` | `#c99564` |
| Link, emphasis | `--link` | `#8a5a30` | `#edc399` |
| Coffee surface | `--coffee` | `#6f4e37` | `#ba8a60` |
| Border | `--border` | `#ead9bf` | `#6a5040` |
| Control boundary | `--input` | `#9f7548` | `#aa8b70` |
| Destructive | `--destructive` | `#c0573a` | `#c0573a` |
| Destructive text | `--destructive-text` | `#9d3b26` | `#eea198` |
| Positive | `--positive` | `#6b8a3d` | `#a9b665` |
| Positive text | `--positive-text` | `#4c681f` | `#b8c57b` |
| Favorite | `--favorite` | `#8b3f60` | `#d3869b` |

- Add new semantic roles to `src/styles.css` before using them. Roast
  gradients, badges, taste states and charts derive from tokens.
- Use fill tokens for filled surfaces and the matching `*-text` token for text
  or icons on light or muted surfaces.
- Amber marks interaction and current state, never decoration. Favorites are a
  preference state, never destructive.
- Dark mode (based on Gruvbox Material) keeps olive, aqua and rose chart series
  distinguishable, coffee-ring marks and hero metrics dark, quick-add rows
  filled and outlined, and native controls on the dark color scheme.
- Contrast: WCAG 2.2 AA, 4.5:1 for body text on its actual surface, 3:1 for
  large text and control outlines.

### Palettes

Light and dark palettes are chosen separately. Roast is the default; Classic
Light uses ivory and copper, Classic Dark uses charcoal, cream and copper, and
Pure Light and Pure Dark use white/black with neutral accents and no decorative
shadows. Paper grain and coffee rings are available in every palette and can be
toggled independently. Every palette keeps visible card and control boundaries.
Overrides and the settings previews use the same tokens in
`src/theme-tokens.css`.

- Color mode (System, Light, Dark in the avatar menu's Theme submenu) is a
  browser-local preference. Palettes, rings and grain are saved with the
  journal (the demo uses a separate browser key).
- Apply palette attributes before hydration, and set the browser/PWA theme
  color to the active canvas.
- Demo and shared journals keep the avatar menu as "demo user" and "default
  user"; account management, admin and sign-out appear only for accounts.

## Typography

- Display: `Bricolage Grotesque` (`font-display`, tight tracking). Body:
  `Hanken Grotesk`. Families and font weights live in `src/typography.css`,
  shared by the app and API explorer. Aligned data uses tabular numerals.
- Page title `1.875rem` mobile / `3rem` desktop, weight 800; compact variant
  `1.5rem` / `1.875rem` from `sm`.
- Section title `1.125rem`/700; body `1rem`/400–600; small `0.875rem`/400–600.
- Body content is at least 14px. Metadata, attribution, helper text and control
  labels may use 12–13px; mobile navigation captions and the timer status
  10px/600.
- Sentence case for titles, labels, actions and status copy. Use `…` for
  truncated or ongoing copy.

## Spacing and layout

- Base unit 4px; breakpoints `sm` 640, `md` 768, `lg` 1024, `xl` 1280.
- Content maximum `max-w-7xl`; page gutter 16px, 32px from `md`; route rhythm
  20px, 32px from `md`.
- Cards: 16px padding, 20px from `sm`; `size="sm"` 12px / 16px; radius `1rem`.
- Card grids: `gap-3` on phones, `gap-4` from `sm` (`gap-5` for prominent
  grids). Card stacks inside a route: 16px, 24px from `md`. Form sections: 20px,
  24px from `sm`.
- Mobile pages account for the navigation height and safe-area inset.
- Phone density lives in the shared primitives (`Page`, `Card`,
  `CollectionList`, `EntityForm`, settings sections). Add a route-local mobile
  override only when the content genuinely differs, and leave desktop values
  unchanged.
- Primary routes need a readable mobile layout; wrap interactive groups instead
  of overflowing.

### Page frame and headings

The shell owns viewport padding and `max-w-7xl`. Routes start with `Page`
(`src/components/page-layout.tsx`) and add no horizontal padding. Choose its
width for the content: `full` (dashboards, lists, maps, tables, multi-column
forms), `wide` (`max-w-5xl`, rich records, settings), `content` (`max-w-3xl`),
`form` (`max-w-2xl`). Constrained widths are centered.

- `PageHeader` holds headings, descriptions, back controls and actions: default
  variant for collection and create pages, compact for details and subordinate
  screens. `FormPageHeader` wraps it for forms.
- One `h1` per page; section cards start with `h2` (the Card title default).
- `FormSection` groups form content. Cancel precedes save in the DOM; stacked
  actions may reverse visually so the primary comes first.
- Settings and Admin use `SectionLayout` (desktop sidebar, mobile tabs) and
  `PanelSection`. Admin Users is a compact table at every width with contained
  horizontal scroll, a row action menu, and confirmed deletion.

### Dialogs

```tsx
<DialogContent>
  <DialogHeader>...</DialogHeader>
  <DialogBody>...</DialogBody>
  <DialogFooter>...</DialogFooter>
</DialogContent>
```

- `DialogContent` owns the viewport bound (`100dvh`-aware, safe-area padding),
  surface and layout; header and footer stay visible while the body scrolls.
  Default width `sm:max-w-lg`.
- Every dialog has a title and explains its task or consequences. Short
  confirmations may omit `DialogBody`.
- Footer: helpers first, decisions last; stacked on mobile, a row from `sm`.
- Keep close reachable unless it would interrupt an unrecoverable operation.
- Change spacing in the primitive; one-off padding only for immersive
  workflows. The AI recommendation dialog is one: fixed height, conversation
  (input pinned) left and result right from `lg`, tabs with result first below
  `lg`, single pane while loading or failed. AI text shows settings as inline
  parameter chips, and change/keep-constant/caveat blocks are shared components
  reused in chat answers.

## Components

### Cards and actions

- Use the shadcn Card with loading, empty and error states inside the same
  geometry. Depth comes from tonal separation and `--coffee-shadow`.
- A navigable card is a real link styled with `interactiveCardLinkClassName`
  (hover motion, reduced motion, offset focus ring); never `role="link"` with
  click handlers.
- One dominant action per page, form or dialog (default amber button);
  supporting actions use outline, secondary or ghost. Destructive styling only
  for deletion or irreversible work.
- Favorite controls use the favorite token. "Want to visit" is a planning state
  shown with the primary token and a bookmark icon.

### Collections

- Browsing pages use `CollectionList`, which provides card and table layouts,
  the lead visual (photo, icon on a tinted disc, entity visual via the `custom`
  media kind, or none), the record link, sortable headers and the remembered
  view. Extend it instead of writing a route-local grid or table. Custom views
  are for the bean grid, brews (grouped table) and visits (map); Gear's
  route-local grid is a migration candidate.
- Cards (default) show the lead visual, name with status icons, one supporting
  line and a chevron; table rows add the columns that do not fit. Search,
  pagination and the record link are identical in both views.
- `CollectionViewToggle` is available at every width. The last view is
  remembered per browser; the app-wide default seeds the first visit and the
  server render.
- Without a view control, lists are cards on mobile and a table from `md`, with
  the same values. With one, honour the chosen view at every width: a phone
  table keeps its columns and scrolls horizontally inside its container. A
  layout that is merely too wide must be redesigned.

### Collection toolbar

- `CollectionToolbar`: labeled search, result count, optional view/filter
  actions; stays visible when a search has no results.
- Below `sm`, one row: search plus a Filters trigger opening a bottom sheet.
  From `sm`, a compact Filters popover. The trigger shows the active filter
  count in its badge and accessible name; Clear all appears whenever a filter is
  set.
- The count sits in the placeholder (`Search 186 brews…`; pass a short phrase)
  and in a polite live region; on phones it becomes visible only while results
  are narrowed.
- Segmented list choices (café lists) and `CollectionViewToggle` stay inline;
  only filter fields go into the sheet.

### Metrics and ratings

- `MetricCard`: at most one hero metric, default for peers, quiet when nested
  (16px padding at every width). No route-local stat cards. Values drop one type
  step below `sm`; short-number rows pair two cards per row on phones, rows with
  dates, names or ratings stay one per row until `sm`.
- `StarRating` for overall quality: full stars when editable or prominent,
  compact star plus `value/max` in dense contexts.
- Brew sensory traits (bitterness, acidity, sweetness, body, astringency) use
  the shared icon intensity control; only body uses beans. Each trait explains
  what to notice and that it measures intensity, not quality.
- Flavor notes are a compact tag list; flavor-wheel paths do not create UI
  groups. Do not seed tags that duplicate a sensory trait.

### Beans

- Bean grid cards: full-bleed darkened photo, restrained scrim, roast badge top
  left, decorative circular northeast arrow top right, bottom-aligned white copy
  (roaster, two-line name, origin and process, divider, roast date and weight).
  No inset frame, parchment, grain, inner card or visible shadow. Omit missing
  values. The whole card is one named link; the image is decorative.
- `/beans` card heights: 288px, 320px from `sm`, 304px from `lg`. The brew
  form's selected-bean card keeps the taller geometry.
- A bean is a stable profile; purchases are bags (roast date, initial and
  remaining weight, price, shop name and URL, On shelf/Archived), newest first.
  "Add another bag" copies the latest bag's weight, price and shop, leaves the
  roast date empty, and never duplicates the profile. Pictures belong to the
  coffee, not the bag; pictures added in the bag editor are read for details
  only unless the user saves them with the coffee.
- Brew pickers keep the coffee name primary and distinguish bags by roast date
  and remaining weight.

### Images, charts and maps

- Images use a fixed-aspect wrapper with a token fallback (thumbnail and gallery
  variants; loading, loaded, unavailable). Never show a broken-image glyph;
  keep dimensions in every state. Meaningful media has alt text, decorative
  thumbnails empty alt.
- Charts have a title, optional legend or description, a fixed responsive plot
  area, loading/rendered/no-data/unavailable states, and a text equivalent.
- `/visits` map: MapLibre with label-free OpenFreeMap basemaps (Positron light,
  Dark dark), only saved cafés, Roastbook-styled zoom/location/fullscreen
  controls that stop pointer and wheel events, a React café inspector, and
  OSM/OpenFreeMap/OpenMapTiles attribution. `/places` stays the management
  list.
- Markers: filled dot for saved, larger double ring for favorites; want-to-visit
  keeps the saved shape and is named in the marker and inspector. No decorative
  glyphs. Clusters are named buttons that zoom in.
- Every marker is a named button; arrow keys move through visible markers and
  selection focuses the inspector. Location is requested only from the location
  control, with a live success, denial or failure message.
- Fixed responsive map height. Below `lg`, inspector and Quick Picks follow in
  flow; from `lg`, the map spans three columns beside a scrollable Quick Picks
  rail. With no coordinates, show an empty state instead of the map.

### Forms

- Persistent label, native or shadcn control, optional helper or error; default,
  focus, disabled, invalid and loading states. Markup is deterministic across
  server and client renders; never hide the caret.
- A picker that supports inline creation always offers its add action before
  typing, including when there are no options. A typed name prefills creation;
  an exact match hides the add action. Pickers without inline creation show a
  noninteractive setup hint when empty. With setup defaults enabled, a sole
  option may be preselected.
- Suggestions: a persistent Suggestions label with wrapping compact buttons
  above the picker, primary tokens when selected, updating the same picker.
- Number inputs: localized text between decrement and increment buttons (no
  native spinners). The number-format setting controls separators for inputs
  and display; form state and payloads stay dot-decimal strings. Steps are
  field-specific without limiting typed precision; pasted dot or comma decimals
  are accepted. Expose spinbutton semantics and bounds, and describe the
  buttons.
- Units sit inside the control and are omitted from the label; prices show the
  currency symbol as prefix or suffix per number layout. Coordinates use the
  same parsing as plain text fields without steppers.
- Dates display in the configured numeric layout; native date values stay ISO.
- Equipment: generic identity before machine or basket details. Confirm a type
  change before discarding subtype values. Nullable booleans offer Unknown;
  labels include units.
- Brewing methods (in the More menu) have a name, description and grouped field
  toggles (pressed state exposed). A recipe belongs to one method; loading it
  copies values into the brew, which keeps no recipe link. Method editors stack;
  parameters use one column at 375px and two from `sm`, never horizontal scroll.
- The method decides which shot fields render and persist; recipes and bean
  history copy into the same shot state. Fields stay in document order. The
  timer uses its timer role and a 30-second progress ring.
- Picture uploader: one inline surface opens the native picker and accepts
  drops and focused paste; URL import is a secondary reveal. Selected and failed
  pictures share one preview grid. Validation errors sit by the intake, upload
  failures by the grid with one batch retry; no toasts or retry queue. Status
  changes are announced.

### Navigation

- Mobile bottom navigation: three destinations, a centered create action and
  More, with full-width touch zones and visible labels. Development tooling
  must never overlap it.
- More menu (shared dropdown): icon-led links to Roasters, Gear, Brewing
  methods, Recipes, Stats and Settings; exposes when the current route is
  inside it.
- Command palette from `lg` only: a header Search control (shortcut shown from
  `xl`, icon-only labelled button below) and `⌘K`/`Ctrl+K`. One search field,
  grouped list of navigation items (derived from the navigation config), New
  menu create actions (also in the demo) and theme choices. Destinations are
  real links; first match highlighted, arrows move, Enter runs, Escape closes.
  Focus the field on open, clear it between openings, show key hints, and keep
  a no-match state.

### Vocabulary and formatting

- User-facing "café"/"cafés"; code may keep `place`, `shop` or `coffeeShop`.
- Measurements have a space before the lowercase unit: `18 g`, `28 s`,
  `2 ml/s`.
- Dates use `useDateFormatter` or `useDateTimeFormatter` (with time for
  events); numbers use the configured number formatter.

## Motion

- Press and focus feedback 100–150ms ease-out; dropdowns and state changes
  200ms ease-in-out (map selection uses it plus a short camera ease).
- Animate geometry only with transform and opacity; color, border, background
  and shadow may transition for real state changes. Layout and size never
  animate.
- Respect `prefers-reduced-motion` (camera moves become immediate).

## Loading

- A page load shows a 2px progress bar after 150ms and the route's skeleton
  after one second. Skeletons in `src/components/route-pending.tsx` reuse the
  page's grid, widths and control heights, so the loaded page does not move;
  a new page layout gets a matching skeleton.

## Depth and surface

- `--coffee-shadow` is card elevation, `--coffee-shadow-inline` shades trailing
  actions toward their input, `--coffee-shadow-strong` is for coffee focal
  surfaces.
- Paper grain and coffee rings live on `body` only (caramel rings in dark mode);
  cards, popovers and controls stay solid. Authentication pages keep the
  textures with every palette.

## Journal states

- Demo: a notice above page content says changes and pictures stay in this
  browser, do not sync, and vanish when site storage is cleared, and offers a
  confirmed Reset demo. Integration settings explain why they are unavailable.
  Show a loading message during initialization; storage errors keep data and
  offer retry and confirmed reset (with the demo avatar menu).
- Product: online, pages read and write on the account; offline, and until
  changes made offline have synced, the device copy answers. The pending
  banner distinguishes local persistence from server confirmation and offers
  recovery for conflicts, failed writes and expired sessions. Never call a demo
  operation queued for sync.
- A missing initial journal is an error, not an empty collection. Quota and
  unsupported-format errors keep saved work and offer retry without reseeding.
