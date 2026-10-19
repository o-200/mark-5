import { ValueObject } from '@shared/core/ValueObject.js';
import { Result } from '@shared/core/Result.js';
import { ValidationError } from '@shared/core/AppError.js';

interface DiscordIdProps {
  value: string;
}

const SNOWFLAKE_REGEX = /^\d{17,20}$/;

export class DiscordId extends ValueObject<DiscordIdProps> {
  private constructor(props: DiscordIdProps) {
    super(props);
  }

  public get value(): string {
    return this.props.value;
  }

  public static create(rawId: string): Result<DiscordId, ValidationError> {
    const trimmed = rawId.trim();

    if (!trimmed) {
      return Result.fail(new ValidationError('Discord ID cannot be empty.'));
    }

    if (!SNOWFLAKE_REGEX.test(trimmed)) {
      return Result.fail(
        new ValidationError(`Invalid Discord snowflake ID format: '${trimmed}'. Must be 17-20 digits.`)
      );
    }

    return Result.ok(new DiscordId({ value: trimmed }));
  }

  public toString(): string {
    return this.props.value;
  }
}
