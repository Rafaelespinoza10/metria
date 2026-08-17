import { z } from 'zod';

export const timezoneSchema = z.string().refine(
  (tz) => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Invalid IANA timezone' },
);

export const localeSchema = z.enum(['en', 'es']);

export const updateProfileSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    locale: localeSchema.optional(),
    timezone: timezoneSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

export const permanentDeleteSchema = z.object({
  password: z.string().min(1),
});
