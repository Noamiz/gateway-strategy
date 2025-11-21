import type { Server } from 'http';
import { WebSocketServer } from 'ws';
import { WS_PATH } from '../config/routes';
import { logger } from '../utils/logger';
import { Router } from './Router';

export class Hub {
  private wss: WebSocketServer | null = null;

  private readonly router = new Router();

  start(server: Server): void {
    if (this.wss) {
      throw new Error('Hub already started');
    }

    this.wss = new WebSocketServer({ server, path: WS_PATH });
    this.wss.on('connection', (ws) => this.router.onConnection(ws));
    logger.info('hub.started', { path: WS_PATH });
  }

  async stop(): Promise<void> {
    if (!this.wss) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.wss?.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
    this.wss = null;
  }
}
