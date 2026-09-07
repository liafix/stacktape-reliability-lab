import {
  afterEach,
  describe,
  expect,
  test
} from '@jest/globals';
import {
  itemListResponseSchema
} from '../../apps/fixture-service/src/contracts.js';
import {
  startFixtureServer,
  type RunningFixtureServer
} from '../../apps/fixture-service/src/server.js';
import type {
  FaultMode,
  FixtureConfig
} from '../../apps/fixture-service/src/types.js';
import {
  classifyFailure
} from '../../packages/qa-core/src/classify-failure.js';
import {
  retryDecision
} from '../../packages/qa-core/src/retry-policy.js';

let running: RunningFixtureServer | undefined;

function fixtureConfig(
  faultMode: FaultMode,
  overrides: Partial<FixtureConfig> = {}
): FixtureConfig {
  return {
    host: '127.0.0.1',
    port: 0,
    faultMode,
    slowMs: 120,
    intermittentEvery: 2,
    shutdownDelayMs: 120,
    ...overrides
  };
}

async function start(
  faultMode: FaultMode,
  overrides: Partial<FixtureConfig> = {}
): Promise<RunningFixtureServer> {
  const server = await startFixtureServer(
    fixtureConfig(faultMode, overrides)
  );

  running = server;

  expect(server.host).toBe('127.0.0.1');
  expect(server.baseUrl.startsWith('http://127.0.0.1:')).toBe(true);

  return server;
}

afterEach(async () => {
  if (!running) return;

  const server = running;
  running = undefined;
  await server.shutdown();
});

describe('PASS 6 deterministic failure injection', () => {
  test('none is the healthy control scenario', async () => {
    const server = await start('none');

    const response = await fetch(`${server.baseUrl}/api/items`);
    expect(response.status).toBe(200);

    const body: unknown = await response.json();
    const parsed = itemListResponseSchema.parse(body);
    expect(parsed.items.length).toBeGreaterThan(0);
  });

  test('unhealthy health is classified and retryable', async () => {
    const server = await start('unhealthy');

    const response = await fetch(`${server.baseUrl}/health`);
    expect(response.status).toBe(503);

    const failure = classifyFailure({
      kind: 'http',
      status: response.status,
      source: 'health'
    });

    expect(failure).toBe('HEALTH_CHECK_FAILED');
    expect(retryDecision(failure, 0, 1)).toEqual({
      retry: true,
      nextAttempt: 1
    });
  });

  test('slow response becomes a deterministic timeout signal', async () => {
    const server = await start('slow', {
      slowMs: 120
    });

    const startedAt = Date.now();
    let timedOut = false;

    try {
      await fetch(`${server.baseUrl}/api/items`, {
        signal: AbortSignal.timeout(30)
      });
    } catch {
      timedOut = true;
    }

    const durationMs = Date.now() - startedAt;

    expect(timedOut).toBe(true);
    expect(durationMs).toBeLessThan(120);

    const failure = classifyFailure({
      kind: 'timeout'
    });

    expect(failure).toBe('TIMEOUT');
    expect(retryDecision(failure, 0, 1)).toEqual({
      retry: true,
      nextAttempt: 1
    });
  });

  test('malformed JSON is classified as a non-retryable response contract failure', async () => {
    const server = await start('malformed-json');

    const response = await fetch(`${server.baseUrl}/api/items`);
    expect(response.status).toBe(200);

    const body = await response.text();
    expect(() => JSON.parse(body)).toThrow();

    const failure = classifyFailure({
      kind: 'contract',
      source: 'response'
    });

    expect(failure).toBe('RESPONSE_CONTRACT_FAILED');
    expect(retryDecision(failure, 0, 2)).toEqual({
      retry: false,
      nextAttempt: null
    });
  });

  test('intermittent 500 is retryable and the next attempt recovers', async () => {
    const server = await start('intermittent-500', {
      intermittentEvery: 2
    });

    const first = await fetch(`${server.baseUrl}/api/items`);
    expect(first.status).toBe(200);
    itemListResponseSchema.parse(await first.json());

    const second = await fetch(`${server.baseUrl}/api/items`);
    expect(second.status).toBe(500);

    const failure = classifyFailure({
      kind: 'http',
      status: second.status,
      source: 'api'
    });

    expect(failure).toBe('TRANSIENT_FAILURE');
    expect(retryDecision(failure, 0, 1)).toEqual({
      retry: true,
      nextAttempt: 1
    });

    const retry = await fetch(`${server.baseUrl}/api/items`);
    expect(retry.status).toBe(200);
    itemListResponseSchema.parse(await retry.json());
  });

  test('shutdown delay is classified as a non-retryable lifecycle timeout', async () => {
    const server = await start('shutdown-delay', {
      shutdownDelayMs: 120
    });

    running = undefined;
    const shutdownPromise = server.shutdown();

    const exceededBudget = await Promise.race([
      shutdownPromise.then(() => false),
      new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(true), 30);
      })
    ]);

    expect(exceededBudget).toBe(true);

    const failure = classifyFailure({
      kind: 'lifecycle',
      source: 'shutdown'
    });

    expect(failure).toBe('SHUTDOWN_TIMEOUT');
    expect(retryDecision(failure, 0, 2)).toEqual({
      retry: false,
      nextAttempt: null
    });

    await shutdownPromise;
  });
});
