// Command types and interfaces
import { CommandName } from './commandResults';

export interface CommandInput {
  name: CommandName;  // Changed from string to CommandName enum
  sourceUserId: string;
  targetUserId?: string;
  serverId: string;
  channelId: string;
  args?: string[];
  userDescription?: string;  // For character customization
  villageDescription?: string;  // NEW: For village creation
  referenceImageUrl?: string; // NEW: Optional reference image URL
}

export interface InteractionResult {
  sourcePlayerMessage: string;
  targetPlayerMessage?: string;
  sourceVillageState: any;
  targetVillageState?: any;
}

export type CommandType = 'solo' | 'social';

export interface VillageImageResult {
  villageId: string;
  imageUrl: string;
  description?: string;
}
