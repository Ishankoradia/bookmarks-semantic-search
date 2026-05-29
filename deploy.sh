#!/bin/bash
set -e

DOMAIN="bookmarks.ishankoradia.in"
EMAIL="ikoradia@umich.edu"
COMPOSE_FILE="docker-compose.nginx.yml"

echo "=== Nginx + SSL Deploy ==="

# Create certbot directories
mkdir -p certbot/www certbot/conf

# Check if SSL cert already exists
if [ -d "certbot/conf/live/$DOMAIN" ]; then
  echo "✓ SSL cert found, starting with HTTPS..."
  cp nginx/nginx.prod.conf nginx/nginx.active.conf
  docker compose -f $COMPOSE_FILE up -d

  # Renew cert if needed
  echo "Checking cert renewal..."
  docker compose -f $COMPOSE_FILE run --rm certbot renew --quiet
  docker compose -f $COMPOSE_FILE restart nginx

else
  echo "→ No SSL cert found, obtaining one..."

  # Start with HTTP-only config
  cp nginx/nginx.initial.conf nginx/nginx.active.conf
  docker compose -f $COMPOSE_FILE up -d

  sleep 5

  # Get cert
  docker compose -f $COMPOSE_FILE run --rm certbot certonly \
    --webroot \
    --webroot-path /var/www/certbot \
    -d $DOMAIN \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email

  # Switch to SSL config
  echo "Switching to HTTPS..."
  cp nginx/nginx.prod.conf nginx/nginx.active.conf
  docker compose -f $COMPOSE_FILE restart nginx
fi

echo ""
echo "=== Done ==="
echo "Site: https://$DOMAIN"
