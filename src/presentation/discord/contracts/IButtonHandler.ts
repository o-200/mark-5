import { ButtonInteraction } from 'discord.js';

export interface IButtonHandler {
  /**
   * Exact customId string or RegExp pattern to match against ButtonInteraction.customId.
   */
  readonly customId: string | RegExp;

  execute(interaction: ButtonInteraction): Promise<void>;
}
