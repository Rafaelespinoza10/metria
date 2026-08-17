import { z } from 'zod';

const dateSchema = z
  .string()
  .date()
  .refine((value) => value <= new Date().toISOString().slice(0, 10), {
    message: 'date cannot be in the future',
  });

export const activityDateParamSchema = z.object({ date: dateSchema });

export const putActivityEntrySchema = z.object({
  steps: z.number().int().min(0).max(200000).optional(),
  activeMinutes: z.number().int().min(0).max(1440).optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const activityRangeQuerySchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
});

export const putActivityTargetsSchema = z
  .object({
    steps: z.number().int().min(1).max(200000).optional(),
    activeMinutes: z.number().int().min(1).max(1440).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No targets provided' });

export type PutActivityEntryInput = z.infer<typeof putActivityEntrySchema>;
export type PutActivityTargetsInput = z.infer<typeof putActivityTargetsSchema>;
