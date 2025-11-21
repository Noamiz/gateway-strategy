import http from 'http';
import { createApp } from './http/app';
import { Hub } from './hub/Hub';
import { logger } from './utils/logger';

const DEFAULT_PORT = Number(process.env.GW_PORT ?? 4100);
const DEFAULT_HOST = process.env.GW_HOST ?? '0.0.0.0';

export interface GatewayInstance {
  server: http.Server;
  hub: Hub;
}

export function createGateway(): GatewayInstance {
  const app = createApp();
  const server = http.createServer(app);
  const hub = new Hub();
  hub.start(server);
  return { server, hub };
}

export async function startGateway(
  port: number = DEFAULT_PORT,
  host: string = DEFAULT_HOST,
): Promise<GatewayInstance> {
  const instance = createGateway();
  await new Promise<void>((resolve, reject) => {
    instance.server.once('error', (error) => {
      reject(error);
    });
    instance.server.listen(port, host, () => {
      const address = instance.server.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;
      logger.info('gateway listening', { port: actualPort, host });
      resolve();
    });
  });
  return instance;
}

export async function stopGateway(instance: GatewayInstance): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    instance.server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
  await instance.hub.stop();
}

if (require.main === module) {
  startGateway().catch((error) => {
    logger.error('gateway startup failed', { error: (error as Error).message });
    process.exitCode = 1;
  });
}
