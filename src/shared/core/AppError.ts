/**
 * Base domain and application error classes.
 */
export abstract class AppError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  protected constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DomainError extends AppError {
  constructor(message: string, code = 'DOMAIN_ERROR', details?: unknown) {
    super(message, code, details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const msg = identifier
      ? `${resource} with identifier '${identifier}' was not found.`
      : `${resource} was not found.`;
    super(msg, 'NOT_FOUND', { resource, identifier });
  }
}

export class InfrastructureError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'INFRASTRUCTURE_ERROR', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access.', details?: unknown) {
    super(message, 'UNAUTHORIZED', details);
  }
}
