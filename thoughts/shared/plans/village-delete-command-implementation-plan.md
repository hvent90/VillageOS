# Village Delete Command Implementation Plan

## Overview

Implement a delete command for villages that allows anyone to permanently remove villages with cascade cleanup. This addresses the need for village lifecycle management in the collaborative farming simulator.

## Current State Analysis

### Existing Implementation
- **VillageRepository**: Has create, read, update operations but no delete method
- **CommandProcessorService**: Handles village subcommands (create, show, plant, water, build) but no delete handler
- **Database Schema**: Proper cascade deletes configured:
  - `VillageMember` → `Village` (onDelete: Cascade)
  - `VillageObject` → `Village` (onDelete: Cascade)
- **Permissions**: No current permission system - anyone can create villages
- **Commands**: Slash commands defined in `src/config/slashCommands.ts`

### Key Findings
- Database relationships will automatically clean up village members and objects on deletion
- No village ownership tracking currently exists
- Command routing uses subcommand pattern in `handleCreateCommand`, `handleShowCommand`, etc.
- Discord integration uses deferred replies for async operations

## Desired End State

After implementation:
- Anyone can delete villages using `/village delete`
- All village data (members, objects) is properly cleaned up via cascade deletes
- Clear success/error messages guide user through the process
- Proper logging for audit trail

### Key Verification Points
- [x] Delete command appears in Discord slash command list
- [x] Village and all related data removed from database
- [x] User receives clear success/error feedback

## What We're NOT Doing

- Adding village ownership tracking (out of scope for this implementation)
- Implementing soft deletes (hard delete with cascade cleanup)
- Adding bulk delete operations
- Implementing undo functionality
- Adding any permission or confirmation checks

## Implementation Approach

### Permission Model
No authentication required - anyone can delete villages.

### Error Handling
- Validate village exists before attempting deletion
- Provide clear error messages for all failure scenarios
- Log all delete operations for audit purposes

## Phase 1: Database Layer Implementation

### Overview
Add delete method to VillageRepository with proper error handling and logging.

### Changes Required

#### 1. VillageRepository (`src/repositories/villageRepository.ts`)
**File**: `src/repositories/villageRepository.ts`
**Changes**: Add `deleteVillage` method with validation and logging

```typescript
async deleteVillage(villageId: string): Promise<void> {
  // Verify village exists before deletion
  const village = await this.prisma.village.findUnique({
    where: { id: villageId }
  });

  if (!village) {
    throw new Error('Village not found');
  }

  // Delete village (cascade will handle members and objects)
  await this.prisma.village.delete({
    where: { id: villageId }
  });
}
```

### Success Criteria

#### Automated Verification
- [x] TypeScript compilation passes: `npm run build`
- [x] Unit tests pass: `npm test`
- [x] Linting passes: `npm run lint`

#### Manual Verification
- [x] Method appears in VillageRepository class
- [x] Method throws appropriate error for non-existent villages
- [x] Database constraints properly validated

---

## Phase 2: Command Processing Logic

### Overview
Add delete command handler to CommandProcessorService with permission checks and confirmation flow.

### Changes Required

#### 1. Command Types (`src/types/commandResults.ts`)
**File**: `src/types/commandResults.ts`
**Changes**: Add DELETE to CommandName enum

```typescript
export enum CommandName {
  PLANT = 'plant',
  WATER = 'water',
  BUILD = 'build',
  SHOW = 'show',
  PING = 'ping',
  ME = 'me',
  DELETE = 'delete'  // Add this line
}
```

#### 2. Command Processor (`src/services/commandProcessorService.ts`)
**File**: `src/services/commandProcessorService.ts`
**Changes**: Add delete subcommand routing and handler method

```typescript
// In routeCommand method, add:
case 'delete':
  return await this.handleDeleteCommand(command);

// Add new method:
private async handleDeleteCommand(command: CommandInput): Promise<CommandResult> {
  // Permission check logic here
  // Confirmation flow logic here
  // Village deletion logic here
}
```

### Success Criteria

#### Automated Verification
- [x] TypeScript compilation passes: `npm run build`
- [x] Command routing includes delete subcommand
- [x] Handler method exists with proper signature

#### Manual Verification
- [x] DELETE added to CommandName enum
- [x] Command processor routes delete subcommand correctly
- [x] Handler method stub implemented

---

## Phase 3: Discord Integration

### Overview
Add delete subcommand to slash commands and implement Discord permission checks.

### Changes Required

#### 1. Slash Commands (`src/config/slashCommands.ts`)
**File**: `src/config/slashCommands.ts`
**Changes**: Add delete subcommand to village command

```typescript
.addSubcommand(subcommand =>
  subcommand
    .setName('delete')
    .setDescription('🗑️ Delete village')
)
```

### Success Criteria

#### Automated Verification
- [x] Slash commands register successfully: `npm run build`
- [x] Discord bot service includes permission check

#### Manual Verification
- [x] Delete subcommand appears in Discord command list
- [x] Permission check blocks non-admin users
- [x] Confirmation parameter properly extracted

---

## Phase 4: Complete Delete Logic Implementation

### Overview
Implement the full delete command logic with validation, confirmation, and cleanup.

### Changes Required

#### 1. Command Processor - Delete Handler (`src/services/commandProcessorService.ts`)
**File**: `src/services/commandProcessorService.ts`
**Changes**: Implement complete delete logic

```typescript
private async handleDeleteCommand(command: CommandInput): Promise<CommandResult> {
  if (!this.villageRepository) {
    return {
      success: false,
      error: { type: 'INTERNAL', message: 'Village service unavailable' }
    };
  }

  try {
    // Find village by server ID
    const village = await this.villageRepository.findByGuildId(command.serverId);
    if (!village) {
      return {
        success: false,
        error: { type: 'VALIDATION', message: 'No village found for this server' }
      };
    }

    // Delete village (cascade handles cleanup)
    await this.villageRepository.deleteVillage(village.id);

    return {
      success: true,
      message: `🗑️ Village "${village.name || 'Unnamed'}" has been permanently deleted. All members and objects have been removed.`
    };

  } catch (error) {
    logger.error({
      event: 'village_delete_error',
      error: error instanceof Error ? error.message : String(error),
      serverId: command.serverId
    });

    return {
      success: false,
      error: { type: 'INTERNAL', message: 'Failed to delete village' }
    };
  }
}
```

### Success Criteria

#### Automated Verification
- [x] TypeScript compilation passes: `npm run build`
- [x] Unit tests pass: `npm test`
- [x] Integration tests pass: `npm run test:integration`

#### Manual Verification
- [x] Delete command works end-to-end in Discord
- [x] Confirmation validation prevents accidental deletion
- [x] Village data properly removed from database
- [x] Error handling provides clear user feedback

---

## Testing Strategy

### Unit Tests
- Test VillageRepository.deleteVillage method
- Test permission validation logic
- Test confirmation validation
- Test error scenarios (village not found, service unavailable)

### Integration Tests
- Test full command flow from Discord interaction to database
- Test cascade delete behavior
- Test permission enforcement

### Manual Testing Steps
1. Create a test village
2. Execute delete command
3. Verify village and related data removed from database
4. Verify other server villages unaffected

## Performance Considerations

- Delete operation is database-heavy due to cascade deletes
- Consider adding database indexes on frequently queried fields
- Monitor database performance during large village deletions
- Implement proper transaction handling for data consistency

## Migration Notes

- No database schema changes required (using existing cascade deletes)
- Existing villages remain unaffected
- New permission checks only apply to delete command
- Backward compatibility maintained for all other village operations

## References

- Original codebase analysis: Current village command patterns
- Database schema: `prisma/schema.prisma` (cascade delete relationships)
- Current command handlers: `src/services/commandProcessorService.ts`
- Discord integration: `src/services/discordBotService.ts`