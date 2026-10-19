import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EnvSchema } from '../src/infrastructure/config/env.js';

describe('Infrastructure Configuration - Strict Environment Validation', () => {
  const completeValidEnv = {
    NODE_ENV: 'development',
    LOG_LEVEL: 'debug',
    DISCORD_TOKEN: 'token_123456789',
    DISCORD_CLIENT_ID: '123456789012345678',
    DISCORD_GUILD_ID: '987654321098765432',
    DISCORD_ADMIN_IDS: '346558198368567297, 111222333444555666',
    BACKEND_API_URL: 'https://api.example.com',
    LOGS_EXPORT_SECRET_KEY: 'secret_key_hex_value',
    BACKEND_TIMEOUT_MS: '5000',
    USE_MOCK_BACKEND: 'false',
  };

  it('should successfully parse when all parameters are provided and valid', () => {
    const result = EnvSchema.safeParse(completeValidEnv);
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.NODE_ENV, 'development');
      assert.equal(result.data.LOG_LEVEL, 'debug');
      assert.equal(result.data.DISCORD_TOKEN, 'token_123456789');
      assert.equal(result.data.DISCORD_CLIENT_ID, '123456789012345678');
      assert.equal(result.data.DISCORD_GUILD_ID, '987654321098765432');
      assert.deepEqual(result.data.DISCORD_ADMIN_IDS, ['346558198368567297', '111222333444555666']);
      assert.equal(result.data.BACKEND_API_URL, 'https://api.example.com');
      assert.equal(result.data.LOGS_EXPORT_SECRET_KEY, 'secret_key_hex_value');
      assert.equal(result.data.BACKEND_TIMEOUT_MS, 5000);
      assert.equal(result.data.USE_MOCK_BACKEND, false);
    }
  });

  const requiredFields = [
    'NODE_ENV',
    'LOG_LEVEL',
    'DISCORD_TOKEN',
    'DISCORD_CLIENT_ID',
    'DISCORD_GUILD_ID',
    'DISCORD_ADMIN_IDS',
    'BACKEND_API_URL',
    'LOGS_EXPORT_SECRET_KEY',
    'BACKEND_TIMEOUT_MS',
    'USE_MOCK_BACKEND',
  ] as const;

  for (const field of requiredFields) {
    it(`should reject configuration when '${field}' is missing`, () => {
      const copy: Record<string, string> = { ...completeValidEnv };
      delete copy[field];

      const result = EnvSchema.safeParse(copy);
      assert.equal(result.success, false);
      if (!result.success) {
        const formatted = result.error.format();
        assert.ok(field in formatted, `Expected error on field '${field}'`);
      }
    });

    it(`should reject configuration when '${field}' is empty`, () => {
      const copy: Record<string, string> = { ...completeValidEnv, [field]: '' };

      const result = EnvSchema.safeParse(copy);
      assert.equal(result.success, false);
    });
  }

  it('should reject invalid URL format for BACKEND_API_URL', () => {
    const invalid = { ...completeValidEnv, BACKEND_API_URL: 'not-a-valid-url' };
    const result = EnvSchema.safeParse(invalid);
    assert.equal(result.success, false);
  });

  it('should reject non-positive integer for BACKEND_TIMEOUT_MS', () => {
    const invalid = { ...completeValidEnv, BACKEND_TIMEOUT_MS: '-10' };
    const result = EnvSchema.safeParse(invalid);
    assert.equal(result.success, false);
  });

  it('should reject invalid USE_MOCK_BACKEND value', () => {
    const invalid = { ...completeValidEnv, USE_MOCK_BACKEND: 'maybe' };
    const result = EnvSchema.safeParse(invalid);
    assert.equal(result.success, false);
  });

  it('should parse multiple comma-separated DISCORD_ADMIN_IDS with mixed spaces and quotes', () => {
    const envWithMultipleAdmins = {
      ...completeValidEnv,
      DISCORD_ADMIN_IDS: '346558198368567297, 329669635387555840,   408647345748705290  ',
    };
    const result = EnvSchema.safeParse(envWithMultipleAdmins);
    assert.equal(result.success, true);
    if (result.success) {
      assert.deepEqual(result.data.DISCORD_ADMIN_IDS, [
        '346558198368567297',
        '329669635387555840',
        '408647345748705290',
      ]);
    }
  });

  it('should parse quoted comma-separated DISCORD_ADMIN_IDS', () => {
    const envWithQuotes = {
      ...completeValidEnv,
      DISCORD_ADMIN_IDS: '"346558198368567297", "329669635387555840"',
    };
    const result = EnvSchema.safeParse(envWithQuotes);
    assert.equal(result.success, true);
    if (result.success) {
      assert.deepEqual(result.data.DISCORD_ADMIN_IDS, [
        '346558198368567297',
        '329669635387555840',
      ]);
    }
  });

  it('should reject DISCORD_ADMIN_IDS when containing only spaces or commas', () => {
    const invalid = { ...completeValidEnv, DISCORD_ADMIN_IDS: '  ,  ,  ' };
    const result = EnvSchema.safeParse(invalid);
    assert.equal(result.success, false);
  });
});
