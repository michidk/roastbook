# Shottimer API

Roastbook can receive brew times from a Wi-Fi capable
[shottimer](https://github.com/michidk/shottimer) and tell the device which
target time to count against.

## Setup

1. Open **Settings → Shottimer** and turn on the integration.
2. Create a device token and copy it into the shottimer configuration. The
   token is shown once; creating a new one invalidates the previous token.
3. Point the device at the public Roastbook URL.

Compose and Helm let `/api/shottimer/*` through Hodor without a session (see
[Deployment](deployment.md)). With another authentication proxy, exempt the
same path prefix and keep TLS enabled because the token is a bearer
credential.

## Endpoints

Every request needs `Authorization: Bearer <token>`. Requests return `401`
while the integration is disabled, no token exists, or the token is wrong.

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
time for every page. Times older than 15 minutes are no longer offered.

### Read the target time

```http
GET /api/shottimer/target
```

```json
{"targetSeconds": 28}
```

`targetSeconds` is the target time of the most recently opened new brew page,
updated as it changes there, or `null` when that page has no target.
