import { EmbedBuilder, GuildMember, Guild, TextChannel, Client, PermissionFlagsBits } from 'discord.js';

export class WelcomeService {
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

  findWelcomeChannel(guild: Guild): TextChannel | null {
    // Use system channel or find by name
    return guild.systemChannel ||
           guild.channels.cache.find(ch => ch.name === 'welcome') as TextChannel ||
           null;
  }

  async canSendWelcomeMessage(channel: TextChannel, client: Client): Promise<boolean> {
    try {
      const permissions = channel.permissionsFor(client.user!);
      return permissions?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks]) ?? false;
    } catch {
      return false;
    }
  }
}