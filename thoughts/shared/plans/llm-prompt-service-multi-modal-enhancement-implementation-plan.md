# LLMPromptService Multi-Modal Enhancement Implementation Plan

## Overview

Enhance the LLMPromptService to optionally accept image inputs for multi-modal prompt generation, enabling the service to analyze both text descriptions and visual references when generating optimized prompts for image generation. This will specifically improve plant addition to villages by using the plant's baseline image to generate more accurate placement and styling instructions.

## Current State Analysis

The LLMPromptService currently:
- Has `referenceImageUrl?: string` in PromptEnhancementRequest interface but doesn't utilize it
- Only processes text instructions in the `generate` method
- Uses Gemini 2.5 Flash for text-based prompt enhancement
- Is used by VillageImageService and CommandProcessorService for prompt optimization

**Key Findings:**
- The codebase already handles image processing in MediaGenerationService using Gemini's multi-modal capabilities
- Images are converted to base64 and passed as `inlineData` to Gemini API
- Existing pattern supports both single images (`baselineImageUrl`) and multiple images (`baselineImages`)

## Desired End State

After implementation:
- LLMPromptService can optionally accept image data directly (Buffer, base64, or URL)
- Generate method supports multi-modal inputs (text + image analysis)
- Plant baseline images are used when adding plants to villages for more accurate generation
- Maintains backward compatibility with existing text-only usage
- Leverages Gemini's vision capabilities for enhanced prompt generation
- Follows existing codebase patterns for image handling

### Key Discoveries:
- MediaGenerationService already implements multi-modal Gemini calls: `src/services/mediaGenerationService.ts:67-103`
- Image processing pattern: fetch URL → convert to base64 → pass as inlineData: `src/services/mediaGenerationService.ts:74-78`
- Current service interface has unused `referenceImageUrl` field: `src/services/llmPromptService.ts:7`
- Plant addition currently uses generic text prompts without visual reference: `src/services/villageImageService.ts:195-202`
- Plant baseline images are available but not used for prompt enhancement: `src/services/villageImageService.ts:189`

## What We're NOT Doing

- Changing the core prompt enhancement logic or guidelines
- Modifying existing text-only usage patterns
- Adding new dependencies beyond what's already available
- Breaking changes to existing service interfaces

## Implementation Approach

Extend the existing service to support multi-modal inputs while maintaining backward compatibility. Follow the established patterns from MediaGenerationService for image processing and Gemini multi-modal calls.

## Phase 1: Interface and Type Updates

### Overview
Update the service interfaces to support direct image input alongside existing URL support.

### Changes Required:

#### 1. Update PromptEnhancementRequest Interface
**File**: `src/services/llmPromptService.ts`
**Changes**: Add optional fields for direct image input

```typescript
export interface PromptEnhancementRequest {
  basePrompt: string;
  userDescription?: string;
  referenceImageUrl?: string;  // Keep for backward compatibility
  referenceImageData?: Buffer | string;  // NEW: Direct image data
  referenceImageMimeType?: string;  // NEW: MIME type for direct data
  villageName?: string;
  actionType?: string;
}
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `npm run build`
- [x] No linting errors: `npm run lint`
- [x] Existing tests still pass: `npm test`

#### Manual Verification:
- [ ] Interface changes don't break existing usage
- [ ] New fields are properly typed and optional

---

## Phase 2: Multi-Modal Generation Logic

### Overview
Implement the core multi-modal generation logic in the LLMPromptService, following the patterns established in MediaGenerationService.

### Changes Required:

#### 1. Update LLMPromptService.generate Method
**File**: `src/services/llmPromptService.ts`
**Changes**: Modify generate method to handle image inputs

```typescript
async generate(instructions: string, imageData?: { data: Buffer | string, mimeType: string }): Promise<string> {
  // Handle multi-modal content preparation
  let contents: any[] = [{ text: prompt }];

  if (imageData) {
    // Convert image to base64 if needed
    const base64Data = imageData.data instanceof Buffer
      ? imageData.data.toString('base64')
      : imageData.data;

    contents = [
      { text: prompt },
      {
        inlineData: {
          mimeType: imageData.mimeType,
          data: base64Data,
        },
      },
    ];
  }

  // Use Gemini multi-modal call
  const response = await this.ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: contents
  });
}
```

#### 2. Update Constructor and Private Methods
**File**: `src/services/llmPromptService.ts`
**Changes**: Ensure proper initialization for multi-modal support

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `npm run build`
- [x] No linting errors: `npm run lint`
- [x] Unit tests pass: `npm test`
- [x] Service can be instantiated without errors

#### Manual Verification:
- [ ] Text-only generation still works
- [ ] Image data processing doesn't break existing functionality
- [ ] Error handling works for invalid image data

---

## Phase 3: Backward Compatibility and Integration

### Overview
Ensure existing usage continues to work while adding new multi-modal capabilities, with specific focus on enhancing plant addition to villages.

### Changes Required:

#### 1. Update Service Usage in VillageImageService
**File**: `src/services/villageImageService.ts`
**Changes**: Pass plant baseline image to LLM prompt generation for better plant placement instructions

```typescript
// In updateVillageBaseline method - use plant baseline for prompt enhancement
async updateVillageBaseline(
  villageName: string,
  currentVillageBaselineUrl: string,
  plantBaselineUrl: string,
  gridX: number,
  gridY: number
): Promise<string> {
  // Fetch plant baseline image for multi-modal prompt generation
  const plantImageResponse = await fetch(plantBaselineUrl);
  const plantImageBuffer = await plantImageResponse.arrayBuffer();
  const plantImageData = Buffer.from(plantImageBuffer);

  const prompt = await this.llmPromptService.generate(
    this.createVillageBaselineUpdatePrompt(villageName, gridX, gridY),
    { data: plantImageData, mimeType: 'image/png' }
  );

  const tempFileInfo = await this.mediaGenerationService.generateMedia({
    prompt,
    type: 'image',
    jobType: 'ADDING_PLANT_TO_VILLAGE',
    baselineImages: [currentVillageBaselineUrl, plantBaselineUrl]
  });

  return tempFileInfo.url;
}
```

**Current Code Location**: The existing call that needs updating is at `src/services/villageImageService.ts:183`:
```typescript
const prompt = await this.llmPromptService.generate(this.createVillageBaselineUpdatePrompt(villageName, gridX, gridY));
```

#### 2. Update createVillageBaselineUpdatePrompt Method
**File**: `src/services/villageImageService.ts`
**Changes**: Enhance prompt to work better with visual plant reference

```typescript
private createVillageBaselineUpdatePrompt(villageName: string, gridX: number, gridY: number): string {
  return `You are adding a plant to an existing village scene. The plant's appearance is shown in the reference image.

  Update the existing landscape by adding a single instance of the plant shown in the reference image to an appropriate area in the farm.

  CRITICAL REQUIREMENTS:
  - The plant must match EXACTLY the appearance, colors, and features shown in the reference image
  - Place the plant at a reasonable size that doesn't dominate the scene
  - Position the plant in an orderly location within the farm/dirt area
  - Ensure the plant doesn't overlap with existing plants or structures
  - Maintain the same art style and visual quality as the reference image
  - The plant should be INSIDE the farm/dirt area, not on paths or buildings

  The reference image shows the exact plant that needs to be added to the village scene.`;
}
```

#### 3. Update Service Usage in CommandProcessorService
**File**: `src/services/commandProcessorService.ts`
**Changes**: Pass image data when available in command context

### Success Criteria:

#### Automated Verification:
- [x] All existing tests pass: `npm test`
- [x] Integration tests pass: `npm run test:integration`
- [x] No breaking changes to existing API

#### Manual Verification:
- [ ] Existing village image generation still works
- [ ] Existing command processing still works
- [ ] New multi-modal features work when image data is provided

---

## Phase 4: Testing and Validation

### Overview
Add comprehensive tests for the new multi-modal functionality.

### Changes Required:

#### 1. Add Unit Tests
**File**: `tests/llmPromptService.test.ts` (create if doesn't exist)
**Changes**: Test both text-only and multi-modal scenarios

```typescript
describe('LLMPromptService Multi-Modal', () => {
  it('should generate prompts with image data', async () => {
    const imageBuffer = Buffer.from('fake-image-data');
    const result = await service.generate('test prompt', {
      data: imageBuffer,
      mimeType: 'image/png'
    });
    expect(result).toBeDefined();
  });

  it('should work without image data (backward compatibility)', async () => {
    const result = await service.generate('test prompt');
    expect(result).toBeDefined();
  });
});
```

#### 2. Add Integration Tests
**File**: `tests/integration/llmPromptService.integration.test.ts`
**Changes**: Test end-to-end multi-modal functionality

### Success Criteria:

#### Automated Verification:
- [x] Unit tests pass: `npm test`
- [x] Integration tests pass: `npm run test:integration`
- [x] Code coverage maintained: `npm run test:coverage`

#### Manual Verification:
- [ ] Multi-modal prompts generate better results than text-only
- [ ] Error handling works for corrupted image data
- [ ] Performance is acceptable with image processing

## Testing Strategy

### Unit Tests:
- Test text-only generation (existing functionality)
- Test multi-modal generation with valid image data
- Test error handling for invalid image data
- Test backward compatibility

### Integration Tests:
- Test with actual image files
- Test integration with VillageImageService
- Test integration with CommandProcessorService
- Performance testing with various image sizes

### Manual Testing Steps:
1. Test existing text-only prompt generation
2. Test new multi-modal generation with sample images
3. Verify enhanced prompts are better quality
4. Test error scenarios (invalid images, network issues)

## Performance Considerations

- Image processing adds latency - consider caching processed images
- Base64 encoding of large images may impact memory usage
- Gemini API has rate limits for multi-modal requests
- Consider lazy loading of image data when not needed

## Migration Notes

- No database migrations required
- Existing service usage continues to work unchanged
- New multi-modal features are opt-in
- Gradual rollout possible by updating callers incrementally

## References

- Original service implementation: `src/services/llmPromptService.ts`
- Multi-modal pattern reference: `src/services/mediaGenerationService.ts:67-103`
- Current usage in VillageImageService: `src/services/villageImageService.ts:60`
- Current usage in CommandProcessorService: `src/services/commandProcessorService.ts:681`
- Plant addition code to update: `src/services/villageImageService.ts:183`