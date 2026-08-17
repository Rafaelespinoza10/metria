import { z } from 'zod';
import { localeSchema, timezoneSchema } from '../users/users.schema.js';

// bcrypt truncates beyond 72 bytes, so cap the password there.
const passwordSchema = z.string().min(8).max(72);

export const registerSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: passwordSchema,
  name: z.string().min(1).max(100),
  locale: localeSchema.optional(),
  timezone: timezoneSchema.optional(),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().regex(/^[0-9a-f]{64}$/, 'Invalid token format'),
  newPassword: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
