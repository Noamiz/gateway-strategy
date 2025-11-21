import WebSocket from 'ws';
import { WS_PATH } from '../config/routes';
import type { GatewayInstance } from '../server';
import { startGateway, stopGateway } from '../server';
import { logger } from '../utils/logger';

const HOST = process.env.ECHO_HOST ?? '127.0.0.1';
const PORT = Number(process.env.ECHO_PORT ?? 4100);
const GROUP_ID = 'group-1';

async function main() {
  let instance: GatewayInstance | undefined;
  let clientA: WebSocket | undefined;
  let clientB: WebSocket | undefined;

  try {
    instance = await startGateway(PORT, HOST);
    const url = `ws://${HOST}:${PORT}${WS_PATH}`;
    logger.info('[dev] gateway online', { url });

    clientA = await bootClient('clientA', url);
    clientB = await bootClient('clientB', url);

    clientB.on('message', (data) => {
      // eslint-disable-next-line no-console
      console.log(`[clientB] ${rawToString(data)}`);
    });

    await delay(200);

    const dataUpdate = {
      type: 'data_update' as const,
      ts: Date.now(),
      groupId: GROUP_ID,
      payload: {
        data: { message: 'hello from clientA' },
      },
    };

    logger.info('[dev] clientA sending data_update', dataUpdate.payload);
    clientA.send(JSON.stringify(dataUpdate));

    await waitForType(clientB, 'data_update');
    await delay(200);
  } catch (error) {
    logger.error('[dev] echo scenario failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    await shutdown(clientA, clientB, instance);
  }
}

async function bootClient(label: string, url: string): Promise<WebSocket> {
  const ws = new WebSocket(url);
  await once(ws, 'open');
  await waitForType(ws, 'ready');
  const identify = {
    type: 'identify' as const,
    ts: Date.now(),
    payload: {
      clientType: 'app-client' as const,
      groupId: GROUP_ID,
      metadata: { label },
    },
  };
  logger.info(`[dev] ${label} identifying`, identify.payload);
  ws.send(JSON.stringify(identify));
  return ws;
}

function once(ws: WebSocket, event: 'open' | 'close'): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${event}`));
    }, 5000);

    const cleanup = () => {
      clearTimeout(timer);
      ws.off('error', handleError);
      ws.off(event, handleResolve);
    };

    const handleResolve = () => {
      cleanup();
      resolve();
    };

    const handleError = (err: Error) => {
      cleanup();
      reject(err);
    };

    ws.once(event, handleResolve);
    ws.once('error', handleError);
  });
}

async function waitForType(ws: WebSocket | undefined, type: string): Promise<Record<string, unknown>> {
  if (!ws) {
    throw new Error('WebSocket not initialized');
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${type}`));
    }, 5000);

    const cleanup = () => {
      clearTimeout(timer);
      ws.off('error', handleError);
      ws.off('message', handleMessage);
    };

    const handleMessage = (raw: WebSocket.RawData) => {
      try {
        const parsed = JSON.parse(rawToString(raw)) as Record<string, unknown>;
        const candidateType = (parsed as { type?: unknown }).type;
        const parsedType = typeof candidateType === 'string' ? candidateType : undefined;
        if (parsedType === type) {
          cleanup();
          resolve(parsed);
        }
      } catch (err) {
        cleanup();
        reject(err as Error);
      }
    };

    const handleError = (err: Error) => {
      cleanup();
      reject(err);
    };

    ws.on('message', handleMessage);
    ws.once('error', handleError);
  });
}

async function shutdown(
  clientA: WebSocket | undefined,
  clientB: WebSocket | undefined,
  instance: GatewayInstance | undefined,
) {
  await Promise.all([closeSocket(clientA), closeSocket(clientB)]);
  if (instance) {
    await stopGateway(instance);
  }
}

function closeSocket(ws?: WebSocket): Promise<void> {
  if (!ws || ws.readyState === WebSocket.CLOSED) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    ws.once('close', () => resolve());
    ws.close();
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function rawToString(raw: WebSocket.RawData): string {
  if (typeof raw === 'string') {
    return raw;
  }
  if (Buffer.isBuffer(raw)) {
    return raw.toString('utf8');
  }
  if (Array.isArray(raw)) {
    return Buffer.concat(raw).toString('utf8');
  }
  if (raw instanceof ArrayBuffer) {
    return Buffer.from(raw).toString('utf8');
  }
  return String(raw);
}

void main();
