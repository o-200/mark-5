import { ValueObject } from '@shared/core/ValueObject.js';
import { Result } from '@shared/core/Result.js';
import { ValidationError } from '@shared/core/AppError.js';

interface EmailProps {
  value: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props);
  }

  public get value(): string {
    return this.props.value;
  }

  public static create(rawEmail: string): Result<Email, ValidationError> {
    const trimmed = rawEmail.trim().toLowerCase();

    if (!trimmed) {
      return Result.fail(new ValidationError('Email address cannot be empty.'));
    }

    if (!EMAIL_REGEX.test(trimmed)) {
      return Result.fail(new ValidationError(`Invalid email address format: '${rawEmail}'.`));
    }

    return Result.ok(new Email({ value: trimmed }));
  }

  public toString(): string {
    return this.props.value;
  }
}
