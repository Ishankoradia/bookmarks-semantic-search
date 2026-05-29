#!/bin/bash
set -e

DOMAIN="bookmarks.ishankoradia.in"
EMAIL="koradiaishan335@gmail.com"
COMPOSE_FILE="docker-compose.nginx.yml"

echo "=== Nginx + SSL Deploy ==="

mkdir -p certbot/www certbot/conf

if [ -d "certbot/conf/live/$DOMAIN" ]; then
  echo "✓ SSL cert found, using HTTPS config..."
  sed -i "s|nginx.initial.conf|nginx.prod.conf|g" $COMPOSE_FILE
  docker compose -f $COMPOSE_FILE up -d

  echo "Checking cert renewal..."
  docker compose -f $COMPOSE_FILE run --rm certbot renew --quiet
  docker compose -f $COMPOSE_FILE restart nginx
else
  echo "→ No SSL cert, starting HTTP to obtain cert..."
  sed -i "s|nginx.prod.conf|nginx.initial.conf|g" $COMPOSE_FILE
  docker compose -f $COMPOSE_FILE up -d
  sleep 5

  docker compose -f $COMPOSE_FILE run --rm certbot certonly \
    --webroot --webroot-path /var/www/certbot \
    -d $DOMAIN --email $EMAIL --agree-tos --no-eff-email

  echo "Switching to HTTPS..."
  sed -i "s|nginx.initial.conf|nginx.prod.conf|g" $COMPOSE_FILE
  docker compose -f $COMPOSE_FILE up -d
fi

echo "=== Done === https://$DOMAIN"
