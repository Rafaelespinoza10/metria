import { z } from 'zod';

const FUTURE_SKEW_MS = 5 * 60 * 1000;
const MAX_SLEEP_MS = 24 * 60 * 60 * 1000;

const instantSchema = z.string().datetime({ offset: true });

function validateWindow(
  data: { bedtime?: string | undefined; wakeTime?: string | undefined },
  ctx: z.RefinementCtx,
) {
  if (!data.bedtime || !data.wakeTime) return;
  const bed = new Date(data.bedtime).getTime();
  const wake = new Date(data.wakeTime).getTime();
  if (wake <= bed) {
    ctx.addIssue({ code: 'custom', message: 'wakeTime must be after bedtime', path: ['wakeTime'] });
  }
  if (wake - bed > MAX_SLEEP_MS) {
    ctx.addIssue({ code: 'custom', message: 'Sleep cannot exceed 24 hours', path: ['wakeTime'] });
  }
  if (wake > Date.now() + FUTURE_SKEW_MS) {
    ctx.addIssue({
      code: 'custom',
      message: 'wakeTime cannot be in the future',
      path: ['wakeTime'],
    });
  }
}

export const createSleepSchema = z
  .object({
    bedtime: instantSchema,
    wakeTime: instantSchema,
    quality: z.number().int().min(1).max(5).optional(),
    notes: z.string().max(500).optional(),
  })
  .superRefine(validateWindow);

export const updateSleepSchema = z
  .object({
    bedtime: instantSchema.optional(),
    wakeTime: instantSchema.optional(),
    quality: z.number().int().min(1).max(5).nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' })
  .refine((data) => (data.bedtime === undefined) === (data.wakeTime === undefined), {
    message: 'bedtime and wakeTime must be updated together',
  })
  .superRefine(validateWindow);

export const sleepRangeQuerySchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

export const putSleepTargetSchema = z.object({
  sleepMinutes: z.number().int().min(60).max(960),
});

export type CreateSleepInput = z.infer<typeof createSleepSchema>;
export type UpdateSleepInput = z.infer<typeof updateSleepSchema>;
