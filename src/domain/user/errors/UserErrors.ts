import { DomainError, NotFoundError } from '@shared/core/AppError.js';

export class UserNotFoundError extends NotFoundError {
  constructor(discordId: string) {
    super('User profile', discordId);
  }
}


export class UserSuspendedError extends DomainError {
  constructor(userId: string) {
    super(`User account '${userId}' is currently suspended.`, 'USER_SUSPENDED');
  }
}
