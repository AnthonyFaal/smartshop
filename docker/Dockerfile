FROM node:22-alpine AS base

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
ENV CI=true
ENV PNPM_CONFIG_CONFIRM_MODULES_PURGE=false


FROM base AS deps

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma

ENV DATABASE_URL=postgresql://smartshop:smartshop@postgres:5432/smartshop
ENV PNPM_CONFIG_ALLOW_BUILD=esbuild,@prisma/engines,prisma,sharp,msgpackr-extract,unrs-resolver

RUN pnpm install --no-frozen-lockfile
RUN ./node_modules/.bin/prisma generate

FROM base AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma
RUN pnpm install --no-frozen-lockfile
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN ./node_modules/.bin/next build


FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.pnpm/ ./node_modules/.pnpm/
COPY --from=builder /app/node_modules/prisma/ ./node_modules/prisma/
COPY --from=builder /app/node_modules/@prisma/ ./node_modules/@prisma/

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]