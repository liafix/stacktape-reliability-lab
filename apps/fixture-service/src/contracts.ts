import { z } from 'zod';
import { FAULT_MODES } from './types.ts';

const isoDateTimeSchema = z.string().refine(
  (value) => !Number.isNaN(Date.parse(value)),
  'Expected an ISO-compatible date-time string.'
);

export const createItemInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(500).nullable().optional().default(null)
}).strict();

export const fixtureItemSchema = z.object({
  id: z.string().regex(/^item-\d+$/),
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(500).nullable(),
  createdAt: isoDateTimeSchema
}).strict();

export const itemListResponseSchema = z.object({
  items: z.array(fixtureItemSchema)
}).strict();

export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'unhealthy']),
  synthetic: z.literal(true)
}).strict();

export const runtimeResponseSchema = z.object({
  service: z.literal('stacktape-reliability-fixture'),
  environment: z.literal('synthetic-local'),
  faultMode: z.enum(FAULT_MODES),
  nodeVersion: z.string().regex(/^v\d+\.\d+\.\d+$/),
  uptimeSeconds: z.number().int().nonnegative()
}).strict();

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.enum([
      'TRANSIENT_FAILURE',
      'ITEM_NOT_FOUND',
      'INVALID_REQUEST',
      'ROUTE_NOT_FOUND'
    ]),
    message: z.string().min(1)
  }).strict()
}).strict();
