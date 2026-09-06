import assert from 'node:assert/strict';
import { startFixtureServer } from '../apps/fixture-service/src/server.ts';
import type {
  FaultMode,
  FixtureConfig
} from '../apps/fixture-service/src/types.ts';

function configFor(
  faultMode: FaultMode,
  overrides: Partial<FixtureConfig> = {}
): FixtureConfig {
  return {
    host: '127.0.0.1',
    port: 0,
    faultMode,
    slowMs: 35,
    intermittentEvery: 3,
    shutdownDelayMs: 35,
    ...overrides
  };
}

async function withFixture(
  config: FixtureConfig,
  run: (baseUrl: string) => Promise<void>
): Promise<void> {
  const fixture = await startFixtureServer(config);
  try {
    await run(fixture.baseUrl);
  } finally {
    await fixture.shutdown();
  }
}

async function normalModeSmoke(): Promise<void> {
  await withFixture(configFor('none'), async (baseUrl) => {
    const health = await fetch(`${baseUrl}/health`);
    assert.equal(health.status, 200);

    const list = await fetch(`${baseUrl}/api/items`);
    assert.equal(list.status, 200);

    const created = await fetch(`${baseUrl}/api/items`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Synthetic Gamma',
        description: 'Created by the P2 runtime smoke gate.'
      })
    });
    assert.equal(created.status, 201);
    const createdBody = (await created.json()) as { id: string };
    assert.equal(typeof createdBody.id, 'string');

    const fetched = await fetch(`${baseUrl}/api/items/${createdBody.id}`);
    assert.equal(fetched.status, 200);

    const runtime = await fetch(`${baseUrl}/api/runtime`);
    assert.equal(runtime.status, 200);
    const runtimeBody = (await runtime.json()) as { faultMode: string };
    assert.equal(runtimeBody.faultMode, 'none');
  });
}

async function unhealthyModeSmoke(): Promise<void> {
  await withFixture(configFor('unhealthy'), async (baseUrl) => {
    const health = await fetch(`${baseUrl}/health`);
    assert.equal(health.status, 503);
  });
}

async function slowModeSmoke(): Promise<void> {
  await withFixture(configFor('slow'), async (baseUrl) => {
    const started = Date.now();
    const response = await fetch(`${baseUrl}/api/items`);
    const elapsed = Date.now() - started;
    assert.equal(response.status, 200);
    assert.ok(elapsed >= 20, `expected synthetic delay, observed ${elapsed}ms`);
  });
}

async function malformedJsonModeSmoke(): Promise<void> {
  await withFixture(configFor('malformed-json'), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/items`);
    assert.equal(response.status, 200);
    const body = await response.text();
    assert.throws(() => JSON.parse(body));
  });
}

async function intermittentModeSmoke(): Promise<void> {
  await withFixture(configFor('intermittent-500'), async (baseUrl) => {
    const first = await fetch(`${baseUrl}/api/items`);
    const second = await fetch(`${baseUrl}/api/items`);
    const third = await fetch(`${baseUrl}/api/items`);

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(third.status, 500);
  });
}

async function shutdownDelayModeSmoke(): Promise<void> {
  const fixture = await startFixtureServer(configFor('shutdown-delay'));
  const started = Date.now();
  await fixture.shutdown();
  const elapsed = Date.now() - started;
  assert.ok(elapsed >= 20, `expected shutdown delay, observed ${elapsed}ms`);
}

async function main(): Promise<void> {
  await normalModeSmoke();
  await unhealthyModeSmoke();
  await slowModeSmoke();
  await malformedJsonModeSmoke();
  await intermittentModeSmoke();
  await shutdownDelayModeSmoke();

  console.log('P2 fixture smoke: PASS (6 deterministic modes, localhost only)');
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
