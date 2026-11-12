# Optional usage statistics

Users may share feature usage with Roastbook's maintainers. Nothing is sent
before explicit consent. The first-use checkbox is unchecked; General settings
allow revocation. A runtime administrator switch overrides consent.

## Approach

Use the existing server event hooks and a small PostHog HTTP sender. A browser
SDK would add automatic metadata and capabilities this feature does not need.
A separate collector service is unnecessary for three fixed events.

Only bean_created, brew_created and ai_recommendation_created are collected.
Each event includes a random browser analytics identity, release and
self_hosted deployment_type. No account identifiers, content, URLs, email,
recordings or arbitrary properties are accepted. Consent and identity live in
one first-party HttpOnly cookie. Denial removes the identity; consenting again
creates a new one. Preferences apply to this browser, including shared journals.

Offline journal replays and integration requests do not produce usage events.
No events are queued or backfilled. Failures never fail a journal action.
The demo does not prompt or collect. The public ingestion token is embedded
as explicitly requested; no personal or management API key is distributed.

The existing operator-configured image cost exporter is separate and is not
connected to the embedded token.
