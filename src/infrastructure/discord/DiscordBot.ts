import { Client } from 'discord.js';
import { createScopedLogger, ScopedLogger } from '../logging/logger.js';
import { EnvConfig } from '../config/env.js';
import { InteractionPipeline } from '@presentation/discord/pipeline/InteractionPipeline.js';
import { registerReadyEvent } from '@presentation/discord/events/ready.event.js';
import { registerInteractionCreateEvent } from '@presentation/discord/events/interactionCreate.event.js';

export class DiscordBot {
  private readonly client: Client;
  private readonly pipeline: InteractionPipeline;
  private readonly config: EnvConfig;
  private readonly logger: ScopedLogger;

  constructor(client: Client, pipeline: InteractionPipeline, config: EnvConfig) {
    this.client = client;
    this.pipeline = pipeline;
    this.config = config;
    this.logger = createScopedLogger('DiscordBot');
  }

  public async start(): Promise<void> {
    this.logger.info('Initializing Discord bot services and listeners...');

    // Register event listeners
    registerReadyEvent(this.client);
    registerInteractionCreateEvent(this.client, this.pipeline);

    // Register process signal handlers for graceful shutdown
    this.setupGracefulShutdown();

    // Login to Discord Gateway
    this.logger.info('Connecting to Discord Gateway...');
    await this.client.login(this.config.DISCORD_TOKEN);
  }

  public async stop(): Promise<void> {
    this.logger.info('Shutting down Discord bot client gracefully...');
    this.client.destroy();
    this.logger.info('Discord bot client destroyed.');
  }

  private setupGracefulShutdown(): void {
    const handleShutdown = async (signal: string) => {
      this.logger.warn({ signal }, `Received ${signal}. Starting graceful shutdown...`);
      try {
        await this.stop();
        process.exit(0);
      } catch (error) {
        this.logger.error({ error }, 'Error during graceful shutdown');
        process.exit(1);
      }
    };

    process.once('SIGINT', () => handleShutdown('SIGINT'));
    process.once('SIGTERM', () => handleShutdown('SIGTERM'));

    process.on('unhandledRejection', (reason) => {
      this.logger.error({ reason }, 'Unhandled Promise rejection');
    });

    process.on('uncaughtException', (error) => {
      this.logger.fatal({ error }, 'Uncaught exception in application process');
      process.exit(1);
    });
  }
}
