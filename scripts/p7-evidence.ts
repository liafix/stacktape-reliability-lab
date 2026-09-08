import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { startFixtureServer, type RunningFixtureServer } from '../apps/fixture-service/src/server.ts';
import type { FaultMode, FixtureConfig } from '../apps/fixture-service/src/types.ts';
import { buildEvidenceSummary } from '../packages/qa-core/src/evidence-builder.ts';
import { renderEvidenceMarkdown } from '../packages/qa-core/src/evidence-report.ts';
import { classifyFailure } from '../packages/qa-core/src/classify-failure.ts';
import { retryDecision } from '../packages/qa-core/src/retry-policy.ts';
import type { EvidenceRecord, FailureCode } from '../packages/qa-core/src/types.ts';

const outputDirectory = resolve(process.cwd(), 'artifacts', 'p7');

function config(faultMode: FaultMode, overrides: Partial<FixtureConfig> = {}): FixtureConfig {
  return { host: '127.0.0.1', port: 0, faultMode, slowMs: 120, intermittentEvery: 2, shutdownDelayMs: 120, ...overrides };
}

async function start(faultMode: FaultMode, overrides: Partial<FixtureConfig> = {}): Promise<RunningFixtureServer> {
  const server = await startFixtureServer(config(faultMode, overrides));
  if (server.host !== '127.0.0.1' || !server.baseUrl.startsWith('http://127.0.0.1:')) {
    await server.shutdown();
    throw new Error(`PASS 7 refused non-loopback runtime: ${server.baseUrl}`);
  }
  return server;
}

function elapsed(startedAt: number): number { return Math.max(0, Math.round(performance.now() - startedAt)); }
function missingEvidenceCode(): FailureCode { return classifyFailure({ kind: 'evidence', source: 'missing' }); }

async function unhealthyEvidence(): Promise<EvidenceRecord> {
  const server = await start('unhealthy');
  const startedAt = performance.now();
  try {
    const response = await fetch(`${server.baseUrl}/health`);
    const actual = classifyFailure({ kind: 'http', status: response.status, source: 'health' });
    const decision = retryDecision(actual, 0, 1);
    return {
      scenarioId: 'P6-UNHEALTHY', expected: 'HEALTH_CHECK_FAILED', actual,
      passed: response.status === 503 && actual === 'HEALTH_CHECK_FAILED' && decision.retry && decision.nextAttempt === 1,
      durationMs: elapsed(startedAt),
      details: `status=${response.status}; retry=${decision.retry}; nextAttempt=${String(decision.nextAttempt)}`
    };
  } finally { await server.shutdown(); }
}

async function slowEvidence(): Promise<EvidenceRecord> {
  const server = await start('slow', { slowMs: 120 });
  const startedAt = performance.now();
  let timedOut = false;
  try {
    try { await fetch(`${server.baseUrl}/api/items`, { signal: AbortSignal.timeout(30) }); } catch { timedOut = true; }
    const actual = timedOut ? classifyFailure({ kind: 'timeout' }) : missingEvidenceCode();
    const decision = retryDecision(actual, 0, 1);
    return {
      scenarioId: 'P6-SLOW', expected: 'TIMEOUT', actual,
      passed: timedOut && actual === 'TIMEOUT' && decision.retry && decision.nextAttempt === 1,
      durationMs: elapsed(startedAt),
      details: `timeoutBudgetMs=30; timedOut=${timedOut}; retry=${decision.retry}`
    };
  } finally { await server.shutdown(); }
}

async function malformedEvidence(): Promise<EvidenceRecord> {
  const server = await start('malformed-json');
  const startedAt = performance.now();
  try {
    const response = await fetch(`${server.baseUrl}/api/items`);
    const body = await response.text();
    let malformed = false;
    try { JSON.parse(body); } catch { malformed = true; }
    const actual = malformed ? classifyFailure({ kind: 'contract', source: 'response' }) : missingEvidenceCode();
    const decision = retryDecision(actual, 0, 1);
    return {
      scenarioId: 'P6-MALFORMED-JSON', expected: 'RESPONSE_CONTRACT_FAILED', actual,
      passed: response.status === 200 && malformed && actual === 'RESPONSE_CONTRACT_FAILED' && !decision.retry,
      durationMs: elapsed(startedAt),
      details: `status=${response.status}; malformed=${malformed}; retry=${decision.retry}`
    };
  } finally { await server.shutdown(); }
}

async function intermittentEvidence(): Promise<EvidenceRecord> {
  const server = await start('intermittent-500', { intermittentEvery: 2 });
  const startedAt = performance.now();
  try {
    const first = await fetch(`${server.baseUrl}/api/items`);
    const second = await fetch(`${server.baseUrl}/api/items`);
    const actual = second.status >= 500 ? classifyFailure({ kind: 'http', status: second.status, source: 'api' }) : missingEvidenceCode();
    const decision = retryDecision(actual, 0, 1);
    const retry = decision.retry ? await fetch(`${server.baseUrl}/api/items`) : undefined;
    return {
      scenarioId: 'P6-INTERMITTENT-500', expected: 'TRANSIENT_FAILURE', actual,
      passed: first.status === 200 && second.status === 500 && actual === 'TRANSIENT_FAILURE' && decision.retry && decision.nextAttempt === 1 && retry?.status === 200,
      durationMs: elapsed(startedAt),
      details: `statuses=${first.status},${second.status},${String(retry?.status ?? 'not-run')}; retry=${decision.retry}`
    };
  } finally { await server.shutdown(); }
}

async function shutdownEvidence(): Promise<EvidenceRecord> {
  const server = await start('shutdown-delay', { shutdownDelayMs: 120 });
  const startedAt = performance.now();
  const shutdownPromise = server.shutdown();
  const exceededBudget = await Promise.race([
    shutdownPromise.then(() => false),
    new Promise<boolean>((resolvePromise) => { setTimeout(() => resolvePromise(true), 30); })
  ]);
  const actual = exceededBudget ? classifyFailure({ kind: 'lifecycle', source: 'shutdown' }) : missingEvidenceCode();
  const decision = retryDecision(actual, 0, 1);
  await shutdownPromise;
  return {
    scenarioId: 'P6-SHUTDOWN-DELAY', expected: 'SHUTDOWN_TIMEOUT', actual,
    passed: exceededBudget && actual === 'SHUTDOWN_TIMEOUT' && !decision.retry && decision.nextAttempt === null,
    durationMs: elapsed(startedAt),
    details: `budgetMs=30; exceededBudget=${exceededBudget}; retry=${decision.retry}`
  };
}

async function main(): Promise<void> {
  const summary = buildEvidenceSummary([
    await unhealthyEvidence(),
    await slowEvidence(),
    await malformedEvidence(),
    await intermittentEvidence(),
    await shutdownEvidence()
  ]);
  const markdown = renderEvidenceMarkdown(summary);
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(resolve(outputDirectory, 'evidence-summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await writeFile(resolve(outputDirectory, 'evidence-report.md'), markdown, 'utf8');
  console.log(`PASS 7 evidence: ${summary.passed}/${summary.total} scenarios passed`);
  console.log(`PASS 7 JSON: ${resolve(outputDirectory, 'evidence-summary.json')}`);
  console.log(`PASS 7 Markdown: ${resolve(outputDirectory, 'evidence-report.md')}`);
  if (summary.failed !== 0) { throw new Error(`PASS 7 evidence gate failed: ${summary.failed} scenario(s) failed`); }
}

await main();
