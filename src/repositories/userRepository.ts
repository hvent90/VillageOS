import { PrismaClient, User } from '@prisma/client';

export class UserRepository {
  constructor(private prisma: PrismaClient) {}

  async findByDiscordId(discordId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { discordId }
    });
  }

  async createUser(discordId: string, displayName?: string): Promise<User> {
    return this.prisma.user.create({
      data: {
        discordId,
        displayName
      }
    });
  }

   async updateBaselineUrl(userId: string, baselineUrl: string): Promise<User> {
     return this.prisma.user.update({
       where: { id: userId },
       data: { baselineUrl }
     });
   }

   async updateUserBaseline(discordId: string, baselineUrl: string): Promise<User> {
     return this.prisma.user.update({
       where: { discordId },
       data: { baselineUrl, updatedAt: new Date() }
     });
   }

  async findById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: userId }
    });
  }
}