#!/usr/bin/env bash
set -euo pipefail

# Usage: copy .env.deploy to .env and run this script from the deploy directory
DIR=$(cd "$(dirname "$0")" && pwd)
cd "$DIR"

if [ ! -f .env ]; then
  echo ".env not found — copy .env.deploy.example to .env and edit it." >&2
  exit 1
fi

echo "Starting services with Docker Compose..."
docker compose up -d --build
echo "Services started. Use 'docker compose ps' to check containers." 
