import { test } from '@jest/globals';
import assert from 'node:assert/strict';
import { buildEvidenceSummary } from '../../packages/qa-core/src/evidence-builder.js';

test('builds stable sorted evidence output independent of input order', () => {
  const a = { scenarioId: 'B02', expected: 'TIMEOUT', actual: 'TIMEOUT', passed: true, durationMs: 9, details: 'b' } as const;
  const b = { scenarioId: 'A01', expected: 'HEALTH_CHECK_FAILED', actual: 'HEALTH_CHECK_FAILED', passed: true, durationMs: 4, details: 'a' } as const;
  const first = buildEvidenceSummary([a, b]);
  const second = buildEvidenceSummary([b, a]);
  assert.deepEqual(first, second);
  assert.deepEqual(first.scenarios.map((x) => x.scenarioId), ['A01', 'B02']);
  assert.equal(first.total, 2);
  assert.equal(first.passed, 2);
});


