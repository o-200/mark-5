import { getEnv } from '@infrastructure/config/env.js';
import { rootLogger } from '@infrastructure/logging/logger.js';
import { HttpClient } from '@infrastructure/http/HttpClient.js';
import { BackendLogExportGateway } from '@infrastructure/backend/BackendLogExportGateway.js';
import { ExportLogsUseCase } from '@application/log-export/use-cases/ExportLogsUseCase.js';
import { InteractionPipeline } from '@presentation/discord/pipeline/InteractionPipeline.js';
import { PingCommand } from '@presentation/discord/commands/ping.command.js';
import { LogsCommand } from '@presentation/discord/commands/logs.command.js';
import { createDiscordClient } from '@infrastructure/discord/client.js';
import { DiscordBot } from '@infrastructure/discord/DiscordBot.js';

async function bootstrap(): Promise<void> {
  const logger = rootLogger.child({ context: 'Bootstrap' });
  logger.info('Starting Mark-5 Discord Bot application...');

  // 1. Validate environment configuration
  const env = getEnv();
  logger.info({ nodeEnv: env.NODE_ENV, logLevel: env.LOG_LEVEL }, 'Environment validated.');

  // 2. Initialize Infrastructure Layer (Adapters)
  const httpClient = new HttpClient({
    baseUrl: env.BACKEND_API_URL,
    defaultTimeoutMs: env.BACKEND_TIMEOUT_MS,
  });

  const backendLogExportGateway = new BackendLogExportGateway({
    httpClient,
    secretKey: env.LOGS_EXPORT_SECRET_KEY,
    useMockBackend: env.USE_MOCK_BACKEND,
  });

  // 3. Initialize Application Layer (Use Cases)
  const exportLogsUseCase = new ExportLogsUseCase(backendLogExportGateway);

  // 4. Initialize Presentation Layer (Pipeline, Commands, Handlers)
  const pipeline = new InteractionPipeline();

  // Register Slash Commands
  pipeline.registerCommand(new PingCommand());
  pipeline.registerCommand(new LogsCommand(exportLogsUseCase, env.DISCORD_ADMIN_IDS));

  // 5. Initialize Discord Client & Bot Lifecycle
  const discordClient = createDiscordClient();
  const bot = new DiscordBot(discordClient, pipeline, env);

  // 6. Start Bot
  await bot.start();
}

bootstrap().catch((error) => {
  rootLogger.fatal({ error }, 'Fatal error during application bootstrap');
  process.exit(1);
});
