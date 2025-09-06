import { Request, Response } from 'express';
import { CommandProcessorService } from './commandProcessorService';
import logger from '../config/logger';

export class SMSWebhookService {
  constructor(private commandProcessor: CommandProcessorService) {}

  async handleIncomingSMS(req: Request, res: Response): Promise<void> {
    try {
      const { From: fromNumber, Body: messageBody, To: toNumber } = req.body;

      logger.info({
        event: 'sms_received',
        from: fromNumber,
        to: toNumber,
        message: messageBody
      });

      // Parse command from message body
      const commandInput = this.parseCommand(messageBody, fromNumber, toNumber);

      // Process command
      const result = await this.commandProcessor.handleCommand(commandInput);

      // Send response back via platform adapter
      await this.commandProcessor.sendResult(fromNumber, result);

      res.status(200).send('OK');
    } catch (error) {
      logger.error({
        event: 'sms_processing_error',
        error: error instanceof Error ? error.message : String(error)
      });
      res.status(500).send('Internal Server Error');
    }
  }

  private parseCommand(messageBody: string, fromNumber: string, toNumber: string) {
    // Parse command from SMS body
    const trimmedBody = messageBody.trim();
    const commandText = trimmedBody.startsWith('!') ? trimmedBody.substring(1) : trimmedBody;

    // Parse command name and arguments
    const parts = commandText.split(' ');
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Map string to CommandName enum
    let name: any;
    switch (commandName) {
      case 'plant':
        name = 'plant' as const;
        break;
      case 'water':
        name = 'water' as const;
        break;
      case 'build':
        name = 'build' as const;
        break;
      case 'show':
        name = 'show' as const;
        break;
      case 'ping':
        name = 'ping' as const;
        break;
      default:
        name = 'ping' as const; // Default to ping for unknown commands
    }

    // Generate group hash for village identification
    const groupHash = this.generateGroupHash([fromNumber]);

    return {
      name,
      sourceUserId: fromNumber,
      serverId: groupHash, // Use group hash for village identification
      channelId: fromNumber,
      args,
      platform: 'sms' as const
    };
  }

  private generateGroupHash(phoneNumbers: string[]): string {
    // Create deterministic hash from sorted phone numbers
    const sortedNumbers = [...phoneNumbers].sort();
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(sortedNumbers.join(',')).digest('hex');
  }
}