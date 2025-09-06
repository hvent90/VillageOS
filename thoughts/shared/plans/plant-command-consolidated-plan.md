# Plant Command Implementation Plan

## Overview

Implement the `handlePlantCommand` with a two-step baseline image generation process that allows users to plant any crop they describe, with automatic positioning and persistent baseline management.

## Current State Analysis

Currently, the VillageOS system has:
- Basic command processing infrastructure in `CommandProcessorService`
- Village and VillageObject database entities with baseline URL support
- Media generation service with job queue system
- Existing command handlers for create, status, and other village operations

### Key Discoveries:
- `VillageObject.baselineUrl` field exists but is not utilized for plant baselines
- `MediaGenerationService` supports `OBJECT_BASELINE` and `VILLAGE_BASELINE` job types
- `VillageRepository.findAvailablePosition()` method needs to be implemented for automatic positioning
- Current village commands use immediate responses, but plant command requires async baseline generation

## Desired End State

After implementation, users will be able to:
- Plant any crop they describe using natural language: `/village plant crop:"magical sunflowers"`
- See their village automatically updated with the new plant at an available position
- Have persistent baseline images for both individual plants and the complete village

**Verification**: A user can run `/village plant crop:"glowing carrots"`, receive a success message, and see an updated village image with the plant precisely placed at the specified grid coordinates.

## What We're NOT Doing

- Manual coordinate specification (positioning is automatic)
- Predefined crop types or restrictions on plant descriptions
- Real-time plant growth or time-based mechanics
- Plant interaction commands (watering, harvesting) - those are separate features
- Integration with existing plant/water/harvest legacy commands
- Villager avatars in village baseline images (villagers shown separately)

## Implementation Approach

Two-step baseline generation process:
1. Generate standalone plant baseline image from user description
2. Composite the plant baseline with current village baseline at precise grid coordinates

This approach ensures visual consistency, precise positioning, and reusable plant baselines for future village updates.

## Phase 1: Repository and Image Service Enhancement

### Overview
Add the foundational methods needed for plant baseline generation and village baseline updates.

### Changes Required:

#### 1. VillageRepository Enhancement
**File**: `src/repositories/villageRepository.ts`
**Changes**: Add methods for baseline URL updates and position finding

```typescript
async updateObjectBaseline(objectId: string, baselineUrl: string): Promise<void> {
  await this.prisma.villageObject.update({
    where: { id: objectId },
    data: { baselineUrl }
  });
}

async updateVillageBaselineByGuildId(guildId: string, baselineUrl: string): Promise<void> {
  await this.prisma.village.update({
    where: { guildId },
    data: { baselineUrl }
  });
}

async findAvailablePosition(villageId: string): Promise<{x: number, y: number} | null> {
  const maxGridSize = 10; // 10x10 grid
  const occupiedPositions = await this.prisma.villageObject.findMany({
    where: { villageId },
    select: { gridX: true, gridY: true }
  });
  
  const occupied = new Set(occupiedPositions.map(pos => `${pos.gridX},${pos.gridY}`));
  
  for (let y = 0; y < maxGridSize; y++) {
    for (let x = 0; x < maxGridSize; x++) {
      if (!occupied.has(`${x},${y}`)) {
        return { x, y };
      }
    }
  }
  return null;
}
```

#### 2. VillageImageService Enhancement
**File**: `src/services/villageImageService.ts`
**Changes**: Add plant baseline generation and village baseline update methods

```typescript
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
  return `A detailed plant: ${plantDescription}. ` +
    `Show as a small seedling just sprouted from the ground. ` +
    `Pixel art style, clean background, farming game aesthetic. ` +
    `Single plant, centered, no other objects. Generate exactly what the user described.`;
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
    baselineUrls: [currentVillageBaselineUrl, plantBaselineUrl]
  });

  return tempFileInfo.url;
}

private createVillageBaselineUpdatePrompt(villageName: string, gridX: number, gridY: number): string {
  return `Update the farming village environment "${villageName}" by adding the new plant at grid position (${gridX}, ${gridY}). ` +
    `Combine the existing village landscape with the new plant. ` +
    `Show only the village environment - fields, buildings, paths, and plants. ` +
    `DO NOT include any people or villagers in this image. ` +
    `Place the plant precisely at the specified grid coordinates. ` +
    `Bird's eye view, farming village style, cohesive and natural integration.`;
}
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `npm run build`
- [x] Unit tests pass: `npm test`
- [x] Linting passes: `npm run lint`
- [x] Database operations work without errors

#### Manual Verification:
- [ ] Repository methods can be called without runtime errors
- [ ] VillageImageService methods integrate properly with MediaGenerationService
- [ ] findAvailablePosition returns valid coordinates for empty villages
- [ ] findAvailablePosition returns null for full villages

---

## Phase 2: Command Handler Implementation

### Overview
Implement the `handlePlantCommand` method in CommandProcessorService with two-step baseline generation process.

### Changes Required:

#### 1. CommandProcessorService Plant Command
**File**: `src/services/commandProcessorService.ts`
**Changes**: Add handlePlantCommand method and async baseline generation

```typescript
private async handlePlantCommand(command: CommandInput): Promise<CommandResult> {
  // Validate required services
  if (!this.villageRepository || !this.userRepository || !this.villageImageService) {
    return {
      success: false,
      error: { type: 'INTERNAL', message: 'Required services not available' }
    };
  }

  // Extract plant description from command args
  const plantDescription = command.args && typeof command.args === 'object' && 'crop' in command.args
    ? (command.args as any).crop
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
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `npm run build`
- [x] Unit tests pass: `npm test`
- [x] Integration test passes: `node test-basic.js`
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [x] Plant command responds immediately with success message
- [x] VillageObject is created in database with correct position
- [x] Async baseline generation completes without errors
- [x] Village baseline URL is updated after plant generation
- [x] Error handling works for invalid plant descriptions
- [x] "No available space" error works for full villages

---

## Phase 3: Command Router Integration

### Overview
Integrate the new plant command into the existing command routing system.

### Changes Required:

#### 1. Command Router Update
**File**: `src/services/commandProcessorService.ts`
**Changes**: Add plant command to the routing logic

```typescript
// In the main command processing method, add:
case 'plant':
  return this.handlePlantCommand(command);
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `npm run build`
- [x] Unit tests pass: `npm test`
- [x] Integration test passes: `node test-basic.js`

#### Manual Verification:
- [x] `/village plant crop:"test plant"` command is recognized and routed correctly
- [x] Other village commands continue to work normally
- [x] Invalid plant commands return appropriate error messages

---

## Testing Strategy

### Unit Tests:
- Test `findAvailablePosition` with empty, partially filled, and full villages
- Test plant description validation and sanitization
- Test error handling for missing services or invalid data
- Mock media generation service responses

### Integration Tests:
1. Create village: `/village create TestFarm`
2. Plant first crop: `/village plant crop:"glowing blue roses"`
3. Verify success message and database object creation
4. Plant second crop: `/village plant crop:"towering sunflowers"`
5. Verify both plants exist at different positions
6. Keep planting until "no available space" error
7. Verify each plant has baseline URL in database

### Manual Testing Steps:
1. Test with various plant descriptions (short, long, creative)
2. Test edge cases: empty description, special characters
3. Verify village baseline image updates correctly
4. Test performance with multiple rapid plant commands
5. Verify error handling when media generation fails

## Performance Considerations

The two-step baseline generation process involves:
- Two separate media generation API calls per plant command
- Database updates for both plant object and village baseline
- Async processing to avoid blocking user response

Optimizations:
- Use async work pattern to respond immediately to user
- Cache plant baselines for identical descriptions
- Batch village baseline updates if multiple plants added quickly

## Migration Notes

No database migrations required - existing schema supports:
- `VillageObject.baselineUrl` for individual plant baselines
- `Village.baselineUrl` for composite village baselines
- `VillageObjectType.PLANT` enum value already exists

Existing village data will be preserved and new plant functionality will work with existing villages.

## References

- Original plan: `thoughts/shared/plans/plant-command-consolidated-plan.md`
- Database schema: `prisma/schema.prisma`
- Command processing pattern: `src/services/commandProcessorService.ts:handleCreateCommand`
- Media generation service: `src/services/mediaGenerationService.ts`

