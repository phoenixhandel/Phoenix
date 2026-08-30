# Deploy Phoenix on a crypto-paid VPS

This is the self-hosted alternative to Render. It runs the Phoenix web app,
API, PostgreSQL, and automatic HTTPS on one Linux VPS. The actual production
values stay only on the server in `.env.production`.

## 1. Buy the server and point the domain

Choose a provider that accepts your preferred cryptocurrency and provides an
Ubuntu 24.04 VPS with at least **2 vCPU, 4 GB RAM, and 60 GB SSD** in an EU
location. A VPS is required because Phoenix uses an API and PostgreSQL; shared
web hosting is not enough.

Before starting the app, create this DNS record at Njalla:

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | the VPS public IPv4 address |
| A | `www` | the VPS public IPv4 address |

Do not create a Cloudflare proxy or an AAAA record for this first deployment.
The included Caddy server obtains and renews TLS certificates automatically
once DNS has propagated.

## 2. Prepare Ubuntu

Run these commands in the VPS console as its initial administrator:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl git ufw
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Sign out and sign back in after the `usermod` command, then verify Docker:

```bash
docker --version
docker compose version
```

## 3. Install and configure Phoenix

```bash
git clone https://github.com/phoenixhandel/Phoenix.git
cd Phoenix
cp .env.production.example .env.production
nano .env.production
```

Fill all blank values in `.env.production`. Use the existing Supabase project
URL and publishable/anon key for both the server and `VITE_` fields. Keep the
OpenAI key blank until you want the live support assistant enabled.

Start the complete production stack:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
docker compose --env-file .env.production -f docker-compose.production.yml ps
curl -fsS https://phoenixhandel.com/api/health
```

The API applies database migrations on startup. It is not published directly
to the internet: Caddy exposes only the website and forwards `/api/*`
internally.

## 4. Finish the connected-service settings

In Supabase Authentication settings, add these exact redirect URLs:

```text
https://phoenixhandel.com/auth/callback
https://phoenixhandel.com/login
```

Set the Site URL to `https://phoenixhandel.com`. Configure the verified Resend
sender and the email-code template as described in
[`production-readiness.md`](production-readiness.md). Enable Google or Apple
only after their provider credentials and redirect URLs are configured in
Supabase.

## Ongoing operations

View logs:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml logs -f api
```

Update after a reviewed GitHub change:

```bash
git pull --ff-only
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
```

Back up PostgreSQL before changing infrastructure:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml exec -T postgres pg_dump -U phoenix phoenix > phoenix-$(date +%F).sql
```

Copy that encrypted backup off the VPS. A single VPS is not a substitute for
off-server backups or a disaster-recovery plan.
