// Environment configuration
export interface EnvironmentConfig {
  databaseUrl: string;
  port: number;
  geminiApiKey: string;
  geminiTextModel: string;
  queueProcessingIntervalSeconds: number;
  queueRateLimitDelayMs: number;
  queueMaxRetryAttempts: number;
  queueCleanupHours: number;

  // Village configuration
  defaultVillageGridWidth: number;
  defaultVillageGridHeight: number;

  // Plant configuration
  defaultWaterDecayRate: number; // Percentage decay per hour
  defaultGrowthRate: number; // Percentage growth per hour
  maxWaterLevel: number;
  maxGrowthLevel: number;



  // Job processing configuration
  jobMaxRetries: number;
  jobProcessingBatchSize: number;

  // Discord Bot Configuration
  discordBotToken: string;
  discordApplicationId: string;
}

export function loadEnvironmentConfig(): EnvironmentConfig {
  return {
    databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5433/villageos',
    port: parseInt(process.env.PORT || '3000', 10),
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiTextModel: process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash',
    queueProcessingIntervalSeconds: parseInt(process.env.QUEUE_PROCESSING_INTERVAL_SECONDS || '30', 10),
    queueRateLimitDelayMs: parseInt(process.env.QUEUE_RATE_LIMIT_DELAY_MS || '5000', 10),
    queueMaxRetryAttempts: parseInt(process.env.QUEUE_MAX_RETRY_ATTEMPTS || '3', 10),
    queueCleanupHours: parseInt(process.env.QUEUE_CLEANUP_HOURS || '24', 10),

    // Village configuration
    defaultVillageGridWidth: parseInt(process.env.DEFAULT_VILLAGE_GRID_WIDTH || '10', 10),
    defaultVillageGridHeight: parseInt(process.env.DEFAULT_VILLAGE_GRID_HEIGHT || '10', 10),

    // Plant configuration
    defaultWaterDecayRate: parseFloat(process.env.DEFAULT_WATER_DECAY_RATE || '0.05'),
    defaultGrowthRate: parseFloat(process.env.DEFAULT_GROWTH_RATE || '0.02'),
    maxWaterLevel: parseFloat(process.env.MAX_WATER_LEVEL || '1.0'),
    maxGrowthLevel: parseFloat(process.env.MAX_GROWTH_LEVEL || '1.0'),



    // Job processing configuration
    jobMaxRetries: parseInt(process.env.JOB_MAX_RETRIES || '3', 10),
    jobProcessingBatchSize: parseInt(process.env.JOB_PROCESSING_BATCH_SIZE || '10', 10),

    // Discord Bot Configuration
    discordBotToken: process.env.DISCORD_BOT_TOKEN || '',
    discordApplicationId: process.env.DISCORD_APPLICATION_ID || '',
  };
}
