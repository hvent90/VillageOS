import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { PlatformAdapter } from '../types/platformAdapter';
import { CommandResult, CommandError } from '../types/commandResults';

export class DiscordPlatformAdapter implements PlatformAdapter {
  constructor(private interaction: ChatInputCommandInteraction) {}

   async sendResult(channelId: string, result: CommandResult): Promise<void> {
     let embed: EmbedBuilder | undefined;

     if (result.mediaData) {
       embed = new EmbedBuilder()
         .setTitle('🎨 Character Customization Complete!')
         .setDescription(result.message || 'Your new appearance has been generated!')
         .setImage(result.mediaData.url)
         .setColor(0x00ff00)
         .setTimestamp();
     }

     const options = {
       content: result.message,
       embeds: embed ? [embed] : []
     };

     if (this.interaction.deferred) {
       await this.interaction.editReply(options);
     } else {
       await this.interaction.reply({...options, flags: MessageFlags.Ephemeral});
     }
   }

  async sendError(channelId: string, error: CommandError): Promise<void> {
    const options = { content: `❌ ${error.message}` };
    if (this.interaction.deferred) {
      await this.interaction.editReply(options);
    } else {
      await this.interaction.reply({...options, flags: MessageFlags.Ephemeral});
    }
  }
}