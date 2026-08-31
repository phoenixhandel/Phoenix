FROM node:22-alpine AS build

WORKDIR /app

# Install once at the workspace root so npm resolves the local workspaces
# exactly as it does in development.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY database/package.json database/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

COPY . .

# Vite reads these at build time. They are public client configuration, never
# server-side credentials.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_BASE_URL=
ARG VITE_LOGO_DEV_PUBLISHABLE_KEY
ARG VITE_TURNSTILE_SITE_KEY
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_LOGO_DEV_PUBLISHABLE_KEY=${VITE_LOGO_DEV_PUBLISHABLE_KEY}
ENV VITE_TURNSTILE_SITE_KEY=${VITE_TURNSTILE_SITE_KEY}

RUN npm run build

FROM node:22-alpine AS api

WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 3001

# Migrations are idempotent and must complete before the API accepts traffic.
CMD ["sh", "-c", "npm run db:migrate && node apps/api/dist/server.js"]

FROM caddy:2.10-alpine AS web

COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/web/dist /srv
