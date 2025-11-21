# gateway-strategy

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
- `yarn build` – compile TypeScript using `tsconfig.build.json`.
- `yarn start` – run the compiled server from `dist`.
- `yarn test` – execute Vitest suites.
- `yarn lint` – lint all source files via ESLint.

## Project Structure
```
src/
 ├─ config/        # shared constants (routes, timings)
 ├─ http/          # express app + health endpoint
 ├─ hub/           # Hub, Router, connection/presence/session helpers
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
