import express, {
  type Request,
  type Response
} from 'express';
import { createItemInputSchema } from './contracts.ts';
import { createFaultController, type FaultDecision } from './fault-controller.ts';
import { createFixtureStore } from './store.ts';
import type { FixtureConfig } from './types.ts';

function sendFault(
  decision: FaultDecision,
  response: Response
): boolean {
  if (decision.kind === 'transient-500') {
    response.status(500).json({
      error: {
        code: 'TRANSIENT_FAILURE',
        message: 'Synthetic intermittent failure.'
      }
    });
    return true;
  }

  if (decision.kind === 'malformed-json') {
    response.status(200).type('application/json').send('{"synthetic":');
    return true;
  }

  return false;
}

export function createFixtureApp(config: FixtureConfig) {
  const app = express();
  const store = createFixtureStore();
  const faults = createFaultController(config);

  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  app.get('/health', (_request, response) => {
    if (config.faultMode === 'unhealthy') {
      response.status(503).json({
        status: 'unhealthy',
        synthetic: true
      });
      return;
    }

    response.status(200).json({
      status: 'ok',
      synthetic: true
    });
  });

  app.get('/api/items', async (_request, response) => {
    const decision = await faults.beforeItemRequest();
    if (sendFault(decision, response)) return;

    response.status(200).json({
      items: store.list()
    });
  });

  app.get('/api/items/:id', async (request: Request<{ id: string }>, response: Response) => {
    const decision = await faults.beforeItemRequest();
    if (sendFault(decision, response)) return;

    const item = store.get(request.params.id);
    if (!item) {
      response.status(404).json({
        error: {
          code: 'ITEM_NOT_FOUND',
          message: 'Synthetic fixture item was not found.'
        }
      });
      return;
    }

    response.status(200).json(item);
  });

  app.post('/api/items', async (request: Request, response: Response) => {
    const decision = await faults.beforeItemRequest();
    if (sendFault(decision, response)) return;

    const parsed = createItemInputSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Request body did not match the synthetic item contract.'
        }
      });
      return;
    }

    const item = store.create(parsed.data);
    response.status(201).json(item);
  });

  app.get('/api/runtime', (_request, response) => {
    response.status(200).json({
      service: 'stacktape-reliability-fixture',
      environment: 'synthetic-local',
      faultMode: config.faultMode,
      nodeVersion: process.version,
      uptimeSeconds: Math.floor(process.uptime())
    });
  });

  app.use((_request, response) => {
    response.status(404).json({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'Synthetic fixture route was not found.'
      }
    });
  });

  return app;
}

