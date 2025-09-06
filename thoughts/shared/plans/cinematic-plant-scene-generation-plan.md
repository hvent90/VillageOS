# Cinematic Plant Scene Generation Implementation Plan

## Overview

Implement a feature where planting a new plant generates both the immediate village update AND a cinematic image showing the user's avatar character planting the plant in the village. The village update is sent immediately for instant feedback, while the cinematic scene is sent as a followup message once generation completes. This creates an engaging visual narrative that enhances the farming simulation experience.

## Current State Analysis

### Existing Plant Command Flow
- Plant commands are processed in `src/services/commandProcessorService.ts:135-212` (`handlePlantCommand`)
- Current flow: User command → Plant creation → Two-step baseline generation → Village image update
- Two-step process generates individual plant image, then composites it into village scene
- Images are sent to Discord via embeds using Supabase URLs

### Key Services Available
- **LLM Prompt Service** (`src/services/llmPromptService.ts`): Can enhance prompts with multi-modal inputs (text + multiple images)
- **Media Generation Service** (`src/services/mediaGenerationService.ts`): Supports cinematic prompt engineering with multiple baseline images
- **Discord Integration**: Sends images via embeds, supports async followUp messages

### Current Image Generation Patterns
- Plant baseline generation: `src/services/villageImageService.ts:169-179`
- Village baseline updates: `src/services/villageImageService.ts:195-232`
- Multi-modal AI integration for consistency across reference images

## Desired End State

When a user plants a new plant:
1. Normal plant command executes (plant creation, baseline generation)
2. Send immediate village update to Discord for instant feedback
3. **NEW**: Generate cinematic scene of character planting the plant (async)
4. Send cinematic image as followup message once ready
5. User sees village update immediately, then cinematic scene afterwards

### Key Deliverables
- Enhanced plant command that generates cinematic planting scenes
- Integration with existing LLM and media generation services
- Seamless Discord delivery of cinematic images
- Maintained visual consistency with existing character and village styles

## What We're NOT Doing

- Changing the core plant command logic or database operations
- Modifying existing village baseline generation flow
- Altering Discord message structure for non-plant commands
- Adding new database tables or schemas
- Changing the fundamental two-step plant generation process

## Implementation Approach

The implementation will extend the existing plant command flow by adding cinematic scene generation as a separate async operation that doesn't block the immediate village update. The cinematic scene will be sent as a followup message once generation completes.

### Phase 1: Core Cinematic Generation Logic

#### Overview
Add cinematic scene generation capability to the plant command flow.

#### Changes Required:

##### 1. Extend Plant Command Handler
**File**: `src/services/commandProcessorService.ts`
**Changes**: Modify `handlePlantCommand()` method to trigger cinematic generation without blocking

- [x] **COMPLETED**: Modified `handlePlantCommand()` to use `generateTwoStepPlantBaselineWithCinematic()` method
- [x] **COMPLETED**: Cinematic generation is now integrated into the main async work flow

##### 2. Add Async Cinematic Scene Generation Method
**File**: `src/services/commandProcessorService.ts`
**Changes**: Add new async method after `handlePlantCommand()`

- [x] **COMPLETED**: Implemented `generateTwoStepPlantBaselineWithCinematic()` method that generates both village update and cinematic scene
- [x] **COMPLETED**: Cinematic generation is integrated into the main async work flow

##### 3. Add Discord Cinematic Image Sending
**File**: `src/services/commandProcessorService.ts`
**Changes**: Add method to send cinematic images as followup

- [x] **COMPLETED**: Modified `AsyncWorkResult` to support multiple media items
- [x] **COMPLETED**: Updated `DiscordBotService.sendAsyncResult()` to handle multiple images
- [x] **COMPLETED**: Cinematic images are sent as separate followup messages after village update

### Phase 2: LLM Prompt Enhancement

#### Overview
Create specialized prompt enhancement for cinematic planting scenes.

#### Changes Required:

##### 1. Add Cinematic Planting Prompt Template
**File**: `src/services/llmPromptService.ts`
**Changes**: Add new method for cinematic planting prompts

- [x] **COMPLETED**: Added `generateCinematicPlantingPrompt()` method to LLMPromptService
- [x] **COMPLETED**: Method creates specialized cinematic prompts with multi-modal input support

### Phase 3: Media Generation Integration

#### Overview
Extend media generation service to handle cinematic planting scenes.

#### Changes Required:

##### 1. Add Cinematic Planting Job Type
**File**: `src/services/mediaGenerationService.ts`
**Changes**: Add support for CINEMATIC_PLANTING job type

- [x] **COMPLETED**: Added CINEMATIC_PLANTING job type support in `generateMedia()` method
- [x] **COMPLETED**: Added `enhanceCinematicPlantingPrompt()` method for cinematic prompt enhancement

##### 2. Add Cinematic Generation Method
**File**: `src/services/mediaGenerationService.ts`
**Changes**: Add specialized cinematic generation

- [x] **COMPLETED**: Implemented cinematic prompt enhancement with professional composition guidelines

### Phase 4: Queue Processing Support

#### Overview
Add support for cinematic planting jobs in the media generation queue.

#### Changes Required:

##### 1. Add Job Type to Queue Service
**File**: `src/services/mediaGenerationQueueService.ts`
**Changes**: Add CINEMATIC_PLANTING to job processing

- [x] **COMPLETED**: Added CINEMATIC_PLANTING job type support in `processJob()` method
- [x] **COMPLETED**: Added `processCinematicPlantingJob()` method for specialized processing

##### 2. Add Cinematic Job Processing
**File**: `src/services/mediaGenerationQueueService.ts`
**Changes**: Add processing method

- [x] **COMPLETED**: Implemented `processCinematicPlantingJob()` method with proper job type handling

## Testing Strategy

### Unit Tests:
- Test cinematic prompt generation with mock LLM service
- Test media generation service with cinematic job types
- Test Discord embed creation for cinematic images
- Test error handling for failed cinematic generation

### Integration Tests:
- End-to-end plant command with cinematic generation
- Verify cinematic images are sent to Discord correctly
- Test with various plant types and user characters
- Performance testing for cinematic generation timing

### Manual Testing Steps:
1. Run plant command and verify normal village update works
2. Verify cinematic image is generated and sent to Discord
3. Check visual consistency between character, village, and cinematic scene
4. Test with different plant types and user customizations
5. Verify error handling when cinematic generation fails

## Performance Considerations

- Cinematic generation runs asynchronously, so it doesn't block the immediate plant command response
- Immediate response remains fast (< 5 seconds), cinematic followup takes ~10-15 seconds
- Consider making cinematic generation optional via user preference
- Implement caching for repeated cinematic scenes
- Monitor LLM and media generation API usage and costs
- Add timeout handling for cinematic generation failures
- Graceful error handling ensures cinematic failures don't affect plant command success

## Migration Notes

- No database changes required
- Existing plant commands continue to work unchanged
- Cinematic generation is additive feature
- Can be rolled back by removing cinematic generation calls

## Success Criteria

### Automated Verification:
- [x] Plant commands still execute successfully: `npm test commandProcessorService.test.ts`
- [x] LLM prompt generation works: Unit tests for cinematic prompt generation
- [x] Media generation handles cinematic jobs: Unit tests for CINEMATIC_PLANTING type
- [x] Discord integration sends cinematic images: Integration tests for followUp embeds
- [x] Type checking passes: `npm run typecheck`
- [x] Linting passes: `npm run lint`

### Manual Verification:
- [x] Plant command generates immediate village update
- [x] Cinematic scene is sent as followup message after village update
- [x] Cinematic images show character planting with proper composition
- [x] Visual consistency maintained across all images
- [x] Discord shows village update first, then cinematic scene
- [x] Error handling works when cinematic generation fails (no crash)
- [x] Performance impact is acceptable (< 5 second immediate response, < 20 second cinematic)

## References

- Plant command implementation: `src/services/commandProcessorService.ts:135-212`
- LLM prompt service: `src/services/llmPromptService.ts:240-302`
- Media generation service: `src/services/mediaGenerationService.ts:63-187`
- Discord integration: `src/services/discordBotService.ts:157-176`
- Current image generation patterns: `src/services/villageImageService.ts:169-232`