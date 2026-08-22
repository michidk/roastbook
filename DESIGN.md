# Roastbook design system

## Atmosphere and identity

Roastbook is a calm, tactile coffee journal. It combines warm paper, crisp
white cards, dark coffee ink, and amber actions. Brewing data should feel
compact and confident.

Reliability is part of the visual identity. Media, charts, and maps must show
useful content or an intentional state, never a browser-broken placeholder.

## Color

Use these semantic tokens:

- Page: `--background`, light `#f6eddf`, dark `#1f1a14`.
- Ink: `--foreground`, light `#3a2a1e`, dark `#f6eddf`.
- Card: `--card`, light `#ffffff`, dark `#2a2219`.
- Secondary: `--secondary`, light `#fbf5eb`, dark `#36281c`.
- Muted text: `--muted-foreground`, light `#7a6a58`, dark `#b8a78f`.
- Primary action: `--primary`, light `#aa612f`, dark `#d2873e`.
- Link and emphasized text: `--link`, light `#8a5a30`, dark `#e0a565`.
- Coffee surface: `--coffee`, light `#6f4e37`, dark `#b07a45`.
- Border: `--border`, light `#ead9bf`, dark `#3c2e20`.
- Control boundary: `--input`, `#9f7548` in both themes.
- Destructive: `--destructive`, `#c0573a` in both themes.
- Destructive text: `--destructive-text`, light `#9d3b26`, dark `#ef947c`.
- Positive: `--positive`, light `#6b8a3d`, dark `#8aa850`.
- Positive text: `--positive-text`, light `#4c681f`, dark `#b7d47a`.
- Favorite: `--favorite`, light `#8b3f60`, dark `#e3a0bd`.

Add new semantic roles to `src/styles.css` before using them. Amber identifies
interaction and current state, not decoration. Roast gradients, badges, taste
states, and charts derive from semantic tokens.

Body text must meet WCAG 2.2 AA contrast on its actual surface. Form-control
outlines must have at least 3:1 contrast with adjacent colors.

Use fill tokens for filled controls and surfaces, and the corresponding text
token for text or icons on cream, white, or muted surfaces. Favorites are a
preference state, never a destructive state.

## Typography

- Display: `Bricolage Grotesque`, sans-serif.
- Body: `Hanken Grotesk`, sans-serif.
- Data: either face with tabular numerals when values align.

Use this scale:

- Page title: `2.25rem` on mobile and `3rem` on desktop, weight 800.
- Section title: `1.125rem`, weight 700.
- Body: `1rem`, weight 400 to 600.
- Small text: `0.875rem`, weight 400 to 600.
- Mobile navigation caption: `0.625rem`, weight 600.

Display text uses `font-display` and tight tracking. Body content never drops
below 14px. Nonessential metadata, attribution, helper text, and control labels
may use 12px to 13px when they remain legible.

Use sentence case for page titles, section titles, field labels, actions, and
status copy. Use the single-character ellipsis (`…`) for truncated or ongoing
copy.

Mobile navigation captions and the timer status may use 10px because a larger
visual affordance reinforces each one.

## Spacing and layout

- Base unit: 4px.
- Content maximum: `80rem` or `max-w-7xl`.
- Page gutter: 16px on mobile and 32px from `md`.
- Route rhythm: 24px on mobile and 32px on desktop.
- Cards: 20px default internal spacing and a `1rem` base radius.
- Breakpoints: `sm` 640, `md` 768, `lg` 1024, and `xl` 1280.
- Mobile pages account for navigation height and the safe-area inset.

Dense tables may scroll horizontally, but primary routes also need a readable
mobile representation.

## Components

### Cards

Group semantic content with shared shadcn Card primitives. Cards support
default, hover or focus, loading, empty, and error states. A card is not
interactive by itself; a navigable card uses a real link.

Use tonal separation and the coffee-tinted soft shadow for depth.

Navigable cards use `interactiveCardLinkClassName`, which owns hover motion,
reduced-motion behavior, and the shared offset focus ring. Do not simulate a
link with `role="link"` and click handlers. Card titles render as `h2` by
default; override the heading level only when the surrounding hierarchy needs
it.

### Actions and semantic states

The default button is the amber primary action. Each page, form, or dialog has
one visually dominant action; supporting actions use outline, secondary, or
ghost variants. Destructive styling is reserved for deletion or irreversible
work. Favorite controls and badges use the favorite token. “Want to visit” is
a planning state; its active controls and indicators use the primary token and
a bookmark icon.

### Collection toolbar

Searchable collections use `CollectionToolbar`: a labeled search control,
result count, and optional adjacent view/filter actions. It stacks at narrow
widths and becomes a single aligned row from `sm`. Keep the toolbar visible
while a search has no results so the query can be cleared.

### Metrics and ratings

Summary metrics use `MetricCard`. Use the hero variant for at most one focal
metric, default for peers, and quiet for metrics nested inside another card.
Avoid route-local stat-card variants.

Use `StarRating` for overall quality ratings. Editable ratings and prominent
record details show the full star treatment; dense read-only contexts show the
compact star plus `value/max`. Brew sensory intensity is the deliberate
exception: bitterness, acidity, sweetness, body, and astringency use the shared
icon intensity control. Only body uses bean icons; the other traits use an icon
that describes that sense. Each trait explains what to notice and makes clear
that the scale measures intensity, not quality.

Flavor notes use a compact tag list. The stored tag hint may retain its
flavor-wheel path for later AI use, but that hierarchy does not create UI
groups. Do not seed tags that merely duplicate a dedicated sensory intensity.

### Editorial bean card

The supplied bean-grid screenshot is the visual contract. Use three full-bleed
photo cards with dark grading, a compact roast badge at the upper left, a
circular northeast arrow at the upper right, and bottom-aligned copy.

One shared Card contains the image, a restrained scrim, a top control row,
roaster, a two-line bean name, origin and process, a divider, and a two-column
roast-date and weight footer.

White type and translucent rules sit over the darkened photo. Do not add an
inset frame, parchment panel, paper grain, inner card, or visible drop shadow.

Omit missing values instead of inventing placeholder copy. The whole card is a
named link, its image is decorative, and its scrim preserves contrast. The
arrow remains decorative rather than becoming a nested control.

Active cards retain the tall reference geometry. Archived cards use a 320px
height on mobile and tablet and 304px on desktop. Long names clamp to two lines.

### Image with fallback

Use a fixed-aspect wrapper, image, and token-driven fallback. Support thumbnail
and gallery variants plus loading, loaded, and unavailable states. Never show
the native broken-image glyph.

Meaningful media has useful alternative text. Decorative thumbnails have empty
alternative text. Preserve dimensions in every state to prevent layout shift.

### Data visualization

Provide a title, optional description or legend, and fixed responsive plot
area. Support loading, rendered, no-data, and unavailable states. A visible
summary or text equivalent accompanies every chart and map.

### Saved café map

The `/visits` route uses a quiet MapLibre surface with a label-free light
basemap. It shows only saved cafés, restrained zoom controls, a React-rendered
café inspector, and concise OpenStreetMap/CARTO attribution. The `/places`
route remains the focused café-management list.

Saved cafés use a compact filled dot. Favorites use a larger double-ring dot.
Want-to-visit cafés keep the saved marker shape and identify the planning state
in accessible marker names and the café inspector.
Shape, size, state, and accessible naming carry meaning without decorative cup
or heart glyphs.

Support loading, ready, selected, empty, and unavailable states. Every visible
marker is a named button. Arrow keys move through markers in the viewport, and
selection moves focus to the inspector. Primary actions retain 44px targets.

Marker selection uses the standard 200ms transition and a short camera ease.
Reduced motion makes camera changes immediate. Animate the inspector with only
opacity and transform.

The map has a fixed responsive height. Below `lg`, the inspector and Quick
Picks follow it in normal flow. From `lg`, the map spans three columns and
Quick Picks occupies a scrollable rail. When no saved café has coordinates,
replace the map with an intentional empty state.

### Form field

Use a persistent label, native or shadcn control, and optional helper or error.
Support default, focus, disabled, invalid, and relevant loading states.

When a picker has no options, show a noninteractive setup hint. A form may
automatically select its sole option when setup defaults are enabled.

Markup must be deterministic across server and client renders. Associate every
label, keep focus visible, and never hide the caret.

### Number input

Place localized decimal text between explicit decrement and increment buttons;
do not use native browser spinner controls. The application number-format
setting controls decimal and thousands separators in inputs and displayed
measurements, while form state and server payloads remain canonical dot-decimal
strings.

Buttons and Arrow Up/Down use a practical field-specific increment without
restricting the precision of manually entered values. Accept pasted
decimal-point and decimal-comma values. Expose spinbutton value semantics and
bounds on the text control, give the attached buttons accessible increment
descriptions, and retain coarse-pointer targets.

Coordinates use the same localized parsing but remain plain decimal text fields
without stepper controls. Regional settings also define a consistent numeric
calendar-date layout for every displayed date; native date-control values remain
ISO-formatted for browser compatibility.

### Form suggestions

Place a persistent Suggestions label and wrapping compact buttons above the
related picker. Use primary tokens for the selected state. Buttons retain 44px
mobile targets and update the same labeled picker as manual selection.

### Brewing methods and recipes

The More menu links to a Brewing methods page. Each method has a name,
description, and grouped toggle matrix for its shot fields. A recipe is a
reusable value snapshot belonging to exactly one method.

Cover seeded, custom, editing, saving, blocked deletion, empty parameters,
loaded recipe, and loaded history states. Toggles expose pressed state,
selectors stay labeled, feedback is announced, and actions retain 44px targets.

Method editors stack vertically. Parameter controls use one column at 375px
and two from `sm`. Shot fields never require horizontal scrolling.

### Conditional equipment details

Show generic identity before machine settings for espresso machines or basket
details for baskets. Support absent, partial, complete, and invalid subtype
data. Confirm a type change before discarding populated subtype values.

Capability and default labels remain explicit. Nullable booleans provide an
Unknown option, and visible labels include units.

### Configurable shot measurements

Every brew setup value belongs to the shot. The brewing method determines which
fields render and persist. Recipes and bean history copy values into that same
shot state.

Conditional fields remain in document order. Equipment selectors have separate
labels. When enabled, the timer announces changes through its timer role and
uses the circular 30-second progress ring. Disabling shot time removes it.

### Picture uploader

Keep the default flow inline and singular: one prominent surface chooses files,
accepts drops, and accepts pasted image data while focused. Show selected and
failed pictures once in the same preview grid. URL import is a secondary reveal,
not a competing default action or permanently visible field.

Put validation errors next to the intake method and upload failures beside the
preview grid with one batch retry action. Do not use a toast or a separate retry
queue for picture failures. Every action is keyboard reachable, the upload
surface opens the native picker, status changes are announced, and
coarse-pointer controls are at least 44px. All input methods feed the same
preview state.

### Mobile bottom navigation

Show three primary destinations, a centered create action, and a More menu.
Use full-width touch zones, visible labels, and at least 44px action regions.
Development tooling must never overlap or intercept the fixed navigation.

### Navigation overflow menu

The named More trigger opens icon-led links to Roasters, Gear, Brewing methods,
Recipes, Stats, and Settings. Use the shared dropdown primitive, expose whether
the current route is inside the menu, and retain 44px mobile targets.

### Responsive record list

Use compact cards on mobile and a shared data table from `md`. Both versions
show the same values and navigation. Primary actions and related links remain
explicit 44px targets. Primary mobile data never needs two-axis scrolling.

The exception is a table the reader asked for. When a view control is on
screen, honour the chosen view at every width: a control that quietly renders
the other layout is worse than sideways scrolling. Such a table keeps all of
its columns on a phone and scrolls horizontally inside its own container, so
the page still scrolls vertically as one column. This applies only to an
explicit, remembered choice — a layout that is merely too wide is still a
layout to redesign, not to hand a scrollbar.

### Browsable collections

`CollectionList` is the default for any page whose job is to browse records of
one entity. Reach for it before writing a route-local card grid or table: it
already carries both layouts, the lead visual, the record link, the sortable
header, and the remembered view, so a new collection inherits them instead of
drifting. Hand-rolling one of these layouts is a deliberate design decision,
not the path of least resistance.

Cafés, roasters, recipes, and brewing methods render one server-paginated page
through it. Every collection keeps search, pagination, and the record link
identical across views; only the density changes.

Each record leads with a photo, a meaningful icon on a tinted disc, an
entity-owned visual such as the roaster logo, or nothing. Cards show the lead
visual, the name with its status icons, one supporting line, and a chevron.
Table rows repeat the same lead visual at a smaller size and add the columns
that do not fit a card.

Cards are the default. `CollectionViewToggle` sits in the collection toolbar
and stays available at every width, including phones, where the table takes the
two-axis exception above. The last view chosen for a collection is remembered
in this browser; the application-wide default list view seeds the first visit
and the server render.

A page earns a custom view when the record itself carries the design, as in the
editorial bean grid, or when browsing is not the page's main verb: shots pair a
specialised record table with grouping, and café visits lead with the map.
Gear is still a route-local card grid and is a migration candidate, not a
sanctioned exception. When a collection needs one more affordance, extend
`CollectionList` so every collection gains it, rather than forking a copy into
a route. An entity that owns its own visual passes it through the `custom`
media kind instead of reimplementing the layout around it.

### Content vocabulary and formatting

- The user-facing entity name is “café” (plural “cafés”). Internal route,
  database, and API identifiers may retain `place`, `shop`, or `coffeeShop`.
- Display measurements with a space between value and unit: `18 g`, `28 s`,
  `2 ml/s`. Keep compact unit symbols lowercase unless the unit requires case.
- Display dates with `useDateFormatter` or `useDateTimeFormatter` so the saved
  application date format is used consistently; include time for event details.
- Use the configured number formatter for visible numeric values.

## Motion and interaction

- Press and focus feedback uses a 100ms to 150ms ease-out.
- Dropdowns and state changes use a 200ms ease-in-out.
- Motion geometry uses only transform and opacity.
- Color, border, background, and shadow may transition for real state feedback.
- Layout and size do not animate.
- Hover and focus indicate real interaction, not decoration.
- Respect `prefers-reduced-motion` for nonessential motion.

## Depth and surface

Use cream and card tones for hierarchy, coffee-tinted shadows for elevation,
and borders for controls or structural separation. Errors and empty states stay
inside the same card geometry.

The page canvas uses a low-contrast, theme-aware paper grain with sparse,
barely visible coffee-ring marks. Keep these textures on `body`; cards,
popovers, controls, and other raised surfaces remain solid and crisp.

- `--coffee-shadow` is the standard card elevation.
- `--coffee-shadow-inline` shades trailing actions toward their input.
- `--coffee-shadow-strong` is for coffee-colored focal surfaces.

## Accessibility constraints

- Target WCAG 2.2 AA: 4.5:1 body text and 3:1 large text and controls.
- Make every interactive element keyboard reachable with visible focus.
- Preserve navigation at widths of 375px, 768px, and 1280px.
- Give controls at least a 44px target on coarse-pointer layouts.
- Degrade broken external resources to intentional, labeled states.

## Shared layout primitives

### Page frame

The shell owns viewport padding and the global `max-w-7xl` boundary. Routes
start with `Page` from `src/components/page-layout.tsx` and do not add another
set of horizontal page padding.

`Page` provides route rhythm and four content widths:

- `full`: dashboards, lists, maps, tables, and multi-column forms.
- `wide`: rich records and settings, bounded by `max-w-5xl`.
- `content`: reading or medium-density content, bounded by `max-w-3xl`.
- `form`: forms and compact details, bounded by `max-w-2xl`.

Choose a width for the content rather than the viewport. Constrained widths are
centered.

### Page headings and sections

- Use `PageHeader` for headings, descriptions, back controls, and actions.
- Use the default variant for collection and create pages.
- Use the compact variant for record details and subordinate screens.
- A page has one `h1`; section cards begin with `h2`.
- `FormPageHeader` is the form-oriented wrapper around `PageHeader`.
- Use `FormSection` for grouped form content and heading association.
- Keep cancel before save in the DOM.
- Stacked actions may reverse visually so the primary action appears first.
- Use `gap-4` for standard grids and `gap-5` for prominent card grids.
- Keep tables and maps wide; constrain long forms.

### Dialogs

Dialogs use the shared three-region structure:

```tsx
<DialogContent>
  <DialogHeader>...</DialogHeader>
  <DialogBody>...</DialogBody>
  <DialogFooter>...</DialogFooter>
</DialogContent>
```

`DialogContent` owns the viewport boundary, surface, shadow, and layout. The
header and footer stay visible while the body scrolls. Use `sm:max-w-lg` unless
the workflow genuinely needs more room.

- Put concise context in `DialogHeader`.
- Put scrollable content in `DialogBody`.
- Put selection helpers first and decisions last in `DialogFooter`.
- Stack footer controls on mobile and align them in a row from `sm`.
- A short confirmation dialog may omit `DialogBody`.
- Keep close reachable unless it would interrupt an unrecoverable operation.
- Change shared spacing in the primitive.
- Reserve one-off padding for intentionally immersive workflows.

### Responsive behavior

- Use `100dvh`-aware dialog limits and preserve safe-area padding.
- Wrap interactive groups instead of allowing narrow-screen overflow.
- Give icon-only controls accessible labels and hide decorative icons.
- Give every dialog a title and explain its task or consequences.
- Route styles must preserve the shared visible focus treatment.
