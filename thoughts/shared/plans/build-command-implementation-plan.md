# Build Command Implementation Plan

## Overview

Implement the `!village build` command to allow users to build structures of their own description and place them within the village. The flow will mirror the existing plant command but create structures instead of plants, with full image generation and village integration.

## Current State Analysis

The build command currently exists as a placeholder in `CommandProcessorService.handleBuildCommand()` that returns a simple success message without any actual functionality. The database schema and repository already support structures through `VillageObjectType.STRUCTURE`, but no image generation or command logic exists yet.

### Key Discoveries:
- Database schema supports `VillageObjectType.STRUCTURE` with nullable plant-specific fields
- `VillageRepository.addObject()` can create structures (already implemented)
- Village image service has plant baseline generation but lacks structure baseline methods
- Command routing exists in `CommandProcessorService.routeCommand()` for both legacy and Discord subcommands
- Plant command provides the exact pattern to follow for structure implementation

## Desired End State

Users can successfully build custom structures in their village by:
1. Running `/village build "structure description"` (e.g., "a small wooden shed", "stone well", "fence")
2. System validates the command and finds available village space
3. Structure is created in the database with user-provided description
4. Structure baseline image is generated using AI
5. Village baseline is updated to include the new structure
6. User receives confirmation with updated village image

## What We're NOT Doing

- Complex structure types or categories (keeping it simple like plants)
- Structure-specific stats or mechanics (water levels, growth, etc.)
- Multi-tile structures or advanced placement logic
- Structure interaction mechanics (beyond visual placement)
- Resource requirements or building costs

## Implementation Approach

Follow the exact same pattern as the plant command:
1. Extract and validate structure description from command args
2. Check village exists and find available position
3. Create structure object in database using existing `addObject()` method
4. Generate structure baseline image (new method needed)
5. Update village baseline with new structure (adapt existing plant logic)
6. Return success with async work for image generation

## Phase 1: Core Build Command Logic

### Overview
Implement the basic build command functionality following the plant command pattern, but create structures instead of plants.

### Changes Required:

#### 1. CommandProcessorService.handleBuildCommand()
**File**: `src/services/commandProcessorService.ts`
**Changes**: Replace placeholder implementation with full build logic

```typescript
private async handleBuildCommand(command: CommandInput): Promise<CommandResult> {
  // Validate required services
  if (!this.villageRepository || !this.userRepository || !this.villageImageService) {
    return {
      success: false,
      error: { type: 'INTERNAL', message: 'Required services not available' }
    };
  }

  // Extract structure description from command args
  const structureDescription = command.args && typeof command.args === 'object' && 'description' in command.args
    ? (command.args as any).description
    : undefined;

  if (!structureDescription) {
    return {
      success: false,
      error: { type: 'VALIDATION', message: 'Please specify what you want to build.' }
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

    // Create structure object
    const structure = await this.villageRepository.addObject(
      village.id,
      user.id,
      VillageObjectType.STRUCTURE,
      structureDescription,
      undefined,
      position.x,
      position.y
    );

    return {
      success: true,
      message: `🏗️ You built ${structureDescription}! Generating your updated village...`,
      data: { structure, village },
      asyncWork: this.generateTwoStepStructureBaseline(village, structure, structureDescription, position.x, position.y)
    };

  } catch (error) {
    logger.error({
      event: 'build_command_error',
      error: error instanceof Error ? error.message : String(error),
      userId: command.sourceUserId,
      serverId: command.serverId
    });

    return {
      success: false,
      error: { type: 'INTERNAL', message: 'Failed to build structure. Please try again.' }
    };
  }
}
```

### Success Criteria:

#### Automated Verification:
- [x] Command routing works for both legacy and Discord subcommands
- [x] Database operations complete without errors
- [x] Error handling works for missing services and invalid inputs

#### Manual Verification:
- [ ] `/village build "wooden shed"` creates structure in database
- [ ] Command returns appropriate error messages for invalid inputs
- [ ] Village existence is properly validated
- [ ] User creation works for new users

---

## Phase 2: Structure Image Generation

### Overview
Add structure baseline generation methods to VillageImageService, adapting the existing plant baseline logic for structures.

### Changes Required:

#### 1. VillageImageService.generateStructureBaseline()
**File**: `src/services/villageImageService.ts`
**Changes**: Add new method for generating structure baseline images

```typescript
async generateStructureBaseline(structureDescription: string): Promise<string> {
  const prompt = await this.llmPromptService.generate(this.createStructureBaselinePrompt(structureDescription));

  const tempFileInfo = await this.mediaGenerationService.generateMedia({
    prompt,
    type: 'image',
    jobType: 'OBJECT_BASELINE'
  });

  return tempFileInfo.url;
}
```

#### 2. VillageImageService.createStructureBaselinePrompt()
**File**: `src/services/villageImageService.ts`
**Changes**: Add private method for structure baseline prompts

```typescript
private createStructureBaselinePrompt(structureDescription: string): string {
  return `A detailed structure: ${structureDescription}.
Show as a small building/structure suitable for a farming village.
If the user has not specified a style or aesthetic, default to a cute pixel-art style.
Single structure, centered, no other objects. Generate exactly what the user described.`;
}
```

#### 3. VillageImageService.updateVillageBaseline() adaptation
**File**: `src/services/villageImageService.ts`
**Changes**: Update existing method to handle both plants and structures

```typescript
async updateVillageBaseline(
  villageName: string,
  currentVillageBaselineUrl: string,
  objectBaselineUrl: string,
  gridX: number,
  gridY: number,
  objectType: 'plant' | 'structure' = 'plant'
): Promise<string> {
  // ... existing fetch logic ...

  const prompt = await this.llmPromptService.generate(
    this.createVillageBaselineUpdatePrompt(villageName, gridX, gridY, objectType),
    imageData
  );

  // ... existing media generation logic ...
}
```

#### 4. VillageImageService.createVillageBaselineUpdatePrompt() adaptation
**File**: `src/services/villageImageService.ts`
**Changes**: Update prompt generation to handle structures

```typescript
private createVillageBaselineUpdatePrompt(villageName: string, gridX: number, gridY: number, objectType: 'plant' | 'structure' = 'plant'): string {
  const objectTypeText = objectType === 'plant' ? 'plant' : 'structure';

  return `You are adding a ${objectTypeText} to an existing village scene. You have two reference images:
1. First image: The ${objectTypeText}'s appearance that needs to be added
2. Second image: The current village scene where the ${objectTypeText} should be placed

Update the existing village landscape by adding a single instance of the ${objectTypeText} from the first reference image to the village scene shown in the second reference image.

CRITICAL REQUIREMENTS:
- The ${objectTypeText} must match EXACTLY the appearance, colors, and features shown in the first reference image
- Use the second reference image to understand the current village layout, existing elements, and available space
- Place the ${objectTypeText} at a reasonable size that fits naturally in the scene
- Position the ${objectTypeText} in an appropriate location within the village that doesn't overlap existing elements
- Maintain the same art style and visual quality as both reference images
- Ensure the ${objectTypeText} fits naturally into the existing village composition

Both reference images show the exact visual context needed for accurate ${objectTypeText} placement.`;
}
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `npm run build`
- [x] New methods are properly typed and accessible
- [ ] LLM prompt generation works without errors
- [ ] Media generation service integration functions correctly

#### Manual Verification:
- [ ] Structure baseline generation creates appropriate images
- [ ] Village baseline updates correctly include new structures
- [ ] Generated images match user descriptions
- [ ] Error handling works for failed image generation

---

## Phase 3: Async Work Integration

### Overview
Add the async work method to CommandProcessorService for handling structure baseline generation and village updates.

### Changes Required:

#### 1. CommandProcessorService.generateTwoStepStructureBaseline()
**File**: `src/services/commandProcessorService.ts`
**Changes**: Add new method adapted from plant baseline generation

```typescript
private async generateTwoStepStructureBaseline(
  village: any,
  structure: any,
  structureDescription: string,
  gridX: number,
  gridY: number
): Promise<AsyncWorkResult> {
  try {
    if (!this.villageImageService || !this.villageRepository) {
      throw new Error('Required services not available');
    }

    // Step 1: Generate structure baseline
    const structureBaselineUrl = await this.villageImageService.generateStructureBaseline(structureDescription);

    // Update structure object with baseline URL
    await this.villageRepository.updateObjectBaseline(structure.id, structureBaselineUrl);

    // Step 2: Update village baseline with new structure
    const villageName = village.name || `Village ${village.guildId.slice(-4)}`;
    const currentVillageBaseline = village.baselineUrl;

    if (!currentVillageBaseline) {
      throw new Error('Village has no baseline image to update');
    }

    const updatedVillageBaselineUrl = await this.villageImageService.updateVillageBaseline(
      villageName,
      currentVillageBaseline,
      structureBaselineUrl,
      gridX,
      gridY,
      'structure'
    );

    // Step 3: Save new village baseline
    await this.villageRepository.updateVillageBaselineByGuildId(village.guildId, updatedVillageBaselineUrl);

    return {
      mediaData: {
        type: 'image',
        url: updatedVillageBaselineUrl,
        filename: `village-${village.id}-updated.png`,
        mimeType: 'image/png',
        caption: `${villageName} - Updated with ${structureDescription} at (${gridX}, ${gridY})`
      },
      message: `🏘️ Your village has been updated with the new ${structureDescription}!`
    };

  } catch (error) {
    console.error('Failed to generate two-step structure baseline:', error);
    return {
      message: `✅ Structure added successfully! The village image will be updated shortly.`
    };
  }
}
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `npm run build`
- [x] Async work promise resolves correctly
- [x] Error handling provides fallback messages
- [x] Database updates work in async context

#### Manual Verification:
- [ ] Build command triggers async image generation
- [ ] Village images update correctly with new structures
- [ ] Users receive updated village images
- [ ] Fallback messages work when image generation fails

---

## Testing Strategy

### Unit Tests:
- Test command validation (missing description, village not found, no space)
- Test database operations (structure creation, baseline updates)
- Test error handling for missing services
- Test async work generation and resolution

### Integration Tests:
- End-to-end build command execution
- Image generation pipeline verification
- Village baseline update confirmation
- Error scenarios (service failures, network issues)

### Manual Testing Steps:
1. Create a village with `/village create`
2. Build a structure with `/village build "wooden shed"`
3. Verify structure appears in database
4. Confirm village image updates with new structure
5. Test error cases (no description, full village, etc.)
6. Test with various structure descriptions

## Performance Considerations

- Structure baseline generation should be async to avoid blocking
- Village baseline updates may take time due to AI image generation
- Consider caching frequently-used structure types
- Monitor image generation service usage and costs

## Migration Notes

No database migrations needed - existing schema already supports structures. The implementation adds new functionality without changing existing data structures.

## References

- Plant command implementation: `src/services/commandProcessorService.ts:135-212`
- Village object creation: `src/repositories/villageRepository.ts:93-137`
- Plant baseline generation: `src/services/villageImageService.ts:157-167`
- Database schema: `prisma/schema.prisma:55-90`