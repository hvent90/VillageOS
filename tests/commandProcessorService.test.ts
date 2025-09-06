import { CommandProcessorService } from '../src/services/commandProcessorService';
import { VillageRepository } from '../src/repositories/villageRepository';
import { UserRepository } from '../src/repositories/userRepository';
import { VillageImageService } from '../src/services/villageImageService';
import { EnvironmentConfig } from '../src/config/environment';
import { CommandInput } from '../src/types/commands';
import { CommandName } from '../src/types/commandResults';

// Mock dependencies
jest.mock('../src/repositories/villageRepository');
jest.mock('../src/repositories/userRepository');
jest.mock('../src/services/villageImageService');
jest.mock('../src/services/llmPromptService');
jest.mock('../src/services/mediaGenerationService');
jest.mock('../src/services/mediaGenerationQueueService');
jest.mock('../src/services/gameConfigurationService');

describe('CommandProcessorService - Build Command', () => {
  let commandProcessor: CommandProcessorService;
  let mockVillageRepository: jest.Mocked<VillageRepository>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockVillageImageService: jest.Mocked<VillageImageService>;
  let mockEnvConfig: EnvironmentConfig;

  beforeEach(() => {
    // Create mocks
    mockVillageRepository = new VillageRepository({} as any) as jest.Mocked<VillageRepository>;
    mockUserRepository = new UserRepository({} as any) as jest.Mocked<UserRepository>;
    mockVillageImageService = new VillageImageService({} as any, {} as any, {} as any) as jest.Mocked<VillageImageService>;

    mockEnvConfig = {} as any;

    // Create command processor with mocked dependencies
    commandProcessor = new CommandProcessorService(
      null, // gameLogic
      mockEnvConfig,
      {} as any, // mediaGenerationService
      {} as any, // queueService
      {} as any, // configService
      mockVillageRepository,
      mockUserRepository,
      {} as any, // llmPromptService
      mockVillageImageService,
      {} as any // platformAdapter
    );
  });

  describe('handleBuildCommand', () => {
    it('should return error when required services are not available', async () => {
      // Create command processor without required services
      const incompleteProcessor = new CommandProcessorService(
        null,
        mockEnvConfig,
        {} as any,
        {} as any,
        {} as any,
        undefined, // villageRepository
        undefined, // userRepository
        {} as any,
        undefined, // villageImageService
        {} as any
      );

      const command: CommandInput = {
        name: CommandName.BUILD,
        sourceUserId: 'user123',
        serverId: 'server123',
        channelId: 'channel123',
        args: { subcommand: 'build' } as any // No description
      };

      const result = await commandProcessor.handleCommand(command);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Please specify what you want to build.');
    });

    it('should return error when village does not exist', async () => {
      mockVillageRepository.findByGuildId.mockResolvedValue(null);

      const command: CommandInput = {
        name: CommandName.BUILD,
        sourceUserId: 'user123',
        serverId: 'server123',
        channelId: 'channel123',
        args: { subcommand: 'build', description: 'wooden shed' }
      };

      const result = await commandProcessor.handleCommand(command);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Village not found. Please create a village first.');
    });

    it('should successfully create a structure when all conditions are met', async () => {
      // Mock village exists
      const mockVillage = {
        id: 'village123',
        guildId: 'server123',
        name: 'Test Village',
        baselineUrl: 'http://example.com/village.png',
        gridWidth: 10,
        gridHeight: 10,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockVillageRepository.findByGuildId.mockResolvedValue(mockVillage as any);

      // Mock user creation
      const mockUser = {
        id: 'user123',
        discordId: 'user123',
        baselineUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        displayName: null
      };
      mockUserRepository.findByDiscordId.mockResolvedValue(null);
      mockUserRepository.createUser.mockResolvedValue(mockUser as any);

      // Mock available position
      mockVillageRepository.findAvailablePosition.mockResolvedValue({ x: 1, y: 2 });

      // Mock structure creation
      const mockStructure = {
        id: 'structure123',
        name: 'wooden shed',
        objectType: 'STRUCTURE'
      };
      mockVillageRepository.addObject.mockResolvedValue(mockStructure as any);

      const command: CommandInput = {
        name: CommandName.BUILD,
        sourceUserId: 'user123',
        serverId: 'server123',
        channelId: 'channel123',
        args: { subcommand: 'build', description: 'wooden shed' }
      };

      const result = await commandProcessor.handleCommand(command);

      expect(result.success).toBe(true);
      expect(result.message).toContain('You built wooden shed!');
      expect(result.data).toEqual({ structure: mockStructure, village: mockVillage });
      expect(mockVillageRepository.addObject).toHaveBeenCalledWith(
        'village123',
        'user123',
        'STRUCTURE',
        'wooden shed',
        undefined,
        1,
        2
      );
    });

    it('should call the single-step structure generation method', async () => {
      // Mock village exists
      const mockVillage = {
        id: 'village123',
        guildId: 'server123',
        name: 'Test Village',
        baselineUrl: 'http://example.com/village.png',
        gridWidth: 10,
        gridHeight: 10,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockVillageRepository.findByGuildId.mockResolvedValue(mockVillage as any);

      // Mock user creation
      const mockUser = {
        id: 'user123',
        discordId: 'user123',
        baselineUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        displayName: null
      };
      mockUserRepository.findByDiscordId.mockResolvedValue(null);
      mockUserRepository.createUser.mockResolvedValue(mockUser as any);

      // Mock available position
      mockVillageRepository.findAvailablePosition.mockResolvedValue({ x: 1, y: 2 });

      // Mock structure creation
      const mockStructure = {
        id: 'structure123',
        name: 'wooden shed',
        objectType: 'STRUCTURE'
      };
      mockVillageRepository.addObject.mockResolvedValue(mockStructure as any);

      // Mock the single-step generation method
      const mockAsyncWorkResult = {
        mediaData: {
          type: 'image',
          url: 'http://example.com/updated-village.png',
          filename: 'village-123-updated.png',
          mimeType: 'image/png',
          caption: 'Test Village - Updated with wooden shed at (1, 2)'
        },
        message: '🏘️ Your village has been updated with the new wooden shed!'
      };

      // Spy on the single-step method
      const singleStepSpy = jest.spyOn(commandProcessor as any, 'generateSingleStepStructureBaseline');
      singleStepSpy.mockResolvedValue(mockAsyncWorkResult);

      const command: CommandInput = {
        name: CommandName.BUILD,
        sourceUserId: 'user123',
        serverId: 'server123',
        channelId: 'channel123',
        args: { subcommand: 'build', description: 'wooden shed' }
      };

      const result = await commandProcessor.handleCommand(command);

      expect(result.success).toBe(true);
      expect(singleStepSpy).toHaveBeenCalledWith(
        mockVillage,
        mockStructure,
        'wooden shed',
        1,
        2
      );
      // asyncWork is a promise that resolves to the result
      expect(result.asyncWork).toBeDefined();
      expect(typeof result.asyncWork).toBe('object');

      // Clean up spy
      singleStepSpy.mockRestore();
    });

    it('should handle errors gracefully in single-step generation', async () => {
      // Mock village exists
      const mockVillage = {
        id: 'village123',
        guildId: 'server123',
        name: 'Test Village',
        baselineUrl: 'http://example.com/village.png',
        gridWidth: 10,
        gridHeight: 10,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockVillageRepository.findByGuildId.mockResolvedValue(mockVillage as any);

      // Mock user creation
      const mockUser = {
        id: 'user123',
        discordId: 'user123',
        baselineUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        displayName: null
      };
      mockUserRepository.findByDiscordId.mockResolvedValue(null);
      mockUserRepository.createUser.mockResolvedValue(mockUser as any);

      // Mock available position
      mockVillageRepository.findAvailablePosition.mockResolvedValue({ x: 1, y: 2 });

      // Mock structure creation
      const mockStructure = {
        id: 'structure123',
        name: 'wooden shed',
        objectType: 'STRUCTURE'
      };
      mockVillageRepository.addObject.mockResolvedValue(mockStructure as any);

      // Mock the single-step method to return error result (not throw)
      const singleStepSpy = jest.spyOn(commandProcessor as any, 'generateSingleStepStructureBaseline');
      singleStepSpy.mockResolvedValue({
        message: '✅ Structure added successfully! The village image will be updated shortly.'
      });

      const command: CommandInput = {
        name: CommandName.BUILD,
        sourceUserId: 'user123',
        serverId: 'server123',
        channelId: 'channel123',
        args: { subcommand: 'build', description: 'wooden shed' }
      };

      const result = await commandProcessor.handleCommand(command);

      expect(result.success).toBe(true);
      expect(result.message).toContain('You built wooden shed!');
      // asyncWork is a promise that resolves to the result
      expect(result.asyncWork).toBeDefined();
      expect(typeof result.asyncWork).toBe('object');

      // Clean up spy
      singleStepSpy.mockRestore();
    });
  });
});