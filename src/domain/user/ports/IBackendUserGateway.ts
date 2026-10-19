import { Result } from '@shared/core/Result.js';
import { AppError } from '@shared/core/AppError.js';
import { DiscordId } from '../value-objects/DiscordId.js';
import { UserProfile } from '../entities/UserProfile.js';

export interface IBackendUserGateway {
  /**
   * Retrieves a user profile by their Discord ID from the backend service.
   */
  findByDiscordId(discordId: DiscordId): Promise<Result<UserProfile, AppError>>;
}
