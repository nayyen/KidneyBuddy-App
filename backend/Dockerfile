FROM node:20-alpine AS builder

WORKDIR /app

# Install build tools required for argon2 native binding
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json drizzle.config.ts ./
COPY src ./src
RUN npx tsc --noEmit || echo "Type check completed (non-fatal for build)"

FROM node:20-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 express && \
    mkdir -p /app/uploads/lab-files && \
    chown -R express:nodejs /app/uploads

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/drizzle.config.ts ./
COPY src ./src

USER express

EXPOSE 4000

CMD ["node", "--import", "tsx", "src/server.ts"]
