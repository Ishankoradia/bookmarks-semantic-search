#!/bin/bash
set -euo pipefail

# Manual webapp release — build backend+frontend images, push to GHCR, then pull &
# restart on EC2. A GitHub-independent alternative to the deploy-web.yml Action.
#
# Usage:
#   ./deploy-web.sh [TAG]            # build + push + deploy (default TAG=current commit sha)
#   SKIP_BUILD=1 ./deploy-web.sh     # deploy only (images already in GHCR)
#
# Required env (same values as the GitHub secrets):
#   EC2_HOST, EC2_USER               # target host + ssh user
#   GHCR_PAT                         # PAT with write:packages (for docker login)
# Optional:
#   EC2_PATH (default /home/ubuntu/bookmarks-semantic-search)
#   EC2_PORT (default 22)

REGISTRY="ghcr.io"
OWNER="ishankoradia"
TAG="${1:-$(git rev-parse HEAD)}"
EC2_PORT="${EC2_PORT:-22}"
EC2_PATH="${EC2_PATH:-/home/ubuntu/bookmarks-semantic-search}"
# EC2 server is arm64; build for it explicitly (matches Apple Silicon natively, and
# stays correct even if this script is run from an amd64 machine).
PLATFORM="linux/arm64"

: "${EC2_HOST:?set EC2_HOST}"
: "${EC2_USER:?set EC2_USER}"

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  : "${GHCR_PAT:?set GHCR_PAT (PAT with write:packages)}"
  echo "$GHCR_PAT" | docker login "$REGISTRY" -u "$OWNER" --password-stdin

  for svc in backend frontend; do
    echo "=== Building + pushing $svc ($PLATFORM, tag=$TAG) ==="
    docker buildx build --platform "$PLATFORM" \
      -t "$REGISTRY/$OWNER/bookmarks-$svc:$TAG" \
      --push "./$svc"
  done
fi

echo "=== Deploying to $EC2_USER@$EC2_HOST ($EC2_PATH) ==="
ssh -p "$EC2_PORT" "$EC2_USER@$EC2_HOST" "
  set -e
  cd '$EC2_PATH'
  git pull --ff-only || true
  echo 'IMAGE_TAG=$TAG' > .env
  docker compose -f docker-compose.web.yml pull
  docker compose -f docker-compose.web.yml up -d
  docker image prune -f
"

echo "=== Done === https://bookmarks.ishankoradia.in"
