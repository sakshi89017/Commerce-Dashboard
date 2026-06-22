Self-hosting (VPS) deployment
===============================

Quick steps to deploy the backend on a Linux VPS using Docker Compose.

1. Prepare the VPS

```bash
# Ubuntu example
sudo apt update
sudo apt install -y ca-certificates curl gnupg lsb-release

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose plugin
sudo apt install -y docker-compose-plugin

# Add your user to docker group (re-login required)
sudo usermod -aG docker $USER
```

2. Clone the repo and prepare env

```bash
git clone https://github.com/sakshi89017/Commerce-Dashboard.git
cd Commerce-Dashboard/deploy
cp .env.deploy.example .env
# Edit .env to set SECRET_KEY and JWT_SECRET_KEY
```

3. Start services

```bash
./start.sh
# Check logs
docker compose logs -f backend
```

4. Verify

```bash
curl -sS https://<VPS_HOST>:5000/api/health | jq .
```

Notes
- By default the compose file runs a Postgres database. If you prefer to use an external DB, set `DATABASE_URL` in `.env` and remove or disable `db` service in `docker-compose.yml`.
- For production you should put the service behind a reverse proxy (nginx / Caddy) and enable TLS.
- Consider configuring `systemd` to run `docker compose` at boot — see `systemd-unit.example` for a template.
