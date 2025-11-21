# Nginx Front Door

This Nginx instance terminates TLS for the gateway-strategy service and forwards both HTTP and WebSocket traffic to the Node gateway container.

## Responsibilities
- Listens on `80` for plaintext HTTP/WS and redirects all non-`/rt` traffic to HTTPS.
- Listens on `443` for HTTPS/WSS, presenting certificates from `infra/nginx/certs/`.
- Proxies `https://<host>/rt` (and any other paths) to the gateway container over the internal Docker network (`gateway:8080`).

## Certificates
Place the following files before starting Nginx:
- `infra/nginx/certs/fullchain.pem`
- `infra/nginx/certs/privkey.pem`

For local development you can drop in self-signed certificates, or temporarily comment out the TLS server block in `nginx.conf` and rely on port 80 only.

## Docker Integration
The docker-compose stack mounts `infra/nginx/nginx.conf` into `/etc/nginx/nginx.conf` and shares the `infra/nginx/certs` directory with the container.

When the stack is running:
- Web/mobile clients reach the gateway over `https://<host>/rt` or `wss://<host>/rt`.
- Internal LAN services can connect via `ws://<host>/rt` on port 80 if TLS is unnecessary.
