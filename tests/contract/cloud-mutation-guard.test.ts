import { test } from '@jest/globals';
import assert from 'node:assert/strict';
import { findCloudMutationViolationsInText } from '../../scripts/cloud-mutation-check.js';

test('detects executable cloud mutation commands', () => {
  const violations = findCloudMutationViolationsInText('npm test && stacktape deploy --stage test', 'script');
  assert.equal(violations.length, 1);
  assert.equal(violations[0]?.code, 'CLOUD_MUTATION_BLOCKED');
});

test('does not flag documentation-only examples', () => {
  const violations = findCloudMutationViolationsInText('Example only: stacktape deploy --stage demo', 'documentation');
  assert.equal(violations.length, 0);
});


