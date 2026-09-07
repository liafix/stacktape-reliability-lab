import {
  afterEach,
  describe,
  expect,
  test
} from '@jest/globals';
import request from 'supertest';
import {
  errorResponseSchema,
  fixtureItemSchema,
  healthResponseSchema,
  itemListResponseSchema,
  runtimeResponseSchema
} from '../../apps/fixture-service/src/contracts.js';
import {
  startFixtureServer,
  type RunningFixtureServer
} from '../../apps/fixture-service/src/server.js';
import type {
  FaultMode,
  FixtureConfig
} from '../../apps/fixture-service/src/types.js';

let running: RunningFixtureServer | undefined;

function fixtureConfig(
  faultMode: FaultMode = 'none',
  overrides: Partial<FixtureConfig> = {}
): FixtureConfig {
  return {
    host: '127.0.0.1',
    port: 0,
    faultMode,
    slowMs: 40,
    intermittentEvery: 3,
    shutdownDelayMs: 40,
    ...overrides
  };
}

async function start(
  faultMode: FaultMode = 'none',
  overrides: Partial<FixtureConfig> = {}
) {
  const server = await startFixtureServer(fixtureConfig(faultMode, overrides));
  running = server;

  expect(server.host).toBe('127.0.0.1');
  expect(server.baseUrl.startsWith('http://127.0.0.1:')).toBe(true);

  return {
    client: request(server.baseUrl),
    server
  };
}

afterEach(async () => {
  if (!running) return;
  const server = running;
  running = undefined;
  await server.shutdown();
});

describe('PASS 4 real HTTP integration boundary', () => {
  test('health and runtime contracts are served over loopback HTTP', async () => {
    const { client } = await start();

    const health = await client.get('/health').expect(200);
    expect(healthResponseSchema.parse(health.body)).toEqual({
      status: 'ok',
      synthetic: true
    });

    const runtime = await client.get('/api/runtime').expect(200);
    const parsedRuntime = runtimeResponseSchema.parse(runtime.body);
    expect(parsedRuntime.environment).toBe('synthetic-local');
    expect(parsedRuntime.faultMode).toBe('none');
  });

  test('lists deterministic synthetic items', async () => {
    const { client } = await start();

    const response = await client.get('/api/items').expect(200);
    const parsed = itemListResponseSchema.parse(response.body);

    expect(parsed.items).toHaveLength(2);
    expect(parsed.items.map((item) => item.id)).toEqual(['item-1', 'item-2']);
  });

  test('creates an item and can retrieve it through a second HTTP request', async () => {
    const { client } = await start();

    const createdResponse = await client
      .post('/api/items')
      .send({
        name: 'Synthetic Integration Gamma',
        description: 'Candidate-owned integration fixture.'
      })
      .expect(201);

    const created = fixtureItemSchema.parse(createdResponse.body);
    expect(created.id).toBe('item-3');

    const fetchedResponse = await client
      .get(`/api/items/${created.id}`)
      .expect(200);

    expect(fixtureItemSchema.parse(fetchedResponse.body)).toEqual(created);
  });

  test('returns stable 404 contracts for missing item and route', async () => {
    const { client } = await start();

    const missingItem = await client.get('/api/items/item-999').expect(404);
    expect(errorResponseSchema.parse(missingItem.body).error.code).toBe(
      'ITEM_NOT_FOUND'
    );

    const missingRoute = await client.get('/api/not-a-route').expect(404);
    expect(errorResponseSchema.parse(missingRoute.body).error.code).toBe(
      'ROUTE_NOT_FOUND'
    );
  });

  test('rejects invalid create payloads with the public error contract', async () => {
    const { client } = await start();

    const response = await client
      .post('/api/items')
      .send({
        name: '',
        description: 'This payload is intentionally invalid.'
      })
      .expect(400);

    expect(errorResponseSchema.parse(response.body).error.code).toBe(
      'INVALID_REQUEST'
    );
  });
});

describe('PASS 4 deterministic fault-mode integration', () => {
  test('none keeps normal item traffic healthy', async () => {
    const { client } = await start('none');
    await client.get('/api/items').expect(200);
  });

  test('unhealthy returns a deterministic 503 health response', async () => {
    const { client } = await start('unhealthy');

    const response = await client.get('/health').expect(503);
    expect(healthResponseSchema.parse(response.body)).toEqual({
      status: 'unhealthy',
      synthetic: true
    });
  });

  test('slow delays item traffic before returning normally', async () => {
    const { client } = await start('slow', { slowMs: 40 });

    const startedAt = Date.now();
    await client.get('/api/items').expect(200);
    const elapsedMs = Date.now() - startedAt;

    expect(elapsedMs).toBeGreaterThanOrEqual(30);
  });

  test('malformed-json returns intentionally invalid JSON without parser masking', async () => {
    const { client } = await start('malformed-json');

    const response = await client
      .get('/api/items')
      .buffer(true)
      .parse((incoming, callback) => {
        let raw = '';
        incoming.setEncoding('utf8');
        incoming.on('data', (chunk: string) => {
          raw += chunk;
        });
        incoming.on('end', () => {
          callback(null, raw);
        });
      })
      .expect('Content-Type', /application\/json/)
      .expect(200);

    expect(response.body).toBe('{"synthetic":');
  });

  test('intermittent-500 fails exactly on the configured Nth item request', async () => {
    const { client } = await start('intermittent-500', {
      intermittentEvery: 3
    });

    await client.get('/api/items').expect(200);
    await client.get('/api/items').expect(200);

    const third = await client.get('/api/items').expect(500);
    expect(errorResponseSchema.parse(third.body).error.code).toBe(
      'TRANSIENT_FAILURE'
    );
  });

  test('shutdown-delay delays graceful shutdown deterministically', async () => {
    const { server } = await start('shutdown-delay', {
      shutdownDelayMs: 40
    });

    running = undefined;
    const startedAt = Date.now();
    await server.shutdown();
    const elapsedMs = Date.now() - startedAt;

    expect(elapsedMs).toBeGreaterThanOrEqual(30);
  });
});
