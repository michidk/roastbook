# Shottimer API

Roastbook can receive brew times from a Wi-Fi capable
[shottimer](https://github.com/michidk/shottimer) and tell the device which
target time to count against.

## Setup

1. Open **Settings → Shottimer** and turn on the integration.
2. Select **Create a shottimer key**. It opens Settings → API with a new key
   filled in: named *Shottimer*, limited to the `shottimer` permission,
   expiring after a year. Check it, create it, and copy the key into the
   shottimer configuration. The key is shown once and only reaches your
   journal. Create a new key before it expires.
3. Point the device at the public Roastbook URL.

The link is `https://<your Roastbook>/settings/api?create=true&name=Shottimer&scopes=shottimer:write&expires=1y`,
so device instructions can link to it directly. Revoke the key in Settings →
API to disconnect the device. Shottimer tokens from earlier versions were
converted to such keys.

The device uses the regular [API](api.md): the same base URL, key header,
rate limits, and error format as any other client. Its key needs only the
[`shottimer` permission](api.md#permission-reference).

## Endpoints

Every request needs `Authorization: Bearer <key>` with an API key that has
`shottimer:write` (which includes `shottimer:read`). Unknown, revoked, or
expired keys get `401`, keys without the permission `403`, and requests while
the integration is turned off `422`. See [API](api.md) for headers and errors.

### Submit a brew time

```http
POST /api/v1/shottimer
Content-Type: application/json

{"seconds": 27.4}
```

`seconds` must be a positive number up to 9999.99 and is rounded to two
decimals. A valid request returns `200` with `{"data": null}`; a malformed
body returns `400`.

Open new brew pages poll for the latest time every few seconds and offer it in
a dialog. Accepting fills in the brew time; accepting or dismissing clears the
time for every page in the same user's journal. Times older than 15 minutes are
no longer offered.

### Read the target time

```http
GET /api/v1/shottimer
```

```json
{"data": {"targetSeconds": 28}}
```

`targetSeconds` is the target time of the most recently opened new brew page,
updated as it changes there, or `null` when that page has no target.
