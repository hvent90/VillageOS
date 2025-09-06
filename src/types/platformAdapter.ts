import { CommandResult, CommandError } from './commandResults';

export interface PlatformAdapter {
  sendResult(channelId: string, result: CommandResult): Promise<void>;
  sendError(channelId: string, error: CommandError): Promise<void>;
  initialize?(): void; // Optional initialization method for setting up event handlers
}