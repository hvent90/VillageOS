import { PrismaClient, Village, VillageObject, VillageObjectType } from '@prisma/client';

export class VillageRepository {
  constructor(private prisma: PrismaClient) {}

  async findByGuildId(guildId: string): Promise<Village | null> {
    return this.prisma.village.findUnique({
      where: { guildId },
      include: {
        objects: { include: { creator: true } },
        members: { include: { user: true } }  // All members (set at village creation)
      }
    });
  }

  async createVillageWithMembers(guildId: string, memberUserIds: string[], name?: string): Promise<Village> {
    return this.prisma.village.create({
      data: {
        guildId,
        name,
        members: {
          create: memberUserIds.map(userId => ({
            userId,
            joinedAt: new Date()  // All members join at village creation time
          }))
        }
      },
      include: {
        members: { include: { user: true } },
        objects: true
      }
    });
  }

  async getVillageMembers(villageId: string): Promise<any[]> {
    return this.prisma.villageMember.findMany({
      where: { villageId },
      include: { user: true },
      orderBy: { joinedAt: 'asc' }  // Order by join time (all same time, but consistent)
    });
  }

  async getVillageMembersWithBaselines(villageId: string): Promise<Array<{
    userId: string;
    baselineUrl?: string;
    displayName?: string;
  }>> {
    const members = await this.prisma.villageMember.findMany({
      where: { villageId },
      include: {
        user: {
          select: {
            discordId: true,
            baselineUrl: true,
            displayName: true
          }
        }
      },
      orderBy: { joinedAt: 'asc' }
    });

    return members.map(member => ({
      userId: member.userId,
      baselineUrl: member.user.baselineUrl || undefined,
      displayName: member.user.displayName || member.user.discordId
    }));
  }

  async findAvailablePosition(villageId: string): Promise<{ x: number, y: number } | null> {
    const village = await this.prisma.village.findUnique({
      where: { id: villageId },
      include: { objects: true }
    });

    if (!village) return null;

    // Find first available grid position
    const occupiedPositions = new Set(
      village.objects.map(obj => `${obj.gridX},${obj.gridY}`)
    );

    for (let y = 0; y < village.gridHeight; y++) {
      for (let x = 0; x < village.gridWidth; x++) {
        if (!occupiedPositions.has(`${x},${y}`)) {
          return { x, y };
        }
      }
    }

    return null; // Village is full
  }

  async addObject(
    villageId: string,
    creatorId: string,
    objectType: VillageObjectType,
    name: string,
    enhancedDescription?: string,
    gridX?: number,
    gridY?: number
  ): Promise<VillageObject> {
    // Auto-assign position if not provided
    let finalX = gridX;
    let finalY = gridY;

    if (finalX === undefined || finalY === undefined) {
      const position = await this.findAvailablePosition(villageId);
      if (!position) throw new Error('Village is full - no available positions');
      finalX = position.x;
      finalY = position.y;
    }

    // Set plant defaults
    const plantDefaults = objectType === 'PLANT' ? {
      waterLevel: 1.0,             // Just planted and watered (100%)
      lastWatered: new Date(),     // Just watered during planting
      waterDecayRate: 0.04,        // Default: 4% decay per hour (needs water in ~25 hours)
      growthLevel: 0.0,            // Just planted, no growth yet (0%)
      plantedAt: new Date(),       // Track planting time
      growthRate: 0.014,           // Default: 1.4% growth per hour (ready in ~72 hours)
      lastHarvested: null          // Never harvested yet
    } : {};

    return this.prisma.villageObject.create({
      data: {
        villageId,
        creatorId,
        objectType,
        name,
        enhancedDescription,
        gridX: finalX,
        gridY: finalY,
        ...plantDefaults
      },
      include: { creator: true }
    });
  }

  async waterPlant(objectId: string): Promise<VillageObject | null> {
    return this.prisma.villageObject.update({
      where: {
        id: objectId,
        objectType: 'PLANT'
      },
      data: {
        waterLevel: 1.0,          // Restore to fully watered (100%)
        lastWatered: new Date()   // Update last watered time
      }
    });
  }

  async harvestPlant(objectId: string): Promise<VillageObject | null> {
    return this.prisma.villageObject.update({
      where: {
        id: objectId,
        objectType: 'PLANT'
      },
      data: {
        growthLevel: 0.0,         // Reset growth after harvest (0%)
        lastHarvested: new Date() // Track when harvested
      }
    });
  }

  async calculatePlantStats(objectId: string): Promise<{ waterLevel: number, growthLevel: number }> {
    const plant = await this.prisma.villageObject.findUnique({
      where: { id: objectId, objectType: 'PLANT' }
    });

    if (!plant || !plant.lastWatered || !plant.plantedAt) {
      throw new Error('Invalid plant object');
    }

    const now = new Date();

    // Calculate water level decay
    const hoursSinceWatered = (now.getTime() - plant.lastWatered.getTime()) / (1000 * 60 * 60);
    const waterDecay = hoursSinceWatered * (plant.waterDecayRate || 0.04);
    const currentWaterLevel = Math.max(0, (plant.waterLevel || 1.0) - waterDecay);

    // Calculate growth level increase
    const hoursSincePlanted = (now.getTime() - plant.plantedAt.getTime()) / (1000 * 60 * 60);
    const growthIncrease = hoursSincePlanted * (plant.growthRate || 0.014);
    const currentGrowthLevel = Math.min(1.0, (plant.growthLevel || 0.0) + growthIncrease);

    return {
      waterLevel: currentWaterLevel,
      growthLevel: currentGrowthLevel
    };
  }

  async updatePlantStats(objectId: string): Promise<VillageObject> {
    const { waterLevel, growthLevel } = await this.calculatePlantStats(objectId);

    return this.prisma.villageObject.update({
      where: { id: objectId },
      data: { waterLevel, growthLevel }
    });
  }

  async updateVillageBaseline(villageId: string, baselineUrl: string): Promise<Village> {
    return this.prisma.village.update({
      where: { id: villageId },
      data: { baselineUrl }
    });
  }

  async updateVillageBaselineByGuildId(guildId: string, baselineUrl: string): Promise<Village> {
    return this.prisma.village.update({
      where: { guildId },
      data: { baselineUrl, updatedAt: new Date() }
    });
  }

  async updateObjectBaseline(objectId: string, baselineUrl: string): Promise<void> {
    await this.prisma.villageObject.update({
      where: { id: objectId },
      data: { baselineUrl }
    });
  }

  async findPlantAtPosition(villageId: string, gridX: number, gridY: number): Promise<VillageObject | null> {
    return this.prisma.villageObject.findFirst({
      where: {
        villageId,
        gridX,
        gridY,
        objectType: 'PLANT'
      }
    });
  }

  async deleteVillage(villageId: string): Promise<void> {
    // Verify village exists before deletion
    const village = await this.prisma.village.findUnique({
      where: { id: villageId }
    });

    if (!village) {
      throw new Error('Village not found');
    }

    // Delete village (cascade will handle members and objects)
    await this.prisma.village.delete({
      where: { id: villageId }
    });
  }
}