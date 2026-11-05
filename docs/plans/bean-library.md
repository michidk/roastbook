# Bean library, optional bags, and café quick creation

Status: proposed. This document describes planned behavior, not shipped features.

## Purpose

Treat beans as the permanent coffee database. Bags represent optional inventory.
A coffee tried once at a café should be easy to record without creating a bag or
adding it to the shelf.

## Optional bags and shelf visibility

Bean creation has two independent controls:

- **Create and track a bag** reveals weight, roast date, price, and purchase
  details. When disabled, creation saves only the bean profile.
- **Always on shelf** keeps the bean active without an active bag. Explain it
  with “Keep this coffee on your shelf without tracking individual bags.”

Both controls may be enabled. Always on shelf controls visibility and does not
create an unlimited quantity or disable tracking on existing bags.

Proposed defaults are bag creation enabled on the Beans page, and both controls
disabled during café logging. Any existing bean can receive a bag later.

A bean is on the shelf when Always on shelf is enabled or at least one bag has
not been archived. Remaining weight does not affect this rule. An empty bag
continues to keep the bean active until the user explicitly archives it.

Show shelf beans as prominent cards and other beans in the compact Archive
section. Search and tag filters cover both sections. Archiving the last bag
moves its bean to Archive unless Always on shelf is enabled. Neither action
deletes history.

Brew logging prioritizes shelf beans and allows access to the full database for
historical entries. Café logging searches the full database immediately.

## Bean ratings and notes

Each bean has an optional personal rating of 1–5 stars and an optional rating
note, separate from the existing descriptive notes. A note may exist without a
personal rating.

Display the personal rating when set. Otherwise display the average of all rated
brews linked to the bean across every bag. Ignore unrated brews. Show derived
averages to one decimal place, with the number of rated brews, and label the
source as Your rating or Brew average. Clearing the personal rating restores the
derived value. Without either source, show Not rated rather than zero stars.

Show ratings on shelf cards, archive entries, and bean details. Compute list
ratings in an aggregate query rather than one query per card. Brew edits and
deletions must update the derived rating.

Proposed behavior keeps café-visit ratings separate because they describe the
visit. Offer an optional Rate this bean control for an explicit bean rating.

## Custom bean tags

Bean tags are separate from tasting tags. Users manage them in Settings and can
create, rename, and delete them. Proposed defaults are Reorder and Want to try.
Every account starts with the same defaults, owned independently by that account.

Seed defaults once, including an initialization marker so deleting every tag
does not restore them. Renaming updates the label everywhere. Deleting a tag
removes assignments while preserving beans and their history. Enforce unique
normalized tag names within an account.

Allow assignment during creation and on bean details, and filtering across the
shelf and archive. Tags do not change shelf visibility.

## Continuous café logging

Keep bean creation inside the visit form:

1. Select the café and drink.
2. Search existing beans or choose Add this coffee.
3. Enter a bean name and optional roaster. Put origin, processing, pictures,
   tags, and other optional fields under More details.
4. Enter the visit rating and notes, with an optional personal bean rating.
5. Save the visit.

New beans default to no bag and no shelf placement. Allow users to change either
option when they also bought the coffee. The bean remains optional when its name
is unknown.

Keep new beans in the form draft until submission. Save the bean, optional bag,
tag assignments, personal rating, and visit in one atomic journal operation.
Canceling creates no record, and a failed save leaves no partial record. Preserve
all draft values after validation or network errors. Use the journal's replay
and identifier mechanisms so retries and offline synchronization do not duplicate
records. Handle picture uploads through the existing recoverable upload flow;
database atomicity does not imply atomic external object storage.

## Implementation sequence

1. Add optional bag creation and Always on shelf. Update creation inputs,
   shared shelf queries, forms, cards, brew selection, and callers that assume
   creation always returns a bag identifier. Support bean-profile pictures when
   no bag exists, reusing the existing image and upload recovery mechanisms.
2. Add personal rating and rating-note fields, aggregate brew ratings, and show
   the same calculation in the list and detail views.
3. Add account-owned bean tags and assignments, one-time default initialization,
   Settings management, assignment controls, and filtering.
4. Add the café inline draft and atomic bean-plus-visit journal write.

Use the existing SQL journal architecture. Keep owner predicates and composite
owner foreign keys, allocate identifiers through allocateJournalIds, and batch
related mutations with runJournalMutations and applicable compare-and-swap
assertions. Register new journal modules. Update synchronization table metadata,
identifier reservations, export/import, demo fixtures, and supported database
implementations where applicable.

The current implementation separates beans and bags, and brews already support
a bean without a bag. However, createBean always creates a bag. The café picker
currently creates an archived bag through the full bean form. The creation form
also uploads pictures to the created bag. These assumptions must change together.

Primary implementation locations:

- src/db/schema.ts and generated migrations
- src/journal/beans.ts and src/journal/input/beans.ts
- src/journal/cafe-visits.ts and src/journal/input/cafe-visits.ts
- src/components/beans/bean-form.tsx and bean-picker.tsx
- src/components/visits/visit-fields.tsx and src/routes/visits/new.tsx
- Bean list, detail, brew selection, Settings, and account default initialization

Check supported editions against the implementation branch before adding
edition-specific migrations. The planning checkout included hosted SQLite/D1
work that may not yet be present on main.

## Migration and compatibility

Set Always on shelf to false for existing beans to preserve their current shelf
visibility. Preserve bags, pictures, brew links, and archive states. Do not
automatically delete old archived bags created during café visits, since they
may contain real information. Existing beans without bags belong in Archive.

Old journal writes must replay compatibly. An omitted new bag-creation option
should retain the old behavior of creating a bag; new forms send their choice
explicitly. Personal ratings start unset. Initialize default tags once for both
existing and new accounts, including shared-journal and demo initialization.

Update the source-of-truth documentation when behavior ships. Update README only
for shipped feature, setup, or documentation-entry changes.

## Acceptance and verification

- A bean can be created without a bag, then receive one later.
- An empty unarchived bag keeps its bean on the shelf.
- Archiving the final bag respects Always on shelf, and toggling it updates
  visibility without deleting history.
- Bagless beans can be selected for brews without inventory deductions.
- Personal ratings override averages; clearing them restores the average.
  Unrated brews do not affect it, and editing or deleting rated brews updates it.
- Bean tags remain account-isolated. Deleted defaults never reappear.
- Café creation preserves the draft, creates no record on cancel, saves related
  records atomically, and survives retries and offline replay without duplicates.
- Pictures work for both bagless beans and tracked bags, including upload recovery.
- Migration, export/import, and synchronization preserve existing records.

Run targeted tests, check, and typecheck for each logic stage. Exercise schema
changes with migrations, relevant integration tests, and a production build.
Verify changed forms at 375px, 768px, and 1280px with console and request checks.
Run the full verification command before handing off the completed feature.

## Product choices proposed for implementation

The following defaults are recommendations rather than additional requirements:

- Enable bag creation by default on the Beans page.
- Keep café-visit ratings out of derived bean ratings.
- Seed Reorder and Want to try as the initial bean tags.
- Keep the Archive label for all beans currently outside the shelf.
