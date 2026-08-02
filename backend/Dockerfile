# =============================================================================
# ESROM BirrBalance — Backend API
# =============================================================================
FROM node:20-alpine AS base
WORKDIR /app

# ── Install dependencies ─────────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Generate Prisma client ─────────────────────────────────────────────────────
FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
COPY prisma.config.ts ./
ENV DIRECT_URL="postgresql://build:build@localhost:5432/build"
RUN npx prisma generate
COPY server.js ./
COPY src ./src

# ── Production image ───────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production

RUN apk add --no-cache tini

COPY package.json package-lock.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./
COPY server.js ./
COPY docker-entrypoint.sh /docker-entrypoint.sh

RUN chmod +x /docker-entrypoint.sh \
  && sed -i 's/\r$//' /docker-entrypoint.sh \
  && mkdir -p uploads/menu

VOLUME ["/app/uploads"]
EXPOSE 5000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/docker-entrypoint.sh"]
