import { InfrastructureError } from '@shared/core/AppError.js';

export class HttpError extends InfrastructureError {
  public readonly status: number;
  public readonly statusText: string;
  public readonly url: string;
  public readonly responseBody?: unknown;

  constructor(status: number, statusText: string, url: string, responseBody?: unknown) {
    super(
      `HTTP Request to ${url} failed with status ${status} (${statusText})`,
      { status, statusText, url, responseBody }
    );
    this.status = status;
    this.statusText = statusText;
    this.url = url;
    this.responseBody = responseBody;
  }
}

export class NetworkError extends InfrastructureError {
  public readonly originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message, { originalError });
    this.originalError = originalError;
  }
}

export class ResponseValidationError extends InfrastructureError {
  public readonly validationErrors: unknown;

  constructor(endpoint: string, validationErrors: unknown) {
    super(`Response from ${endpoint} failed schema validation.`, { validationErrors });
    this.validationErrors = validationErrors;
  }
}
