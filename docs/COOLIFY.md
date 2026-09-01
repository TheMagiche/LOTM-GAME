# Coolify — LOTM (`lotmdnd.work.gd`)

This app and the betting UI share **one VPS**. Coolify owns ports **80** and **443** and routes by hostname:

| Domain | Coolify resource | Container port |
| --- | --- | --- |
| `https://lotmdnd.work.gd` | this repo | `3001` |
| `https://bettingui.work.gd` | betting UI repo | `3000` |
| Coolify dashboard | Coolify itself | `8000` (or a `coolify.` hostname) |

Copy [`COOLIFY_BETTINGUI.md`](./COOLIFY_BETTINGUI.md) into the betting UI repo and apply the compose / workflow changes there.

## 1. DNS

At the `work.gd` DNS panel, point both names at the VPS public IPv4 (A records):

- `lotmdnd.work.gd`
- `bettingui.work.gd`

Optional: `coolify.work.gd` (or another hostname) for the dashboard instead of `http://VPS_IP:8000`.

## 2. Install Coolify once

On a fresh Ubuntu/Debian VPS (or after **stopping** host nginx/Caddy that currently bind 80/443):

```bash
sudo systemctl stop nginx || true
sudo systemctl disable nginx || true
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Open `http://VPS_IP:8000`, create the admin user, then in **Settings → Configuration** set the instance domain if you use one.

Coolify must be the only process listening on 80/443. The old betting UI deploy that wrote `/etc/nginx/sites-available/bettingui` and published container port 80 will fight Traefik — that is what [`COOLIFY_BETTINGUI.md`](./COOLIFY_BETTINGUI.md) removes.

## 3. GitHub Container Registry

Pushes to `main` build `ghcr.io/<owner>/<repo>:latest` via `.github/workflows/deploy.yml`.

On the VPS (as the user Coolify uses for Docker, often root):

```bash
echo "$GITHUB_TOKEN" | docker login ghcr.io -u GITHUB_USERNAME --password-stdin
```

Use a classic PAT with `read:packages` (and `write:packages` if this account also publishes). For a private package, also grant Coolify’s server that login so `docker compose pull` works.

## 4. Create the LOTM application in Coolify

1. **Projects → New** (one project can hold both sites).
2. **New Resource → Docker Compose**.
3. Connect this GitHub repository (GitHub App is easiest) and branch `main`.
4. **Compose file: `docker-compose.prod.yml`** — pull-only Player-only demo; no `build:` on the VPS. Do **not** use `docker-compose.yml` in Coolify (it has `build: .` and will compile the **full** app on the server).
5. **Domains**: `https://lotmdnd.work.gd` mapped to service `app` port **3001**.
6. Environment variables (Coolify UI):

   | Key | Value |
   | --- | --- |
   | `LOTM_IMAGE` | `ghcr.io/<owner>/<repo>:latest` |
   | `PUBLIC_ORIGIN` | `https://lotmdnd.work.gd` |
   | `ALLOWED_ORIGINS` | `https://lotmdnd.work.gd` |

   `docker-compose.prod.yml` already sets `DEMO_MODE=1` and `TTS_DISABLED=1`. The Player UI lock is **not** a Coolify env — GitHub Actions bakes `VITE_DEPLOYMENT_MODE=demo` into `:latest`. See [demo-vps-player-deployment.md](./agents/demo-vps-player-deployment.md).

7. Persistent storage: compose already declares volume `lotm-data` → `/app/data` (campaigns, vault, embeddings, user mods). Do not delete that volume on redeploy.
8. Resource hints: **2 GB RAM minimum**, 4 GB if you enable Chatterbox TTS. First embedder warmup downloads the ONNX model into `/app/data`.
9. **Disable automatic deployment on git push** in Coolify (Configuration / Source). Use only the GitHub Actions **Deploy Webhook** after GHCR push. If both are enabled, Coolify rebuilds on the VPS *and* GHA builds — avoid that double build.

### Pull-only deploy flow

```text
push main → GHA build + push GHCR → POST COOLIFY_WEBHOOK → Coolify pull :latest + restart
```

Coolify deploy logs should show `Pulling ghcr.io/...`, not `npm ci` or `vite build`. If you still see a build, confirm step 4 uses `docker-compose.prod.yml` and step 9 disabled auto-deploy.

## 5. GitHub secrets (this repo)

| Secret | Purpose |
| --- | --- |
| `COOLIFY_WEBHOOK` | Coolify → this app → **Configuration → Webhooks → Deploy Webhook** |
| `COOLIFY_TOKEN` | Only if that webhook requires `Authorization: Bearer …` |

After the first successful GHCR push, trigger the webhook (or deploy once from the Coolify UI) and confirm `https://lotmdnd.work.gd/health` returns `{"ok":true}`.

## 6. LLM streaming timeouts

Turns stream through `/api` for a long time. In Coolify, raise the proxy read timeout for this resource (300s or disable). If Traefik returns 504 on long turns, increase that timeout; do not put host nginx back in front.

## 7. What not to do

- Do not publish `80:80` or `443:443` in compose.
- Do not set `container_name` (breaks Coolify rolling updates).
- Do not install a host nginx vhost for `lotmdnd.work.gd` while Coolify is running.
- Do not point this site at port 3000 — that is the betting UI’s Next.js port.
