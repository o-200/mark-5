import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env file into process.env
dotenv.config();

export const EnvSchema = z.object({
  // Runtime Environment
  NODE_ENV: z.enum(['development', 'production', 'test'], {
    errorMap: () => ({
      message: 'NODE_ENV is required and must be "development", "production", or "test"',
    }),
  }),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'], {
    errorMap: () => ({
      message:
        'LOG_LEVEL is required and must be "fatal", "error", "warn", "info", "debug", or "trace"',
    }),
  }),

  // Discord Credentials
  DISCORD_TOKEN: z
    .string({ required_error: 'DISCORD_TOKEN is required in .env' })
    .min(1, 'DISCORD_TOKEN cannot be empty'),
  DISCORD_CLIENT_ID: z
    .string({ required_error: 'DISCORD_CLIENT_ID is required in .env' })
    .min(1, 'DISCORD_CLIENT_ID cannot be empty'),
  DISCORD_GUILD_ID: z
    .string({ required_error: 'DISCORD_GUILD_ID is required in .env' })
    .min(1, 'DISCORD_GUILD_ID cannot be empty'),

  // Admin Access Configuration
  DISCORD_ADMIN_IDS: z
    .string({ required_error: 'DISCORD_ADMIN_IDS is required in .env' })
    .min(1, 'DISCORD_ADMIN_IDS cannot be empty')
    .transform((val) =>
      val
        .replace(/['"]/g, '')
        .split(/[,;\s]+/)
        .map((id) => id.trim())
        .filter((id) => id.length > 0)
    )
    .refine((ids) => ids.length > 0, {
      message: 'DISCORD_ADMIN_IDS must contain at least one valid Discord ID',
    }),

  // Backend API Configuration
  BACKEND_API_URL: z
    .string({ required_error: 'BACKEND_API_URL is required in .env' })
    .min(1, 'BACKEND_API_URL cannot be empty')
    .url('BACKEND_API_URL must be a valid URL'),
  LOGS_EXPORT_SECRET_KEY: z
    .string({ required_error: 'LOGS_EXPORT_SECRET_KEY is required in .env' })
    .min(1, 'LOGS_EXPORT_SECRET_KEY cannot be empty'),
  BACKEND_TIMEOUT_MS: z
    .string({ required_error: 'BACKEND_TIMEOUT_MS is required in .env' })
    .min(1, 'BACKEND_TIMEOUT_MS cannot be empty')
    .pipe(
      z.coerce.number().int().positive('BACKEND_TIMEOUT_MS must be a positive integer')
    ),

  // Feature Flag: Mock Backend
  USE_MOCK_BACKEND: z
    .string({ required_error: 'USE_MOCK_BACKEND is required in .env' })
    .min(1, 'USE_MOCK_BACKEND cannot be empty')
    .refine((val) => ['true', 'false', '1', '0'].includes(val.toLowerCase()), {
      message: 'USE_MOCK_BACKEND is required and must be either "true" or "false"',
    })
    .transform((val) => val.toLowerCase() === 'true' || val === '1'),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

let cachedEnv: EnvConfig | null = null;

export function resetEnvCache(): void {
  cachedEnv = null;
}

export function getEnv(): EnvConfig {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parseResult = EnvSchema.safeParse(process.env);

  if (!parseResult.success) {
    console.error('❌ Invalid or missing environment variables:');
    const formatted = parseResult.error.format();
    for (const [key, value] of Object.entries(formatted)) {
      if (key !== '_errors' && value && '_errors' in value) {
        console.error(`  - ${key}: ${value._errors.join(', ')}`);
      }
    }
    throw new Error('Environment configuration validation failed. All parameters must be filled in.');
  }

  cachedEnv = parseResult.data;
  return cachedEnv;
}
