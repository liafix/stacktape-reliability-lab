import type { FixtureConfig } from './types.ts';

export type FaultDecision =
  | { readonly kind: 'pass' }
  | { readonly kind: 'transient-500' }
  | { readonly kind: 'malformed-json' };

export interface FaultController {
  beforeItemRequest(): Promise<FaultDecision>;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export function createFaultController(
  config: FixtureConfig
): FaultController {
  let itemRequestCount = 0;

  return {
    async beforeItemRequest() {
      itemRequestCount += 1;

      if (config.faultMode === 'slow') {
        await delay(config.slowMs);
      }

      if (config.faultMode === 'malformed-json') {
        return { kind: 'malformed-json' };
      }

      if (
        config.faultMode === 'intermittent-500' &&
        itemRequestCount % config.intermittentEvery === 0
      ) {
        return { kind: 'transient-500' };
      }

      return { kind: 'pass' };
    }
  };
}
