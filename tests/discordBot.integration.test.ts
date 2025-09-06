import { DiscordBotService } from '../src/services/discordBotService';
import { WelcomeService } from '../src/services/welcomeService';
import { GuildMember, Guild, TextChannel, Client } from 'discord.js';

// Mock Discord.js
jest.mock('discord.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    login: jest.fn().mockResolvedValue(undefined),
    user: { id: 'bot123' }
  })),
  GatewayIntentBits: {
    Guilds: 'Guilds',
    GuildMessages: 'GuildMessages',
    GuildMembers: 'GuildMembers'
  }
}));

describe('DiscordBot Welcome Integration', () => {
  let discordBot: DiscordBotService;
  let welcomeService: WelcomeService;
  let mockMember: jest.Mocked<GuildMember>;
  let mockGuild: jest.Mocked<Guild>;
  let mockChannel: jest.Mocked<TextChannel>;
  let mockClient: jest.Mocked<Client>;

  beforeEach(() => {
    welcomeService = new WelcomeService();

    mockGuild = {
      name: 'Test Server',
      systemChannel: mockChannel
    } as any;

    mockMember = {
      user: {
        username: 'testuser',
        id: '123'
      },
      guild: mockGuild
    } as any;

    mockChannel = {
      name: 'general',
      permissionsFor: jest.fn().mockReturnValue({
        has: jest.fn().mockReturnValue(true)
      }),
      send: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockClient = {
      user: { id: 'bot123' }
    } as any;

    // Mock the Client constructor
    const MockClient = require('discord.js').Client;
    MockClient.mockImplementation(() => mockClient);

    discordBot = new DiscordBotService('fake-token');
  });

  describe('handleGuildMemberAdd', () => {
    it('sends welcome message when channel and permissions are available', async () => {
      // Mock the welcome service methods
      welcomeService.findWelcomeChannel = jest.fn().mockReturnValue(mockChannel);
      welcomeService.canSendWelcomeMessage = jest.fn().mockResolvedValue(true);
      welcomeService.createWelcomeEmbed = jest.fn().mockReturnValue({
        data: { title: 'Welcome!' }
      });

      // Access the private method for testing
      const handleGuildMemberAdd = (discordBot as any).handleGuildMemberAdd.bind(discordBot);

      await handleGuildMemberAdd(mockMember);

      expect(welcomeService.findWelcomeChannel).toHaveBeenCalledWith(mockGuild);
      expect(welcomeService.canSendWelcomeMessage).toHaveBeenCalledWith(mockChannel, mockClient);
      expect(welcomeService.createWelcomeEmbed).toHaveBeenCalledWith(mockMember);
      expect(mockChannel.send).toHaveBeenCalledWith({
        content: expect.any(String), // Should be a mention string
        embeds: [expect.any(Object)]
      });
    });

    it('does not send message when no welcome channel found', async () => {
      welcomeService.findWelcomeChannel = jest.fn().mockReturnValue(null);

      const handleGuildMemberAdd = (discordBot as any).handleGuildMemberAdd.bind(discordBot);

      await handleGuildMemberAdd(mockMember);

      expect(mockChannel.send).not.toHaveBeenCalled();
    });

    it('does not send message when permissions are insufficient', async () => {
      welcomeService.findWelcomeChannel = jest.fn().mockReturnValue(mockChannel);
      welcomeService.canSendWelcomeMessage = jest.fn().mockResolvedValue(false);

      const handleGuildMemberAdd = (discordBot as any).handleGuildMemberAdd.bind(discordBot);

      await handleGuildMemberAdd(mockMember);

      expect(mockChannel.send).not.toHaveBeenCalled();
    });

    it('handles errors gracefully', async () => {
      welcomeService.findWelcomeChannel = jest.fn().mockReturnValue(mockChannel);
      welcomeService.canSendWelcomeMessage = jest.fn().mockResolvedValue(true);
      mockChannel.send = jest.fn().mockRejectedValue(new Error('Send failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const handleGuildMemberAdd = (discordBot as any).handleGuildMemberAdd.bind(discordBot);

      await handleGuildMemberAdd(mockMember);

      expect(consoleSpy).toHaveBeenCalledWith('Welcome message failed:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Client Configuration', () => {
    it('initializes client with correct intents', () => {
      const MockClient = require('discord.js').Client;
      new DiscordBotService('fake-token');

      expect(MockClient).toHaveBeenCalledWith({
        intents: ['Guilds', 'GuildMessages', 'GuildMembers']
      });
    });
  });
});