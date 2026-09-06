import { test } from '@jest/globals';
import assert from 'node:assert/strict';
import { loadFixtureConfig } from '../../apps/fixture-service/src/config.ts';

test('fixture config uses safe loopback defaults', () => {
  const config = loadFixtureConfig({});
  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.port, 4317);
  assert.equal(config.faultMode, 'none');
  assert.equal(config.slowMs, 150);
  assert.equal(config.intermittentEvery, 3);
  assert.equal(config.shutdownDelayMs, 200);
});

test('fixture config accepts deterministic test overrides', () => {
  const config = loadFixtureConfig({
    FIXTURE_HOST: '::1',
    FIXTURE_PORT: '0',
    FIXTURE_FAULT_MODE: 'intermittent-500',
    FIXTURE_SLOW_MS: '25',
    FIXTURE_INTERMITTENT_EVERY: '4',
    FIXTURE_SHUTDOWN_DELAY_MS: '10'
  });

  assert.deepEqual(config, {
    host: '::1',
    port: 0,
    faultMode: 'intermittent-500',
    slowMs: 25,
    intermittentEvery: 4,
    shutdownDelayMs: 10
  });
});

test('fixture config rejects non-loopback binding', () => {
  assert.throws(() => loadFixtureConfig({ FIXTURE_HOST: '0.0.0.0' }));
});

test('fixture config rejects unknown fault modes', () => {
  assert.throws(() => loadFixtureConfig({ FIXTURE_FAULT_MODE: 'production-chaos' }));
});

test('fixture config rejects invalid deterministic limits', () => {
  assert.throws(() => loadFixtureConfig({ FIXTURE_INTERMITTENT_EVERY: '1' }));
  assert.throws(() => loadFixtureConfig({ FIXTURE_SLOW_MS: '0' }));
  assert.throws(() => loadFixtureConfig({ FIXTURE_PORT: '70000' }));
});
