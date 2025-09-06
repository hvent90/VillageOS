// Database configuration
import { PrismaClient } from '@prisma/client';
import logger from './logger';

export const prisma = new PrismaClient();

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info({ event: 'database_connected', message: 'Database connected successfully' });
  } catch (error) {
    logger.error({
      event: 'database_connection_failed',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info({ event: 'database_disconnected', message: 'Database disconnected' });
}
