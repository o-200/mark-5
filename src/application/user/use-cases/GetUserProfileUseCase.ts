import { IUseCase } from '@application/common/UseCase.js';
import { Result } from '@shared/core/Result.js';
import { AppError, ValidationError } from '@shared/core/AppError.js';
import { DiscordId } from '@domain/user/value-objects/DiscordId.js';
import { IBackendUserGateway } from '@domain/user/ports/IBackendUserGateway.js';
import {
  GetUserProfileInput,
  GetUserProfileInputSchema,
  UserProfileDTO,
  UserProfileMapper,
} from '../dtos/UserProfileDTO.js';

export class GetUserProfileUseCase
  implements IUseCase<GetUserProfileInput, Result<UserProfileDTO, AppError>>
{
  constructor(private readonly userGateway: IBackendUserGateway) {}

  public async execute(input: GetUserProfileInput): Promise<Result<UserProfileDTO, AppError>> {
    const parseResult = GetUserProfileInputSchema.safeParse(input);
    if (!parseResult.success) {
      return Result.fail(
        new ValidationError('Invalid input parameters', parseResult.error.format())
      );
    }

    const discordIdResult = DiscordId.create(parseResult.data.discordId);
    if (discordIdResult.isFailure) {
      return Result.fail(discordIdResult.getError());
    }

    const gatewayResult = await this.userGateway.findByDiscordId(discordIdResult.getValue());
    if (gatewayResult.isFailure) {
      return Result.fail(gatewayResult.getError());
    }

    const userProfile = gatewayResult.getValue();
    return Result.ok(UserProfileMapper.toDTO(userProfile));
  }
}
