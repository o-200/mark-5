import { Result } from '@shared/core/Result.js';
import { AppError } from '@shared/core/AppError.js';

export interface UserActivityLogsQuery {
  userId?: string;
  email?: string;
  limit?: number;
}

export interface LogLoaderEntriesQuery {
  userId?: string;
  email?: string;
  loaderId?: string;
  limit?: number;
}

export interface LogProductEntriesQuery {
  userId?: string;
  email?: string;
  productId?: string;
  limit?: number;
}

export interface ILogExportGateway {
  /**
   * Export user activity logs as streamed plain text.
   */
  exportUserActivityLogs(query: UserActivityLogsQuery): Promise<Result<string, AppError>>;

  /**
   * Export log loader entries as streamed plain text.
   */
  exportLogLoaderEntries(query: LogLoaderEntriesQuery): Promise<Result<string, AppError>>;

  /**
   * Export log product entries as streamed plain text.
   */
  exportLogProductEntries(query: LogProductEntriesQuery): Promise<Result<string, AppError>>;
}
