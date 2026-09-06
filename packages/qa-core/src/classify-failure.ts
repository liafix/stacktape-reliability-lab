import type { FailureCode, FailureSignal } from './types.js';

export function classifyFailure(signal: FailureSignal): FailureCode {
  switch (signal.kind) {
    case 'timeout':
      return 'TIMEOUT';
    case 'http':
      if (signal.source === 'health' && signal.status >= 500) {
        return 'HEALTH_CHECK_FAILED';
      }
      return signal.status >= 500 ? 'TRANSIENT_FAILURE' : 'RESPONSE_CONTRACT_FAILED';
    case 'contract':
      if (signal.source === 'config') {
        return 'CONFIG_CONTRACT_FAILED';
      }
      return signal.source === 'api-ui' ? 'API_UI_MISMATCH' : 'RESPONSE_CONTRACT_FAILED';
    case 'policy':
      return signal.source === 'secret' ? 'SECRET_POLICY_FAILED' : 'CLOUD_MUTATION_BLOCKED';
    case 'lifecycle':
      return 'SHUTDOWN_TIMEOUT';
    case 'evidence':
      return 'EVIDENCE_MISSING';
  }
}


