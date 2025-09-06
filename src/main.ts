import 'dotenv/config'; // Load environment variables from .env file
import { connectDatabase, disconnectDatabase, prisma } from './config/database';
import { loadEnvironmentConfig } from './config';
import { UserRepository, VillageRepository } from './repositories';
import { MediaGenerationQueueRepository } from './repositories/mediaGenerationQueueRepository';
import { CommandProcessorService } from './services/commandProcessorService';
import { MediaGenerationQueueService } from './services/mediaGenerationQueueService';
import { DiscordBotService } from './services/discordBotService';
import { CommandRegistrationService } from './services/commandRegistrationService';
import { DiscordPlatformAdapter } from './adapters/discordPlatformAdapter';

import { SchedulerService } from './services/schedulerService';
import { SupabaseMediaService } from './services/supabaseMediaService';
import { MediaGenerationService } from './services/mediaGenerationService';
import { GameConfigurationService } from './services/gameConfigurationService';
import { GameConfigurationRepository } from './repositories/gameConfigurationRepository';
import { LLMPromptService } from './services/llmPromptService';

import logger from './config/logger';

async function main() {
  try {
    logger.info({ event: 'application_startup', message: 'Starting VillageOS' });

    // Connect to database
    await connectDatabase();
    logger.info({ event: 'database_connected', message: 'Database connection established' });



    // Load configurations
    const envConfig = loadEnvironmentConfig();
    logger.info({ event: 'config_loaded', message: 'Environment configuration loaded' });

    // Initialize repositories
    const userRepository = new UserRepository(prisma);
    const villageRepository = new VillageRepository(prisma);
    const configRepository = new GameConfigurationRepository();

    // Initialize Supabase media service
    const mediaService = new SupabaseMediaService();

    // Initialize configuration service
    const configService = new GameConfigurationService(configRepository, envConfig);

    // Initialize default configurations if none exist
    await configService.initializeDefaults();
    logger.info({ event: 'config_defaults_initialized', message: 'Configuration defaults initialized' });

    // Initialize media generation service
    const mediaGenerationService = new MediaGenerationService(mediaService, envConfig.geminiApiKey);

    // Initialize LLM prompt service
    const llmPromptService = new LLMPromptService(envConfig.geminiApiKey, envConfig.geminiTextModel);

    // Initialize queue repository and service
    const queueRepository = new MediaGenerationQueueRepository();
    const queueService = new MediaGenerationQueueService(
      queueRepository,
      mediaGenerationService,
      userRepository,
      new VillageRepository(prisma),
      envConfig.queueRateLimitDelayMs
    );

    // Initialize scheduler service
    const schedulerService = new SchedulerService(queueService);
    schedulerService.startJobs();

    // Initialize Discord bot service
    const discordBotService = new DiscordBotService(envConfig.discordBotToken);

    // Initialize command registration service
    const commandRegistrationService = new CommandRegistrationService(
      discordBotService['client'],
      envConfig.discordBotToken,
      envConfig.discordApplicationId
    );

    // Initialize Discord platform adapter (will be created per interaction)
    // The Discord platform adapter is created per interaction in the bot service

    // Initialize command processor with framework dependencies
     const commandProcessorService = new CommandProcessorService(
       null as any, // gameLogic - removed
       envConfig,
       mediaGenerationService,
       queueService,
       configService,
       villageRepository,
       userRepository,
       llmPromptService,
       null as any // platformAdapter - will be set per Discord interaction
     );

    // Set up Discord bot
    discordBotService.setCommandRegistrationService(commandRegistrationService);
    discordBotService.setCommandProcessor(commandProcessorService);

    // Start Discord bot
    await discordBotService.listen();
    await discordBotService.registerSlashCommands();
    logger.info({ event: 'discord_bot_started', message: 'Discord bot is now running' });

    logger.info({ event: 'application_started', message: 'VillageOS is now running' });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info({ event: 'shutdown_initiated', message: 'Received SIGINT, shutting down gracefully' });
      await disconnectDatabase();
      logger.info({ event: 'shutdown_complete', message: 'Application shutdown complete' });
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info({ event: 'shutdown_initiated', message: 'Received SIGTERM, shutting down gracefully' });
      await disconnectDatabase();
      logger.info({ event: 'shutdown_complete', message: 'Application shutdown complete' });
      process.exit(0);
    });

  } catch (error) {
    logger.error({ event: 'startup_failed', message: 'Failed to start application', error: error instanceof Error ? error.message : String(error) });
    await disconnectDatabase();
    process.exit(1);
  }
}

// Start the application
main().catch((error) => {
  logger.error({ event: 'unhandled_error', message: 'Unhandled error in main', error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
