import { Client, Events } from 'discord.js';
import { createScopedLogger } from '@infrastructure/logging/logger.js';

export function registerReadyEvent(client: Client): void {
  const logger = createScopedLogger('DiscordReady');

  client.once(Events.ClientReady, (readyClient) => {
    logger.info(
      {
        tag: readyClient.user.tag,
        id: readyClient.user.id,
        guildCount: readyClient.guilds.cache.size,
      },
      `🤖 Bot logged in successfully as ${readyClient.user.tag}`
    );
  });
}
