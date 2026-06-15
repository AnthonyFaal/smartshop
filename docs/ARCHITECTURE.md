# SmartShop Architecture

## Overview

SmartShop is a modular monolith built on Next.js 16 App Router, designed for horizontal scaling to 5M+ users. The architecture separates concerns into layers while keeping deployment simple for the UMaT pilot, with clear extraction paths for distributed services at scale.

## Architectural Decisions

### 1. Modular Monolith (Not Microservices Initially)

**Decision:** Single deployable Next.js application with strict internal module boundaries.

**Rationale:**
- Faster iteration for pilot launch at UMaT
- Shared types between frontend and backend via tRPC
- Lower operational complexity for a small team
- Clear module boundaries (`server/services`, `server/repositories`) enable future extraction

**Scale path:** Extract workers, search, and AI inference into separate services when load demands it. Kubernetes manifests support this transition.

### 2. API Strategy: tRPC Primary, REST for External

**Decision:** tRPC for all first-party client-server communication; versioned REST (`/api/v1`) for webhooks, mobile clients, and Enterprise API access.

**Rationale:**
- End-to-end type safety reduces bugs at scale
- REST provides OpenAPI-documented external contract
- Both share validation layer (Zod) and service layer

### 3. Database: PostgreSQL with Read Replica Support

**Decision:** PostgreSQL 16+ with Prisma ORM, UUID primary keys, soft deletes, and partitioning strategy for high-volume tables.

**Partitioning strategy:**
- `orders` — range partition by `created_at` (monthly)
- `messages` — range partition by `created_at` (monthly)
- `audit_logs` — range partition by `created_at` (weekly)
- `analytics_events` — range partition by `created_at` (daily)

**Read replicas:** Prisma `$extends` with read/write splitting via `DATABASE_URL` (primary) and `DATABASE_READ_URL` (replica).

### 4. Caching: Redis Cluster

**Decision:** Redis for sessions, rate limiting, OTP, hot product cache, search cache, and job queues.

**Cache layers:**
| Layer | TTL | Key Pattern |
|-------|-----|-------------|
| Session | 7 days | `session:{id}` |
| OTP | 10 min | `otp:{phone}` |
| Rate limit | 1 min | `rl:{ip}:{endpoint}` |
| Product | 5 min | `product:{id}` |
| Hot products | 1 min | `hot:products:{category}` |
| Search | 2 min | `search:{hash}` |

### 5. Authentication: Email + Password + Phone OTP

**Decision:** Custom auth with bcrypt password hashing, JWT access tokens (15 min), refresh tokens in Redis (7 days), phone OTP via SMS provider abstraction.

**No social login** per product requirements.

**Session hardening:**
- HttpOnly, Secure, SameSite=Strict cookies
- CSRF double-submit cookie pattern
- Device fingerprinting in session metadata
- Concurrent session limits (5 per user)

### 6. File Storage: S3-Compatible

**Decision:** Abstract storage provider with S3 implementation. Presigned URLs for direct upload; CDN in front for delivery.

**Buckets:**
- `smartshop-uploads` — seller verification documents (private)
- `smartshop-products` — product images (public via CDN)
- `smartshop-avatars` — user avatars (public via CDN)

### 7. Background Processing: BullMQ on Redis

**Decision:** BullMQ queues for notifications, AI inference, search indexing, trust score recalculation, and analytics aggregation.

**Queues:**
- `notifications` — email, SMS, in-app
- `ai` — listing generation, moderation, recommendations
- `trust` — trust score recalculation
- `search` — search index updates
- `analytics` — event aggregation

### 8. AI: OpenAI-Compatible Provider Abstraction

**Decision:** Provider interface supporting OpenAI API-compatible endpoints. Usage logged per user/plan with server-side quota enforcement.

### 9. Payments: Abstract Provider Architecture

**Decision:** Payment provider interface with webhook handling. Ghana-specific providers (MTN MoMo, Paystack) integrated later without changing order flow.

### 10. Trust System

**Trust score (0-100)** calculated from:
- Verification levels (phone +20, identity +30, location +20, trusted seller +30)
- Order completion rate (weight: 15%)
- Refund rate inverse (weight: 10%)
- Dispute rate inverse (weight: 10%)
- Average rating (weight: 15%)

Recalculated asynchronously on order completion, dispute resolution, and verification approval.

### 11. Subscription Enforcement

**Server-side only.** Product creation, AI calls, and analytics access checked in service layer against active subscription. Frontend limits are UX hints only.

| Plan | Products | AI Tier |
|------|----------|---------|
| FREE | 5 | Basic |
| STARTER | 200 | Standard |
| BUSINESS | Unlimited | Advanced |
| ENTERPRISE | Unlimited | Advanced + API |

### 12. Security Architecture

- **OWASP Top 10:** Input validation (Zod), parameterized queries (Prisma), CSP headers, XSS sanitization
- **Rate limiting:** Redis sliding window per IP and per user
- **Audit logging:** All admin actions, auth events, payment events
- **RBAC:** Role-based with permission checks in tRPC middleware
- **Encryption:** TLS in transit; AES-256 at rest for sensitive fields (Ghana Card numbers)

### 13. Observability

- Structured JSON logging (pino)
- OpenTelemetry traces (ready via env flag)
- Health endpoints: `/api/health`, `/api/health/ready`
- Metrics: request latency, error rate, queue depth, cache hit rate

### 14. Deployment Topology

```
                    ┌─────────────┐
                    │   CDN       │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Ingress    │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼─────┐ ┌───▼───┐ ┌─────▼─────┐
        │ Next.js   │ │ Next  │ │  Worker   │
        │ (web)     │ │ (web) │ │ (BullMQ)  │
        └─────┬─────┘ └───┬───┘ └─────┬─────┘
              │            │            │
        ┌─────▼────────────▼────────────▼─────┐
        │         Redis Cluster              │
        └─────────────────┬─────────────────┘
                          │
        ┌─────────────────▼─────────────────┐
        │    PostgreSQL (Primary + Replica)  │
        └─────────────────────────────────────┘
```

## Directory Structure

```
smartshop/
├── app/                    # Next.js App Router pages & API routes
│   ├── (auth)/             # Auth pages (login, register, verify)
│   ├── (marketplace)/      # Buyer-facing pages
│   ├── (seller)/           # Seller dashboard
│   ├── (admin)/            # Admin panel
│   └── api/                # REST API + tRPC + webhooks
├── components/             # React components
│   ├── ui/                 # Shadcn UI primitives
│   ├── layout/             # Layout components
│   ├── marketplace/        # Marketplace-specific
│   ├── seller/             # Seller dashboard
│   └── admin/              # Admin panel
├── lib/                    # Shared utilities & clients
│   ├── auth/               # JWT, session, CSRF
│   ├── redis/              # Redis client & cache helpers
│   ├── storage/            # S3 storage abstraction
│   ├── ai/                 # AI provider abstraction
│   ├── payments/           # Payment provider abstraction
│   ├── notifications/      # Email, SMS, in-app
│   └── config/             # Environment validation
├── server/                 # Server-only business logic
│   ├── trpc/               # tRPC routers & procedures
│   ├── services/           # Business logic services
│   ├── repositories/       # Data access layer
│   ├── middleware/         # Rate limiting, auth guards
│   └── workers/            # Background job processors
├── prisma/                 # Database schema & migrations
├── docker/                 # Docker configurations
├── k8s/                    # Kubernetes manifests
├── tests/                  # Test suites
└── docs/                   # Documentation
```

## Data Flow: Order Placement

```
Buyer → Cart Service → Order Service → Payment Provider
                          ↓
                    Inventory Lock (Redis)
                          ↓
                    PostgreSQL Transaction
                          ↓
                    Notification Queue
                          ↓
                    Trust Score Queue
```

## Pilot Configuration (UMaT)

- Default currency: GHS
- Default region: Western Region, Ghana
- Campus delivery zones configured in `lib/config/pilot.ts`
- Seller verification requires GPS within UMaT campus radius (configurable)
