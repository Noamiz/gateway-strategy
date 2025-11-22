# System Sync – Gateway Strategy

This repo is one of the seven core repos in the secondbase kit.

## 1. Purpose of This File

This document gives **AI coding tools (Cursor, ChatGPT, etc.)** and developers a compact overview of:

- The overall multi-repo system.
- The role of this specific repository: `gateway-strategy`.
- Where to find deeper documentation (Confluence).

Reference this file before starting or resuming work so every agent understands the whole picture.

---

## 2. Global System Overview

We are building a **multi-service, multi-app architecture** with seven main repositories:

1. **common-strategy** – Shared TypeScript library for DTOs, envelopes, constants, logging interfaces, and helpers.
2. **server-strategy** – Core Node.js/TypeScript HTTP API server: auth, user management, business logic, PostgreSQL access, Swagger/OpenAPI docs.
3. **gateway-strategy** – Node.js/TypeScript realtime gateway behind Nginx. Terminates WebSockets on `/rt`, enforces heartbeats, and routes presence/collaboration signals.
4. **web-client-strategy** – React + TypeScript dashboard that speaks HTTP to `server-strategy` and WebSockets to `gateway-strategy`.
5. **mobile-client-strategy** – React Native + Expo client aligned with the web feature set.
6. **internal-tool-strategy** – Operational tooling for support/sales (admin console, metrics, release switches). Talks to the same APIs/gateways.
7. **ai-strategy** – AI/ML workloads (data enrichment, forecasts) that consume `server-` and `gateway-` data streams.

### Key Principles

- **TypeScript everywhere** – shared contracts originate in `common-strategy`.
- **Separation of concerns** – HTTP APIs live in `server-`, realtime fan-out lives in `gateway-`, clients consume via `web-`/`mobile-`, AI/ops tooling stay decoupled.
- **Production mindset** – real domains, TLS termination, Docker/Nginx, Postgres, CI/CD, and structured logging from day one.

---

## 3. This Repo: `gateway-strategy`

**Role**  
`gateway-strategy` is the **WebSocket gateway** for the End to End Company Products platform. It exposes `/health` for probes and `/rt` for realtime messaging, coordinating presence, heartbeats, and channel/session fan-out.

**Responsibilities**

- Accept secure WebSocket connections and bootstrap them through the Hub → Router pipeline.
- Normalize inbound envelopes (`identify`, `heartbeat`, `data_update`) and emit `ready`, `presence_update`, `data_update`, and `error`.
- Track per-connection metadata (role, group, timestamps) plus lightweight presence/session registries for group fan-out.
- Provide local placeholder envelope/signal models until shared contracts move into `common-strategy`.
- Offer a deterministic dev playground (`yarn dev:echo`) so other repos can simulate realtime scenarios quickly.

**Out of scope**

- Business logic, auth flows, or persistence beyond in-memory presence/session caches.
- HTTP APIs beyond `/health`.
- Long-term contract ownership (migrate to `common-strategy` when shared DTOs are ready).

---

## 4. Current Code Modules (Nov 2025)

- `src/server.ts` – Boots Express + HTTP server, starts the Hub, honours `GW_PORT`/`GW_HOST`, exposes `startGateway` + `stopGateway`.
- `src/http/app.ts` – Express app with JSON middleware and `/health` returning `{ ok: true, data: { status: 'ok' } }` using `common-strategy`'s `Result<T>`.
- `src/hub/Hub.ts` – Wraps `ws`’s `WebSocketServer`, attaches it to the HTTP server on `WS_PATH = '/rt'`, and forwards lifecycle events to the Router.
- `src/hub/Router.ts` – Core realtime brain: validates envelopes, handles identify/heartbeat/data flows, manages connection map + group membership, emits ready/error/presence/data responses, and uses `PresenceRegistry`/`SessionStore`.
- `src/hub/ConnectionContext.ts` – Connection DTO (ids, sockets, timestamps, role/group metadata).
- `src/hub/Presence.ts` & `SessionStore.ts` – Minimal registries to track group presence (`UP`/`DOWN` with metadata) and session meta (per group/session TTL respecting `ORPHAN_SESSION_TTL_MS`).
- `src/config/routes.ts` & `timings.ts` – Constants for `/rt`, heartbeat intervals (`10s` interval, `25s` timeout), orphan-session TTL, future expansion point for configurable routes/timers.
- `src/types/envelope.ts`, `domain.ts`, `signals.ts` – Local placeholder envelope definitions, client roles, session metadata, and signal unions (`IncomingFromClient`, `OutgoingToClient`).
- `src/utils/` – Helpers for IDs (`newId()`), JSON parsing with structured errors, console logger honoring `LOG_LEVEL`, and `sendJSON` wrappers around `ws`.
- `src/dev/echoScenario.ts` – Dev playground that boots the gateway, spawns two in-process clients in `group-1`, exercises identify + heartbeat + data fan-out, and shuts down automatically.
- `src/__tests__/health.test.ts` & `ws-basic.test.ts` – Vitest suites covering the HTTP health probe and basic ready/identify/data round-trips (binds to `127.0.0.1` high ports, no sudo).
- `infra/nginx/` + `docker-compose.yml` – Local Docker stack: Nginx proxy on ports 80/443 -> Node gateway (`gateway:8080`) on the `gateway_net` bridge, TLS cert placeholders in `infra/nginx/certs`.

Keep this section current when files move or new subsystems land so other agents know what is production-ready.

---

## 5. Runtime & Local Workflows

- Install deps: `yarn install`.
- Key scripts:
  - `yarn dev` – run `src/server.ts` via `ts-node-dev` (restarts on changes).
  - `yarn dev:echo` – run the gateway _plus_ the dev playground clients; ideal smoke test before committing.
  - `yarn build` – compile to `dist/` via `tsc -p tsconfig.build.json`.
  - `yarn start` – run the compiled server from `dist/server.js`.
  - `yarn test` – execute Vitest suites (uses supertest + in-memory ws clients).
  - `yarn lint` – ESLint over `src` (Flat config disabled for compatibility).
- Environment:
  - `GW_PORT` / `GW_HOST` override the HTTP/WebSocket bind (defaults `4100`/`0.0.0.0`).
  - `LOG_LEVEL` controls logger threshold (`debug` < `info` < `warn` < `error`, default `info`).
- Recommended loop: `yarn dev` or `yarn dev:echo`, keep Vitest running in watch mode (`yarn test --watch`), run `yarn lint` before PRs.

---

## 6. Deployment & Infra

- `docker compose up -d` builds the Node image, runs it behind Nginx, and exposes:
  - `80` → `ws://<host>/rt` (plaintext dev)
  - `443` → `wss://<host>/rt` with certs from `infra/nginx/certs/{fullchain.pem,privkey.pem}`
- Update `infra/nginx/nginx.conf` if paths/routes change; keep TLS blocks in sync with cert automation.
- The Compose stack keeps Node + Nginx on the same `gateway_net` bridge so you can move it to a LAN NUC or VPS unchanged.
- Production expectation: DNS targets the Nginx host, clients speak WebSocket Secure, and the HTTP `/health` endpoint is wired into uptime monitors.

---

## 7. Documentation Sources

- **Confluence Space**: “End to End Company Products”
  - `01 – Vision & Strategy` – personas, roadmap.
  - `02 – System Architecture` – service interactions (gateway ↔ server ↔ clients).
  - `03 – Repositories → gateway-strategy` – deep dives on hub/router/presence internals.
  - `05 – APIs & Contracts` – shared DTOs and envelope specs; migrate local placeholders once finalized there.

If this file and Confluence disagree, **Confluence wins** and this file must be updated.

---

## 8. How Agents Should Use This

- Assume all clients eventually import _shared_ realtime contracts from `common-strategy`; avoid drifting local copies.
- When adding new signals or envelope fields, coordinate with `server-`, `web-`, `mobile-`, and `ai-strategy` so they stay compatible.
- Keep Router logic stateless beyond in-memory maps; if persistence is needed, spec the change with `server-strategy` first.
- Update this System Sync (and Confluence) whenever routes, message types, or deployment expectations change.
- Prefer adding integration tests (Vitest ws suites) whenever you touch connection/presence logic—regressions are costly.
