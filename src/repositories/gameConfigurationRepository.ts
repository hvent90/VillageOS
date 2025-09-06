// Game configuration repository for database operations
import { prisma } from '../config/database';

export interface GameConfiguration {
  key: string;
  value: string;
  description?: string;
}

export class GameConfigurationRepository {
  async findAll(): Promise<GameConfiguration[]> {
    const configs = await (prisma as any).gameConfiguration.findMany();
    return configs.map((config: any) => ({
      key: config.key,
      value: config.value,
      description: config.description || undefined
    }));
  }

  async findByKey(key: string): Promise<GameConfiguration | null> {
    const config = await (prisma as any).gameConfiguration.findUnique({
      where: { key }
    });

    if (!config) return null;

    return {
      key: config.key,
      value: config.value,
      description: config.description || undefined
    };
  }

  async upsert(key: string, value: string, description?: string): Promise<GameConfiguration> {
    const config = await (prisma as any).gameConfiguration.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description }
    });

    return {
      key: config.key,
      value: config.value,
      description: config.description || undefined
    };
  }

  async delete(key: string): Promise<void> {
    await (prisma as any).gameConfiguration.delete({
      where: { key }
    });
  }
}