# Cloudflare Origin certificates

nginx reads the TLS cert/key for each zone from this directory. Every file here is
**git-ignored** — these are secrets. Name them after the zone, e.g.:

| File                   | Contents                                        |
| ---------------------- | ----------------------------------------------- |
| `ishankoradia.in.pem`  | Cloudflare Origin CA certificate (PEM)          |
| `ishankoradia.in.key`  | The matching private key (PEM)                  |

A single **wildcard** origin cert for `*.ishankoradia.in` covers every subdomain
site (bookmarks, plus any you add later). A second root domain gets its own
`<zone>.pem` / `<zone>.key` pair, referenced from that site's config in `conf.d/`.

## Generating a cert

1. Cloudflare dashboard → **SSL/TLS → Origin Server → Create Certificate**.
2. Let Cloudflare generate the private key + CSR. Hostnames: add both the apex and
   a wildcard, e.g. `ishankoradia.in` and `*.ishankoradia.in`.
3. Copy the **Origin Certificate** into `<zone>.pem` and the **Private Key** into
   `<zone>.key`.
4. Set **SSL/TLS → Overview** to **Full (strict)** so the edge validates the cert.

## Installing on the server

Drop the files in `nginx/certs/` on the host, then:

```bash
cd nginx
docker compose up -d          # or: docker compose restart nginx
```

Origin certs are valid for up to 15 years, so there is nothing to renew — this is
why certbot / Let's Encrypt was removed.
