# ── Stage 1: Install dependencies ──
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: Build the application ──
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env vars (NEXT_PUBLIC_*) must be available here.
# Dokploy injects them as build args — declare them so Docker accepts them.
ARG NEXT_PUBLIC_LOGIN_WEBHOOK
ARG NEXT_PUBLIC_OPEN_MOODBOARD_WEBHOOK
ARG NEXT_PUBLIC_SAVE_MOODBOARD_WEBHOOK

ENV NEXT_PUBLIC_LOGIN_WEBHOOK=$NEXT_PUBLIC_LOGIN_WEBHOOK
ENV NEXT_PUBLIC_OPEN_MOODBOARD_WEBHOOK=$NEXT_PUBLIC_OPEN_MOODBOARD_WEBHOOK
ENV NEXT_PUBLIC_SAVE_MOODBOARD_WEBHOOK=$NEXT_PUBLIC_SAVE_MOODBOARD_WEBHOOK

RUN npm run build

# ── Stage 3: Production runner ──
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only the minimum required files from the build
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
