import { test } from '@jest/globals';
import assert from 'node:assert/strict';
import { createFaultController } from '../../apps/fixture-service/src/fault-controller.ts';
import type { FixtureConfig, FaultMode } from '../../apps/fixture-service/src/types.ts';

function configFor(faultMode: FaultMode): FixtureConfig {
  return {
    host: '127.0.0.1',
    port: 0,
    faultMode,
    slowMs: 1,
    intermittentEvery: 3,
    shutdownDelayMs: 1
  };
}

test('none mode always passes item requests', async () => {
  const controller = createFaultController(configFor('none'));
  assert.deepEqual(await controller.beforeItemRequest(), { kind: 'pass' });
  assert.deepEqual(await controller.beforeItemRequest(), { kind: 'pass' });
});

test('malformed-json mode deterministically selects malformed response', async () => {
  const controller = createFaultController(configFor('malformed-json'));
  assert.deepEqual(await controller.beforeItemRequest(), { kind: 'malformed-json' });
});

test('intermittent mode fails exactly on configured cadence', async () => {
  const controller = createFaultController(configFor('intermittent-500'));
  assert.deepEqual(await controller.beforeItemRequest(), { kind: 'pass' });
  assert.deepEqual(await controller.beforeItemRequest(), { kind: 'pass' });
  assert.deepEqual(await controller.beforeItemRequest(), { kind: 'transient-500' });
  assert.deepEqual(await controller.beforeItemRequest(), { kind: 'pass' });
});

test('unhealthy and shutdown-delay modes do not mutate item responses', async () => {
  for (const mode of ['unhealthy', 'shutdown-delay'] as const) {
    const controller = createFaultController(configFor(mode));
    assert.deepEqual(await controller.beforeItemRequest(), { kind: 'pass' });
  }
});
