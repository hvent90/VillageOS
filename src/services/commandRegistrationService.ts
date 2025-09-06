import { Client, REST, Routes } from 'discord.js';
import { slashCommands } from '../config/slashCommands';

export class CommandRegistrationService {
  constructor(private client: Client, private token: string, private applicationId: string) {}

  async registerCommands(): Promise<void> {
    const rest = new REST().setToken(this.token);

    try {
      console.log('Started refreshing application (/) commands.');

      await rest.put(
        Routes.applicationCommands(this.applicationId),
        { body: slashCommands }
      );

      console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
      console.error('Failed to register commands:', error);
      throw error;
    }
  }
}