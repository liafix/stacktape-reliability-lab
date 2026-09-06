import { test } from '@jest/globals';
import assert from 'node:assert/strict';
import { retryDecision } from '../../packages/qa-core/src/retry-policy.js';

test('retries transient failures within budget', () => {
  assert.deepEqual(retryDecision('TRANSIENT_FAILURE', 0, 2), { retry: true, nextAttempt: 1 });
});

test('does not retry deterministic policy or contract failures', () => {
  assert.deepEqual(retryDecision('SECRET_POLICY_FAILED', 0, 2), { retry: false, nextAttempt: null });
  assert.deepEqual(retryDecision('RESPONSE_CONTRACT_FAILED', 0, 2), { retry: false, nextAttempt: null });
});

test('stops when retry budget is exhausted', () => {
  assert.deepEqual(retryDecision('TIMEOUT', 2, 2), { retry: false, nextAttempt: null });
});


