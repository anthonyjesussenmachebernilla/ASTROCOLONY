import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  NASA_API_KEY: z.string().min(1).default('DEMO_KEY'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export function getServerEnv() {
  return envSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    NASA_API_KEY: process.env.NASA_API_KEY ?? 'DEMO_KEY',
    NODE_ENV: process.env.NODE_ENV ?? 'development',
  });
}
