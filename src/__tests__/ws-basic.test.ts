import WebSocket from 'ws';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WS_PATH } from '../config/routes';
import type { GatewayInstance } from '../server';
import { startGateway, stopGateway } from '../server';

async function nextMessage(ws: WebSocket): Promise<any> {
  return new Promise((resolve, reject) => {
    const handleMessage = (data: WebSocket.RawData) => {
      ws.off('error', handleError);
      resolve(JSON.parse(data.toString()));
    };
    const handleError = (error: Error) => {
      ws.off('message', handleMessage);
      reject(error);
    };
    ws.once('message', handleMessage);
    ws.once('error', handleError);
  });
}

describe('websocket basics', () => {
  let instance: GatewayInstance | undefined;
  let port: number | undefined;

  beforeEach(async () => {
    instance = await startGateway(0);
    const address = instance.server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Unable to determine server port');
    }
    port = address.port;
  });

  afterEach(async () => {
    if (instance) {
      await stopGateway(instance);
      instance = undefined;
    }
  });

  it('emits ready on connect and handles identify', async () => {
    if (!port) {
      throw new Error('Gateway port missing');
    }

    const ws = new WebSocket(`ws://127.0.0.1:${port}${WS_PATH}`);

    const initial = await nextMessage(ws);
    expect(initial.type).toBe('ready');
    expect(initial.payload?.heartbeat).toBeDefined();

    const identify = {
      type: 'identify',
      ts: Date.now(),
      payload: {
        clientType: 'app-client' as const,
        groupId: 'test-group',
      },
    };
    ws.send(JSON.stringify(identify));

    const followUp = await nextMessage(ws);
    expect(['presence_update', 'ready']).toContain(followUp.type);

    ws.close();
    await new Promise<void>((resolve) => ws.once('close', resolve));
  });
});
