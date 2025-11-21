import express from 'express';
import type { Result } from 'common-strategy';

export function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    const body: Result<{ status: 'ok' }> = {
      ok: true,
      data: { status: 'ok' },
    };
    res.status(200).json(body);
  });

  return app;
}
