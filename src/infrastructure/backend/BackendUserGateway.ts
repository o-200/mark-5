import { z } from 'zod';
import { Result } from '@shared/core/Result.js';
import { AppError } from '@shared/core/AppError.js';
import { DiscordId } from '@domain/user/value-objects/DiscordId.js';
import { Email } from '@domain/user/value-objects/Email.js';
import { UserProfile } from '@domain/user/entities/UserProfile.js';
import { UserNotFoundError } from '@domain/user/errors/UserErrors.js';
import { IBackendUserGateway } from '@domain/user/ports/IBackendUserGateway.js';
import { HttpClient } from '../http/HttpClient.js';
import { HttpError } from '../http/HttpError.js';
import { createScopedLogger, ScopedLogger } from '../logging/logger.js';

// Schema defining the contract with the external backend endpoint
const BackendUserProfileResponseSchema = z.object({
  id: z.string(),
  discordId: z.string(),
  username: z.string(),
  bio: z.string(),
  email: z.string().email().optional(),
  level: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

type BackendUserProfileResponse = z.infer<typeof BackendUserProfileResponseSchema>;

export interface BackendUserGatewayConfig {
  httpClient: HttpClient;
  useMockBackend?: boolean;
}

export class BackendUserGateway implements IBackendUserGateway {
  private readonly httpClient: HttpClient;
  private readonly useMockBackend: boolean;
  private readonly logger: ScopedLogger;

  // In-memory mock store for local development/testing without an external server
  private readonly mockStore = new Map<string, UserProfile>();

  constructor(config: BackendUserGatewayConfig) {
    this.httpClient = config.httpClient;
    this.useMockBackend = config.useMockBackend ?? false;
    this.logger = createScopedLogger('BackendUserGateway');

    if (this.useMockBackend) {
      this.logger.info('Using in-memory mock backend for User Gateway operations.');
    }
  }

  public async findByDiscordId(discordId: DiscordId): Promise<Result<UserProfile, AppError>> {
    if (this.useMockBackend) {
      return this.findInMock(discordId);
    }

    const endpoint = `/api/v1/users/discord/${discordId.value}`;
    const result = await this.httpClient.get<BackendUserProfileResponse>(endpoint, {
      responseSchema: BackendUserProfileResponseSchema,
    });

    if (result.isFailure) {
      const error = result.getError();
      if (error instanceof HttpError && error.status === 404) {
        return Result.fail(new UserNotFoundError(discordId.value));
      }
      return Result.fail(error);
    }

    const data = result.getValue();
    return this.mapToDomain(data);
  }


  private mapToDomain(data: BackendUserProfileResponse): Result<UserProfile, AppError> {
    const discordIdResult = DiscordId.create(data.discordId);
    if (discordIdResult.isFailure) {
      return Result.fail(discordIdResult.getError());
    }

    let emailVo: Email | undefined;
    if (data.email) {
      const emailResult = Email.create(data.email);
      if (emailResult.isSuccess) {
        emailVo = emailResult.getValue();
      }
    }

    const profile = UserProfile.create(data.id, {
      discordId: discordIdResult.getValue(),
      username: data.username,
      bio: data.bio,
      email: emailVo,
      level: data.level,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    });

    return Result.ok(profile);
  }

  // --- In-memory Mock Helpers ---
  private findInMock(discordId: DiscordId): Result<UserProfile, AppError> {
    let profile = this.mockStore.get(discordId.value);
    if (!profile) {
      // Create initial sample user for test purposes
      profile = UserProfile.create(`user_${discordId.value}`, {
        discordId,
        username: `DiscordUser_${discordId.value.slice(-4)}`,
        bio: 'Hello from DDD Discord Bot! This bio is managed via domain use-cases.',
        level: 1,
      });
      this.mockStore.set(discordId.value, profile);
    }
    return Result.ok(profile);
  }
}
