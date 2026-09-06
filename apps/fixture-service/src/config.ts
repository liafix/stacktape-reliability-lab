import { z } from 'zod';
import { FAULT_MODES, type FixtureConfig } from './types.ts';

const fixtureEnvironmentSchema = z.object({
  FIXTURE_HOST: z.enum(['127.0.0.1', '::1']).default('127.0.0.1'),
  FIXTURE_PORT: z.coerce.number().int().min(0).max(65535).default(4317),
  FIXTURE_FAULT_MODE: z.enum(FAULT_MODES).default('none'),
  FIXTURE_SLOW_MS: z.coerce.number().int().min(1).max(5000).default(150),
  FIXTURE_INTERMITTENT_EVERY: z.coerce.number().int().min(2).max(100).default(3),
  FIXTURE_SHUTDOWN_DELAY_MS: z.coerce.number().int().min(0).max(5000).default(200)
});

export function loadFixtureConfig(
  environment: NodeJS.ProcessEnv = process.env
): FixtureConfig {
  const parsed = fixtureEnvironmentSchema.parse(environment);

  return {
    host: parsed.FIXTURE_HOST,
    port: parsed.FIXTURE_PORT,
    faultMode: parsed.FIXTURE_FAULT_MODE,
    slowMs: parsed.FIXTURE_SLOW_MS,
    intermittentEvery: parsed.FIXTURE_INTERMITTENT_EVERY,
    shutdownDelayMs: parsed.FIXTURE_SHUTDOWN_DELAY_MS
  };
}
