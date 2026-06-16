# SmartShop

AI-powered marketplace for Ghana. Built for trust, local commerce, and the UMaT campus pilot.

## Tech Stack

- **Frontend:** Next.js 16, TypeScript, Tailwind CSS, Shadcn UI, TanStack Query, tRPC, Zustand, Framer Motion
- **Backend:** Next.js Route Handlers, Server Actions, tRPC
- **Database:** PostgreSQL 16 + Prisma 7
- **Cache:** Upstash Redis (or local Redis for offline dev)
- **Storage:** S3-compatible (MinIO for local dev)
- **AI:** OpenAI-compatible provider

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 10+
- Docker (for PostgreSQL and MinIO)
- Upstash Redis database ([create one free](https://console.upstash.com/))

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

### 3. Configure Redis (Upstash)

Create a database at [console.upstash.com](https://console.upstash.com/), open the **REST API** section, click **.env**, and copy the values into `.env`:

```bash
UPSTASH_REDIS_REST_URL=https://YOUR_ENDPOINT.upstash.io
UPSTASH_REDIS_REST_TOKEN=YOUR_TOKEN
```

Use the REST credentials (not the TCP `rediss://` URL) — they work reliably with Next.js serverless routes.

### 4. Start infrastructure

```bash
docker compose up -d postgres minio
```

Optional: run a local Redis container instead of Upstash:

```bash
docker compose --profile local-redis up -d postgres redis minio
# and set REDIS_URL=redis://localhost:6379 in .env (leave UPSTASH_REDIS_URL unset)
```

### 5. Initialize database

```bash
pnpm db:push
pnpm db:seed
```

### 6. Run development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

### Seed Accounts

| Role   | Email                | Password   |
|--------|----------------------|------------|
| Admin  | admin@smartshop.gh   | Admin123!  |
| Seller | seller@smartshop.gh  | Seller123! |

## Project Structure

```
smartshop/
├── app/              # Next.js pages & API routes
├── components/       # React UI components
├── lib/              # Auth, Redis, S3, AI, config
├── server/           # tRPC routers, services, workers
├── prisma/           # Database schema & seed
├── docker/           # Production Dockerfile
├── k8s/              # Kubernetes manifests
├── tests/            # Unit & integration tests
└── docs/             # Architecture documentation
```

## Scripts

| Command          | Description                    |
|------------------|--------------------------------|
| `pnpm dev`       | Start development server       |
| `pnpm build`     | Production build               |
| `pnpm test`      | Run unit tests                 |
| `pnpm db:push`   | Push schema to database        |
| `pnpm db:seed`   | Seed sample data               |
| `pnpm db:studio` | Open Prisma Studio             |

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full system design, scaling strategy, and security architecture.

## Deployment

```bash
docker compose up -d        # Full stack (app + infra)
```

Kubernetes manifests are in `k8s/`. CI/CD pipeline in `.github/workflows/ci.yml`.

## License

Proprietary — SmartShop Ghana
