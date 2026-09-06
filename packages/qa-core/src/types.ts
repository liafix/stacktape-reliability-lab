export const FAILURE_CODES = [
  'HEALTH_CHECK_FAILED',
  'TIMEOUT',
  'RESPONSE_CONTRACT_FAILED',
  'TRANSIENT_FAILURE',
  'CONFIG_CONTRACT_FAILED',
  'SECRET_POLICY_FAILED',
  'SHUTDOWN_TIMEOUT',
  'API_UI_MISMATCH',
  'EVIDENCE_MISSING',
  'CLOUD_MUTATION_BLOCKED'
] as const;

export type FailureCode = (typeof FAILURE_CODES)[number];

export type FailureSignal =
  | { kind: 'http'; status: number; source: 'health' | 'api' }
  | { kind: 'timeout' }
  | { kind: 'contract'; source: 'response' | 'config' | 'api-ui' }
  | { kind: 'policy'; source: 'secret' | 'cloud-mutation' }
  | { kind: 'lifecycle'; source: 'shutdown' }
  | { kind: 'evidence'; source: 'missing' };

export interface EvidenceRecord {
  readonly scenarioId: string;
  readonly expected: FailureCode;
  readonly actual: FailureCode;
  readonly passed: boolean;
  readonly durationMs: number;
  readonly details: string;
}

export interface EvidenceSummary {
  readonly schemaVersion: 1;
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
  readonly scenarios: readonly EvidenceRecord[];
}


