import { FAILURE_CODES, type EvidenceRecord, type FailureCode } from './types.ts';

function isFailureCode(value: unknown): value is FailureCode {
  return typeof value === 'string' && (FAILURE_CODES as readonly string[]).includes(value);
}

export function isEvidenceRecord(value: unknown): value is EvidenceRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.scenarioId === 'string' &&
    record.scenarioId.length > 0 &&
    isFailureCode(record.expected) &&
    isFailureCode(record.actual) &&
    typeof record.passed === 'boolean' &&
    typeof record.durationMs === 'number' &&
    Number.isFinite(record.durationMs) &&
    record.durationMs >= 0 &&
    typeof record.details === 'string'
  );
}


