import type { EvidenceSummary } from './types.js';

function escapeCell(value: string): string {
  return value.replaceAll('|', '\\|').replace(/\r?\n/g, ' ');
}

export function renderEvidenceMarkdown(summary: EvidenceSummary): string {
  const status = summary.failed === 0 ? 'GREEN' : 'RED';
  const lines = [
    '# Stacktape Reliability Lab - PASS 7 CI Evidence Report',
    '',
    `Status: **${status}**`,
    '',
    `Schema version: ${summary.schemaVersion}`,
    `Scenarios: ${summary.total}`,
    `Passed: ${summary.passed}`,
    `Failed: ${summary.failed}`,
    '',
    '| Scenario | Expected | Actual | Result | Duration | Details |',
    '| --- | --- | --- | --- | ---: | --- |'
  ];

  for (const scenario of summary.scenarios) {
    lines.push(
      `| ${escapeCell(scenario.scenarioId)} | ${scenario.expected} | ${scenario.actual} | ${scenario.passed ? 'PASS' : 'FAIL'} | ${Math.round(scenario.durationMs)} ms | ${escapeCell(scenario.details)} |`
    );
  }

  lines.push(
    '',
    '## Safety boundary',
    '',
    '- Candidate-owned synthetic data only',
    '- Runtime targets are loopback-only (`127.0.0.1`)',
    '- No AWS credentials',
    '- No Stacktape credentials',
    '- No production endpoints or customer data',
    '- No cloud mutation or deployment commands',
    '',
    'This report is CI evidence only. PASS 8 Evidence UI and Vercel deployment are not part of PASS 7.',
    ''
  );

  return lines.join('\n');
}
