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
The central area is an empty farm, currently a dirt patch suitable for growing crops.

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

  async generateVillageWithMembersImage(
    villageName: string,
    memberBaselines: Array<{userId: string, baselineUrl?: string, displayName?: string}>,
    villageBaselineUrl?: string
  ): Promise<string> {
    // Create composite prompt with village scene and member descriptions
    const prompt = this.createVillageWithMembersPrompt(villageName, memberBaselines, villageBaselineUrl);

    // Prepare baseline images array for media generation
    const baselineImages = memberBaselines
      .filter(member => member.baselineUrl)
      .map(member => member.baselineUrl!);

    // Add village baseline as primary reference if available
    if (villageBaselineUrl) {
      baselineImages.unshift(villageBaselineUrl);
    }

    // Generate image with multiple references
    const tempFileInfo = await this.mediaGenerationService.generateMedia({
      prompt: prompt,
      type: 'image',
      jobType: 'VILLAGE_BASELINE',
      baselineImages: baselineImages // New field to support multiple baselines
    });

    return tempFileInfo.url;
  }

  private createVillageWithMembersPrompt(
    villageName: string,
    members: Array<{userId: string, baselineUrl?: string, displayName?: string}>,
    villageBaselineUrl?: string
  ): string {
    const memberCount = members.length;
    const hasBaselines = members.some(m => m.baselineUrl);
    const hasVillageBaseline = !!villageBaselineUrl;

    if (hasVillageBaseline) {
      // When we have an existing village baseline, focus ONLY on adding members
      return `Take the existing village scene from the first reference image and add ${memberCount} villagers to it.

CRITICAL INSTRUCTIONS:
- DO NOT add, remove, or modify any existing buildings, crops, paths, or landscape features
- DO NOT change the village layout or composition in any way
- ONLY add the villager characters to the existing scene
- Position villagers naturally within the existing village environment
- Maintain the exact same visual elements, lighting, and atmosphere as the original
- Keep the same camera angle and composition

The villagers should be engaged in farming activities appropriate to the existing village scene.`;
    } else {
      // Original prompt for villages without baseline
      return `Create a farming village scene for "${villageName}" in a collaborative farming game.

The village has ${memberCount} members who should be shown as villagers engaged in farming activities.
${hasBaselines ? 'Use the provided reference images to represent the villagers\' appearances.' : 'Each villager should have a distinct appearance and personality.'}

Visual elements:
- Charming countryside village with rolling green hills
- Mix of traditional farmhouses and agricultural buildings
- Lush green fields and vegetable gardens
- Dirt paths winding between buildings
- Clear blue sky with fluffy white clouds
- Warm, inviting atmosphere perfect for a farming community

Composition:
- Wide landscape view showing the entire village
- Villagers positioned naturally throughout the scene
- Some working in fields, others near buildings
- Centered composition with village as main focal point

This will serve as the village's visual representation in the game showing all current members.`;
    }
  }

  async generatePlantBaseline(plantDescription: string): Promise<string> {
    const prompt = this.createPlantBaselinePrompt(plantDescription);

    const tempFileInfo = await this.mediaGenerationService.generateMedia({
      prompt,
      type: 'image',
      jobType: 'OBJECT_BASELINE'
    });

    return tempFileInfo.url;
  }

  private createPlantBaselinePrompt(plantDescription: string): string {
    return `A detailed plant: ${plantDescription}.
Show as a small seedling just sprouted from the ground.
Pixel art style, clean background, farming game aesthetic.
Single plant, centered, no other objects. Generate exactly what the user described.`;
  }

  async updateVillageBaseline(
    villageName: string,
    currentVillageBaselineUrl: string,
    plantBaselineUrl: string,
    gridX: number,
    gridY: number
  ): Promise<string> {
    const prompt = this.createVillageBaselineUpdatePrompt(villageName, gridX, gridY);

    const tempFileInfo = await this.mediaGenerationService.generateMedia({
      prompt,
      type: 'image',
      jobType: 'VILLAGE_BASELINE',
      baselineImages: [currentVillageBaselineUrl, plantBaselineUrl]
    });

    return tempFileInfo.url;
  }

  private createVillageBaselineUpdatePrompt(villageName: string, gridX: number, gridY: number): string {
    return `Update the existing landscape by adding a single instance of the plant in an appropriate area in the farm. `
        + 'The plant should be at a reasonable size to allow and not take up too much space.';
  }
}