import { test } from '@jest/globals';
import assert from 'node:assert/strict';
import { findSecretViolationsInText } from '../../scripts/secret-check.js';

test('detects likely AWS access key material in executable/config context', () => {
  const violations = findSecretViolationsInText('AWS_ACCESS_KEY_ID=AKIAABCDEFGHIJKLMNOP', 'config');
  assert.equal(violations.length, 1);
  assert.equal(violations[0]?.code, 'SECRET_POLICY_FAILED');
});

test('allows clearly synthetic placeholders', () => {
  const violations = findSecretViolationsInText('AWS_ACCESS_KEY_ID=AKIAEXAMPLE000000000', 'fixture');
  assert.equal(violations.length, 0);
});


