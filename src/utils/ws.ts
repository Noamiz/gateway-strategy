import type WebSocket from 'ws';
import type { OutgoingToClient } from '../types/signals';
import { logger } from './logger';

export function sendJSON(
  ws: WebSocket,
  msg: OutgoingToClient | Record<string, unknown>,
): void {
  try {
    ws.send(JSON.stringify(msg));
    const type = (msg as { type?: string }).type ?? 'unknown';
    logger.debug('WS SENT', { type });
  } catch (error) {
    logger.error('WS send failed', { error: (error as Error).message });
  }
}
