import { test } from '@jest/globals';
import assert from 'node:assert/strict';
import { buildEvidenceSummary } from '../../packages/qa-core/src/evidence-builder.js';
import { renderEvidenceMarkdown } from '../../packages/qa-core/src/evidence-report.js';

test('renders stable sorted PASS 7 Markdown evidence from an evidence summary', () => {
  const summary = buildEvidenceSummary([
    { scenarioId: 'B02', expected: 'TIMEOUT', actual: 'TIMEOUT', passed: true, durationMs: 9, details: 'retry=true' },
    { scenarioId: 'A01', expected: 'HEALTH_CHECK_FAILED', actual: 'HEALTH_CHECK_FAILED', passed: true, durationMs: 4, details: 'status=503' }
  ]);
  const report = renderEvidenceMarkdown(summary);
  assert.match(report, /Status: \*\*GREEN\*\*/);
  assert.match(report, /Scenarios: 2/);
  assert.ok(report.indexOf('| A01 |') < report.indexOf('| B02 |'));
  assert.match(report, /PASS 8 Evidence UI and Vercel deployment are not part of PASS 7/);
});
