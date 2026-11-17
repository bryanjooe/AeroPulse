import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SESSION_SECRET: z.string().min(32),
  AUTH_EMAIL: z.string().email(),
  AUTH_PASSWORD_HASH: z.string().regex(/^[a-f0-9]{32}:[a-f0-9]{128}$/i),
  APP_ORIGINS: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const missing = parsed.error.issues.map(issue => issue.path.join('.')).join(', ');
  throw new Error(`Backend environment is incomplete or invalid (${missing}). Copy .env.example to .env and configure the required values.`);
}
export const config = parsed.data;
