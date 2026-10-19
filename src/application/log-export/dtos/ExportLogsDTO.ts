import { z } from 'zod';

export const ExportUserActivityLogsInputSchema = z.object({
  type: z.literal('user_activity'),
  userId: z.string().uuid('user_id must be a valid UUID').optional(),
  email: z.string().email('Invalid email address format').optional(),
  limit: z.number().int().min(1).max(10000).default(1000).optional(),
});

export const ExportLogLoaderEntriesInputSchema = z.object({
  type: z.literal('loader'),
  userId: z.string().uuid('user_id must be a valid UUID').optional(),
  email: z.string().email('Invalid email address format').optional(),
  loaderId: z.string().uuid('loader_id must be a valid UUID').optional(),
  limit: z.number().int().min(1).max(10000).default(1000).optional(),
});

export const ExportLogProductEntriesInputSchema = z.object({
  type: z.literal('product'),
  userId: z.string().uuid('user_id must be a valid UUID').optional(),
  email: z.string().email('Invalid email address format').optional(),
  productId: z.string().uuid('product_id must be a valid UUID').optional(),
  limit: z.number().int().min(1).max(10000).default(1000).optional(),
});

export const ExportLogsInputSchema = z.discriminatedUnion('type', [
  ExportUserActivityLogsInputSchema,
  ExportLogLoaderEntriesInputSchema,
  ExportLogProductEntriesInputSchema,
]);

export type ExportLogsInput = z.infer<typeof ExportLogsInputSchema>;

export interface ExportLogsDTO {
  type: 'user_activity' | 'loader' | 'product';
  filename: string;
  content: string;
  lineCount: number;
  sizeBytes: number;
  filters: Record<string, string | number | undefined>;
}
