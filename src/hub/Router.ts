import type WebSocket from 'ws';
import type { RawData } from 'ws';
import { HEARTBEAT_INTERVAL_MS, HEARTBEAT_TIMEOUT_MS } from '../config/timings';
import type { PresenceInfo } from '../types/domain';
import type { ConnectionContext } from './ConnectionContext';
import { PresenceRegistry } from './Presence';
import { SessionStore } from './SessionStore';
import {
  type DataUpdate,
  type ErrorMsg,
  type Heartbeat,
  type Identify,
  type OutgoingToClient,
  type PresenceUpdate,
  type Ready,
} from '../types/signals';
import { newId } from '../utils/id';
import { safeParse } from '../utils/json';
import { logger } from '../utils/logger';
import { sendJSON } from '../utils/ws';

export class Router {
  private readonly presence = new PresenceRegistry();

  private readonly sessions = new SessionStore();

  private readonly connections = new Map<string, ConnectionContext>();

  private readonly groups = new Map<string, Set<string>>();

  onConnection(ws: WebSocket): void {
    const now = Date.now();
    const ctx: ConnectionContext = {
      id: newId(),
      ws,
      createdAt: now,
      lastSeenAt: now,
    };

    this.connections.set(ctx.id, ctx);
    logger.info('connection.open', { connectionId: ctx.id });

    ws.on('message', (payload) => this.handleMessage(ctx, payload));
    ws.on('close', () => this.onClose(ctx));
    ws.on('error', (error) => {
      logger.warn('connection.error', {
        connectionId: ctx.id,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    this.sendReady(ctx);
  }

  private handleMessage(ctx: ConnectionContext, raw: RawData): void {
    const data = this.normalizeRaw(raw);
    const parsed = safeParse<unknown>(data);
    if (!parsed.ok) {
      logger.warn('router.bad_json', {
        connectionId: ctx.id,
        error: parsed.error.message,
        bytes: data.length,
      });
      this.sendError(ctx, 'BAD_JSON', 'Unable to parse message');
      return;
    }

    const message = parsed.value;
    ctx.lastSeenAt = Date.now();
    const messageType = this.getMessageType(message);
    const messageGroup = (message as { groupId?: string } | undefined)?.groupId ?? ctx.groupId;
    logger.debug('router.message', {
      connectionId: ctx.id,
      type: messageType,
      groupId: messageGroup,
    });

    if (this.isIdentify(message)) {
      this.handleIdentify(ctx, message);
      return;
    }

    if (this.isHeartbeat(message)) {
      this.handleHeartbeat(ctx);
      return;
    }

    if (this.isDataUpdate(message)) {
      this.handleDataUpdate(ctx, message);
      return;
    }

    this.sendError(ctx, 'UNKNOWN_TYPE', `Unsupported signal: ${messageType}`);
  }

  private handleIdentify(ctx: ConnectionContext, msg: Identify): void {
    if (!msg.payload) {
      this.sendError(ctx, 'INVALID_IDENTIFY', 'Identify payload is required');
      return;
    }

    ctx.role = msg.payload.clientType;
    const incomingGroup = msg.payload.groupId;
    this.assignToGroup(ctx, incomingGroup);
    logger.info('router.identify', {
      connectionId: ctx.id,
      role: ctx.role,
      groupId: ctx.groupId,
    });

    if (ctx.groupId) {
      const info = this.presence.set(ctx.groupId, {
        status: 'UP',
        details: {
          role: ctx.role,
          metadata: msg.payload.metadata,
        },
      });
      this.broadcastPresence(ctx.groupId, info);
    }

    this.sendReady(ctx);
  }

  private handleHeartbeat(ctx: ConnectionContext): void {
    ctx.lastSeenAt = Date.now();
  }

  private handleDataUpdate(ctx: ConnectionContext, msg: DataUpdate): void {
    const groupId = msg.groupId ?? ctx.groupId;
    const envelope: DataUpdate = {
      ...msg,
      groupId,
      ts: msg.ts ?? Date.now(),
    };
    logger.debug('router.data_update', {
      connectionId: ctx.id,
      groupId,
      sessionId: msg.sessionId,
    });

    if (groupId) {
      this.broadcastToGroup(groupId, envelope);
    } else {
      this.broadcastAll(envelope);
    }

    if (groupId && msg.sessionId && msg.payload?.meta) {
      this.sessions.upsert(groupId, msg.sessionId, msg.payload.meta);
    }
  }

  private assignToGroup(ctx: ConnectionContext, groupId?: string): void {
    if (!groupId) {
      return;
    }

    if (ctx.groupId === groupId) {
      return;
    }

    if (ctx.groupId) {
      this.removeFromGroup(ctx);
    }

    ctx.groupId = groupId;
    let collection = this.groups.get(groupId);
    if (!collection) {
      collection = new Set();
      this.groups.set(groupId, collection);
    }
    collection.add(ctx.id);
  }

  private removeFromGroup(ctx: ConnectionContext): void {
    const previousGroup = ctx.groupId;
    if (!previousGroup) {
      return;
    }

    ctx.groupId = undefined;
    const collection = this.groups.get(previousGroup);
    collection?.delete(ctx.id);
    if (collection && collection.size === 0) {
      this.groups.delete(previousGroup);
      const info = this.presence.set(previousGroup, { status: 'DOWN' });
      this.broadcastPresence(previousGroup, info);
    }
  }

  private broadcastPresence(groupId: string, info: PresenceInfo): void {
    const message: PresenceUpdate = {
      type: 'presence_update',
      ts: Date.now(),
      groupId,
      payload: { groupId, info },
    };
    this.broadcastToGroup(groupId, message);
  }

  private broadcastToGroup(groupId: string, msg: OutgoingToClient): void {
    const members = this.groups.get(groupId);
    if (!members) {
      return;
    }
    members.forEach((connectionId) => {
      const ctx = this.connections.get(connectionId);
      if (ctx) {
        sendJSON(ctx.ws, msg);
      }
    });
    logger.debug('router.broadcast.group', {
      groupId,
      size: members?.size ?? 0,
      type: (msg as { type?: string }).type,
    });
  }

  private broadcastAll(msg: OutgoingToClient, excludeId?: string): void {
    let delivered = 0;
    this.connections.forEach((connection, id) => {
      if (excludeId && excludeId === id) {
        return;
      }
      sendJSON(connection.ws, msg);
      delivered += 1;
    });
    logger.debug('router.broadcast.all', {
      delivered,
      type: (msg as { type?: string }).type,
    });
  }

  private sendReady(ctx: ConnectionContext): void {
    const ready: Ready = {
      type: 'ready',
      ts: Date.now(),
      groupId: ctx.groupId,
      payload: {
        connectionId: ctx.id,
        heartbeat: {
          intervalMs: HEARTBEAT_INTERVAL_MS,
          timeoutMs: HEARTBEAT_TIMEOUT_MS,
        },
        presence: ctx.groupId ? this.presence.get(ctx.groupId) : undefined,
      },
    };
    sendJSON(ctx.ws, ready);
    logger.debug('router.ready_sent', { connectionId: ctx.id, groupId: ctx.groupId });
  }

  private sendError(ctx: ConnectionContext, code: string, message: string): void {
    const envelope: ErrorMsg = {
      type: 'error',
      ts: Date.now(),
      groupId: ctx.groupId,
      payload: {
        code,
        message,
      },
    };
    sendJSON(ctx.ws, envelope);
    logger.warn('router.error_sent', { connectionId: ctx.id, code, groupId: ctx.groupId });
  }

  private normalizeRaw(raw: RawData): string {
    if (typeof raw === 'string') {
      return raw;
    }
    if (Buffer.isBuffer(raw)) {
      return raw.toString('utf8');
    }
    if (Array.isArray(raw)) {
      return Buffer.concat(raw).toString('utf8');
    }
    return Buffer.from(raw).toString('utf8');
  }

  private onClose(ctx: ConnectionContext): void {
    const lastGroup = ctx.groupId;
    this.connections.delete(ctx.id);
    this.removeFromGroup(ctx);
    logger.info('connection.closed', { connectionId: ctx.id, groupId: lastGroup });
  }

  private getMessageType(msg: unknown): string {
    if (typeof msg === 'object' && msg !== null && 'type' in msg) {
      const candidate = (msg as { type?: string }).type;
      if (typeof candidate === 'string') {
        return candidate;
      }
    }
    return 'unknown';
  }

  private isIdentify(msg: unknown): msg is Identify {
    return this.getMessageType(msg) === 'identify';
  }

  private isHeartbeat(msg: unknown): msg is Heartbeat {
    return this.getMessageType(msg) === 'heartbeat';
  }

  private isDataUpdate(msg: unknown): msg is DataUpdate {
    return this.getMessageType(msg) === 'data_update';
  }
}
