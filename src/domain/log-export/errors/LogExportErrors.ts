import { DomainError, InfrastructureError, UnauthorizedError } from '@shared/core/AppError.js';

export class LogExportUnauthorizedError extends UnauthorizedError {
  constructor(reason = 'Invalid or expired HMAC signature.') {
    super(`Log Export Unauthorized: ${reason}`);
  }
}

export class MissingSecretKeyError extends InfrastructureError {
  constructor() {
    super(
      'Log export secret key (LOGS_EXPORT_SECRET_KEY) is not configured in environment variables.',
      'MISSING_SECRET_KEY'
    );
  }
}

export class AdminPermissionDeniedError extends DomainError {
  constructor(discordId: string) {
    super(
      `User '${discordId}' is not authorized to execute log export commands.`,
      'ADMIN_PERMISSION_DENIED',
      { discordId }
    );
  }
}
