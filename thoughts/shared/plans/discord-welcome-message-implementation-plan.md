# Discord Welcome Message Implementation Plan

## Overview

Implement a welcome message system for new users joining Discord servers where VillageOS bot is active. The system will greet new users, introduce them to the VillageOS farming simulator, and guide them through initial setup including character customization via the "ME" command.

## Current State Analysis

### Existing Discord Bot Functionality
- **Slash Commands**: Full `/village` command suite implemented with subcommands (create, show, plant, water, build, me, delete)
- **Event Handling**: Currently only handles `interactionCreate` for slash commands
- **Intents**: Uses `Guilds` and `GuildMessages` intents (missing `GuildMembers` for member events)
- **Platform Adapter**: DiscordPlatformAdapter handles command responses and async media generation
- **Welcome System**: No existing welcome message functionality for new server members

### Key Findings
- Bot successfully handles slash command interactions with deferred replies for async operations
- Character customization already implemented via `/village me` subcommand
- All village management commands are functional and documented
- No member join event handling currently implemented

## Desired End State

### Welcome Message Requirements
- **Automatic Trigger**: Welcome message sent when new users join Discord server
- **Personalized Greeting**: Uses user's Discord username in welcome message
- **Character Setup Guidance**: Clear instructions for using `/village me` command
- **Command Overview**: Brief introduction to available village commands
- **Visual Appeal**: Rich embed format with emojis and formatting
- **Error Resilience**: Graceful handling of permission/channel issues

### Message Content Structure
```
@NewUser 🎉 Welcome to [Server Name], [Username]!

🌾 **VillageOS Farming Simulator**
Create your own virtual village and collaborate with other farmers!

🎨 **Get Started:**
Use `/village me` to customize your character appearance
Example: `/village me description: red hair, blue eyes, farmer outfit`

🚀 **Available Commands:**
• `/village create` - Start your farming village
• `/village show` - View village status
• `/village plant` - Plant crops at coordinates
• `/village water` - Water your plants
• `/village build` - Build structures

Happy farming! 🌱
```

## What We're NOT Doing

- Auto-role assignment (out of scope)
- Welcome DMs to users (privacy concerns)
- Complex welcome channels configuration (keep simple)
- Welcome message customization per server (use standard message)
- Integration with existing user database (welcome is informational only)

## Implementation Approach

### Architecture Changes
- **Add GuildMembers Intent**: Enable privileged intent for member events
- **Event Handler**: Add `guildMemberAdd` event listener to DiscordBotService
- **Welcome Service**: Create dedicated service for welcome message logic
- **Configuration**: Add welcome channel detection and permission checks
- **Error Handling**: Implement fallback mechanisms for missing channels/permissions

### Technical Strategy
- **Modular Design**: Separate welcome logic from existing bot functionality
- **Permission Checks**: Verify bot has necessary permissions before sending messages
- **Channel Detection**: Use systemChannel as primary, with fallback options
- **Async Safety**: Ensure welcome messages don't interfere with existing command processing
- **Testing**: Comprehensive testing with mock Discord events

## Phase 1: Core Welcome Infrastructure

### Overview
Set up the basic Discord event handling infrastructure and intent configuration needed for welcome messages.

### Changes Required

#### 1. Update Discord Bot Intents (`src/services/discordBotService.ts`)
**File**: `src/services/discordBotService.ts`
**Changes**: Add GuildMembers intent and guildMemberAdd event handler

```typescript
// Add GuildMembers intent
this.client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers]
});

// Add event handler in setupEventHandlers()
this.client.on('guildMemberAdd', async (member) => {
  await this.handleGuildMemberAdd(member);
});
```

#### 2. Implement Welcome Handler (`src/services/discordBotService.ts`)
**File**: `src/services/discordBotService.ts`
**Changes**: Add handleGuildMemberAdd method with welcome message logic

```typescript
private async handleGuildMemberAdd(member: GuildMember): Promise<void> {
  try {
    const welcomeChannel = this.findWelcomeChannel(member.guild);
    if (!welcomeChannel) return;

    const embed = this.createWelcomeEmbed(member);
    // ${member.user} automatically formats as @ mention in Discord
    await welcomeChannel.send({ content: `${member.user}`, embeds: [embed] });
  } catch (error) {
    console.error('Welcome message failed:', error);
  }
}
```

### Success Criteria

#### Automated Verification
- [x] Discord bot starts with GuildMembers intent enabled
- [x] No TypeScript compilation errors in updated files
- [x] Jest tests pass for existing Discord bot functionality
- [x] Linting passes with no new errors

#### Manual Verification
- [ ] Bot connects to Discord with new intents (check logs)
- [ ] No runtime errors when bot starts
- [ ] Existing slash commands still work correctly

---

## Phase 2: Welcome Message Service

### Overview
Create a dedicated service for welcome message creation and channel detection logic.

### Changes Required

#### 1. Create Welcome Service (`src/services/welcomeService.ts`)
**File**: `src/services/welcomeService.ts` (new file)
**Changes**: Implement welcome message logic and channel detection

```typescript
export class WelcomeService {
  createWelcomeEmbed(member: GuildMember): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('🎉 Welcome to the Village!')
      .setDescription(`Welcome ${member.user.username}! Ready to start farming?`)
      .addFields(
        { name: '🎨 Character Setup', value: 'Use `/village me` to customize your appearance!' },
        { name: '🚀 Getting Started', value: 'Try `/village create` to start your village!' }
      )
      .setTimestamp();
  }

  findWelcomeChannel(guild: Guild): TextChannel | null {
    // Use system channel or find by name
    return guild.systemChannel ||
           guild.channels.cache.find(ch => ch.name === 'welcome') as TextChannel ||
           null;
  }
}
```

#### 2. Integrate Welcome Service (`src/main.ts`)
**File**: `src/main.ts`
**Changes**: Initialize and inject WelcomeService into DiscordBotService

```typescript
const welcomeService = new WelcomeService();
discordBotService.setWelcomeService(welcomeService);
```

#### 3. Update Discord Bot Service (`src/services/discordBotService.ts`)
**File**: `src/services/discordBotService.ts`
**Changes**: Add WelcomeService dependency and update handler

```typescript
private welcomeService!: WelcomeService;

setWelcomeService(service: WelcomeService): void {
  this.welcomeService = service;
}

private async handleGuildMemberAdd(member: GuildMember): Promise<void> {
  try {
    const welcomeChannel = this.welcomeService.findWelcomeChannel(member.guild);
    if (!welcomeChannel) return;

    const embed = this.welcomeService.createWelcomeEmbed(member);
    await welcomeChannel.send({ content: `${member.user}`, embeds: [embed] });
  } catch (error) {
    console.error('Welcome message failed:', error);
  }
}
```

### Success Criteria

#### Automated Verification
- [x] WelcomeService compiles without errors
- [x] Dependency injection works correctly
- [x] Unit tests pass for WelcomeService methods
- [x] Integration tests pass for service wiring

#### Manual Verification
- [ ] Welcome embed creates correctly with proper formatting
- [ ] Channel detection works for systemChannel and named channels
- [ ] Error handling works when no suitable channel found

---

## Phase 3: Enhanced Welcome Content

### Overview
Implement the complete welcome message with detailed command instructions and improved formatting.

### Changes Required

#### 1. Update Welcome Embed (`src/services/welcomeService.ts`)
**File**: `src/services/welcomeService.ts`
**Changes**: Expand welcome message with full command guide

```typescript
createWelcomeEmbed(member: GuildMember): EmbedBuilder {
  const serverName = member.guild.name;

  return new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle(`🎉 Welcome to ${serverName}!`)
    .setDescription(`Hey ${member.user.username}! 🌾 Welcome to the VillageOS farming community!`)
    .addFields(
      {
        name: '🎨 Character Customization',
        value: 'Use `/village me` to set your appearance:\n`/village me description: red hair, blue eyes, farmer outfit`'
      },
      {
        name: '🚀 Getting Started',
        value: '• `/village create` - Start your farming village\n• `/village show` - View village status\n• `/village plant` - Plant crops\n• `/village water` - Water plants\n• `/village build` - Build structures'
      },
      {
        name: '🌱 Happy Farming!',
        value: 'Create, plant, and collaborate with other farmers in your virtual village!'
      }
    )
    .setFooter({ text: 'VillageOS - Collaborative Farming Simulator' })
    .setTimestamp();
}
```

#### 2. Add Permission Checks (`src/services/welcomeService.ts`)
**File**: `src/services/welcomeService.ts`
**Changes**: Add permission validation before sending messages

```typescript
async canSendWelcomeMessage(channel: TextChannel, client: Client): Promise<boolean> {
  try {
    const permissions = channel.permissionsFor(client.user!);
    return permissions?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks]) ?? false;
  } catch {
    return false;
  }
}
```

#### 3. Update Handler with Permissions (`src/services/discordBotService.ts`)
**File**: `src/services/discordBotService.ts`
**Changes**: Check permissions before sending welcome message

```typescript
private async handleGuildMemberAdd(member: GuildMember): Promise<void> {
  try {
    const welcomeChannel = this.welcomeService.findWelcomeChannel(member.guild);
    if (!welcomeChannel) return;

    const canSend = await this.welcomeService.canSendWelcomeMessage(welcomeChannel, this.client);
    if (!canSend) return;

    const embed = this.welcomeService.createWelcomeEmbed(member);
    // ${member.user} automatically formats as @ mention in Discord
    await welcomeChannel.send({ content: `${member.user}`, embeds: [embed] });
  } catch (error) {
    console.error('Welcome message failed:', error);
  }
}
```

### Success Criteria

#### Automated Verification
- [x] Welcome embed contains all required command information
- [x] Permission checks work correctly
- [x] No embed size limit violations (under 6000 characters)

#### Manual Verification
- [ ] Welcome message displays correctly in Discord with @ mention of new user
- [ ] All command instructions are clear and accurate
- [ ] Message looks visually appealing with emojis and formatting
- [ ] Permission denied scenarios handled gracefully

---

## Phase 4: Testing and Validation

### Overview
Implement comprehensive testing and validate the welcome system works correctly.

### Changes Required

#### 1. Add Unit Tests (`tests/welcomeService.test.ts`)
**File**: `tests/welcomeService.test.ts` (new file)
**Changes**: Test welcome message creation and channel detection

```typescript
describe('WelcomeService', () => {
  it('creates welcome embed with correct structure', () => {
    const embed = welcomeService.createWelcomeEmbed(mockMember);
    expect(embed.data.title).toContain('Welcome');
    expect(embed.data.fields).toHaveLength(3);
  });

  it('finds welcome channel correctly', () => {
    const channel = welcomeService.findWelcomeChannel(mockGuild);
    expect(channel).toBeDefined();
  });
});
```

#### 2. Add Integration Tests (`tests/discordBot.integration.test.ts`)
**File**: `tests/discordBot.integration.test.ts`
**Changes**: Test guildMemberAdd event handling

```typescript
describe('DiscordBot Welcome Integration', () => {
  it('handles guildMemberAdd event', async () => {
    // Mock Discord client and emit guildMemberAdd
    await discordBot.handleGuildMemberAdd(mockMember);
    expect(mockChannel.send).toHaveBeenCalledWith(
      expect.objectContaining({ embeds: [expect.any(Object)] })
    );
  });
});
```

### Success Criteria

#### Automated Verification
- [x] All unit tests pass for WelcomeService
- [x] Integration tests pass for Discord bot welcome functionality
- [x] Test coverage > 80% for new welcome code
- [x] No regressions in existing Discord bot tests

#### Manual Verification
- [ ] Test welcome message with real Discord account join
- [ ] Verify message appears in correct channel
- [ ] Test permission denied scenarios
- [ ] Confirm existing slash commands still work

---

## Testing Strategy

### Unit Tests
- **WelcomeService**: Test embed creation, channel detection, permission checks
- **DiscordBotService**: Test event handler integration
- **Mock Objects**: Use Discord.js mock objects for isolated testing

### Integration Tests
- **Event Handling**: Test guildMemberAdd event processing
- **Service Integration**: Verify WelcomeService integration with DiscordBotService
- **Error Scenarios**: Test permission failures and missing channels

### Manual Testing Steps
1. **Bot Deployment**: Deploy bot with new intents to test server
2. **Permission Setup**: Ensure bot has necessary permissions in welcome channel
3. **User Join Test**: Have test user join server and verify welcome message includes @ mention
4. **Mention Verification**: Confirm the @ mention properly notifies the new user
5. **Edge Cases**: Test with no systemChannel, missing permissions, etc.
6. **Regression Test**: Verify all existing slash commands still work

### Performance Considerations
- **Event Throttling**: Welcome messages shouldn't impact command processing
- **Rate Limits**: Respect Discord's message rate limits
- **Memory Usage**: Ensure welcome service doesn't leak memory

## Migration Notes

### Discord Developer Portal
- **Privileged Intents**: Enable "Server Members Intent" in bot settings
- **Bot Permissions**: Ensure bot has "Send Messages" and "Embed Links" permissions
- **Server Settings**: No server-specific configuration required

### Deployment Checklist
- [ ] Update Discord application with GuildMembers intent
- [ ] Deploy code changes to production
- [ ] Monitor logs for welcome message errors
- [ ] Test with real user joins
- [ ] Rollback plan: Disable welcome feature if issues arise

## References

- Original requirement: Discord welcome message for new users
- Discord.js GuildMemberAdd event documentation
- Existing VillageOS command structure: `src/config/slashCommands.ts`
- Current Discord bot implementation: `src/services/discordBotService.ts`
- Platform adapter pattern: `src/adapters/discordPlatformAdapter.ts`