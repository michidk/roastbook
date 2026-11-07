# Beautify uploaded images

Approved in conversation on 2026-11-06.

Users can enable **Beautify image** in image upload controls. Persist the last
choice per journal in the database, initially off. Automatically edit only the
primary picture. Individual gallery pictures also offer a Beautify action.

Keep the original and use the edit for the displayed image and its thumbnails.
The fixed prompt preserves the product and label text, reduces artifacts,
evens lighting, and replaces the background with a softly blurred setting.
Failures preserve the original and allow retry. AI operations require an online
connection and a configured provider; the static demo makes no paid requests.

## Approaches

Replacing the original would lose user data. Adding a second independent gallery
record would consume the per-item picture allowance. Store an original path on
the existing record instead, count both versions toward storage, and include both
in deletion and export handling. Keep journal writes portable and replayable;
perform the paid provider call only in a server operation.

Use the existing provider transport and AI request recorder. Record actual image
and text usage, model, pricing source/version, and USD cost. Unknown usage or
non-OpenAI pricing must remain unknown. Add optional server-side PostHog events
without picture content or secrets. Interpretation: the user's “postdoc” means
PostHog. Use a fixed OpenAI image editing model independent of text/vision models.

## Verification

Exercise usage/cost parsing, provider serialization and errors, owner isolation,
original preservation, storage quota and deletion, remembered preference and
primary-only selection. Run repository checks and production build. Report any
unavailable integration or visual coverage explicitly.
