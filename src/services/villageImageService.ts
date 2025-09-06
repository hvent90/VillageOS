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

If the user has not specified a style or aesthetic, default to a cute pixel-art style.

Create an optimized prompt for Gemini AI image generation that will produce a beautiful, atmospheric village scene suitable for a collaborative farming game.

Make sure that the camera is from a near-birdseye perspective. We want to be able to showcase a lot of land that we can further develop later on a near equally-distant plane from the camera.

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

  async generateStructureBaseline(structureDescription: string): Promise<string> {
    const prompt = await this.llmPromptService.generate(this.createStructureBaselinePrompt(structureDescription));

    const tempFileInfo = await this.mediaGenerationService.generateMedia({
      prompt,
      type: 'image',
      jobType: 'OBJECT_BASELINE'
    });

    return tempFileInfo.url;
  }

  async generatePlantBaseline(plantDescription: string): Promise<string> {
    const prompt = await this.llmPromptService.generate(this.createPlantBaselinePrompt(plantDescription));

    const tempFileInfo = await this.mediaGenerationService.generateMedia({
      prompt,
      type: 'image',
      jobType: 'OBJECT_BASELINE'
    });

    return tempFileInfo.url;
  }

  private createStructureBaselinePrompt(structureDescription: string): string {
    return `A detailed structure: ${structureDescription}.
Show as a small building/structure suitable for a farming village.
If the user has not specified a style or aesthetic, default to a cute pixel-art style.
Single structure, centered, no other objects. Generate exactly what the user described.`;
  }

  private createPlantBaselinePrompt(plantDescription: string): string {
    return `A detailed plant: ${plantDescription}.
Show as a small seedling just sprouted from the ground.
If the user has not specified a style or aesthetic, default to a cute pixel-art style.
Single plant, centered, no other objects. Generate exactly what the user described.`;
  }

  async updateVillageBaseline(
    villageName: string,
    currentVillageBaselineUrl: string,
    objectBaselineUrl: string,
    gridX: number,
    gridY: number,
    objectType: 'plant' | 'structure' = 'plant'
  ): Promise<string> {
    // Fetch both object baseline and village baseline images for multi-modal prompt generation
    const [objectImageResponse, villageImageResponse] = await Promise.all([
      fetch(objectBaselineUrl),
      fetch(currentVillageBaselineUrl)
    ]);

    const [objectImageBuffer, villageImageBuffer] = await Promise.all([
      objectImageResponse.arrayBuffer(),
      villageImageResponse.arrayBuffer()
    ]);

    const imageData = [
      { data: Buffer.from(objectImageBuffer), mimeType: 'image/png' },   // Object baseline
      { data: Buffer.from(villageImageBuffer), mimeType: 'image/png' }   // Village baseline
    ];

    const prompt = await this.llmPromptService.generate(
      this.createVillageBaselineUpdatePrompt(villageName, gridX, gridY, objectType),
      imageData
    );

    const tempFileInfo = await this.mediaGenerationService.generateMedia({
      prompt,
      type: 'image',
      jobType: 'ADDING_PLANT_TO_VILLAGE',
      baselineImages: [currentVillageBaselineUrl, objectBaselineUrl]
    });

    return tempFileInfo.url;
  }

  private createVillageBaselineUpdatePrompt(villageName: string, gridX: number, gridY: number, objectType: 'plant' | 'structure' = 'plant'): string {
    const objectTypeText = objectType === 'plant' ? 'plant' : 'structure';

    return `You are adding a ${objectTypeText} to an existing village scene. You have two reference images:
1. First image: The ${objectTypeText}'s appearance that needs to be added
2. Second image: The current village scene where the ${objectTypeText} should be placed

Update the existing village landscape by adding a single instance of the ${objectTypeText} from the first reference image to the village scene shown in the second reference image.

CRITICAL REQUIREMENTS:
- The ${objectTypeText} should maintain the same core visual characteristics (colors, style, key features) as shown in the first reference image
- Feel free to adjust perspective, angle, and lighting as needed to make the ${objectTypeText} fit naturally into the village composition
- Use the second reference image to understand the current village layout, existing elements, and available space
- Place the ${objectTypeText} at a reasonable size that fits naturally in the scene
- Position the ${objectTypeText} in an appropriate location within the village that doesn't overlap existing elements
- Maintain the same art style and visual quality as both reference images
- Ensure the ${objectTypeText} fits naturally into the existing village composition

Both reference images show the visual context needed for natural ${objectTypeText} placement.`;
  }
}