import { VillageObjectType } from '@prisma/client';

export interface VillageContext {
  id: string;
  groupHash: string;
  name?: string;
  gridWidth: number;
  gridHeight: number;
  baselineUrl?: string;
  members: VillageMemberContext[];
  objects: VillageObjectContext[];
}

export interface VillageMemberContext {
  id: string;
  userId: string;
  user: {
    id: string;
    phoneNumber: string;
    displayName?: string;
    baselineUrl?: string;
  };
  joinedAt: Date;
}

export interface VillageObjectContext {
  id: string;
  gridX: number;
  gridY: number;
  objectType: VillageObjectType;
  name: string;
  enhancedDescription?: string;
  // Plant-specific properties
  waterLevel?: number;        // 0.0-1.0 (1.0 = fully watered)
  lastWatered?: Date;
  waterDecayRate?: number;    // Percentage decay per hour
  growthLevel?: number;       // 0.0-1.0 (1.0 = ready to harvest)
  plantedAt?: Date;
  growthRate?: number;        // Percentage growth per hour
  lastHarvested?: Date;
  // Visual
  baselineUrl?: string;
  // Creator info
  creator: {
    id: string;
    phoneNumber: string;
    displayName?: string;
  };
}

export interface CreateVillageRequest {
  groupHash: string;
  memberUserIds: string[];  // All phone numbers from initial group text
  name?: string;
}

export interface AddObjectRequest {
  villageId: string;
  creatorId: string;
  objectType: VillageObjectType;
  name: string;
  enhancedDescription?: string;
  gridX?: number;
  gridY?: number;
}

export interface WaterPlantRequest {
  objectId: string;
}

export interface HarvestPlantRequest {
  objectId: string;
}

export interface PlacementPosition {
  x: number;
  y: number;
}