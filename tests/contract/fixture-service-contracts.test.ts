import { test } from '@jest/globals';
import assert from 'node:assert/strict';
import {
  createItemInputSchema,
  errorResponseSchema,
  fixtureItemSchema,
  healthResponseSchema,
  itemListResponseSchema,
  runtimeResponseSchema
} from '../../apps/fixture-service/src/contracts.ts';
import { createFixtureStore } from '../../apps/fixture-service/src/store.ts';

test('create-item contract normalizes omitted description and rejects extra fields', () => {
  assert.deepEqual(createItemInputSchema.parse({ name: 'Synthetic Gamma' }), {
    name: 'Synthetic Gamma',
    description: null
  });

  assert.equal(
    createItemInputSchema.safeParse({ name: 'Synthetic Gamma', externalId: 'prod-1' }).success,
    false
  );
});

test('fixture item and list contracts accept actual synthetic store records', () => {
  const store = createFixtureStore();
  const created = store.create({ name: 'Synthetic Gamma', description: null });

  assert.equal(fixtureItemSchema.safeParse(created).success, true);
  assert.equal(itemListResponseSchema.safeParse({ items: store.list() }).success, true);
});

test('health contract is explicit about synthetic healthy and unhealthy states', () => {
  assert.equal(healthResponseSchema.safeParse({ status: 'ok', synthetic: true }).success, true);
  assert.equal(healthResponseSchema.safeParse({ status: 'unhealthy', synthetic: true }).success, true);
  assert.equal(healthResponseSchema.safeParse({ status: 'ok', synthetic: false }).success, false);
});

test('runtime contract allows only the approved six fault modes', () => {
  const base = {
    service: 'stacktape-reliability-fixture',
    environment: 'synthetic-local',
    nodeVersion: 'v22.23.2',
    uptimeSeconds: 1
  } as const;

  for (const faultMode of [
    'none',
    'unhealthy',
    'slow',
    'malformed-json',
    'intermittent-500',
    'shutdown-delay'
  ] as const) {
    assert.equal(runtimeResponseSchema.safeParse({ ...base, faultMode }).success, true);
  }

  assert.equal(runtimeResponseSchema.safeParse({ ...base, faultMode: 'external-network' }).success, false);
});

test('error contract rejects unknown or empty error classifications', () => {
  assert.equal(
    errorResponseSchema.safeParse({
      error: { code: 'TRANSIENT_FAILURE', message: 'Synthetic intermittent failure.' }
    }).success,
    true
  );

  assert.equal(
    errorResponseSchema.safeParse({ error: { code: 'UNKNOWN', message: 'x' } }).success,
    false
  );

  assert.equal(
    errorResponseSchema.safeParse({ error: { code: 'ITEM_NOT_FOUND', message: '' } }).success,
    false
  );
});
