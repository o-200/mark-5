import {
  EmbedBuilder,
  Interaction,
  RepliableInteraction,
} from 'discord.js';
import { createScopedLogger, ScopedLogger } from '@infrastructure/logging/logger.js';
import { AppError } from '@shared/core/AppError.js';
import { ISlashCommand } from '../contracts/ISlashCommand.js';
import { IButtonHandler } from '../contracts/IButtonHandler.js';
import { IModalHandler } from '../contracts/IModalHandler.js';

export class InteractionPipeline {
  private readonly commands = new Map<string, ISlashCommand>();
  private readonly buttons: IButtonHandler[] = [];
  private readonly modals: IModalHandler[] = [];
  private readonly logger: ScopedLogger;

  constructor() {
    this.logger = createScopedLogger('InteractionPipeline');
  }

  public registerCommand(command: ISlashCommand): this {
    this.commands.set(command.data.name, command);
    this.logger.debug({ command: command.data.name }, 'Registered slash command');
    return this;
  }

  public registerButton(handler: IButtonHandler): this {
    this.buttons.push(handler);
    this.logger.debug({ customId: String(handler.customId) }, 'Registered button handler');
    return this;
  }

  public registerModal(handler: IModalHandler): this {
    this.modals.push(handler);
    this.logger.debug({ customId: String(handler.customId) }, 'Registered modal handler');
    return this;
  }

  public getAllCommands(): ISlashCommand[] {
    return Array.from(this.commands.values());
  }

  public async dispatch(interaction: Interaction): Promise<void> {
    const startTime = Date.now();

    try {
      if (interaction.isChatInputCommand()) {
        await this.handleCommand(interaction);
      } else if (interaction.isButton()) {
        await this.handleButton(interaction);
      } else if (interaction.isModalSubmit()) {
        await this.handleModal(interaction);
      }
    } catch (error) {
      await this.handleError(interaction, error);
    } finally {
      const durationMs = Date.now() - startTime;
      this.logger.debug(
        {
          type: interaction.type,
          user: interaction.user.tag,
          durationMs,
        },
        'Interaction lifecycle completed'
      );
    }
  }

  private async handleCommand(interaction: Interaction & { isChatInputCommand: () => boolean }): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const command = this.commands.get(interaction.commandName);
    if (!command) {
      this.logger.warn({ command: interaction.commandName }, 'Unknown slash command invoked');
      await interaction.reply({
        content: `Unknown command \`/${interaction.commandName}\`.`,
        ephemeral: true,
      });
      return;
    }

    this.logger.info(
      {
        command: interaction.commandName,
        user: interaction.user.tag,
        guildId: interaction.guildId,
      },
      'Executing slash command'
    );

    await command.execute(interaction);
  }

  private async handleButton(interaction: Interaction & { isButton: () => boolean }): Promise<void> {
    if (!interaction.isButton()) return;

    const handler = this.buttons.find((btn) => {
      if (typeof btn.customId === 'string') {
        return btn.customId === interaction.customId;
      }
      return btn.customId.test(interaction.customId);
    });

    if (!handler) {
      this.logger.warn({ customId: interaction.customId }, 'No button handler found for interaction');
      return;
    }

    this.logger.info(
      {
        customId: interaction.customId,
        user: interaction.user.tag,
      },
      'Executing button handler'
    );

    await handler.execute(interaction);
  }

  private async handleModal(interaction: Interaction & { isModalSubmit: () => boolean }): Promise<void> {
    if (!interaction.isModalSubmit()) return;

    const handler = this.modals.find((modal) => {
      if (typeof modal.customId === 'string') {
        return modal.customId === interaction.customId;
      }
      return modal.customId.test(interaction.customId);
    });

    if (!handler) {
      this.logger.warn({ customId: interaction.customId }, 'No modal handler found for interaction');
      return;
    }

    this.logger.info(
      {
        customId: interaction.customId,
        user: interaction.user.tag,
      },
      'Executing modal handler'
    );

    await handler.execute(interaction);
  }

  private async handleError(interaction: Interaction, error: unknown): Promise<void> {
    this.logger.error(
      {
        error,
        user: interaction.user.tag,
        interactionId: interaction.id,
      },
      'Unhandled error during interaction processing'
    );

    if (!interaction.isRepliable()) {
      return;
    }

    const repliable = interaction as RepliableInteraction;
    const isAppError = error instanceof AppError;
    const userMessage = isAppError ? error.message : 'An unexpected error occurred while processing your request.';

    const embed = new EmbedBuilder()
      .setColor(0xed4245) // Discord red
      .setTitle('⚠️ Processing Error')
      .setDescription(userMessage)
      .setFooter({ text: 'If this issue persists, please contact the administrator.' })
      .setTimestamp();

    try {
      if (repliable.deferred || repliable.replied) {
        await repliable.followUp({ embeds: [embed], ephemeral: true });
      } else {
        await repliable.reply({ embeds: [embed], ephemeral: true });
      }
    } catch (replyError) {
      this.logger.error({ replyError }, 'Failed to send error response to Discord interaction');
    }
  }
}
