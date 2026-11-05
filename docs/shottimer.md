# Shottimer API

Roastbook can receive brew times from a Wi-Fi capable
[shottimer](https://github.com/michidk/shottimer) and tell the device which
target time to count against.

## Setup

1. Open **Settings → Shottimer** and turn on the integration.
2. Select **Create a shottimer key**. It opens Settings → API with a new key
   filled in: named *Shottimer*, limited to the `shottimer` permission, without
   expiry. Check it, create it, and copy the key into the shottimer
   configuration. The key is shown once and only reaches your journal.
3. Point the device at the public Roastbook URL.

The link is `https://<your Roastbook>/settings/api?create=true&name=Shottimer&scopes=shottimer:write&expires=never`,
so device instructions can link to it directly. Revoke the key in Settings →
API to disconnect the device. Device tokens created before API keys existed
were converted to such keys and keep working.

Compose and Helm let `/api/shottimer/*` through Hodor without a session (see
[Deployment](deployment.md)). With another authentication proxy, exempt the
same path prefix and keep TLS enabled because the key is a bearer credential.

## Endpoints

Every request needs `Authorization: Bearer <key>` with an API key that has
`shottimer:write` (which includes `shottimer:read`). Requests return `401`
while the integration is disabled or the key is unknown, revoked, or expired,
and `403` when the key lacks the permission. They count against the account's
[rate limits](api.md#rate-limits). The same operations are available as
`/api/v1/shottimer/shots` and `/api/v1/shottimer/target`.

### Submit a brew time

```http
POST /api/shottimer/shots
Content-Type: application/json

{"seconds": 27.4}
```

`seconds` must be a positive number up to 9999.99 and is rounded to two
decimals. A valid request returns `204`; a malformed body returns `400`.

Open new brew pages poll for the latest time every few seconds and offer it in
a dialog. Accepting fills in the brew time; accepting or dismissing clears the
time for every page in the same user's journal. Times older than 15 minutes are
no longer offered.

### Read the target time

```http
GET /api/shottimer/target
```

```json
{"targetSeconds": 28}
```

`targetSeconds` is the target time of the most recently opened new brew page,
updated as it changes there, or `null` when that page has no target.
