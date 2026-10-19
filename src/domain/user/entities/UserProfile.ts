import { Entity } from '@shared/core/Entity.js';
import { DiscordId } from '../value-objects/DiscordId.js';
import { Email } from '../value-objects/Email.js';


export interface UserProfileProps {
  discordId: DiscordId;
  username: string;
  bio: string;
  email?: Email;
  level: number;
  createdAt: Date;
  updatedAt: Date;
}

export class UserProfile extends Entity<string> {
  private _props: UserProfileProps;

  private constructor(id: string, props: UserProfileProps) {
    super(id);
    this._props = props;
  }

  public get discordId(): DiscordId {
    return this._props.discordId;
  }

  public get username(): string {
    return this._props.username;
  }

  public get bio(): string {
    return this._props.bio;
  }

  public get email(): Email | undefined {
    return this._props.email;
  }

  public get level(): number {
    return this._props.level;
  }

  public get createdAt(): Date {
    return this._props.createdAt;
  }

  public get updatedAt(): Date {
    return this._props.updatedAt;
  }


  public incrementLevel(): void {
    this._props.level += 1;
    this._props.updatedAt = new Date();
  }

  public static create(
    id: string,
    props: Omit<UserProfileProps, 'createdAt' | 'updatedAt'> & {
      createdAt?: Date;
      updatedAt?: Date;
    }
  ): UserProfile {
    const now = new Date();
    return new UserProfile(id, {
      ...props,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }
}
