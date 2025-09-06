---
date: 2025-09-06T18:41:00-05:00
researcher: opencode
git_commit: 9ec78458fbe92c70e008c3b7d0453c38f0d348f8
branch: main
repository: hvent90/VillageOS
topic: "Find everywhere we are generating and sending images to Discord - ensure visibility to everyone (not ephemeral)"
tags: [research, discord, image-generation, ephemeral, visibility]
status: complete
last_updated: 2025-09-06
last_updated_by: opencode
---

# Research: Find everywhere we are generating and sending images to Discord - ensure visibility to everyone (not ephemeral)

**Date**: 2025-09-06T18:41:00-05:00
**Researcher**: opencode
**Git Commit**: 9ec78458fbe92c70e008c3b7d0453c38f0d348f8
**Branch**: main
**Repository**: hvent90/VillageOS

## Research Question
Find everywhere we are generating and sending images to Discord. They should be visible to everyone (not ephemeral).

## Summary
The codebase generates images through a sophisticated pipeline using Google's Gemini AI and sends them via Discord interactions. **Critical Issue Found**: All Discord messages containing images are currently sent as ephemeral (only visible to the requesting user), preventing other users from seeing generated village images. This affects collaborative gameplay where image sharing is important.

## Detailed Findings

### Image Generation Pipeline

#### Core Services
- **`src/services/mediaGenerationService.ts`** - Main service handling Gemini AI integration for image generation
- **`src/services/villageImageService.ts`** - Specialized service for creating village scenes with multiple member images
- **`src/services/supabaseMediaService.ts`** - Manages temporary file storage and cleanup for generated images
- **`src/services/mediaGenerationQueueService.ts`** - Background processing queue for async image generation jobs

#### Generation Flow
1. **Prompt Enhancement**: User descriptions are enhanced with detailed scene composition guidelines
2. **Gemini AI Call**: Uses `gemini-2.5-flash-image-preview` model for high-quality image generation
3. **Baseline Images**: Supports multiple reference images for consistent character appearances
4. **Storage**: Images uploaded to Supabase temporary storage with public URLs
5. **Cleanup**: Automatic cleanup of expired files (1-hour retention)

### Discord Integration and Message Sending

#### Core Files
- **`src/services/discordBotService.ts`** - Main Discord bot service handling slash commands and async results
- **`src/adapters/discordPlatformAdapter.ts`** - Platform adapter implementing Discord-specific messaging
- **`src/services/commandProcessorService.ts`** - Routes commands and processes results

#### Message Sending Methods
- **`interaction.reply()`** - Initial responses with embeds
- **`interaction.editReply()`** - Updates deferred replies
- **`interaction.followUp()`** - Sends follow-up messages for async results

### Ephemeral Settings - Critical Visibility Issue

#### Current Implementation (Problematic)
All Discord messages are sent with `MessageFlags.Ephemeral`, making them **only visible to the requesting user**:

```typescript
// Initial deferral - makes ALL responses ephemeral
await interaction.deferReply({ flags: MessageFlags.Ephemeral });

// Async image delivery - also ephemeral
await interaction.followUp({
  embeds: [embed],  // Contains village image
  flags: MessageFlags.Ephemeral  // ❌ Only visible to requesting user
});
```

#### Locations of Ephemeral Usage
- **`src/services/discordBotService.ts:34`** - Initial deferral for all commands
- **`src/services/discordBotService.ts:135, 140, 148`** - Async result and error messages
- **`src/adapters/discordPlatformAdapter.ts:29, 38`** - Command results and errors

#### Impact on Image Visibility
- ✅ User who requested the image can see it
- ❌ Other users in the channel cannot see generated village images
- ❌ Images disappear when user navigates away from the channel
- ❌ No persistent record of generated images in channel history

### Command Integration Points

#### Village Commands with Image Generation
- **`!village create`** - Triggers automatic village image generation
- **`!village show`** - Generates village scene with all members
- **`!village me <description>`** - Creates user avatar/character image

#### Processing Flow
1. **Immediate Response**: Text status sent immediately (ephemeral)
2. **Background Generation**: Image created asynchronously via queue
3. **Follow-up Delivery**: Generated image sent via `interaction.followUp()` (ephemeral)

## Code References
- `src/services/mediaGenerationService.ts:63-187` - Core image generation with Gemini AI
- `src/services/discordBotService.ts:124-142` - Async image delivery with ephemeral flags
- `src/adapters/discordPlatformAdapter.ts:29, 38` - Ephemeral message sending
- `src/services/villageImageService.ts:77-104` - Multi-member village image composition
- `src/services/supabaseMediaService.ts:25-112` - Temporary file storage and cleanup

## Architecture Insights
- **Queue-Based Processing**: Prevents Discord timeout errors during long image generation
- **Platform Adapter Pattern**: Clean separation between business logic and Discord API
- **Dependency Injection**: Services injected through constructors for testability
- **Async Processing**: Background jobs with follow-up delivery for responsive UX
- **Temporary Storage**: Supabase integration with automatic cleanup to prevent storage bloat

## Historical Context (from thoughts/)
- **`thoughts/2025-09-06_18-41-00_discord-bot-setup-and-deferred-interactions-research.md`** - Documents Discord bot setup with deferred interactions for async operations
- **`thoughts/shared/plans/village-show-image-generation-implementation-plan.md`** - Implementation plan for village image generation using member baselines
- **`thoughts/shared/plans/village-delete-command-implementation-plan.md`** - Notes about deferred replies for async operations

## Related Research
None found - this appears to be the first comprehensive research on Discord image visibility issues.

## Open Questions
1. Should all images be public, or should there be user-controlled visibility settings?
2. How to handle potential spam concerns if images become publicly visible?
3. Should text-only responses remain ephemeral while images become public?
4. Impact on user privacy and experience if changing from ephemeral to public?

## Recommendations
1. **Remove ephemeral flags from image-containing messages** in `discordBotService.ts` and `discordPlatformAdapter.ts`
2. **Keep ephemeral for text-only responses and errors** to maintain user experience
3. **Consider channel-specific visibility settings** for different Discord servers
4. **Test collaborative gameplay** to ensure image sharing enhances the village-building experience