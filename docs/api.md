# API

`/api/v1` exposes your journal over HTTP: brews, beans and bags, roasters,
equipment and gear sets, recipes, places, café visits, brewing methods and
drinks, taste tags, statistics, and pictures. It can do everything the app
can, except manage accounts, credentials, sign-in, or instance settings.

The same operations are available as MCP tools (see
[Deployment](deployment.md#mcp)). API keys, MCP tokens, and MCP applications
share one permission model and one rate limit.

## Keys and permissions

Create a key in **Settings → API**. Give it a name, an expiry (30 days to one
year, a custom date, or none), and permissions. Keys are shown once; Roastbook
stores only a hash and the first characters (`rbk_api_…`) so you can tell keys
apart. You can change a key's name and permissions later without rotating it,
and revoke it at any time.

Permissions are granted per resource as **None**, **Read**, or
**Read & write**:

| Resource | Covers |
| --- | --- |
| `brews` | Brews, their pictures, bean and gear brew lists, analytics |
| `beans` | Beans, bags, and bag pictures |
| `roasters` | Roasters |
| `gear` | Gear, gear sets, and gear pictures |
| `recipes` | Recipes |
| `places` | Coffee shops and their pictures |
| `visits` | Café visits and their pictures |
| `methods` | Brewing methods, drink types, and drink options |
| `tags` | Taste tags |
| `shottimer` | Report brew times and read the target time ([Shottimer](shottimer.md)) |
| `stats` | Dashboard and detailed statistics (read only) |

### Links that fill in a new key

Like GitHub's token links, a link can open the new-key dialog with a name,
permissions, and expiry filled in. The owner still checks and confirms it; a
link never creates a key on its own:

```text
/settings/api?create=true&name=Backup%20script&scopes=brews:read,beans:read&expires=90d
```

`scopes` is a comma-separated list; `expires` is `30d`, `90d`, `1y`, or
`never`. Unknown scopes are ignored.

Scopes are written `<resource>:read` or `<resource>:write`; write includes
read. A key only ever reaches the journal of the account that created it:
requests run in that account's journal scope under PostgreSQL row-level
security.

## Permission reference

Every endpoint below `/api/v1` and its MCP tool (in parentheses) needs one
scope. `<resource>:write` also grants everything listed for
`<resource>:read`.

- `brews:read`: `GET /brews` (`list_brews`), `GET /brews/{id}` (`get_brew`),
  `GET /beans/{entityId}/brews` (`list_bean_brews`), `GET /beans/{id}/analytics`
  (`get_bean_brew_analytics`), `GET /gear/{entityId}/brews` (`list_gear_brews`).
- `brews:write`: `POST /brews` (`create_brew`), `PATCH /brews/{id}`
  (`update_brew`), `DELETE /brews/{id}` (`delete_brew`).
- `beans:read`: `GET /beans` (`list_beans`), `GET /beans/{id}` (`get_bean`).
- `beans:write`: `POST /beans` (`create_bean`), `PATCH /beans/{id}`
  (`update_bean`), `DELETE /beans/{id}` (`delete_bean`),
  `POST /beans/{beanId}/purchases` (`create_bean_purchase`),
  `PATCH /beans/{beanId}/purchases/{id}` (`update_bean_purchase`),
  `POST /beans/{beanId}/purchases/{id}/archive` (`archive_bean_purchase`).
- `roasters:read`: `GET /roasters` (`list_roasters`), `GET /roasters/{id}`
  (`get_roaster`).
- `roasters:write`: `POST /roasters` (`create_roaster`), `PATCH /roasters/{id}`
  (`update_roaster`), `DELETE /roasters/{id}` (`delete_roaster`).
- `gear:read`: `GET /gear` (`list_gear`), `GET /gear/{id}` (`get_gear`),
  `GET /gear-sets` (`list_gear_sets`), `GET /gear-sets/{id}` (`get_gear_set`).
- `gear:write`: `POST /gear` (`create_gear`), `PATCH /gear/{id}`
  (`update_gear`), `DELETE /gear/{id}` (`delete_gear`), `POST /gear-sets`
  (`create_gear_set`), `PATCH /gear-sets/{id}` (`update_gear_set`),
  `DELETE /gear-sets/{id}` (`delete_gear_set`).
- `recipes:read`: `GET /recipes` (`list_recipes`), `GET /recipes/{id}`
  (`get_recipe`).
- `recipes:write`: `POST /brews/{shotId}/recipe` (`save_brew_as_recipe`),
  `POST /recipes` (`create_recipe`), `PATCH /recipes/{id}` (`update_recipe`),
  `DELETE /recipes/{id}` (`delete_recipe`).
- `places:read`: `GET /places` (`list_places`), `GET /places/{id}`
  (`get_place`).
- `places:write`: `POST /places` (`create_place`), `PATCH /places/{id}`
  (`update_place`), `DELETE /places/{id}` (`delete_place`).
- `visits:read`: `GET /visits` (`list_visits`), `GET /visits/{id}`
  (`get_visit`).
- `visits:write`: `POST /visits` (`create_visit`), `PATCH /visits/{id}`
  (`update_visit`), `DELETE /visits/{id}` (`delete_visit`).
- `methods:read`: `GET /brewing-methods` (`list_brewing_methods`),
  `GET /brewing-methods/{id}` (`get_brewing_method`), `GET /drinks`
  (`get_drink_configuration`).
- `methods:write`: `POST /brewing-methods` (`create_brewing_method`),
  `PATCH /brewing-methods/{id}` (`update_brewing_method`),
  `DELETE /brewing-methods/{id}` (`delete_brewing_method`), `POST /drinks/types`
  (`save_drink_type`), `POST /drinks/types/{id}/archive` (`archive_drink_type`),
  `POST /drinks/options` (`create_drink_option`),
  `POST /drinks/options/{id}/archive` (`archive_drink_option`).
- `tags:read`: `GET /taste-tags` (`list_taste_tags`).
- `tags:write`: `POST /taste-tags` (`create_taste_tag`),
  `DELETE /taste-tags/{id}` (`delete_taste_tag`).
- `shottimer:read`: `GET /shottimer` (`get_shot_target`).
- `shottimer:write`: `POST /shottimer` (`report_shot_time`).
- `stats:read`: `GET /stats` (`get_stats`), `GET /stats/dashboard`
  (`get_dashboard`).

Pictures need the scope of the record they belong to: `brews`, `beans` (bag
pictures), `gear`, `places`, or `visits`. Reading uses `:read`, the rest
`:write`; thumbnails exist only for bags and gear.

- `GET /images` (`get_image`), `POST /images` (`upload_image`),
  `DELETE /images/{entityType}/{entityId}/{imageId}` (`delete_image`),
  `POST /images/{entityType}/{entityId}/{imageId}/thumbnail`
  (`set_image_thumbnail`).

`GET /api/v1`, `GET /api/v1/rate-limit`, and `GET /api/v1/openapi.json` need
no particular scope.

## Requests

```bash
curl -H "Authorization: Bearer $ROASTBOOK_API_KEY" \
  "https://coffee.example.com/api/v1/brews?page=1"
```

- `GET /api/v1` lists every operation and whether the key may use it.
- `GET /api/v1/openapi.json` is the OpenAPI 3.1 description, readable without
  a key. Each operation names its required scope.
- Successful responses are JSON objects with a `data` field. Lists return the
  same pages the app shows (`page`, sorting, and filters as query parameters).
- Request bodies are JSON (`Content-Type: application/json`), at most 1 MiB.
  Path parameters such as `{id}` override body fields of the same name.
- Dates and times are ISO 8601 strings. Decimal measurements such as
  `doseGrams` are strings, exactly as the app stores them.
- `PATCH` replaces the editable fields of a record, like saving its form in the
  app. Read the record first and send it back with your changes.

Errors use HTTP status codes and a JSON body:

```json
{
  "error": {
    "code": "insufficient_scope",
    "message": "This key needs the brews:write permission",
    "scope": "brews:write"
  }
}
```

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | `invalid_input` | Validation failed; `issues` lists fields |
| 401 | `unauthorized` | Missing, unknown, revoked, or expired key |
| 403 | `insufficient_scope` | The key lacks the permission in `scope` |
| 404 | `not_found` | No such route or record in your journal |
| 409 | `conflict` | The record changed or is in use |
| 422 | `operation_failed` | The journal refused the change; see `message` |
| 429 | `rate_limited` | Limit reached; see `Retry-After` |

## Pictures

Records with pictures include image rows with a `storagePath`. Download one
with `GET /api/v1/images?path=<storagePath>&size=original|small|thumbnail`.

Upload with `POST /api/v1/images`, either as `multipart/form-data` with
`entityType`, `entityId`, and `file`, or as JSON with `entityType`,
`entityId`, `filename`, `mimeType`, and base64 `data`. `entityType` is one of
`brews`, `bean-purchases`, `gear`, `places`, or `visits`, and needs write
access to the matching resource. The per-item picture limit and storage
allowance apply as in the app. Delete with
`DELETE /api/v1/images/{entityType}/{entityId}/{imageId}`.

## Rate limits

All API keys, MCP tokens, and MCP applications of one account share a
per-minute and a per-day allowance (UTC days). Operators set them with
`INTEGRATION_RATE_LIMIT_PER_MINUTE` and `INTEGRATION_RATE_LIMIT_PER_DAY` (see
[Configuration](configuration.md#api-and-mcp)). Settings → API and Settings →
AI access (MCP) show current use and each key's requests today.

Every response reports the limits:

```http
RateLimit-Policy: "minute";q=120;w=60, "day";q=5000;w=86400
RateLimit: "minute";r=117;t=42, "day";r=4890;t=50320
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 117
X-RateLimit-Reset: 1793872860
```

`X-RateLimit-*` describes the window closest to its limit. `GET
/api/v1/rate-limit` returns the same numbers as JSON. When a limit is reached,
requests return `429` with `Retry-After` until the window resets.

## Exposure

Behind Hodor, the Compose file and Helm chart let `/api/v1/*` through without
the Hodor login: the API authenticates every request with its own key and
never accepts a browser session. With another authenticating proxy, exempt
the same path prefix and keep TLS enabled because keys are bearer credentials.
