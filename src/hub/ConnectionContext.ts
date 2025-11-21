import type WebSocket from 'ws';
import type { ClientRole } from '../types/signals';

export interface ConnectionContext {
  id: string;
  ws: WebSocket;
  role?: ClientRole;
  groupId?: string;
  createdAt: number;
  lastSeenAt: number;
}
