import { z } from 'zod';
import { UserProfile } from '@domain/user/entities/UserProfile.js';

export const GetUserProfileInputSchema = z.object({
  discordId: z.string().min(17).max(20, 'Discord ID must be a snowflake (17-20 digits)'),
});
export type GetUserProfileInput = z.infer<typeof GetUserProfileInputSchema>;


export const UserProfileDTOSchema = z.object({
  id: z.string(),
  discordId: z.string(),
  username: z.string(),
  bio: z.string(),
  email: z.string().email().optional(),
  level: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type UserProfileDTO = z.infer<typeof UserProfileDTOSchema>;

export class UserProfileMapper {
  public static toDTO(entity: UserProfile): UserProfileDTO {
    return {
      id: entity.id,
      discordId: entity.discordId.value,
      username: entity.username,
      bio: entity.bio,
      email: entity.email?.value,
      level: entity.level,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
