import { describe, expect, test } from '@jest/globals';
import request from 'supertest';
import { createFixtureApp } from '../../apps/fixture-service/src/app.js';
import {
  errorResponseSchema,
  fixtureItemSchema,
  healthResponseSchema,
  itemListResponseSchema,
  runtimeResponseSchema
} from '../../apps/fixture-service/src/contracts.js';
import type { FaultMode, FixtureConfig } from '../../apps/fixture-service/src/types.js';

function fixtureConfig(
  faultMode: FaultMode = 'none',
  overrides: Partial<FixtureConfig> = {}
): FixtureConfig {
  return {
    host: '127.0.0.1',
    port: 0,
    faultMode,
    slowMs: 10,
    intermittentEvery: 3,
    shutdownDelayMs: 10,
    ...overrides
  };
}

function createClient(
  faultMode: FaultMode = 'none',
  overrides: Partial<FixtureConfig> = {}
) {
  const app = createFixtureApp(fixtureConfig(faultMode, overrides));
  return request(app);
}

describe('PASS 4 HTTP Integration Tests', () => {
  test('GET /health success', async () => {
    const client = createClient();
    const response = await client.get('/health').expect(200);
    expect(healthResponseSchema.parse(response.body)).toEqual({
      status: 'ok',
      synthetic: true
    });
  });

  test('GET /api/items', async () => {
    const client = createClient();
    const response = await client.get('/api/items').expect(200);
    const parsed = itemListResponseSchema.parse(response.body);
    expect(parsed.items).toHaveLength(2);
    expect(parsed.items.map((item) => item.id)).toEqual(['item-1', 'item-2']);
  });

  test('GET /api/items/:id success', async () => {
    const client = createClient();
    const response = await client.get('/api/items/item-1').expect(200);
    const parsed = fixtureItemSchema.parse(response.body);
    expect(parsed.id).toBe('item-1');
    expect(parsed.name).toBe('Synthetic Alpha');
  });

  test('POST /api/items creation and created item can subsequently be retrieved/listed', async () => {
    const client = createClient();

    const createResponse = await client
      .post('/api/items')
      .send({
        name: 'Synthetic Delta',
        description: 'Synthetic item for Pass 4 HTTP integration.'
      })
      .expect(201);

    const created = fixtureItemSchema.parse(createResponse.body);
    expect(created.id).toBe('item-3');
    expect(created.name).toBe('Synthetic Delta');

    const getResponse = await client.get(`/api/items/${created.id}`).expect(200);
    expect(fixtureItemSchema.parse(getResponse.body)).toEqual(created);

    const listResponse = await client.get('/api/items').expect(200);
    const list = itemListResponseSchema.parse(listResponse.body);
    expect(list.items).toHaveLength(3);
    expect(list.items.some((item) => item.id === created.id)).toBe(true);
  });

  test('item 404', async () => {
    const client = createClient();
    const response = await client.get('/api/items/item-999').expect(404);
    const parsed = errorResponseSchema.parse(response.body);
    expect(parsed.error.code).toBe('ITEM_NOT_FOUND');
  });

  test('unknown route 404', async () => {
    const client = createClient();
    const response = await client.get('/api/not-a-route').expect(404);
    const parsed = errorResponseSchema.parse(response.body);
    expect(parsed.error.code).toBe('ROUTE_NOT_FOUND');
  });

  test('request validation failures', async () => {
    const client = createClient();
    const response = await client
      .post('/api/items')
      .send({
        name: '',
        description: 'Invalid name field.'
      })
      .expect(400);

    const parsed = errorResponseSchema.parse(response.body);
    expect(parsed.error.code).toBe('INVALID_REQUEST');
  });

  test('deterministic unhealthy health mode', async () => {
    const client = createClient('unhealthy');
    const response = await client.get('/health').expect(503);
    expect(healthResponseSchema.parse(response.body)).toEqual({
      status: 'unhealthy',
      synthetic: true
    });
  });

  test('deterministic malformed-json mode', async () => {
    const client = createClient('malformed-json');
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

  test('deterministic intermittent-500 cadence', async () => {
    const client = createClient('intermittent-500', { intermittentEvery: 3 });

    await client.get('/api/items').expect(200);
    await client.get('/api/items').expect(200);

    const third = await client.get('/api/items').expect(500);
    const parsed = errorResponseSchema.parse(third.body);
    expect(parsed.error.code).toBe('TRANSIENT_FAILURE');

    await client.get('/api/items').expect(200);
  });

  test('deterministic slow mode where appropriate without flaky wall-clock assertions', async () => {
    const client = createClient('slow', { slowMs: 10 });
    const response = await client.get('/api/items').expect(200);
    const parsed = itemListResponseSchema.parse(response.body);
    expect(parsed.items).toHaveLength(2);
  });

  test('GET /api/runtime returns synthetic runtime information', async () => {
    const client = createClient();
    const response = await client.get('/api/runtime').expect(200);
    const parsed = runtimeResponseSchema.parse(response.body);
    expect(parsed.service).toBe('stacktape-reliability-fixture');
    expect(parsed.environment).toBe('synthetic-local');
    expect(parsed.faultMode).toBe('none');
  });
});
