import { z } from 'zod';
import { Result } from '@shared/core/Result.js';
import { createScopedLogger, ScopedLogger } from '../logging/logger.js';
import { HttpError, NetworkError, ResponseValidationError } from './HttpError.js';

export interface HttpClientConfig {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  defaultTimeoutMs?: number;
}

export interface HttpRequestOptions<TResponse> {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  timeoutMs?: number;
  responseSchema?: z.ZodType<TResponse>;
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;
  private readonly defaultTimeoutMs: number;
  private readonly logger: ScopedLogger;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...config.defaultHeaders,
    };
    this.defaultTimeoutMs = config.defaultTimeoutMs ?? 5000;
    this.logger = createScopedLogger('HttpClient');
  }

  public async get<T>(
    endpoint: string,
    options?: Omit<HttpRequestOptions<T>, 'body'>
  ): Promise<Result<T, HttpError | NetworkError | ResponseValidationError>> {
    return this.request<T>('GET', endpoint, options);
  }

  public async post<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions<T>, 'body'>
  ): Promise<Result<T, HttpError | NetworkError | ResponseValidationError>> {
    return this.request<T>('POST', endpoint, { ...options, body });
  }

  public async put<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions<T>, 'body'>
  ): Promise<Result<T, HttpError | NetworkError | ResponseValidationError>> {
    return this.request<T>('PUT', endpoint, { ...options, body });
  }

  public async patch<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions<T>, 'body'>
  ): Promise<Result<T, HttpError | NetworkError | ResponseValidationError>> {
    return this.request<T>('PATCH', endpoint, { ...options, body });
  }

  public async delete<T>(
    endpoint: string,
    options?: Omit<HttpRequestOptions<T>, 'body'>
  ): Promise<Result<T, HttpError | NetworkError | ResponseValidationError>> {
    return this.request<T>('DELETE', endpoint, options);
  }

  private async request<T>(
    method: string,
    endpoint: string,
    options?: HttpRequestOptions<T>
  ): Promise<Result<T, HttpError | NetworkError | ResponseValidationError>> {
    const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let urlString = `${this.baseUrl}${formattedEndpoint}`;

    if (options?.params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      }
      const queryString = searchParams.toString();
      if (queryString) {
        urlString += `?${queryString}`;
      }
    }

    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...options?.headers,
    };

    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const startTime = Date.now();
    this.logger.debug({ method, url: urlString }, 'Initiating HTTP request');

    try {
      const response = await fetch(urlString, {
        method,
        headers,
        body: options?.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;

      this.logger.debug(
        { method, url: urlString, status: response.status, durationMs },
        'HTTP response received'
      );

      let responseData: unknown = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json().catch(() => null);
      } else {
        const text = await response.text().catch(() => null);
        responseData = text;
      }

      if (!response.ok) {
        return Result.fail(
          new HttpError(response.status, response.statusText, urlString, responseData)
        );
      }

      if (options?.responseSchema) {
        const parseResult = options.responseSchema.safeParse(responseData);
        if (!parseResult.success) {
          this.logger.error(
            { endpoint: urlString, errors: parseResult.error.format() },
            'Response schema validation failed'
          );
          return Result.fail(new ResponseValidationError(urlString, parseResult.error.format()));
        }
        return Result.ok(parseResult.data);
      }

      return Result.ok(responseData as T);
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const message = isAbort
        ? `HTTP request to ${urlString} timed out after ${timeoutMs}ms.`
        : `Network error connecting to ${urlString}: ${err instanceof Error ? err.message : String(err)}`;

      this.logger.warn({ error: err, url: urlString }, message);
      return Result.fail(new NetworkError(message, err));
    }
  }
}
