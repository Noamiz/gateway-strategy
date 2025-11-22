# gateway-strategy

Part of the secondbase kit – a reusable, always-modern company-in-a-box.

Node.js + TypeScript real-time gateway for the End to End Company Products system. It accepts WebSocket connections on `/rt`, manages per-connection context and presence, and exchanges messages through a unified envelope with a compact signal map.

## Architecture

- **Hub** – boots the WebSocketServer on `/rt`, accepts connections, and delegates lifecycle events to the router.
- **Router** – parses inbound envelopes, tracks connection metadata, and coordinates broadcasts, heartbeats, identify, and generic data signals.
- **ConnectionContext** – in-memory snapshot of each active socket (role, group, timestamps) used by routing logic.
- **PresenceRegistry** – minimal state holder for channel/group presence so we can publish presence updates consistently.
- **SessionStore** – placeholder store for future collaborative/live session metadata.
- **Envelope & Signals** – domain-neutral contract describing all gateway messages, ready to be replaced by shared types from `common-strategy` when available.

## Current Features

- `GET /health` responds with `{ ok: true, data: { status: 'ok' } }` using the `Result<T>` helper from `common-strategy`.
- WebSocket endpoint at `/rt` that sends an initial `ready`, accepts `identify`, `heartbeat`, and `data_update`, and emits `presence_update`, `data_update`, and `error` envelopes.
- Configurable heartbeat defaults and simple presence/session scaffolding to keep future real-time work consistent.

## Getting Started

1. Install dependencies: `yarn install`
2. Start the gateway in watch mode: `yarn dev`
3. Build for production: `yarn build`

## Scripts

- `yarn dev` – run the gateway with `ts-node-dev`.
- `yarn dev:echo` – launch the gateway plus two in-process clients to showcase identify + data fan-out.
- `yarn build` – compile TypeScript using `tsconfig.build.json`.
- `yarn start` – run the compiled server from `dist`.
- `yarn test` – execute Vitest suites (binds to `127.0.0.1` on high ports; no elevated privileges required).
- `yarn lint` – lint all source files via ESLint.

## Dev Playground

- Run `yarn dev:echo` to spin up the gateway on port `4100` and automatically connect two local WebSocket clients in `group-1`.
- Client A identifies as an `app-client` and sends a `data_update` payload.
- Client B identifies in the same group and logs every message it receives (presence updates, ready envelopes, and the echoed `data_update`).
- The scenario cleans up both sockets and shuts the gateway down once the broadcast is observed, making it easy to experiment without extra tooling.

## Logging

- Logging remains console-based but now honours `LOG_LEVEL` (`debug` < `info` < `warn` < `error`, default `info`).
- Example: `LOG_LEVEL=debug yarn dev` surfaces Router connection and broadcast traces, while `LOG_LEVEL=warn` suppresses informational chatter.
- The logger also respects OS-level timestamps so collected logs can be piped into other processors or future structured loggers.

## Docker & Nginx

- Requirements: Docker Engine + the Docker Compose plugin.
- Build and run: `docker compose build && docker compose up -d && docker compose ps`.
- Nginx listens on `80` (HTTP/WS) and `443` (HTTPS/WSS), proxying traffic over the internal `gateway_net` bridge network to the Node process (`gateway:8080`).
- TLS certificates must live at `infra/nginx/certs/fullchain.pem` and `infra/nginx/certs/privkey.pem`; for local dev, drop in self-signed certs or temporarily comment out the TLS server block to use port 80 only.
- Typical deployment: DNS points to the Nginx host (NUC, LAN router, etc.); web/mobile clients connect with `wss://<hostname>/rt` while LAN peers can use `ws://<hostname>/rt` if plaintext is acceptable.

## Project Structure

```
src/
 ├─ config/        # shared constants (routes, timings)
 ├─ http/          # express app + health endpoint
 ├─ hub/           # Hub, Router, connection/presence/session helpers
 ├─ dev/           # local playground scenarios
 ├─ types/         # envelope, domain placeholders, signals
 ├─ utils/         # ids, json safety, logger facade, ws helpers
 ├─ __tests__/     # Vitest suites (health + ws basics)
 └─ server.ts      # HTTP + WebSocket bootstrap
```

## Related Repositories

- `common-strategy`
- `server-strategy`
- `web-client-strategy`
- `mobile-client-strategy`
- `internal-tool-strategy`
- `ai-strategy`

Consult the End to End Company Products Confluence space for canonical architecture decisions, message contracts, and deployment guidelines.
