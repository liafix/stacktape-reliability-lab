import type { FailureCode } from './types.js';

export interface RetryDecision {
  readonly retry: boolean;
  readonly nextAttempt: number | null;
}

const RETRYABLE: ReadonlySet<FailureCode> = new Set([
  'TIMEOUT',
  'TRANSIENT_FAILURE',
  'HEALTH_CHECK_FAILED'
]);

export function retryDecision(
  failure: FailureCode,
  currentAttempt: number,
  maxRetries: number
): RetryDecision {
  if (!Number.isInteger(currentAttempt) || currentAttempt < 0) {
    throw new RangeError('currentAttempt must be a non-negative integer');
  }
  if (!Number.isInteger(maxRetries) || maxRetries < 0) {
    throw new RangeError('maxRetries must be a non-negative integer');
  }

  if (!RETRYABLE.has(failure) || currentAttempt >= maxRetries) {
    return { retry: false, nextAttempt: null };
  }

  return { retry: true, nextAttempt: currentAttempt + 1 };
}


