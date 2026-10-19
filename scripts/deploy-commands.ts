import { REST, Routes } from 'discord.js';
import { getEnv } from '@infrastructure/config/env.js';
import { rootLogger } from '@infrastructure/logging/logger.js';
import { PingCommand } from '@presentation/discord/commands/ping.command.js';
import { LogsCommand } from '@presentation/discord/commands/logs.command.js';

async function deployCommands(): Promise<void> {
  const env = getEnv();
  const logger = rootLogger.child({ context: 'DeployCommands' });

  // Gather all slash command JSON data
  // Commands only require dependencies at execution time; data is static builder
  const pingCommand = new PingCommand();
  const logsCommand = new LogsCommand(null as never, []);

  const commands = [
    pingCommand.data.toJSON(),
    logsCommand.data.toJSON(),
  ];

  logger.info({ commandCount: commands.length }, 'Started refreshing application (/) commands.');

  const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);

  try {
    if (env.DISCORD_GUILD_ID) {
      logger.info(
        { guildId: env.DISCORD_GUILD_ID },
        'Deploying commands to development guild for immediate availability...'
      );
      await rest.put(
        Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID),
        { body: commands }
      );
      logger.info(
        { guildId: env.DISCORD_GUILD_ID },
        'Successfully registered guild application commands.'
      );
    } else {
      logger.info('No DISCORD_GUILD_ID provided. Deploying commands globally to Discord...');
      await rest.put(
        Routes.applicationCommands(env.DISCORD_CLIENT_ID),
        { body: commands }
      );
      logger.info('Successfully registered global application commands.');
    }
  } catch (error) {
    logger.error({ error }, 'Failed to deploy slash commands to Discord API');
    process.exit(1);
  }
}

deployCommands();
