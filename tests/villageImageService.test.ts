import { VillageImageService } from '../src/services/villageImageService';
import { LLMPromptService } from '../src/services/llmPromptService';
import { MediaGenerationService } from '../src/services/mediaGenerationService';
import { VillageRepository } from '../src/repositories/villageRepository';

// Mock dependencies
jest.mock('../src/services/llmPromptService');
jest.mock('../src/services/mediaGenerationService');
jest.mock('../src/repositories/villageRepository');

describe('VillageImageService - Single-Step Structure Generation', () => {
  let villageImageService: VillageImageService;
  let mockLLMPromptService: jest.Mocked<LLMPromptService>;
  let mockMediaService: jest.Mocked<MediaGenerationService>;
  let mockVillageRepository: jest.Mocked<VillageRepository>;

  beforeEach(() => {
    // Create mocks
    mockLLMPromptService = new LLMPromptService({} as any) as jest.Mocked<LLMPromptService>;
    mockMediaService = new MediaGenerationService({} as any, {} as any) as jest.Mocked<MediaGenerationService>;
    mockVillageRepository = new VillageRepository({} as any) as jest.Mocked<VillageRepository>;

    // Create service instance
    villageImageService = new VillageImageService(
      mockMediaService,
      mockLLMPromptService,
      mockVillageRepository
    );
  });

  describe('generateVillageWithStructure', () => {
    it('should generate village image with structure using single-step approach', async () => {
      // Mock LLM service to return enhanced prompt
      mockLLMPromptService.generate.mockResolvedValue('Enhanced prompt for structure generation');

      // Mock media service to return temp file info
      const mockTempFileInfo = {
        filepath: '/tmp/generated-village.png',
        url: 'http://example.com/generated-village.png',
        filename: 'generated-village.png',
        mimeType: 'image/png',
        createdAt: new Date()
      };
      mockMediaService.generateMedia.mockResolvedValue(mockTempFileInfo);

      // Mock fetch for village baseline image
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024))
      });

      const result = await villageImageService.generateVillageWithStructure(
        'Test Village',
        'http://example.com/village-baseline.png',
        'wooden barn',
        2,
        3
      );

      expect(result).toBe('http://example.com/generated-village.png');
      expect(mockLLMPromptService.generate).toHaveBeenCalledTimes(1);
      expect(mockMediaService.generateMedia).toHaveBeenCalledWith({
        prompt: 'Enhanced prompt for structure generation',
        type: 'image',
        jobType: 'ADDING_STRUCTURE_TO_VILLAGE',
        baselineImages: ['http://example.com/village-baseline.png']
      });
    });

    it('should handle fetch errors gracefully', async () => {
      // Mock fetch to throw error
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        villageImageService.generateVillageWithStructure(
          'Test Village',
          'http://example.com/village-baseline.png',
          'wooden barn',
          2,
          3
        )
      ).rejects.toThrow('Network error');
    });

    it('should handle media generation errors gracefully', async () => {
      // Mock LLM service
      mockLLMPromptService.generate.mockResolvedValue('Enhanced prompt');

      // Mock fetch for village baseline
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024))
      });

      // Mock media service to throw error
      mockMediaService.generateMedia.mockRejectedValue(new Error('Generation failed'));

      await expect(
        villageImageService.generateVillageWithStructure(
          'Test Village',
          'http://example.com/village-baseline.png',
          'wooden barn',
          2,
          3
        )
      ).rejects.toThrow('Generation failed');
    });
  });

  describe('createVillageWithStructurePrompt', () => {
    it('should create appropriate prompt for structure generation', () => {
      const prompt = (villageImageService as any).createVillageWithStructurePrompt(
        'Test Village',
        'red barn',
        1,
        2
      );

      expect(prompt).toContain('You are adding a structure to an existing farming village scene');
      expect(prompt).toContain('red barn');
      expect(prompt).toContain('farming village');
      expect(prompt).toContain('VISUAL INTEGRATION GUIDELINES');
      expect(prompt).toContain('Match the color palette and material textures');
    });

    it('should include farming village specific guidance', () => {
      const prompt = (villageImageService as any).createVillageWithStructurePrompt(
        'Farm Village',
        'storage silo',
        3,
        4
      );

      expect(prompt).toContain('farming village');
      expect(prompt).toContain('agricultural theme');
      expect(prompt).toContain('storage silo');
    });
  });
});