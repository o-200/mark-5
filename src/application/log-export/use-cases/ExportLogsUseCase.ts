import { IUseCase } from '@application/common/UseCase.js';
import { Result } from '@shared/core/Result.js';
import { AppError, ValidationError } from '@shared/core/AppError.js';
import { ILogExportGateway } from '@domain/log-export/ports/ILogExportGateway.js';
import {
  ExportLogsDTO,
  ExportLogsInput,
  ExportLogsInputSchema,
} from '../dtos/ExportLogsDTO.js';

export class ExportLogsUseCase
  implements IUseCase<ExportLogsInput, Result<ExportLogsDTO, AppError>>
{
  constructor(private readonly logExportGateway: ILogExportGateway) {}

  public async execute(input: ExportLogsInput): Promise<Result<ExportLogsDTO, AppError>> {
    const parseResult = ExportLogsInputSchema.safeParse(input);
    if (!parseResult.success) {
      return Result.fail(
        new ValidationError('Invalid log export parameters', parseResult.error.format())
      );
    }

    const data = parseResult.data;
    let exportResult: Result<string, AppError>;
    let filePrefix: string;
    const filters: Record<string, string | number | undefined> = {};

    switch (data.type) {
      case 'user_activity':
        filePrefix = 'user_activity_logs_simple';
        filters.user_id = data.userId;
        filters.email = data.email;
        filters.limit = data.limit ?? 1000;
        exportResult = await this.logExportGateway.exportUserActivityLogs({
          userId: data.userId,
          email: data.email,
          limit: data.limit,
        });
        break;

      case 'loader':
        filePrefix = 'log_loader_entries_simple';
        filters.user_id = data.userId;
        filters.email = data.email;
        filters.loader_id = data.loaderId;
        filters.limit = data.limit ?? 1000;
        exportResult = await this.logExportGateway.exportLogLoaderEntries({
          userId: data.userId,
          email: data.email,
          loaderId: data.loaderId,
          limit: data.limit,
        });
        break;

      case 'product':
        filePrefix = 'log_product_entries_simple';
        filters.user_id = data.userId;
        filters.email = data.email;
        filters.product_id = data.productId;
        filters.limit = data.limit ?? 1000;
        exportResult = await this.logExportGateway.exportLogProductEntries({
          userId: data.userId,
          email: data.email,
          productId: data.productId,
          limit: data.limit,
        });
        break;
    }

    if (exportResult.isFailure) {
      return Result.fail(exportResult.getError());
    }

    const content = exportResult.getValue();
    const timestampStr = this.formatTimestamp(new Date());
    const filename = `${filePrefix}_${timestampStr}.txt`;
    const lineCount = content ? content.trim().split('\n').filter(Boolean).length : 0;
    const sizeBytes = Buffer.byteLength(content, 'utf-8');

    return Result.ok({
      type: data.type,
      filename,
      content,
      lineCount,
      sizeBytes,
      filters,
    });
  }

  private formatTimestamp(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const y = date.getUTCFullYear();
    const m = pad(date.getUTCMonth() + 1);
    const d = pad(date.getUTCDate());
    const h = pad(date.getUTCHours());
    const min = pad(date.getUTCMinutes());
    const s = pad(date.getUTCSeconds());
    return `${y}${m}${d}_${h}${min}${s}`;
  }
}
