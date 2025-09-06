import { Client, GatewayIntentBits, ChatInputCommandInteraction, MessageFlags, EmbedBuilder } from 'discord.js';
import { CommandProcessorService } from './commandProcessorService';
import { CommandRegistrationService } from './commandRegistrationService';
import { DiscordPlatformAdapter } from '../adapters/discordPlatformAdapter';
// TODO: Re-enable when GuildMembers intent is enabled in Discord Developer Portal
// import { WelcomeService } from './welcomeService';
import { CommandInput } from '../types/commands';
import { CommandName, AsyncWorkResult } from '../types/commandResults';

export class DiscordBotService {
  private client: Client;
  private commandProcessor!: CommandProcessorService;
  private commandRegistrationService!: CommandRegistrationService;
  // TODO: Re-enable when GuildMembers intent is enabled in Discord Developer Portal
  // private welcomeService!: WelcomeService;

  constructor(private token: string) {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds] // Remove GuildMembers until enabled in portal
    });
  }

  async listen(): Promise<void> {
    this.setupEventHandlers();
    await this.client.login(this.token);
  }

  private setupEventHandlers(): void {
    this.client.on('interactionCreate', async (interaction) => {
      if (interaction.isChatInputCommand()) {
        await this.handleSlashCommand(interaction);
      }
    });

    // TODO: Re-enable when GuildMembers intent is enabled in Discord Developer Portal
    // this.client.on('guildMemberAdd', async (member) => {
    //   await this.handleGuildMemberAdd(member);
    // });
  }

  private async handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    // CRITICAL: Defer IMMEDIATELY to meet Discord's 3-second timeout
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const commandInput = this.parseCommand(interaction);
    const result = await this.commandProcessor.handleCommand(commandInput);

    // Create Discord platform adapter for this interaction
    const adapter = new DiscordPlatformAdapter(interaction);

    // Send the result using the adapter
    if (result.success) {
      await adapter.sendResult(interaction.channelId, result);

      // Process async work if present
      if (result.asyncWork) {
        try {
          const asyncResult = await result.asyncWork;
          await this.sendAsyncResult(interaction, asyncResult);
        } catch (error) {
          console.error('Async work failed:', error);
          await this.sendAsyncError(interaction, 'Failed to complete background task');
        }
      }
    } else if (result.error) {
      await adapter.sendError(interaction.channelId, result.error);
    }
  }

  private parseCommand(interaction: ChatInputCommandInteraction): CommandInput {
    const args = this.extractArgs(interaction);

    // Convert Discord interaction to CommandInput format
    return {
      name: this.mapCommandName(interaction.commandName),
      sourceUserId: interaction.user.id,
      serverId: interaction.guildId || '', // Use guildId as village identifier (replaces SMS groupHash)
      channelId: interaction.channelId,
      args: args,
      villageDescription: args.description || undefined  // Extract village description
    };
  }

  private mapCommandName(commandName: string): CommandName {
    // Map Discord slash commands to our internal command names
    switch (commandName) {
      case 'village':
        // For village commands, the actual command is determined by the subcommand
        // This will be handled in the command processor based on the args.subcommand
        return CommandName.SHOW; // Default, will be overridden by subcommand processing
      default:
        return CommandName.SHOW; // Default fallback
    }
  }

   private extractArgs(interaction: ChatInputCommandInteraction): any {
     const args: any = {};

     // Extract subcommand
     if (interaction.options.getSubcommand(false)) {
       args.subcommand = interaction.options.getSubcommand();
     }

     // Extract common arguments
     if (interaction.options.getString('name')) {
       args.name = interaction.options.getString('name');
     }
     if (interaction.options.getInteger('x') !== null) {
       args.x = interaction.options.getInteger('x');
     }
     if (interaction.options.getInteger('y') !== null) {
       args.y = interaction.options.getInteger('y');
     }
     if (interaction.options.getString('description') || interaction.options.getString('crop')) {
       args.description = interaction.options.getString('description');
     }

     return args;
   }

  setCommandProcessor(commandProcessor: CommandProcessorService): void {
    this.commandProcessor = commandProcessor;
  }

  setCommandRegistrationService(service: CommandRegistrationService): void {
    this.commandRegistrationService = service;
  }

  // TODO: Re-enable when GuildMembers intent is enabled in Discord Developer Portal
  // setWelcomeService(service: WelcomeService): void {
  //   this.welcomeService = service;
  // }

  async registerSlashCommands(): Promise<void> {
    await this.commandRegistrationService.registerCommands();
  }

  private async sendAsyncResult(interaction: ChatInputCommandInteraction, asyncResult: AsyncWorkResult): Promise<void> {
    if (asyncResult.mediaData) {
      const embed = new EmbedBuilder()
        .setTitle('🏘️ Village Image Generated!')
        .setDescription(asyncResult.message || 'Here\'s your village!')
        .setImage(asyncResult.mediaData.url)
        .setColor(0x00ff00)
        .setTimestamp();

      await interaction.followUp({
        embeds: [embed]
        // No ephemeral flag - image visible to everyone
      });
    } else if (asyncResult.message) {
      await interaction.followUp({
        content: asyncResult.message,
        flags: MessageFlags.Ephemeral
      });
    }
  }

  private async sendAsyncError(interaction: ChatInputCommandInteraction, errorMessage: string): Promise<void> {
    await interaction.followUp({
      content: `❌ ${errorMessage}`,
      flags: MessageFlags.Ephemeral
    });
  }

  // TODO: Re-enable when GuildMembers intent is enabled in Discord Developer Portal
  // private async handleGuildMemberAdd(member: GuildMember): Promise<void> {
  //   try {
  //     const welcomeChannel = this.welcomeService.findWelcomeChannel(member.guild);
  //     if (!welcomeChannel) return;
  //
  //     const canSend = await this.welcomeService.canSendWelcomeMessage(welcomeChannel, this.client);
  //     if (!canSend) return;
  //
  //     const embed = this.welcomeService.createWelcomeEmbed(member);
  //     // ${member.user} automatically formats as @ mention in Discord
  //     await welcomeChannel.send({ content: `${member.user}`, embeds: [embed] });
  //   } catch (error) {
  //     console.error('Welcome message failed:', error);
  //   }
  // }
}