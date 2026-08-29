# Gear property model

<!-- markdownlint-disable MD013 -->

- Status: accepted for implementation
- Reviewed: 2026-08-29
- Related issues: [#13](https://github.com/michidk/roastbook/issues/13),
  [#8](https://github.com/michidk/roastbook/issues/8)

## Decision

Roastbook will separate equipment data into four kinds:

1. Common identity and inventory data remains on `gear`.
2. Stable capabilities and product specifications use typed, per-subtype
   detail records.
3. Factory defaults and an owner's mutable configuration use append-only,
   effective-dated setting revisions.
4. Brewing intent and observed results remain on recipes and brews.

This keeps the gear catalog useful without turning it into a product database.
The first subtype implementation must cover the **Core** properties below.
**Next** properties are worthwhile structured enhancements but should not delay
the core model; already-shipped fields remain available while they are migrated.
**Notes** properties deliberately have no dedicated field. **Brew** properties
belong on a recipe or brew, even when a machine happens to provide the control.

All subtype properties are optional in storage. "Core" means essential to the
model and first UI, not required user input: an owner must be able to save a
machine while every specification remains unknown.

## Shared semantics

### Unknown, no, and zero

- `NULL` means unknown or not recorded.
- A nullable boolean uses `false` only for a known "no". It never substitutes
  for `NULL`.
- A nullable enum uses an explicit `none` value for a known absence and `NULL`
  for unknown.
- A nullable set uses `NULL` for unknown and an empty set for known none.
- Zero is stored only when it is physically meaningful. Compatibility
  dimensions, capacities, dose sizes, and resolutions must be greater than
  zero. Setting fields use per-field constraints so zero remains distinct from
  unknown when it means no pressure, flow, or duration. Signed offsets may be
  negative or zero.
- Empty strings are normalized to `NULL`; they do not encode unknown.

### Units

Persist one canonical metric value and show the unit in every label and
read-only value. The canonical units are millimetres (`mm`), grams (`g`),
millilitres (`mL`), seconds (`s`), degrees Celsius (`°C`), bar, and millilitres
per second (`mL/s`). Initial forms do not need unit preferences or conversion.
Research imports convert compatible source units to the canonical unit and
retain the source's original value in evidence. Display conversion can be added
later without a data migration.

### Ownership

- **Spec** is a stable manufacturer capability or physical property.
- **Factory** is an explicitly documented factory default, not a universal
  truth about every unit or firmware revision.
- **Setting** is the owner's configuration for a period of time.
- **Recipe** is intended brewing behavior.
- **Brew** is the value used or observed for one brew.
- **Inventory** describes ownership rather than brewing behavior.

A factory value and an owner setting must never share one unlabeled column.
Research may propose specs and factory values, but never owner settings, recipe
targets, or observed brew values.

## Common gear properties

These apply to every current gear type.

| Property | Priority | Shape and nullability | Owner | Definition and decision |
| --- | --- | --- | --- | --- |
| `brand` | Core | Non-empty text | Spec | Manufacturer or maker. Keep; required by the current product. |
| `model` | Core | Non-empty text | Spec | Manufacturer's model name or number. Keep; required by the current product. |
| `type` | Core | Existing `gear_type` enum | Spec | Controls subtype fields and valid brew roles. Keep. |
| `name` | Core | Derived text | Spec | Search/display value derived from brand and model. Keep it derived; do not add another user-entered name. |
| `purchaseDate` | Next | Nullable date | Inventory | Date this unit was acquired. Keep. |
| `purchasePrice` and `priceCurrency` | Next | Nullable non-negative decimal plus supported currency | Inventory | Acquisition cost. Keep the pair atomic in UI and validation. |
| `manualUrl` | Next | Nullable URL | Spec | Documentation for the exact model or revision. Keep and prefer it during research. |
| `productUrl` | Next | Nullable URL | Spec | Manufacturer or canonical product page. Keep. |
| `notes` | Notes | Nullable text | Mixed | Owner observations, modifications, compatibility caveats, and low-value catalog facts. Keep, but do not parse it as authoritative structured data. |
| archive and timestamps | Core | Existing non-null fields | Inventory | Lifecycle metadata. Keep. |

Changing `type` must transactionally remove incompatible subtype rows only
after the user confirms the potential data loss. A combined espresso machine
uses both the espresso-machine and grinder detail records; it does not get a
second set of built-in-grinder columns.

## Espresso machines

The matrix applies to both `espresso_machine` and
`espresso_machine_with_grinder`.

### Stable capabilities and specifications

| Property | Priority | Shape and nullability | Owner | Definition |
| --- | --- | --- | --- | --- |
| `portafilterDiameterMm` | Core | Nullable decimal, `> 0`, mm | Spec | Nominal basket/group interface diameter, such as 54 or 58 mm; not the basket's outer rim. It supports basket and tamper compatibility. |
| `heatingArchitecture` | Core | Nullable enum | Spec | One of `single_boiler`, `heat_exchanger`, `dual_boiler`, `multi_boiler`, `single_thermoblock`, `dual_thermoblock`, `hybrid`, `manual`, or `other`. Thermocoils map to the corresponding thermoblock class. |
| `temperatureControl` | Core | Nullable enum | Spec | Brew-temperature control capability: `none`, `fixed`, `adjustable`, or `programmable`. A PID is evidence for adjustable or programmable control, not a separate user-facing category. |
| `pressureControl` | Core | Nullable enum | Spec | Brew-pressure control capability: `fixed`, `adjustable_opv`, `manual`, or `programmable`. It describes control, not the pump's advertised maximum rating. |
| `flowControl` | Core | Nullable enum | Spec | Brew-flow control capability: `none`, `manual`, or `programmable`. A fixed unrestricted path is `none`, not unknown. |
| `preinfusionControl` | Core | Nullable enum | Spec | Pre-infusion capability: `none`, `supported`, `fixed`, `adjustable`, or `programmable`. `supported` preserves a known yes when the control type is unknown. |
| `shotStopModes` | Core | Nullable set of enum values | Spec | Supported ways to end dosing: `manual`, `time`, `volume`, and/or `weight`. This is a capability set, not the owner's selected default. |
| `steamSystem` | Core | Nullable enum | Spec | `none`, `shared_heater`, or `dedicated_heater`. It captures whether steaming exists and whether it has dedicated heat generation. |
| `simultaneousBrewAndSteam` | Core | Nullable boolean | Spec | Whether the machine can brew and steam at the same time under its normal documented workflow. |
| `groupCount` | Next | Nullable integer, `> 0` | Spec | Number of independently usable brew groups. Mostly useful for commercial and comparison use. |
| `pumpType` | Next | Nullable enum | Spec | `vibration`, `rotary`, `gear`, `peristaltic`, `manual`, or `other`. It is less useful than the pressure/flow capabilities themselves. |
| `waterSourceModes` | Next | Nullable set of `reservoir`, `plumbed` | Spec | Supported water-supply modes. Record both for convertible machines. Reservoir capacity stays in notes. |
| `brewPressureMinimumBar` and `brewPressureMaximumBar` | Next | Nullable non-negative decimal pair, bar | Spec | Documented controllable operating range. Do not use pump maximum pressure. Require minimum to be less than or equal to maximum. |
| `brewTemperatureMinimumCelsius` and `brewTemperatureMaximumCelsius` | Next | Nullable decimal pair, °C | Spec | Documented selectable brew-temperature range. Require minimum to be less than or equal to maximum. |

`espresso_machine_with_grinder` is the structured indication that a grinder is
built in. Its grinder properties come from the grinder matrix below. Do not add
another `hasBuiltInGrinder` boolean or duplicate burr fields on machine
details.

### Factory defaults, owner settings, recipes, and brews

The same concept may exist at more than one ownership layer. The layer is part
of its meaning.

| Property | Priority | Shape and nullability | Owner | Definition and boundary |
| --- | --- | --- | --- | --- |
| `brewPressureBar` | Core | Nullable non-negative decimal, bar | Factory/Setting | Documented factory operating target or the owner's current pressure/OPV setting. Recipe pressure is the target and brew pressure is the observed/used value. |
| `preinfusionEnabled` | Core | Nullable boolean | Factory/Setting | Whether the default machine workflow applies pre-infusion. It must not replace `preinfusionControl`. |
| `preinfusionTimeSeconds` | Core | Nullable non-negative decimal, s | Factory/Setting | Default pre-infusion duration. The recipe and brew values override and snapshot it. Zero is a meaningful disabled duration only when the machine documents that behavior. |
| `preinfusionPressureBar` | Core | Nullable non-negative decimal, bar | Factory/Setting | Default pre-infusion pressure. Recipe and brew values remain separate. |
| `brewTemperatureOffsetCelsius` | Next | Nullable signed decimal, °C | Factory/Setting | Calibration or controller offset, not the brew-temperature setpoint. Zero and negative values are valid. |
| `flowLimitMlPerSecond` | Next | Nullable non-negative decimal, mL/s | Factory/Setting | Default scalar flow limit. Per-recipe targets and per-brew observations remain on those records. Staged profiles belong to #8. |
| `defaultStopMode` | Next | Nullable member of the stop-mode enum | Factory/Setting | The selected default among `shotStopModes`. It does not prove that no other mode is supported. |
| `programmedVolumeMl` | Next | Nullable positive decimal, mL | Factory/Setting | One explicitly identified default volumetric program. Multi-button programs need a later child model; actual beverage yield stays on the brew. |
| `steamTemperatureCelsius` | Next | Nullable positive decimal, °C | Factory/Setting | Steam controller default or owner setting. It is not a brew-temperature field. |
| `steamPressureBar` | Next | Nullable non-negative decimal, bar | Factory/Setting | Steam-circuit operating default or owner setting. It is never inferred from pump pressure. |
| `brewTemperatureCelsius` | Brew | Nullable decimal, °C | Recipe/Brew | Recipe target or value used for one brew. A commonly used machine setpoint is still brewing intent, not a stable gear property. |
| dose, water, yield, ratio, grind setting, time, bloom, pressure, flow, puck preparation | Brew | Existing validated recipe/brew fields | Recipe/Brew | Keep on recipes and brews. Selecting gear may provide defaults but later gear edits must not mutate old records. |
| pressure/flow stages, telemetry, controller/PID profiles | Later | Profile or time series | Recipe/Brew/Setting | Explicitly deferred to #8. Do not approximate these with extra scalar gear fields. |

### Existing machine-field audit

No existing user value is discarded during the first migration.

| Existing field | Decision | Migration meaning |
| --- | --- | --- |
| `brewPressureOpvBar` | Rename and redefine | Move to an owner setting revision as `brewPressureBar`. It is operating pressure, not proof of an OPV or a pump rating. Research-sourced documented defaults become a separate factory revision. |
| `supportsPreinfusion` | Replace | Move `false` to `preinfusionControl = none`, `true` to `supported`, and `NULL` to unknown. More specific capability values require user or researched evidence. |
| `defaultPreinfusionEnabled` | Move | Move to `preinfusionEnabled` on the appropriate factory or owner setting revision. Existing unlabeled values migrate as owner settings. |
| `defaultPreinfusionTimeSeconds` | Move | Move to `preinfusionTimeSeconds` on an owner setting revision. |
| `defaultPreinfusionPressureBar` | Move | Move to `preinfusionPressureBar` on an owner setting revision. |
| `defaultFlowLimitMlPerSecond` | Move | Move to `flowLimitMlPerSecond` on an owner setting revision. |
| `temperatureOffsetCelsius` | Rename and move | Move to signed `brewTemperatureOffsetCelsius` on an owner setting revision. Remove the research validator's current non-negative assumption. |
| `volumetricShotVolumeMl` | Rename and move | Move to `programmedVolumeMl` on an owner setting revision. Do not treat it as actual yield. |
| `autoStopMode` | Split | Move the value to `defaultStopMode`. It proves support for that one mode, which may be added to `shotStopModes`; it does not define the complete capability set. |
| `steamTemperatureCelsius` | Move | Move unchanged to an owner setting revision; expose it in the later/advanced group. |
| `steamPressureBar` | Move | Move unchanged to an owner setting revision; expose it in the later/advanced group. |

The current table name `machine_settings` is therefore misleading. Typed
machine capabilities belong in an `espresso_machine_details` record; temporal
values belong in `espresso_machine_setting_revisions`.

## Other gear types

### Grinders

This matrix also applies to the grinder inside
`espresso_machine_with_grinder`.

| Property | Priority | Shape and nullability | Owner | Definition |
| --- | --- | --- | --- | --- |
| `burrMechanism` | Core | Nullable enum | Spec | `conical`, `flat`, `ghost`, `roller`, `blade`, or `other`. Use `blade` for blade grinders rather than pretending they have a burr diameter. |
| `burrDiameterMm` | Core | Nullable decimal, `> 0`, mm | Spec | Manufacturer's nominal burr diameter. Leave unknown for blade grinders. |
| `adjustmentType` | Core | Nullable enum | Spec | `fixed`, `stepped`, or `stepless`. Digital steps are still stepped. |
| `brewRange` | Core | Nullable set of `espresso`, `filter` | Spec | Documented usable brew range. Both means all-purpose; it is not inferred from marketing alone. |
| `beanFeed` | Next | Nullable enum | Spec | `single_dose`, `hopper`, or `both`. |
| `doseControlModes` | Next | Nullable set of `manual`, `time`, `weight` | Spec | Supported ways the grinder controls a dose. |
| `burrMaterial` | Next | Nullable enum | Spec | `steel`, `ceramic`, or `other`; coating names stay in notes. |
| `grindSetting` | Brew | Nullable text | Recipe/Brew | Keep the grinder's native setting label on the recipe and brew. It is not comparable across units and may change after calibration. |

Motor power, advertised retention, noise, hopper capacity, anti-static
marketing, and RPM belong in notes until a concrete comparison or
recommendation use case exists. A materially different replacement burr set
should be recorded in notes or as a separate gear record until component
history is designed.

### Brewers

| Property | Priority | Shape and nullability | Owner | Definition |
| --- | --- | --- | --- | --- |
| `brewerMechanism` | Core | Nullable enum | Spec | `percolation`, `immersion`, `hybrid`, `press`, `vacuum`, or `other`. This describes the device; the existing brewing-method record still controls form behavior. |
| `capacityMl` | Core | Nullable decimal, `> 0`, mL | Spec | Manufacturer's practical maximum brew capacity, not package volume. |
| `filterFormat` | Core | Nullable short text | Spec | Compatible named filter format or size, such as `02` or `AeroPress`. Free text is intentional because formats are product-specific. |
| `flowControl` | Next | Nullable enum | Spec | `fixed`, `manual_valve`, or `programmable`. It describes a brewer valve/control, not the recipe's target flow. |

Material, color, rib geometry, and hole count stay in notes. Dose, water,
temperature, bloom, agitation, drawdown time, and yield are recipe/brew data.

### Kettles

| Property | Priority | Shape and nullability | Owner | Definition |
| --- | --- | --- | --- | --- |
| `capacityMl` | Core | Nullable decimal, `> 0`, mL | Spec | Manufacturer's usable water capacity. |
| `spoutType` | Core | Nullable enum | Spec | `gooseneck`, `standard`, or `other`. |
| `temperatureControl` | Core | Nullable enum | Spec | `none`, `fixed`, or `adjustable`. Stovetop kettles normally use `none`. |
| `minimumTemperatureCelsius` and `maximumTemperatureCelsius` | Next | Nullable decimal pair, °C | Spec | Documented selectable range; require minimum to be less than or equal to maximum. |
| `supportsTemperatureHold` | Next | Nullable boolean | Spec | Whether the kettle can maintain a chosen setpoint. |
| `brewTemperatureCelsius` | Brew | Nullable decimal, °C | Recipe/Brew | Target or measured brew-water temperature. It never belongs to the kettle record. |

Power, voltage, finish, cable details, and base dimensions stay in notes.

### Scales

| Property | Priority | Shape and nullability | Owner | Definition |
| --- | --- | --- | --- | --- |
| `resolutionGrams` | Core | Nullable decimal, `> 0`, g | Spec | Smallest displayed increment in the relevant weighing range. |
| `capacityGrams` | Core | Nullable decimal, `> 0`, g | Spec | Maximum supported load. |
| `hasTimer` | Core | Nullable boolean | Spec | Whether a timer is available on the scale itself. |
| `supportsAutoTare` | Next | Nullable boolean | Spec | Whether a documented automatic tare workflow exists. |
| `supportsAutoTimer` | Next | Nullable boolean | Spec | Whether timing can start or stop automatically from detected flow or weight. |
| `hasFlowRateDisplay` | Next | Nullable boolean | Spec | Whether the scale calculates live flow rate. |

Battery chemistry, display dimensions, charging connector, and claimed battery
life stay in notes. Connectivity, device protocols, and sampled weight data are
part of #8.

### Tampers

| Property | Priority | Shape and nullability | Owner | Definition |
| --- | --- | --- | --- | --- |
| `diameterMm` | Core | Nullable decimal, `> 0`, mm | Spec | Nominal base diameter for basket compatibility. |
| `forceControl` | Core | Nullable enum | Spec | `none`, `fixed`, or `adjustable`; describes calibrated force capability. |
| `baseShape` | Next | Nullable enum | Spec | `flat`, `convex`, `rippled`, or `other`. |
| `selfLeveling` | Next | Nullable boolean | Spec | Whether the tamper mechanically references the basket rim to level the base. |
| `tampForceKg` | Brew | Nullable positive decimal, kg | Recipe/Brew | Intended or used force. A fixed-force tamper can suggest a default, but the value remains brew data. |

Handle material, finish, and cosmetic variants stay in notes.

### WDT tools

| Property | Priority | Shape and nullability | Owner | Definition |
| --- | --- | --- | --- | --- |
| `needleDiameterMm` | Core | Nullable decimal, `> 0`, mm | Spec | Manufacturer's needle or filament diameter. |
| `needleCount` | Core | Nullable integer, `> 0` | Spec | Number of working needles in the configured tool. |
| `depthControl` | Next | Nullable enum | Spec | `none`, `fixed`, or `adjustable`. |
| distribution method/use | Brew | Existing method plus accessory link | Recipe/Brew | Keep the use of WDT on the recipe/brew; owning a tool does not mean it was used. |

Pattern geometry, handle material, and stand details stay in notes.

### Baskets

| Property | Priority | Shape and nullability | Owner | Definition |
| --- | --- | --- | --- | --- |
| `diameterMm` | Core | Nullable decimal, `> 0`, mm | Spec | Nominal group/tamper compatibility diameter. Do not use the basket rim's outer diameter. |
| `nominalDoseGrams` | Core | Nullable decimal, `> 0`, g | Spec | Manufacturer's named dose size. Keep the existing field with this narrower definition. |
| `isPressurized` | Core | Nullable boolean | Spec | `true` for a pressure-enhancing/dual-wall basket, `false` for known non-pressurized, and `NULL` for unknown. |
| `doseMinimumGrams` and `doseMaximumGrams` | Next | Nullable positive decimal pair, g | Spec | Documented usable dose range. Do not manufacture a range from a single nominal value. |
| `basketKind` | Next | Nullable enum | Spec | `single`, `double`, `triple`, or `other`, following the maker's intended format. |
| `doseGrams` | Brew | Nullable positive decimal, g | Recipe/Brew | Actual or target coffee dose. Basket capacity may validate or warn, but never overwrites it. |

Ridge style, coating, hole count/pattern, wall shape, and marketing names stay
in notes until they drive a tested recommendation.

### Other equipment

`other` receives only the common gear fields and notes. A property should earn
a new typed gear category when at least one of these is true:

- it affects reproducibility and should be copied into recipe or brew context;
- it enables compatibility validation;
- it supports a meaningful filter or comparison; or
- it supplies evidence used by a tested recommendation.

Color, dimensions, weight, packaging contents, warranty text, electrical
certifications, and other catalog trivia remain notes unless a specific product
workflow demonstrates value.

## Persistence and history

Canonical properties should use typed columns in one-to-one subtype tables,
not a JSON or entity-attribute-value property bag. The intended first schema is:

- `gear` for the existing common fields;
- one-to-one detail tables such as `espresso_machine_details`,
  `grinder_details`, and `basket_details` for stable specs;
- `espresso_machine_setting_revisions` for factory and owner settings; and
- `gear_property_evidence` for research provenance.

An espresso-machine setting revision has an immutable identifier, `gearId`, a
`kind` of `factory` or `owner`, the applicable setting columns, `effectiveFrom`,
an optional `supersededAt`, and timestamps. At most one owner revision is
current. Editing current settings closes that revision and inserts a new one;
old revisions are not rewritten or deleted.

A new brew may reference the current owner revision and copy relevant defaults
into its own scalar fields. Old brews retain that revision reference and their
snapshotted recipe/brew values, so later machine changes cannot rewrite
history. Recipes store explicit targets and do not dynamically read the latest
machine settings. Hardware modifications that change stable capabilities use
notes or a new gear record in the initial implementation rather than silently
changing the meaning of old brews.

Capability sets may use checked arrays or child rows, but their logical
contract must preserve `NULL` (unknown) separately from an empty set (known
none). `espresso_machine_with_grinder` is the only type allowed to own both
machine and grinder subtype rows.

## Research and provenance

`gear_property_evidence` records one claim per property and source with:

- `gearId` and a stable `propertyKey`;
- the normalized `valueJson` proposed or applied;
- source URL, title, and source kind;
- the raw source value and unit when conversion occurred;
- retrieval time and optional model region, revision, or firmware context; and
- whether the owner accepted the value.

The typed subtype or setting record remains the selected value; evidence is an
audit trail, not the primary value store. Multiple sources and conflicting
claims can coexist.

Research reliability, from strongest to weakest, is:

1. exact-model manual, service/support document, or manufacturer specification;
2. exact-model manufacturer product page;
3. reputable specialist measurement or technical review;
4. retailer listing; and
5. community content.

Retailer and community sources may help identity or flag a conflict but should
not automatically populate a core value. Numerical values require explicit
exact-model evidence. Research must not infer operating brew pressure from a
pump's maximum rating, infer a setting from a capability, or copy facts from a
nearby model. Region, revision, and firmware ambiguity yields unknown. Imports
present conflicts for review and never replace a non-empty owner value by
default.

The machine-research contract should first cover Core specs and explicit
factory defaults. It must stop writing researched factory facts into the
owner's current configuration. Later research contracts can add the Core
properties for other gear types using the same evidence rules.

## Follow-up implementation slices

### 1. Schema and migration

- Add typed machine and grinder detail records, setting revisions, Core detail
  records for the remaining types, and evidence storage.
- Add constraints for positivity, paired ranges, subtype/type compatibility,
  and one current owner setting revision.
- Migrate every existing machine value according to the audit table. Treat
  unlabeled legacy defaults as owner settings and retain the old columns until
  the new read/write path has shipped and been verified.
- Keep `nominalDoseGrams`; add basket diameter and pressurization without
  inventing dose ranges.

### 2. Forms and details

- Show Core fields by type and keep all of them optional.
- Use tri-state controls for nullable booleans and explicit `none` choices for
  capability enums.
- Separate "Capabilities", "Current setup", and "Factory defaults" in the UI.
- Put Next fields behind an advanced section only as they are implemented.
- When settings change, create a revision and make its effective date clear.
- Show source links and conflicts beside researched values.

### 3. Research import

- Replace the current mixed machine-settings contract with spec and factory
  contracts using the canonical names and enums above.
- Return claim-level evidence and unit conversions, not values alone.
- Apply only owner-selected claims; never populate owner settings from web
  research.
- Add grinder research for combined machines without duplicating fields.

### 4. Tests

- Cover `NULL` versus `false`, `none`, empty sets, and numeric zero.
- Test every enum, measurement bound, paired range, and unit conversion.
- Verify type changes, combined-machine subtype ownership, and transactional
  preservation/removal rules.
- Exercise the full legacy migration, including nullable values and each
  existing auto-stop mode.
- Prove setting edits leave old revisions and brew snapshots unchanged.
- Validate research source ranking, conflicts, unsupported claims, provenance,
  and rejection of pump maximum pressure.

Advanced profiles, time-series telemetry, device/controller protocols, and
arbitrary controller configuration remain exclusively in #8.
