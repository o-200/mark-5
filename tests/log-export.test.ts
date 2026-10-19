import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { HmacSigner } from '../src/infrastructure/backend/HmacSigner.js';
import { BackendLogExportGateway } from '../src/infrastructure/backend/BackendLogExportGateway.js';
import { HttpClient } from '../src/infrastructure/http/HttpClient.js';
import { ExportLogsUseCase } from '../src/application/log-export/use-cases/ExportLogsUseCase.js';
import { LogsCommand } from '../src/presentation/discord/commands/logs.command.js';
import {
  LogExportUnauthorizedError,
  MissingSecretKeyError,
} from '../src/domain/log-export/errors/LogExportErrors.js';
import { ValidationError } from '../src/shared/core/AppError.js';
import { PermissionFlagsBits } from 'discord.js';

describe('Log Export - HMAC-SHA256 Signer', () => {
  const secretKey = 'test_secret_key_12345';
  const timestamp = '1729267200';
  const method = 'GET';
  const fullpath = '/api/v1/user_activity_logs?limit=1000&user_id=550e8400-e29b-41d4-a716-446655440000';

  it('should compute exact HMAC-SHA256 hex signature matching reference algorithm', () => {
    const expectedPayload = `${timestamp}\n${method}\n${fullpath}`;
    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(expectedPayload)
      .digest('hex');

    const signature = HmacSigner.sign(secretKey, timestamp, method, fullpath);

    assert.equal(signature, expectedSignature);
    assert.equal(/^[0-9a-f]{64}$/.test(signature), true);
  });

  it('should normalize HTTP method to uppercase', () => {
    const sig1 = HmacSigner.sign(secretKey, timestamp, 'get', fullpath);
    const sig2 = HmacSigner.sign(secretKey, timestamp, 'GET', fullpath);
    assert.equal(sig1, sig2);
  });

  it('should generate headers containing X-Timestamp, X-Signature, and Accept: text/plain', () => {
    const headers = HmacSigner.createAuthHeaders(secretKey, 'GET', fullpath, timestamp);

    assert.equal(headers['X-Timestamp'], timestamp);
    assert.equal(headers['Accept'], 'text/plain');
    assert.equal(/^[0-9a-f]{64}$/.test(headers['X-Signature']), true);
  });
});

describe('Log Export - Backend Gateway (Mock & Offline Mode)', () => {
  const httpClient = new HttpClient({ baseUrl: 'http://localhost:3000' });
  const mockGateway = new BackendLogExportGateway({
    httpClient,
    useMockBackend: true,
  });

  it('should export mock user activity logs matching query limit', async () => {
    const result = await mockGateway.exportUserActivityLogs({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      email: 'pilot@example.com',
      limit: 3,
    });

    assert.equal(result.isSuccess, true);
    const text = result.getValue();
    const lines = text.split('\n');
    assert.equal(lines.length, 3);
    assert.ok(text.includes('550e8400-e29b-41d4-a716-446655440000'));
    assert.ok(text.includes('EMAIL: pilot@example.com'));
    assert.ok(text.includes('ACTION:'));
  });

  it('should export mock log loader entries', async () => {
    const result = await mockGateway.exportLogLoaderEntries({
      loaderId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      email: 'loader_operator@example.com',
      limit: 2,
    });

    assert.equal(result.isSuccess, true);
    const text = result.getValue();
    const lines = text.split('\n');
    assert.equal(lines.length, 2);
    assert.ok(text.includes('7c9e6679-7425-40de-944b-e07fc1f90ae7'));
    assert.ok(text.includes('EMAIL: loader_operator@example.com'));
    assert.ok(text.includes('LOADER:'));
  });

  it('should export mock log product entries', async () => {
    const result = await mockGateway.exportLogProductEntries({
      productId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      email: 'client@example.com',
      limit: 4,
    });

    assert.equal(result.isSuccess, true);
    const text = result.getValue();
    const lines = text.split('\n');
    assert.equal(lines.length, 4);
    assert.ok(text.includes('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'));
    assert.ok(text.includes('EMAIL: client@example.com'));
    assert.ok(text.includes('PRODUCT:'));
  });

  it('should return MissingSecretKeyError if secretKey is missing when real backend mode is active', async () => {
    const realGatewayWithoutKey = new BackendLogExportGateway({
      httpClient,
      useMockBackend: false,
    });

    const result = await realGatewayWithoutKey.exportUserActivityLogs({});
    assert.equal(result.isFailure, true);
    assert.ok(result.getError() instanceof MissingSecretKeyError);
  });
});

describe('Log Export - Application Use Case', () => {
  const httpClient = new HttpClient({ baseUrl: 'http://localhost:3000' });
  const mockGateway = new BackendLogExportGateway({
    httpClient,
    useMockBackend: true,
  });
  const useCase = new ExportLogsUseCase(mockGateway);

  it('should export user activity logs with valid UUID and return DTO metadata', async () => {
    const result = await useCase.execute({
      type: 'user_activity',
      userId: '550e8400-e29b-41d4-a716-446655440000',
      email: 'pilot@example.com',
      limit: 5,
    });

    assert.equal(result.isSuccess, true);
    const dto = result.getValue();
    assert.equal(dto.type, 'user_activity');
    assert.ok(dto.filename.startsWith('user_activity_logs_simple_'));
    assert.ok(dto.filename.endsWith('.txt'));
    assert.equal(dto.lineCount, 5);
    assert.ok(dto.sizeBytes > 0);
    assert.equal(dto.filters.user_id, '550e8400-e29b-41d4-a716-446655440000');
    assert.equal(dto.filters.email, 'pilot@example.com');
  });

  it('should reject invalid UUID format with ValidationError', async () => {
    const result = await useCase.execute({
      type: 'user_activity',
      userId: 'not-a-valid-uuid',
    });

    assert.equal(result.isFailure, true);
    assert.ok(result.getError() instanceof ValidationError);
  });

  it('should reject invalid email format with ValidationError', async () => {
    const result = await useCase.execute({
      type: 'user_activity',
      email: 'not-an-email',
    });

    assert.equal(result.isFailure, true);
    assert.ok(result.getError() instanceof ValidationError);
  });

  it('should reject limit exceeding maximum allowable boundary (10000)', async () => {
    const result = await useCase.execute({
      type: 'loader',
      limit: 20000,
    });

    assert.equal(result.isFailure, true);
    assert.ok(result.getError() instanceof ValidationError);
  });

  it('should reject limit below minimum allowable boundary (1)', async () => {
    const result = await useCase.execute({
      type: 'product',
      limit: 0,
    });

    assert.equal(result.isFailure, true);
    assert.ok(result.getError() instanceof ValidationError);
  });
});

describe('Log Export - Discord Command Admin Authorization', () => {
  const httpClient = new HttpClient({ baseUrl: 'http://localhost:3000' });
  const mockGateway = new BackendLogExportGateway({
    httpClient,
    useMockBackend: true,
  });
  const useCase = new ExportLogsUseCase(mockGateway);

  const adminIds = ['346558198368567297', '111222333444555666'];
  const logsCommand = new LogsCommand(useCase, adminIds);

  it('should reject non-admin users with ephemeral access denied embed', async () => {
    let repliedPayload: any = null;

    const mockInteraction: any = {
      user: { id: '999888777666555444', tag: 'Unauthorized#0001' },
      reply: async (payload: any) => {
        repliedPayload = payload;
      },
      deferReply: async () => {},
      options: {
        getSubcommand: () => 'user-activity',
        getString: () => null,
        getInteger: () => null,
      },
    };

    await logsCommand.execute(mockInteraction);

    assert.ok(repliedPayload);
    assert.equal(repliedPayload.ephemeral, true);
    assert.ok(repliedPayload.embeds);
    assert.equal(repliedPayload.embeds[0].data.title, '⛔ Access Denied');
  });

  it('should allow authorized admin users and send exported file attachment', async () => {
    let deferred = false;
    let deferredEphemeral = false;
    let editedReplyPayload: any = null;

    const mockAdminInteraction: any = {
      user: { id: '346558198368567297', tag: 'Admin#0001' },
      reply: async () => {},
      deferReply: async (opts?: any) => {
        deferred = true;
        deferredEphemeral = opts?.ephemeral ?? false;
      },
      options: {
        getSubcommand: () => 'user-activity',
        getString: (name: string) => {
          if (name === 'user_id') return '550e8400-e29b-41d4-a716-446655440000';
          if (name === 'email') return 'admin_test@example.com';
          return null;
        },
        getInteger: (name: string) => (name === 'limit' ? 3 : null),
      },
      editReply: async (payload: any) => {
        editedReplyPayload = payload;
      },
    };

    await logsCommand.execute(mockAdminInteraction);

    assert.equal(deferred, true);
    assert.equal(deferredEphemeral, false, 'Exported logs reply must be public (not ephemeral)');
    assert.equal(
      logsCommand.data.default_member_permissions,
      PermissionFlagsBits.Administrator.toString()
    );
    assert.ok(editedReplyPayload);
    assert.ok(editedReplyPayload.embeds);
    const filterField = editedReplyPayload.embeds[0].data.fields.find(
      (f: any) => f.name === 'Applied Filters'
    );
    assert.ok(filterField);
    assert.ok(filterField.value.includes('admin_test@example.com'));
    assert.ok(editedReplyPayload.files);
    assert.equal(editedReplyPayload.files.length, 1);
    assert.ok(editedReplyPayload.files[0].attachment);
    assert.ok(editedReplyPayload.files[0].name.startsWith('user_activity_logs_simple_'));
  });

  it('should allow secondary admin user from multiple comma-separated IDs', async () => {
    let deferred = false;
    const secondaryAdminInteraction: any = {
      user: { id: '111222333444555666', tag: 'SecondAdmin#0002' },
      reply: async () => {},
      deferReply: async () => {
        deferred = true;
      },
      options: {
        getSubcommand: () => 'loader',
        getString: () => null,
        getInteger: () => 5,
      },
      editReply: async () => {},
    };

    await logsCommand.execute(secondaryAdminInteraction);
    assert.equal(deferred, true);
  });
});
