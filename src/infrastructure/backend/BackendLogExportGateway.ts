import { Result } from '@shared/core/Result.js';
import { AppError } from '@shared/core/AppError.js';
import {
  ILogExportGateway,
  LogLoaderEntriesQuery,
  LogProductEntriesQuery,
  UserActivityLogsQuery,
} from '@domain/log-export/ports/ILogExportGateway.js';
import {
  LogExportUnauthorizedError,
  MissingSecretKeyError,
} from '@domain/log-export/errors/LogExportErrors.js';
import { HttpClient } from '../http/HttpClient.js';
import { HttpError } from '../http/HttpError.js';
import { createScopedLogger, ScopedLogger } from '../logging/logger.js';
import { HmacSigner } from './HmacSigner.js';

export interface BackendLogExportGatewayConfig {
  httpClient: HttpClient;
  secretKey?: string;
  useMockBackend?: boolean;
}

export class BackendLogExportGateway implements ILogExportGateway {
  private readonly httpClient: HttpClient;
  private readonly secretKey?: string;
  private readonly useMockBackend: boolean;
  private readonly logger: ScopedLogger;

  constructor(config: BackendLogExportGatewayConfig) {
    this.httpClient = config.httpClient;
    this.secretKey = config.secretKey;
    this.useMockBackend = config.useMockBackend ?? false;
    this.logger = createScopedLogger('BackendLogExportGateway');

    if (this.useMockBackend) {
      this.logger.info('Using in-memory mock backend for Log Export operations.');
    }
  }

  public async exportUserActivityLogs(
    query: UserActivityLogsQuery
  ): Promise<Result<string, AppError>> {
    const fullpath = this.buildFullPath('/api/v1/user_activity_logs', {
      user_id: query.userId,
      email: query.email,
      limit: query.limit,
    });

    if (this.useMockBackend) {
      return Result.ok(this.generateMockUserActivityLogs(query));
    }

    return this.fetchSignedLogs(fullpath);
  }

  public async exportLogLoaderEntries(
    query: LogLoaderEntriesQuery
  ): Promise<Result<string, AppError>> {
    const fullpath = this.buildFullPath('/api/v1/log_loader_entries', {
      user_id: query.userId,
      email: query.email,
      loader_id: query.loaderId,
      limit: query.limit,
    });

    if (this.useMockBackend) {
      return Result.ok(this.generateMockLoaderEntries(query));
    }

    return this.fetchSignedLogs(fullpath);
  }

  public async exportLogProductEntries(
    query: LogProductEntriesQuery
  ): Promise<Result<string, AppError>> {
    const fullpath = this.buildFullPath('/api/v1/log_product_entries', {
      user_id: query.userId,
      email: query.email,
      product_id: query.productId,
      limit: query.limit,
    });

    if (this.useMockBackend) {
      return Result.ok(this.generateMockProductEntries(query));
    }

    return this.fetchSignedLogs(fullpath);
  }

  private async fetchSignedLogs(fullpath: string): Promise<Result<string, AppError>> {
    if (!this.secretKey) {
      this.logger.error('Cannot export logs: LOGS_EXPORT_SECRET_KEY is not configured');
      return Result.fail(new MissingSecretKeyError());
    }

    const headers = HmacSigner.createAuthHeaders(this.secretKey, 'GET', fullpath);

    this.logger.debug({ fullpath }, 'Sending HMAC-authenticated GET request for logs');

    const result = await this.httpClient.get<string>(fullpath, { headers });

    if (result.isFailure) {
      const error = result.getError();
      if (error instanceof HttpError && error.status === 401) {
        this.logger.warn({ fullpath, status: 401 }, 'HMAC authentication rejected by backend');
        return Result.fail(new LogExportUnauthorizedError());
      }
      return Result.fail(error);
    }

    const data = result.getValue();
    return Result.ok(typeof data === 'string' ? data : JSON.stringify(data));
  }

  private buildFullPath(
    basePath: string,
    params: Record<string, string | number | undefined>
  ): string {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    }

    const queryString = searchParams.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  }

  // --- In-memory Mock Generators ---
  private generateMockUserActivityLogs(query: UserActivityLogsQuery): string {
    const count = Math.max(1, Math.min(query.limit ?? 20, 10000));
    const userId = query.userId ?? '550e8400-e29b-41d4-a716-446655440000';
    const emailInfo = query.email ? ` | EMAIL: ${query.email}` : '';
    const lines: string[] = [];

    const actions = ['auth_login', 'token_refresh', 'view_profile', 'export_data', 'auth_logout'];
    for (let i = 0; i < count; i++) {
      const date = new Date(Date.now() - (count - i) * 60000).toISOString();
      const action = actions[i % actions.length];
      lines.push(
        `[${date}] USER: ${userId}${emailInfo} | ACTION: ${action} | STATUS: 200 | IP: 192.168.1.${(10 + i) % 250}`
      );
    }

    return lines.join('\n');
  }

  private generateMockLoaderEntries(query: LogLoaderEntriesQuery): string {
    const count = Math.max(1, Math.min(query.limit ?? 20, 10000));
    const userId = query.userId ?? '550e8400-e29b-41d4-a716-446655440000';
    const loaderId = query.loaderId ?? '7c9e6679-7425-40de-944b-e07fc1f90ae7';
    const emailInfo = query.email ? ` | EMAIL: ${query.email}` : '';
    const lines: string[] = [];

    const events = [
      'Loader startup sequence initiated',
      'Integrity verification passed',
      'Payload downloaded successfully',
      'Injected into target process',
      'Loader session terminated cleanly',
    ];

    for (let i = 0; i < count; i++) {
      const date = new Date(Date.now() - (count - i) * 60000).toISOString();
      const event = events[i % events.length];
      lines.push(
        `[${date}] USER: ${userId}${emailInfo} | LOADER: ${loaderId} | LEVEL: INFO | MSG: ${event}`
      );
    }

    return lines.join('\n');
  }

  private generateMockProductEntries(query: LogProductEntriesQuery): string {
    const count = Math.max(1, Math.min(query.limit ?? 20, 10000));
    const userId = query.userId ?? '550e8400-e29b-41d4-a716-446655440000';
    const productId = query.productId ?? '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
    const emailInfo = query.email ? ` | EMAIL: ${query.email}` : '';
    const lines: string[] = [];

    const events = [
      'License checked: VALID (active subscription)',
      'Product module initialized: version 1.3.0',
      'Heartbeat check received (latency 12ms)',
      'Configuration profile synchronized',
      'Module unhooked gracefully',
    ];

    for (let i = 0; i < count; i++) {
      const date = new Date(Date.now() - (count - i) * 60000).toISOString();
      const event = events[i % events.length];
      lines.push(
        `[${date}] USER: ${userId}${emailInfo} | PRODUCT: ${productId} | LEVEL: INFO | MSG: ${event}`
      );
    }

    return lines.join('\n');
  }
}
