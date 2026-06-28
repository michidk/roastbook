# Roastbook

A self-hosted coffee logging application for tracking espresso shots, cafe visits, beans, and gear. Built with TanStack Start, shadcn/ui, PostgreSQL/Drizzle, deployed via Helm with hodor authentication.

## Stack

| Layer | Technology |
|-------|------------|
| Runtime | [Bun](https://bun.sh) |
| Framework | [TanStack Start](https://tanstack.com/start) (React 19, Vite 8) |
| Routing | [TanStack Router](https://tanstack.com/router) (file-based) |
| UI | [shadcn/ui](https://ui.shadcn.com) with Tailwind CSS v4 |
| Database | PostgreSQL with [Drizzle ORM](https://orm.drizzle.team) |
| Storage | Local filesystem or S3-compatible |
| AI | OpenAI GPT-4o Vision (bean info extraction from images) |
| Auth Gate | [hodor](https://github.com/michidk/hodor) (sidecar reverse proxy) |
| Container | Docker (multi-stage, bun:1-slim) |
| Orchestration | Kubernetes via Helm |

## Features

- **Espresso Shot Logging** — Track dose, yield, time, grind setting, and tasting notes for every shot
- **Bean Management** — Catalog your coffee beans with roaster, origin, process, and roast level
- **AI-Powered Label Scanning** — Extract bean info from bag photos using GPT-4o Vision
- **Cafe Visits** — Log visits to coffee shops with location and notes
- **Gear Inventory** — Keep track of your grinders, machines, and accessories
- **Statistics & Charts** — Visualize your coffee journey over time

## Getting Started

```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
bun run db:push

# Start development server
bun run dev
```

The app will be available at http://localhost:3000

## Commands

```bash
bun run dev              # Development server (port 3000)
bun run build            # Production build
bun run test             # Run tests
bun run lint:deadcode    # Check for unused code (knip)
bun run db:generate      # Generate migrations
bun run db:migrate       # Run migrations
bun run db:push          # Push schema to database
bun run db:studio        # Open Drizzle Studio
bun run db:seed          # Seed database with sample data
```

## Docker

```bash
docker build -t roastbook .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  roastbook
```

## Helm Deployment

### External PostgreSQL (default)

The simplest path is to give the chart a full connection string and let it create
the internal secret for you:

```bash
helm install roastbook ./charts/roastbook \
  --set hodor.password="your-password" \
  --set hodor.secret="$(openssl rand -hex 32)" \
  --set image.tag="latest" \
  --set postgresql.external.url="postgresql://roastbook:db-password@postgres.default.svc:5432/roastbook"
```

If you prefer to keep the connection parts separate, the chart can still assemble
the URL from host and auth values:

```bash
helm install roastbook ./charts/roastbook \
  --set hodor.password="your-password" \
  --set hodor.secret="$(openssl rand -hex 32)" \
  --set image.tag="latest" \
  --set postgresql.auth.username="roastbook" \
  --set postgresql.auth.password="db-password" \
  --set postgresql.auth.database="roastbook" \
  --set postgresql.external.host="postgres.default.svc" \
  --set postgresql.external.port="5432"
```

Roastbook defaults to an external PostgreSQL connection so chart users are not tied
to a specific bundled database image source. This avoids surprising install failures
when public image availability or registry policy changes upstream.

If you already store a full `DATABASE_URL` in a Kubernetes secret, point the chart at it instead:

```bash
helm install roastbook ./charts/roastbook \
  --set hodor.password="your-password" \
  --set hodor.secret="$(openssl rand -hex 32)" \
  --set image.tag="latest" \
  --set postgresql.existingSecret="roastbook-db" \
  --set postgresql.existingSecretKey="url"
```

### Bundled PostgreSQL (opt-in)

If you want Roastbook to deploy PostgreSQL for you, enable the bundled database and
set a database password explicitly:

```bash
helm install roastbook ./charts/roastbook \
  --set hodor.password="your-password" \
  --set hodor.secret="$(openssl rand -hex 32)" \
  --set image.tag="latest" \
  --set postgresql.enabled=true \
  --set postgresql.auth.password="db-password"
```

The bundled database path uses Roastbook's own PostgreSQL StatefulSet templates with
the public multi-arch official `postgres` image by default. You can still override
`postgresql.image.repository`, `postgresql.image.tag`, and the `postgresql.primary.*`
settings if your environment needs a different image, storage class, or placement.

See [charts/roastbook/values.yaml](charts/roastbook/values.yaml) for all configuration options.

For Kubernetes environments that already manage secrets externally, set `postgresql.existingSecret` to a secret containing a full `DATABASE_URL` under the `url` key, and set `hodor.existingSecret` to a secret containing Hodor's `password` and `secret` keys.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `STORAGE_PROVIDER` | `local` or `s3` | No (default: local) |
| `STORAGE_PATH` | Local storage path | No (default: ./uploads) |
| `S3_BUCKET` | S3 bucket name | If using S3 |
| `S3_REGION` | S3 region | If using S3 |
| `S3_ENDPOINT` | Custom S3 endpoint (MinIO, etc.) | No |
| `S3_ACCESS_KEY_ID` | S3 access key | If using S3 |
| `S3_SECRET_ACCESS_KEY` | S3 secret key | If using S3 |
| `OPENAI_API_KEY` | OpenAI API key for vision | No |
| `OPENAI_BASE_URL` | Custom OpenAI-compatible endpoint | No |
| `OPENAI_VISION_MODEL` | Model for image extraction | No (default: gpt-4o) |

## License

MIT
