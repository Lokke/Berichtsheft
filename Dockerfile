# Multi-stage build für optimale Image-Größe
FROM node:20-alpine AS base

# Upgrade npm to latest version
RUN npm install -g npm@latest

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
# Install all dependencies including prisma CLI (needed for migrations)
RUN npm ci

# Install ALL dependencies for builder (including devDependencies)
FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image, copy all files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Copy prisma schema to /app/prisma-schema (not mounted by volume)
COPY --from=builder /app/prisma /app/prisma-schema
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
# Copy all node_modules including prisma CLI for migrations
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy entrypoint script
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Create directories with proper permissions
RUN mkdir -p /app/temp && chown -R nextjs:nodejs /app/temp
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["./docker-entrypoint.sh"]
