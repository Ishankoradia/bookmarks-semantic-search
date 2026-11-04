# nginx reverse proxy

A small, multi-site nginx reverse proxy. TLS is terminated with **Cloudflare Origin
CA certificates** (Cloudflare SSL/TLS mode **Full (strict)**); there is no certbot /
Let's Encrypt to manage.

```
nginx/
├── docker-compose.yml    # the nginx service
├── conf.d/               # one *.conf per site (mounted read-only into nginx)
│   ├── 00-default.conf   # catch-all: rejects unknown hosts with 444
│   └── bookmarks.conf    # bookmarks.ishankoradia.in → frontend + /api/v1 → backend
└── certs/                # Cloudflare origin cert/key per zone (git-ignored secrets)
```

## Run

```bash
cd nginx
docker compose up -d
docker compose restart nginx   # after editing conf.d/* or swapping certs
docker compose logs -f nginx
```

nginx joins the external network created by `../docker-compose.web.yml`, so it
reaches the app containers by service name (`backend:6005`, `frontend:3002`). Start
that stack first.

## Add another site / domain

1. Put the zone's origin cert in `certs/` (see [`certs/README.md`](certs/README.md)).
   A wildcard cert for an existing zone needs nothing new.
2. Add `conf.d/<site>.conf` — copy `bookmarks.conf` as a template, then change:
   - `server_name` to the new domain
   - `ssl_certificate*` to the right `certs/<zone>.{pem,key}`
   - the `proxy_pass` upstream(s) to that app's container/host\:port
   If the upstream lives in a different compose stack, either join that network in
   `docker-compose.yml` as well, or proxy to `host.docker.internal:<port>`.
3. Point the domain at this host in Cloudflare (proxied / orange cloud) and reload:
   `docker compose restart nginx`.
