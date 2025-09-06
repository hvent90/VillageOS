import { MediaGenerationService } from './mediaGenerationService';
import { LLMPromptService } from './llmPromptService';
import { VillageRepository } from '../repositories/villageRepository';

export class VillageImageService {
  constructor(
    private mediaGenerationService: MediaGenerationService,
    private llmPromptService: LLMPromptService,
    private villageRepository: VillageRepository
  ) {}

  async generateVillageImage(villageName: string, description?: string): Promise<string> {
    // Step 1: Create or optimize prompt
    const prompt = description
      ? await this.optimizeVillagePrompt(villageName, description)
      : this.createDefaultVillagePrompt(villageName);

    // Step 2: Generate image using media service
    const tempFileInfo = await this.mediaGenerationService.generateMedia({
      prompt: prompt,
      type: 'image',
      jobType: 'VILLAGE_BASELINE'
    });

    return tempFileInfo.url;
  }

  async updateVillageImage(guildId: string, description?: string): Promise<string> {
    // Get village name from repository
    const village = await this.villageRepository.findByGuildId(guildId);
    if (!village) {
      throw new Error('Village not found');
    }

    const villageName = village.name || `Village ${guildId.slice(-4)}`;
    const imageUrl = await this.generateVillageImage(villageName, description);

    // Update village baseline
    await this.villageRepository.updateVillageBaselineByGuildId(guildId, imageUrl);

    return imageUrl;
  }

  private async optimizeVillagePrompt(villageName: string, description: string): Promise<string> {
    const optimizationPrompt = `You are optimizing user descriptions for a farming village image generator.

User wants their village to look like: "${description}".

The village is currently an EMPTY PLOT OF LAND.
The user interacts with the village via a 2D grid, so make sure to keep in mind that we are trying to visualize a PLOT of land.

Create an optimized prompt for Gemini AI image generation that will produce a beautiful, atmospheric village scene suitable for a collaborative farming game.

Return only the optimized prompt, no additional text or explanation.`;

    const response = await this.llmPromptService.generate(optimizationPrompt);
    const trimmedResponse = response?.trim();
    return trimmedResponse ? trimmedResponse : this.createDefaultVillagePrompt(villageName);
  }

  private createDefaultVillagePrompt(villageName: string): string {
    return `Create a beautiful, peaceful farming village scene for "${villageName}" in a collaborative farming game.

Visual Details:
- Charming countryside village with rolling green hills
- Mix of traditional farmhouses and modern agricultural buildings
- Lush green fields and vegetable gardens
- Dirt paths winding between buildings
- Clear blue sky with fluffy white clouds
- Warm, inviting atmosphere perfect for a farming community
- Pixel art style with clean, retro gaming aesthetics
- Centered composition showing the village as the main focal point

This will serve as the village's visual representation in the game.`;
  }
}