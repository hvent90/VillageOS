// Command processor service for handling user commands
import { MediaGenerationService } from './mediaGenerationService';
import { MediaGenerationQueueService } from './mediaGenerationQueueService';
import { GameConfigurationService } from './gameConfigurationService';
import { VillageRepository } from '../repositories/villageRepository';
import { UserRepository } from '../repositories/userRepository';
import { LLMPromptService } from './llmPromptService';
import { VillageImageService } from './villageImageService';
import { CommandInput } from '../types/commands';
import { CommandResult, CommandError, CommandName, AsyncWorkResult, MediaData } from '../types/commandResults';
import { VillageObjectType } from '@prisma/client';
import { EnvironmentConfig } from '../config/environment';
import logger from '../config/logger';

export class CommandProcessorService {
    private envConfig: EnvironmentConfig;
    private mediaGenerationService: MediaGenerationService;
    private queueService: MediaGenerationQueueService;
    private configService?: GameConfigurationService;
    private villageRepository?: VillageRepository;
    private userRepository?: UserRepository;
    private llmPromptService?: LLMPromptService;
    private villageImageService?: VillageImageService;
    private platformAdapter?: any;

    constructor(
      gameLogic: any, // Removed
      envConfig: EnvironmentConfig,
      mediaGenerationService: MediaGenerationService,
      queueService: MediaGenerationQueueService,
      configService?: GameConfigurationService,
      villageRepository?: VillageRepository,
      userRepository?: UserRepository,
      llmPromptService?: LLMPromptService,
      villageImageService?: any,
      platformAdapter?: any
    ) {
      this.envConfig = envConfig;
      this.mediaGenerationService = mediaGenerationService;
      this.queueService = queueService;
      this.configService = configService;
      this.villageRepository = villageRepository;
      this.userRepository = userRepository;
      this.llmPromptService = llmPromptService;
      this.villageImageService = villageImageService;
      this.platformAdapter = platformAdapter;
   }

  async handleCommand(command: CommandInput): Promise<CommandResult> {
    logger.info({
      event: 'command_received',
      message: 'Processing user command',
      command: command.name,
      userId: command.sourceUserId,
      serverId: command.serverId
    });

    try {
      // Route command to appropriate handler
      const result = await this.routeCommand(command);

      return result;

    } catch (error) {
      logger.error({
        event: 'command_processing_error',
        error: error instanceof Error ? error.message : String(error),
        command: command.name,
        userId: command.sourceUserId
      });

      return {
        success: false,
        error: {
          type: 'INTERNAL',
          message: 'An unexpected error occurred while processing your command.'
        }
      };
    }
  }

   private async routeCommand(command: CommandInput): Promise<CommandResult> {
     // Handle Discord subcommands
     if (command.args && typeof command.args === 'object' && 'subcommand' in command.args) {
       const subcommand = (command.args as any).subcommand;

       // Extract description for me command
       if (subcommand === 'me' && (command.args as any).description) {
         command.userDescription = (command.args as any).description;
       }

        switch (subcommand) {
          case 'create':
            return await this.handleCreateCommand(command);
          case 'show':
            return await this.handleShowCommand(command);
          case 'plant':
            return await this.handlePlantCommand(command);
          case 'water':
            return await this.handleWaterCommand(command);
          case 'build':
            return await this.handleBuildCommand(command);
          case 'me':
            return await this.handleMeCommand(command);
          case 'delete':
            return await this.handleDeleteCommand(command);
          default:
            return await this.handleShowCommand(command); // Default to show
        }
     }

    // Handle legacy command routing
    switch (command.name) {
      case CommandName.PLANT:
        return await this.handlePlantCommand(command);
      case CommandName.WATER:
        return await this.handleWaterCommand(command);
      case CommandName.BUILD:
        return await this.handleBuildCommand(command);
      case CommandName.SHOW:
        return await this.handleShowCommand(command);
      case CommandName.PING:
        return await this.handlePingCommand(command);
      default:
        return {
          success: false,
          error: {
            type: 'VALIDATION',
            message: '❓ Oops! That\'s not a command I know. Try the `help` command to see available commands.'
          }
        };
    }
  }

  private async handlePlantCommand(command: CommandInput): Promise<CommandResult> {
    // Validate required services
    if (!this.villageRepository || !this.userRepository || !this.villageImageService) {
      return {
        success: false,
        error: { type: 'INTERNAL', message: 'Required services not available' }
      };
    }

    // Extract plant description from command args
    const plantDescription = command.args && typeof command.args === 'object' && 'description' in command.args
      ? (command.args as any).description
      : undefined;

    if (!plantDescription) {
      return {
        success: false,
        error: { type: 'VALIDATION', message: 'Please specify what you want to plant.' }
      };
    }

    try {
      // Check if village exists
      const village = await this.villageRepository.findByGuildId(command.serverId);
      if (!village) {
        return {
          success: false,
          error: { type: 'VALIDATION', message: 'Village not found. Please create a village first.' }
        };
      }

      // Get or create user
      let user = await this.userRepository.findByDiscordId(command.sourceUserId);
      if (!user) {
        user = await this.userRepository.createUser(command.sourceUserId);
      }

      // Find available position automatically
      const position = await this.villageRepository.findAvailablePosition(village.id);
      if (!position) {
        return {
          success: false,
          error: { type: 'VALIDATION', message: 'No available space in your village!' }
        };
      }

      // Create plant object first
      const plant = await this.villageRepository.addObject(
        village.id,
        user.id,
        VillageObjectType.PLANT,
        plantDescription,
        undefined,
        position.x,
        position.y
      );

      return {
        success: true,
        message: `🌱 You planted ${plantDescription} at position (${position.x}, ${position.y})! Generating your updated village...`,
        data: { plant, village },
        asyncWork: this.generateTwoStepPlantBaseline(village, plant, plantDescription, position.x, position.y)
      };

    } catch (error) {
      logger.error({
        event: 'plant_command_error',
        error: error instanceof Error ? error.message : String(error),
        userId: command.sourceUserId,
        serverId: command.serverId
      });

      return {
        success: false,
        error: { type: 'INTERNAL', message: 'Failed to plant crop. Please try again.' }
      };
    }
  }

  private async handleWaterCommand(command: CommandInput): Promise<CommandResult> {
    // Validate required services
    if (!this.villageRepository) {
      return {
        success: false,
        error: { type: 'INTERNAL', message: 'Required services not available' }
      };
    }

    // Extract coordinates from Discord args
    const x = command.args && typeof command.args === 'object' && 'x' in command.args
      ? (command.args as any).x
      : undefined;
    const y = command.args && typeof command.args === 'object' && 'y' in command.args
      ? (command.args as any).y
      : undefined;

    // Validate coordinates
    if (x === undefined || y === undefined) {
      return {
        success: false,
        error: { type: 'VALIDATION', message: 'Please specify both x and y coordinates for watering.' }
      };
    }

    if (x < 0 || x > 9 || y < 0 || y > 9) {
      return {
        success: false,
        error: { type: 'VALIDATION', message: 'Coordinates must be between 0 and 9.' }
      };
    }

    try {
      // Check if village exists
      const village = await this.villageRepository.findByGuildId(command.serverId);
      if (!village) {
        return {
          success: false,
          error: { type: 'VALIDATION', message: 'Village not found. Please create a village first.' }
        };
      }

      // Find plant at the specified coordinates
      const plant = await this.villageRepository.findPlantAtPosition(village.id, x, y);

      if (!plant) {
        return {
          success: false,
          error: { type: 'VALIDATION', message: `No plant found at position (${x}, ${y}).` }
        };
      }

      // Water the plant
      await this.villageRepository.waterPlant(plant.id);

      return {
        success: true,
        message: `💧 You watered the plant at (${x}, ${y})! It will grow nicely now.`
      };

    } catch (error) {
      logger.error({
        event: 'water_command_error',
        error: error instanceof Error ? error.message : String(error),
        userId: command.sourceUserId,
        serverId: command.serverId,
        coordinates: { x, y }
      });

      return {
        success: false,
        error: { type: 'INTERNAL', message: 'Failed to water plant. Please try again.' }
      };
    }
  }
  private async handleBuildCommand(command: CommandInput): Promise<CommandResult> {
    return {
      success: true,
      message: '🏗️ You built something new for your village! It\'s growing beautifully.',
      data: null,
      asyncWork: undefined
    };
  }
  private async handleCreateCommand(command: CommandInput): Promise<CommandResult> {
    if (!this.villageRepository || !this.userRepository) {
      return {
        success: false,
        error: {
          type: 'INTERNAL',
          message: 'Required services not available'
        }
      };
    }

    try {
      // Check if village already exists for this server
      const existingVillage = await this.villageRepository.findByGuildId(command.serverId);
      if (existingVillage) {
        return {
          success: false,
          error: {
            type: 'VALIDATION',
            message: 'A village already exists for this server!'
          }
        };
      }

      // Get or create user
      let user = await this.userRepository.findByDiscordId(command.sourceUserId);
      if (!user) {
        user = await this.userRepository.createUser(command.sourceUserId);
      }

      // Get village name from args
      const villageName = command.args && typeof command.args === 'object' && 'name' in command.args
        ? (command.args as any).name
        : `Village ${command.serverId.slice(-4)}`;

      // Create village with the user as the first member
      const village = await this.villageRepository.createVillageWithMembers(
        command.serverId,
        [user.id],
        villageName
      );

      // Generate village image if service is available
      let villageImageUrl: string | undefined;
      if (this.villageImageService) {
        try {
          villageImageUrl = await this.villageImageService.generateVillageImage(
            villageName,
            command.villageDescription
          );

          // Update village with generated image
          await this.villageRepository.updateVillageBaselineByGuildId(command.serverId, villageImageUrl);
        } catch (error) {
          logger.warn({
            event: 'village_image_generation_failed',
            error: error instanceof Error ? error.message : String(error),
            villageId: village.id
          });
          // Continue with village creation even if image generation fails
        }
      }

      const successMessage = villageImageUrl
        ? `🏘️ Village "${village.name}" has been created with a beautiful landscape! Use \`/village show\` to see your village.`
        : `🏘️ Village "${village.name}" has been created! Use \`/village show\` to see your village status.`;

      return {
        success: true,
        message: successMessage,
        mediaData: villageImageUrl ? {
          type: 'image',
          url: villageImageUrl,
          filename: `village-${village.id}.png`,
          mimeType: 'image/png'
        } : undefined
      };
    } catch (error) {
      logger.error({
        event: 'village_creation_error',
        error: error instanceof Error ? error.message : String(error),
        userId: command.sourceUserId,
        serverId: command.serverId
      });

      return {
        success: false,
        error: {
          type: 'INTERNAL',
          message: 'Failed to create village. Please try again.'
        }
      };
    }
  }
  private async handleShowCommand(command: CommandInput): Promise<CommandResult> {
    if (!this.villageRepository) {
      return {
        success: false,
        error: {
          type: 'INTERNAL',
          message: 'Village repository not available'
        }
      };
    }

    const village = await this.villageRepository.findByGuildId(command.serverId);
    if (!village) {
      return {
        success: false,
        error: {
          type: 'VALIDATION',
          message: 'Village not found. Please create a village first with `/village create`.'
        }
      };
    }

    // Get village members with baseline URLs
    const villageMembers = await this.villageRepository.getVillageMembers(village.id);
    const memberList = villageMembers
      .map(member => member.user.displayName || member.user.discordId)
      .join(', ');
    const membersWithBaselines = villageMembers.map(member => ({
      userId: member.userId,
      baselineUrl: member.user.baselineUrl,
      displayName: member.user.displayName || member.user.discordId
    }));

    // Return immediate response with async work
    return {
      success: true,
      message: `🏘️ **${village.name || 'Village'}**\n👥 **Members:** ${memberList}\n🎨 *Generating village image...*`,
      data: { village, members: villageMembers },
      asyncWork: this.generateVillageShowImage(village, membersWithBaselines)
    };
  }

  private async generateVillageShowImage(
    village: any,
    members: Array<{userId: string, baselineUrl?: string, displayName?: string}>
  ): Promise<AsyncWorkResult> {
    try {
      if (!this.villageImageService) {
        throw new Error('Village image service not available');
      }

      const villageName = village.name || `Village ${village.guildId.slice(-4)}`;
      const villageBaselineUrl = village.baselineUrl;

      const imageUrl = await this.villageImageService.generateVillageWithMembersImage(
        villageName,
        members,
        villageBaselineUrl
      );

      return {
        mediaData: {
          type: 'image',
          url: imageUrl,
          filename: `village-${village.id}-show.png`,
          mimeType: 'image/png',
          caption: `${villageName} - Village with ${members.length} members`
        },
        message: `🏘️ Here's your village!`
      };
    } catch (error) {
      console.error('Failed to generate village show image:', error);
      return {
        message: `❌ Failed to generate village image. The village information is still available above.`
      };
    }
  }

  private async generateTwoStepPlantBaseline(
    village: any,
    plant: any,
    plantDescription: string,
    gridX: number,
    gridY: number
  ): Promise<AsyncWorkResult> {
    try {
      if (!this.villageImageService || !this.villageRepository) {
        throw new Error('Required services not available');
      }

      // Step 1: Generate plant baseline
      const plantBaselineUrl = await this.villageImageService.generatePlantBaseline(plantDescription);

      // Update plant object with baseline URL
      await this.villageRepository.updateObjectBaseline(plant.id, plantBaselineUrl);

      // Step 2: Update village baseline with new plant
      const villageName = village.name || `Village ${village.guildId.slice(-4)}`;
      const currentVillageBaseline = village.baselineUrl;

      if (!currentVillageBaseline) {
        throw new Error('Village has no baseline image to update');
      }

      const updatedVillageBaselineUrl = await this.villageImageService.updateVillageBaseline(
        villageName,
        currentVillageBaseline,
        plantBaselineUrl,
        gridX,
        gridY
      );

      // Step 3: Save new village baseline
      await this.villageRepository.updateVillageBaselineByGuildId(village.guildId, updatedVillageBaselineUrl);

      return {
        mediaData: {
          type: 'image',
          url: updatedVillageBaselineUrl,
          filename: `village-${village.id}-updated.png`,
          mimeType: 'image/png',
          caption: `${villageName} - Updated with ${plantDescription} at (${gridX}, ${gridY})`
        },
        message: `🏘️ Your village has been updated with the new ${plantDescription}!`
      };

    } catch (error) {
      console.error('Failed to generate two-step plant baseline:', error);
      return {
        message: `✅ Plant added successfully! The village image will be updated shortly.`
      };
    }
  }

   private async handlePingCommand(command: CommandInput): Promise<CommandResult> {
     if (!this.villageRepository) {
       return {
         success: false,
         error: {
           type: 'INTERNAL',
           message: 'Village repository not available'
         }
       };
     }

     const village = await this.villageRepository.findByGuildId(command.serverId);
     if (!village) {
       return {
         success: false,
         error: {
           type: 'VALIDATION',
           message: 'Village not found. Please start a village first.'
         }
       };
     }

     // Get village members using the dedicated method
     const villageMembers = await this.villageRepository.getVillageMembers(village.id);
     const memberList = villageMembers
       .map(member => member.user.displayName || member.user.discordId)
       .join(', ');

     return {
       success: true,
       message: `pong! 👋 Village members: ${memberList}`,
       data: { memberCount: villageMembers.length }
     };
   }

  private async handleMeCommand(command: CommandInput): Promise<CommandResult> {
    if (!command.userDescription) {
      return {
        success: false,
        error: {
          type: 'VALIDATION',
          message: 'Please provide a description of how you want to look.'
        }
      };
    }

    if (!this.userRepository || !this.llmPromptService) {
      return {
        success: false,
        error: {
          type: 'INTERNAL',
          message: 'Required services not available'
        }
      };
    }

    try {
      // Check if user exists, create if not
      let user = await this.userRepository.findByDiscordId(command.sourceUserId);
      if (!user) {
        user = await this.userRepository.createUser(command.sourceUserId);
      }

      // Step 1: Use LLM to optimize the user's description into an effective prompt
      const optimizedPrompt = await this.optimizePromptWithLLM(command.userDescription);

      // Step 2: Generate image directly using the media generation service
      const tempFileInfo = await this.mediaGenerationService.generateMedia({
        prompt: optimizedPrompt,
        type: 'image',
        jobType: 'BASELINE'
      });

      // Convert TempFileInfo to MediaData
      const mediaData: MediaData = {
        type: 'image',
        url: tempFileInfo.url,
        filename: tempFileInfo.filename,
        mimeType: 'image/png' // Assuming PNG for now
      };

      // Step 3: Update user's baseline URL
      await this.userRepository.updateUserBaseline(command.sourceUserId, mediaData.url);

      return {
        success: true,
        message: '✨ Your new appearance has been generated!',
        mediaData: mediaData
      };

    } catch (error) {
      logger.error({
        event: 'character_customization_error',
        error: error instanceof Error ? error.message : String(error),
        userId: command.sourceUserId
      });
      return {
        success: false,
        error: {
          type: 'INTERNAL',
          message: '❌ Sorry, we couldn\'t generate your custom appearance right now. Please try again later.'
        }
      };
    }
  }

  private async handleDeleteCommand(command: CommandInput): Promise<CommandResult> {
    if (!this.villageRepository) {
      return {
        success: false,
        error: { type: 'INTERNAL', message: 'Village service unavailable' }
      };
    }

    try {
      // Find village by server ID
      const village = await this.villageRepository.findByGuildId(command.serverId);
      if (!village) {
        return {
          success: false,
          error: { type: 'VALIDATION', message: 'No village found for this server' }
        };
      }

      // Delete village (cascade handles cleanup)
      await this.villageRepository.deleteVillage(village.id);

      return {
        success: true,
        message: `🗑️ Village "${village.name || 'Unnamed'}" has been permanently deleted. All members and objects have been removed.`
      };

    } catch (error) {
      logger.error({
        event: 'village_delete_error',
        error: error instanceof Error ? error.message : String(error),
        serverId: command.serverId
      });

      return {
        success: false,
        error: { type: 'INTERNAL', message: 'Failed to delete village' }
      };
    }
  }

   private async optimizePromptWithLLM(userDescription: string): Promise<string> {
     const optimizationPrompt = `You are optimizing user descriptions for a farming village character image generator. ` +
         `User wants to look like: "${userDescription}". `+
         `If the user has not explicitly stated a style or aesthetic, default to a cute pixel-art style.`;

     // Use existing LLM service
     if (!this.llmPromptService) {
       return userDescription; // Fallback to original if LLM service not available
     }

     const response = await this.llmPromptService.generate(optimizationPrompt);
     return response ? response.trim() : userDescription; // Fallback to original if LLM fails
   }

   private validateMeDescription(description: string): { valid: boolean, error?: string } {
     if (description.length < 10) {
       return { valid: false, error: 'Description must be at least 10 characters long.' };
     }
     if (description.length > 200) {
       return { valid: false, error: 'Description must be less than 200 characters.' };
     }
     // Check for inappropriate content (basic filter)
     const inappropriateWords = ['inappropriate', 'offensive', 'nsfw', 'adult', 'explicit'];
     if (inappropriateWords.some(word => description.toLowerCase().includes(word))) {
       return { valid: false, error: 'Please keep descriptions appropriate for all ages.' };
     }
     return { valid: true };
   }

  async sendResult(channelId: string, result: CommandResult): Promise<void> {
    if (this.platformAdapter) {
      await this.platformAdapter.sendResult(channelId, result);
    }
  }
}