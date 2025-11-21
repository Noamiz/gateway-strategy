# System Sync: Gateway Strategy

## Overview
- `gateway-strategy` is the WebSocket gateway for the End to End Company Products platform.
- It provides a generic Hub → Router based architecture inspired by the Motivision real-time gateway, but keeps all domain language neutral.
- The gateway will act as the central realtime transport layer that future presence, collaboration, and monitoring features will use.

## Platform Context
- This repository sits alongside:
  - `common-strategy`
  - `server-strategy`
  - `gateway-strategy`
  - `web-client-strategy`
  - `mobile-client-strategy`
  - `internal-tool-strategy`
  - `ai-strategy`
- Shared types originate in `common-strategy`. As realtime message contracts evolve they should be authored there and imported into this gateway (and other clients) to maintain parity.

## Contracts & Source of Truth
- Until the shared contract package contains the realtime message definitions, this gateway ships a small in-repo placeholder envelope/signal model.
- When the shared contracts land, replace the local placeholders with the shared versions to avoid drift.
- Confluence remains the canonical reference for architecture decisions, message contracts, and deployment expectations.
