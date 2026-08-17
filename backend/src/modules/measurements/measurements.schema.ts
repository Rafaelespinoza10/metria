import { z } from 'zod';

const FUTURE_SKEW_MS = 5 * 60 * 1000;

const measuredAtSchema = z
  .string()
  .datetime({ offset: true })
  .refine((value) => new Date(value).getTime() <= Date.now() + FUTURE_SKEW_MS, {
    message: 'measuredAt cannot be in the future',
  });

// kg / cm / % sanity bound.
const measurementValueSchema = z.number().positive().lt(1000);

export const createMeasurementSchema = z.object({
  typeId: z.string().uuid(),
  value: measurementValueSchema,
  measuredAt: measuredAtSchema,
  notes: z.string().max(500).optional(),
});

export const updateMeasurementSchema = z
  .object({
    value: measurementValueSchema.optional(),
    measuredAt: measuredAtSchema.optional(),
    notes: z.string().max(500).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

export const listMeasurementsQuerySchema = z.object({
  typeId: z.string().uuid().optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

export const createPhotoBodySchema = z.object({
  takenAt: z
    .string()
    .datetime({ offset: true })
    .refine((value) => new Date(value).getTime() <= Date.now() + FUTURE_SKEW_MS, {
      message: 'takenAt cannot be in the future',
    })
    .optional(),
  notes: z.string().max(500).optional(),
});

export type CreateMeasurementInput = z.infer<typeof createMeasurementSchema>;
export type UpdateMeasurementInput = z.infer<typeof updateMeasurementSchema>;
export type ListMeasurementsQuery = z.infer<typeof listMeasurementsQuerySchema>;
