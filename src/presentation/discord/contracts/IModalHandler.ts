import { ModalSubmitInteraction } from 'discord.js';

export interface IModalHandler {
  /**
   * Exact customId string or RegExp pattern to match against ModalSubmitInteraction.customId.
   */
  readonly customId: string | RegExp;

  execute(interaction: ModalSubmitInteraction): Promise<void>;
}
