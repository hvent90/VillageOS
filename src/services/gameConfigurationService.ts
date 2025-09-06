// Game configuration service for managing configurable values
import { GameConfigurationRepository, GameConfiguration } from '../repositories/gameConfigurationRepository';
import { EnvironmentConfig } from '../config/environment';

export interface VillageConfig {
  gridWidth: number;
  gridHeight: number;
}

export interface PlantConfig {
  waterDecayRate: number;
  growthRate: number;
  maxWaterLevel: number;
  maxGrowthLevel: number;
}



export class GameConfigurationService {
  private cache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private configRepo: GameConfigurationRepository,
    private envConfig: EnvironmentConfig
  ) {}

  async getVillageConfig(): Promise<VillageConfig> {
    const cacheKey = 'village_config';
    const cached = this.getFromCache<VillageConfig>(cacheKey);
    if (cached) return cached;

    const config: VillageConfig = {
      gridWidth: await this.getWithFallback('village_grid_width', this.envConfig.defaultVillageGridWidth),
      gridHeight: await this.getWithFallback('village_grid_height', this.envConfig.defaultVillageGridHeight)
    };

    this.setCache(cacheKey, config);
    return config;
  }

  async getPlantConfig(): Promise<PlantConfig> {
    const cacheKey = 'plant_config';
    const cached = this.getFromCache<PlantConfig>(cacheKey);
    if (cached) return cached;

    const config: PlantConfig = {
      waterDecayRate: await this.getWithFallback('plant_water_decay_rate', this.envConfig.defaultWaterDecayRate),
      growthRate: await this.getWithFallback('plant_growth_rate', this.envConfig.defaultGrowthRate),
      maxWaterLevel: await this.getWithFallback('plant_max_water_level', this.envConfig.maxWaterLevel),
      maxGrowthLevel: await this.getWithFallback('plant_max_growth_level', this.envConfig.maxGrowthLevel)
    };

    this.setCache(cacheKey, config);
    return config;
  }



  async updateConfig(key: string, value: string, description?: string): Promise<GameConfiguration> {
    const config = await this.configRepo.upsert(key, value, description);

    // Clear related caches
    this.clearCache();

    return config;
  }

  async initializeDefaults(): Promise<void> {
    try {
      // Check if any configurations already exist
      const existingConfigs = await this.configRepo.findAll();
      if (existingConfigs.length > 0) {
        console.log('Configuration defaults already initialized, skipping...');
        return;
      }

      console.log('Initializing configuration defaults...');

      // Define all known configuration keys with their defaults
      const defaultConfigs = [
        // Village configurations
        { key: 'village_grid_width', value: this.envConfig.defaultVillageGridWidth.toString(), description: 'Default width of village grid' },
        { key: 'village_grid_height', value: this.envConfig.defaultVillageGridHeight.toString(), description: 'Default height of village grid' },

        // Plant configurations
        { key: 'plant_water_decay_rate', value: this.envConfig.defaultWaterDecayRate.toString(), description: 'Rate at which plant water level decays per hour' },
        { key: 'plant_growth_rate', value: this.envConfig.defaultGrowthRate.toString(), description: 'Rate at which plants grow per hour' },
        { key: 'plant_max_water_level', value: this.envConfig.maxWaterLevel.toString(), description: 'Maximum water level for plants' },
        { key: 'plant_max_growth_level', value: this.envConfig.maxGrowthLevel.toString(), description: 'Maximum growth level for plants' },



        // Job processing configurations
        { key: 'job_max_retries', value: this.envConfig.jobMaxRetries.toString(), description: 'Maximum number of retries for failed jobs' },
        { key: 'job_processing_batch_size', value: this.envConfig.jobProcessingBatchSize.toString(), description: 'Number of jobs to process in each batch' }
      ];

      // Insert all default configurations
      for (const config of defaultConfigs) {
        await this.configRepo.upsert(config.key, config.value, config.description);
      }

      console.log(`Successfully initialized ${defaultConfigs.length} default configurations`);
    } catch (error) {
      console.error('Failed to initialize configuration defaults:', error);
      throw error;
    }
  }

  async getAllConfigs(): Promise<(GameConfiguration & { isOverride: boolean; defaultValue: string })[]> {
    // Get all database overrides
    const dbConfigs = await this.configRepo.findAll();
    const dbConfigMap = new Map(dbConfigs.map(c => [c.key, c.value]));

    // Define all known configuration keys with their defaults
    const allConfigKeys = [
      // Village configurations
      { key: 'village_grid_width', defaultValue: this.envConfig.defaultVillageGridWidth.toString(), description: 'Default width of village grid' },
      { key: 'village_grid_height', defaultValue: this.envConfig.defaultVillageGridHeight.toString(), description: 'Default height of village grid' },

      // Plant configurations
      { key: 'plant_water_decay_rate', defaultValue: this.envConfig.defaultWaterDecayRate.toString(), description: 'Rate at which plant water level decays per hour' },
      { key: 'plant_growth_rate', defaultValue: this.envConfig.defaultGrowthRate.toString(), description: 'Rate at which plants grow per hour' },
      { key: 'plant_max_water_level', defaultValue: this.envConfig.maxWaterLevel.toString(), description: 'Maximum water level for plants' },
      { key: 'plant_max_growth_level', defaultValue: this.envConfig.maxGrowthLevel.toString(), description: 'Maximum growth level for plants' },



      // Job processing configurations
      { key: 'job_max_retries', defaultValue: this.envConfig.jobMaxRetries.toString(), description: 'Maximum number of retries for failed jobs' },
      { key: 'job_processing_batch_size', defaultValue: this.envConfig.jobProcessingBatchSize.toString(), description: 'Number of jobs to process in each batch' }
    ];

    // Build complete configuration list
    const allConfigs: (GameConfiguration & { isOverride: boolean; defaultValue: string })[] = allConfigKeys.map(({ key, defaultValue, description }) => {
      const dbValue = dbConfigMap.get(key);
      return {
        key,
        value: dbValue || defaultValue,
        description: dbValue ? description : `${description} (using default)`,
        isOverride: !!dbValue,
        defaultValue
      };
    });

    return allConfigs;
  }

  async getConfig(key: string): Promise<GameConfiguration | null> {
    return this.configRepo.findByKey(key);
  }

  async deleteConfig(key: string): Promise<void> {
    await this.configRepo.delete(key);

    // Clear related caches
    this.clearCache();
  }

  private async getWithFallback<T>(key: string, envDefault: T): Promise<T> {
    try {
      const dbValue = await this.configRepo.findByKey(key);
      if (dbValue) {
        // Type conversion based on expected type
        if (typeof envDefault === 'number') {
          return parseFloat(dbValue.value) as T;
        }
        if (typeof envDefault === 'boolean') {
          return (dbValue.value.toLowerCase() === 'true') as T;
        }
        return dbValue.value as T;
      }
    } catch (error) {
      // If database query fails, fall back to environment default
      console.warn(`Failed to get config ${key} from database, using environment default:`, error);
    }

    return envDefault;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    const expiry = this.cacheExpiry.get(key);

    if (cached && expiry && Date.now() < expiry) {
      return cached as T;
    }

    // Remove expired cache
    if (cached) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
    }

    return null;
  }

  private setCache<T>(key: string, value: T): void {
    this.cache.set(key, value);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
  }

  private clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}