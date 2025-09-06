# Village Show Image Generation Implementation Plan

## Overview

Implement image generation for the `/village show` command that creates a visual representation of the village including all village members using their baselineUrl reference images. This will replace the current text-only response with a generated image showing the village scene with member avatars.

## Current State Analysis

### Current Show Command Behavior
- Located in `src/services/commandProcessorService.ts:handleShowCommand()` (lines 270-303)
- Returns text message with village name and comma-separated member list
- No image generation currently implemented
- Uses `villageRepository.getVillageMembers()` to fetch member data

### Existing Image Generation Infrastructure
- **VillageImageService** (`src/services/villageImageService.ts`): Handles village image generation
- **MediaGenerationService** (`src/services/mediaGenerationService.ts`): Core Gemini AI integration with baseline image support
- **Async Work System**: Command results can include `asyncWork` promises for background processing
- **User Baseline URLs**: `User.baselineUrl` property stores reference images for consistency

### Database Schema Support
- `User.baselineUrl`: Optional field for user avatar reference images
- `VillageMember` junction table links users to villages
- Village members accessible via `villageRepository.getVillageMembers()`

## Desired End State

When a user runs `/village show`:
1. Command immediately returns a "Generating village image..." message
2. Background process generates an image showing:
   - The village landscape/scene
   - All village members represented by their baseline images
   - Member avatars positioned naturally in the village scene
3. Follow-up message contains the generated village image
4. Image maintains visual consistency with existing village baseline (if available)

## What We're NOT Doing

- Modifying the core village creation or member management logic
- Changing the database schema
- Implementing real-time image updates (only on show command)
- Adding image caching or optimization (beyond existing Supabase storage)
- Supporting custom village layouts or member positioning preferences

## Implementation Approach

### High-Level Strategy
1. **Extend VillageImageService** with member-inclusive generation method
2. **Modify Show Command** to use async image generation
3. **Leverage Multi-Image Support** in MediaGenerationService for member baselines
4. **Maintain Consistency** with existing village baseline images
5. **Handle Edge Cases** for users without baseline images

### Technical Approach
- Use Gemini AI's multi-reference image capability
- Generate composite prompt including village scene + member descriptions
- Position members naturally in the village environment
- Fall back gracefully when baseline images are unavailable

## Phase 1: Extend Village Image Service

### Overview
Add a new method to VillageImageService that generates village images including member avatars.

### Changes Required:

#### 1. VillageImageService Enhancement
**File**: `src/services/villageImageService.ts`
**Changes**: Add new method `generateVillageWithMembersImage()`

```typescript
async generateVillageWithMembersImage(
  villageId: string,
  villageName: string,
  memberBaselines: Array<{userId: string, baselineUrl?: string, displayName?: string}>
): Promise<string> {
  // Create composite prompt with village scene and member descriptions
  const prompt = this.createVillageWithMembersPrompt(villageName, memberBaselines);
  
  // Prepare baseline images array for media generation
  const baselineImages = memberBaselines
    .filter(member => member.baselineUrl)
    .map(member => member.baselineUrl!);
  
  // Generate image with multiple references
  const tempFileInfo = await this.mediaGenerationService.generateMedia({
    prompt: prompt,
    type: 'image',
    jobType: 'VILLAGE_BASELINE',
    baselineImages: baselineImages // New field to support multiple baselines
  });

  return tempFileInfo.url;
}
```

#### 2. Add Member Prompt Generation
**File**: `src/services/villageImageService.ts`
**Changes**: Add helper method for member-inclusive prompts

```typescript
private createVillageWithMembersPrompt(
  villageName: string,
  members: Array<{userId: string, baselineUrl?: string, displayName?: string}>
): string {
  const memberCount = members.length;
  const hasBaselines = members.some(m => m.baselineUrl);

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
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `npm run build`
- [x] Unit tests pass for new method: `npm test -- --testPathPattern=villageImageService`
- [x] Linting passes: `npm run lint`
- [x] New method returns valid image URL when called

#### Manual Verification:
- [ ] Method generates image successfully with mock member data
- [ ] Generated image shows village scene with multiple figures
- [ ] Image quality is acceptable for Discord display

---

## Phase 2: Update Media Generation Service

### Overview
Extend MediaGenerationService to support multiple baseline images for composite generation.

### Changes Required:

#### 1. Update MediaGenerationRequest Interface
**File**: `src/services/mediaGenerationService.ts`
**Changes**: Add support for multiple baseline images

```typescript
export interface MediaGenerationRequest {
   prompt: string;
   type: 'image' | 'video' | 'audio';
   style?: string;
   format?: string;
   baselineImageUrl?: string;  // Keep for backward compatibility
   baselineImages?: string[];  // NEW: Support multiple baseline images
   jobType?: string;
}
```

#### 2. Update generateMedia Method
**File**: `src/services/mediaGenerationService.ts`
**Changes**: Handle multiple baseline images in content generation

```typescript
// Inside generateMedia method, replace baseline image handling:
let contents: any[] = [{ text: request.prompt }];

// Handle multiple baseline images
if (request.baselineImages && request.baselineImages.length > 0) {
  const validBaselines = [];
  
  for (const baselineUrl of request.baselineImages) {
    try {
      const response = await fetch(baselineUrl);
      const buffer = await response.arrayBuffer();
      const base64Image = Buffer.from(buffer).toString('base64');
      validBaselines.push(base64Image);
    } catch (error) {
      console.error(`Failed to load baseline image ${baselineUrl}:`, error);
    }
  }
  
  if (validBaselines.length > 0) {
    // Enhanced prompt for multiple references
    const enhancedPrompt = `${request.prompt}

Reference Guidelines:
- Use the provided reference images to create consistent character appearances
- Each reference image represents a different villager in the scene
- Maintain the unique visual features from each reference image
- Position villagers naturally throughout the village scene
- Ensure visual consistency and cohesion across all characters`;
    
    contents = [
      { text: enhancedPrompt },
      ...validBaselines.map(base64Image => ({
        inlineData: {
          mimeType: "image/png",
          data: base64Image,
        },
      }))
    ];
  }
} else if (request.baselineImageUrl) {
  // Existing single baseline logic...
}
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `npm run build`
- [x] Existing single-baseline functionality still works
- [x] New multi-baseline interface compiles without errors
- [x] Unit tests pass: `npm test -- --testPathPattern=mediaGenerationService`

#### Manual Verification:
- [ ] Service handles multiple baseline images correctly
- [ ] Fallback to single baseline works when multi-baseline fails
- [ ] Error handling works for invalid baseline URLs

---

## Phase 3: Modify Show Command Handler

### Overview
Update the show command to trigger async image generation and return the result.

### Changes Required:

#### 1. Update handleShowCommand Method
**File**: `src/services/commandProcessorService.ts`
**Changes**: Modify show command to generate village image with members

```typescript
private async handleShowCommand(command: CommandInput): Promise<CommandResult> {
  // ... existing validation logic ...

  // Get village members with baseline URLs
  const villageMembers = await this.villageRepository.getVillageMembers(village.id);
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
    asyncWork: this.generateVillageShowImage(village.id, village.name || `Village ${village.guildId.slice(-4)}`, membersWithBaselines)
  };
}
```

#### 2. Add Async Image Generation Method
**File**: `src/services/commandProcessorService.ts`
**Changes**: Add private method for async village image generation

```typescript
private async generateVillageShowImage(
  villageId: string,
  villageName: string,
  members: Array<{userId: string, baselineUrl?: string, displayName?: string}>
): Promise<AsyncWorkResult> {
  try {
    if (!this.villageImageService) {
      throw new Error('Village image service not available');
    }

    const imageUrl = await this.villageImageService.generateVillageWithMembersImage(
      villageId,
      villageName,
      members
    );

    return {
      mediaData: {
        type: 'image',
        url: imageUrl,
        filename: `village-${villageId}-show.png`,
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
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `npm run build`
- [x] Command processor tests pass: `npm test -- --testPathPattern=commandProcessorService`
- [x] Linting passes: `npm run lint`
- [x] Show command still returns basic info immediately

#### Manual Verification:
- [ ] `/village show` command works without errors
- [ ] Initial response shows village info and "generating image" message
- [ ] Follow-up message contains generated image
- [ ] Error handling works when image generation fails

---

## Phase 4: Add Repository Method for Member Baselines

### Overview
Add a convenience method to get village members with their baseline URLs.

### Changes Required:

#### 1. Add getVillageMembersWithBaselines Method
**File**: `src/repositories/villageRepository.ts`
**Changes**: Add method to fetch members with baseline data

```typescript
async getVillageMembersWithBaselines(villageId: string): Promise<Array<{
  userId: string;
  baselineUrl?: string;
  displayName?: string;
}>> {
  const members = await this.prisma.villageMember.findMany({
    where: { villageId },
    include: { 
      user: {
        select: {
          discordId: true,
          baselineUrl: true,
          displayName: true
        }
      }
    },
    orderBy: { joinedAt: 'asc' }
  });

  return members.map(member => ({
    userId: member.userId,
    baselineUrl: member.user.baselineUrl,
    displayName: member.user.displayName || member.user.discordId
  }));
}
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `npm run build`
- [x] Repository tests pass: `npm test -- --testPathPattern=villageRepository`
- [x] Method returns expected data structure

#### Manual Verification:
- [ ] Method returns correct member data with baselines
- [ ] Handles users without baseline URLs gracefully

---

## Testing Strategy

### Unit Tests:
- Test VillageImageService new method with mock member data
- Test MediaGenerationService multi-baseline functionality
- Test CommandProcessorService show command changes
- Test VillageRepository new method

### Integration Tests:
- End-to-end test of `/village show` command with image generation
- Test with villages that have members with/without baseline images
- Test error handling when image generation fails

### Manual Testing Steps:
1. Create a village with multiple members
2. Ensure some members have baselineUrl set
3. Run `/village show` command
4. Verify initial text response appears immediately
5. Verify follow-up message contains generated image
6. Verify image shows village scene with member representations
7. Test with village that has no baseline images
8. Test error scenarios (image generation failure)

## Performance Considerations

- Image generation is async and doesn't block the initial command response
- Multiple baseline images may increase generation time - monitor and optimize if needed
- Consider caching generated images for frequently viewed villages
- Ensure proper error handling doesn't impact other village operations

## Migration Notes

- No database schema changes required
- Existing `/village show` functionality remains intact
- New image generation is additive feature
- Users without baselineUrl will still see generated village images (without specific avatars)

## References

- Current show command: `src/services/commandProcessorService.ts:270-303`
- Village image service: `src/services/villageImageService.ts`
- Media generation service: `src/services/mediaGenerationService.ts`
- Database schema: `prisma/schema.prisma`
- User baselineUrl property: `User.baselineUrl` in schema</content>
</xai:function_call/>
<xai:function_call name="todowrite">
<parameter name="todos">[{"content":"Create detailed implementation plan with phases and success criteria","status":"completed","priority":"high","id":"create_implementation_plan"}]