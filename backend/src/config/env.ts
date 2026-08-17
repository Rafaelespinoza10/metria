import 'dotenv/config';
import { z } from 'zod';

const DEV_JWT_SECRET = 'metria-dev-secret-change-me-in-production-0123456789';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  // Required from Workflow 02 onward; the database module asserts its presence.
  DATABASE_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32).default(DEV_JWT_SECRET),
  JWT_EXPIRES_IN_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(7 * 24 * 60 * 60),
  STORAGE_DIR: z.string().min(1).default('storage'),
  // AI features stay disabled (analyses fail gracefully) when the key is absent.
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1).default('gpt-4o-mini'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  if (parsed.data.NODE_ENV === 'production' && parsed.data.JWT_SECRET === DEV_JWT_SECRET) {
    throw new Error('JWT_SECRET must be set to a real secret in production.');
  }
  return parsed.data;
}

export const env = loadEnv();
