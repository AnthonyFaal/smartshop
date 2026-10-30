# SmartShop

SmartShop is a trust-first local-commerce platform piloting around UMaT, Tarkwa. It helps buyers order from verified local sellers with a clear pickup or campus-delivery promise. It is deliberately not a nationwide marketplace at this stage.

## Product focus

- Verified local sellers and clear product availability
- Buyer-paid pickup or campus-delivery fulfilment
- Paid-order records, proof-aware delivery operations and dispute resolution
- Mobile-money/card checkout through a Ghana-compatible provider
- Seller catalogue, inventory and order tools

The business thesis and pilot success criteria are in [docs/SMARTSHOP_THESIS.md](docs/SMARTSHOP_THESIS.md).
The ordered implementation and operating checklist is in [docs/LAUNCH_READINESS.md](docs/LAUNCH_READINESS.md).

## Architecture

The app is a TypeScript modular monolith using Next.js App Router, tRPC, Prisma and PostgreSQL. Redis supports rate limiting and short-lived flows; S3-compatible storage holds product assets and private verification documents.

`app/` contains pages and route handlers. `server/services/` contains business rules. `server/trpc/` exposes typed procedures. `prisma/` contains the data model, migrations and safe seed routines.

## Local development

Requirements: Node 20+, pnpm 9+, Docker Desktop.

```bash
docker compose up -d postgres redis minio
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open `http://localhost:3000`. The seed creates local pilot locations, delivery zones and a development admin account. Do not use seeded credentials or MinIO defaults outside local development.

## Required production configuration

Set explicitly in production:

- `DATABASE_URL`, `REDIS_URL`
- `JWT_SECRET` and `CSRF_SECRET` (strong unique values)
- S3 endpoint, credentials, buckets and a non-public verification-document policy
- `PAYMENT_PROVIDER=paystack`, `PAYSTACK_SECRET_KEY`, `PAYSTACK_WEBHOOK_SECRET`, `PAYSTACK_CALLBACK_URL`
- SMTP credentials and a real SMS provider integration

The development payment provider is `mock`; it is not a production payment configuration. Verify every webhook and reconcile provider settlements before releasing seller funds.

## Delivery operating model

`DeliveryZone` holds the delivery fee and promised minutes for a permitted local area. A paid campus-delivery order creates one `DeliveryTask`. An administrator assigns a runner and records the transition:

`UNASSIGNED → ASSIGNED → PICKED_UP → DELIVERED`

Pickup orders receive a short pickup code. Delivery revenue, marketplace fee and seller payout are stored separately on the order; the `tax` field remains zero until a compliant tax calculation is introduced.

Run migrations before seeding whenever the schema changes:

```bash
pnpm db:migrate
pnpm db:seed
```

## Quality checks

```bash
pnpm lint
pnpm test
pnpm build
```

## Production launch gates

Do not launch until all of these are true:

- lint, tests, build and migration checks pass in CI;
- real SMS and payment flows are tested in provider sandbox/live environments;
- payment/webhook reconciliation and refund runbooks exist;
- a delivery operator, runner standards, pickup points and dispute SLA are named;
- Ghana Data Protection Commission obligations, document retention and access controls have been reviewed with qualified local counsel;
- pilot metrics show repeat fulfilled orders and positive contribution margin.

SmartShop does not claim automatic biometric matching or hold funds as an escrow service. Those capabilities require additional operational, legal and provider controls.
