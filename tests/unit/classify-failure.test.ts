import { test } from '@jest/globals';
import assert from 'node:assert/strict';
import { classifyFailure } from '../../packages/qa-core/src/classify-failure.js';

test('classifies health check failures deterministically', () => {
  assert.equal(classifyFailure({ kind: 'http', status: 503, source: 'health' }), 'HEALTH_CHECK_FAILED');
});

test('classifies timeout and transient server failures', () => {
  assert.equal(classifyFailure({ kind: 'timeout' }), 'TIMEOUT');
  assert.equal(classifyFailure({ kind: 'http', status: 500, source: 'api' }), 'TRANSIENT_FAILURE');
});

test('classifies malformed response contracts', () => {
  assert.equal(classifyFailure({ kind: 'contract', source: 'response' }), 'RESPONSE_CONTRACT_FAILED');
});


