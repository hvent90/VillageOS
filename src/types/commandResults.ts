export enum CommandName {
   PLANT = 'plant',
   WATER = 'water',
   BUILD = 'build',
   SHOW = 'show',
   PING = 'ping',
   ME = 'me',
   DELETE = 'delete'
}

// NEW: Interface for async work results
export interface AsyncWorkResult {
  mediaData?: MediaData;  // Optional generated media
  message?: string;       // Optional text content
  mentions?: string[];    // User IDs to mention in the followup
}

export interface CommandResult {
  success: boolean;
  data?: any;
  message?: string;
  mediaData?: MediaData;  // NEW: For generated/attached media
  followUpMessage?: string;
  asyncWork?: Promise<AsyncWorkResult>; // NEW: Optional promise for async content
  error?: CommandError;
}

export interface CommandError {
  type: 'NOT_FOUND' | 'VALIDATION' | 'INTERNAL';
  message: string;
}

// Media data interface for generated/attached media
export interface MediaData {
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;            // Temporary URL for generated media
  filename: string;       // Original filename for downloads
  mimeType: string;       // MIME type for proper content handling
  caption?: string;       // Optional media description
}