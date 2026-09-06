export const FAULT_MODES = [
  'none',
  'unhealthy',
  'slow',
  'malformed-json',
  'intermittent-500',
  'shutdown-delay'
] as const;

export type FaultMode = (typeof FAULT_MODES)[number];

export interface FixtureConfig {
  readonly host: '127.0.0.1' | '::1';
  readonly port: number;
  readonly faultMode: FaultMode;
  readonly slowMs: number;
  readonly intermittentEvery: number;
  readonly shutdownDelayMs: number;
}

export interface FixtureItem {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly createdAt: string;
}

export interface CreateFixtureItemInput {
  readonly name: string;
  readonly description: string | null;
}
