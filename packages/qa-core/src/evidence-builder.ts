import { isEvidenceRecord } from './evidence-schema.ts';
import type { EvidenceRecord, EvidenceSummary } from './types.js';

export function buildEvidenceSummary(records: readonly EvidenceRecord[]): EvidenceSummary {
  for (const record of records) {
    if (!isEvidenceRecord(record)) {
      throw new TypeError(`Invalid evidence record: ${JSON.stringify(record)}`);
    }
  }

  const scenarios = [...records]
    .map((record) => ({ ...record }))
    .sort((left, right) => left.scenarioId.localeCompare(right.scenarioId));

  const passed = scenarios.filter((scenario) => scenario.passed).length;

  return Object.freeze({
    schemaVersion: 1 as const,
    total: scenarios.length,
    passed,
    failed: scenarios.length - passed,
    scenarios: Object.freeze(scenarios)
  });
}


