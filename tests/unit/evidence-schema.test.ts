import { test } from '@jest/globals';
import assert from 'node:assert/strict';
import { isEvidenceRecord } from '../../packages/qa-core/src/evidence-schema.js';

test('accepts a complete evidence record', () => {
  assert.equal(isEvidenceRecord({
    scenarioId: 'U01',
    expected: 'TIMEOUT',
    actual: 'TIMEOUT',
    passed: true,
    durationMs: 12,
    details: 'synthetic timeout'
  }), true);
});

test('rejects malformed evidence', () => {
  assert.equal(isEvidenceRecord({ scenarioId: 'U01', passed: 'yes' }), false);
});


