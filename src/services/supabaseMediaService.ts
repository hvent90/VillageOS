import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import https from 'https';
import http from 'http';

export interface TempFileInfo {
  filepath: string;
  url: string;
  filename: string;
  createdAt: Date;
}

export class SupabaseMediaService {
  private supabase: SupabaseClient;
  private bucketName: string;
  private cleanupIntervalMs: number = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    this.bucketName = process.env.SUPABASE_BUCKET_NAME || 'temp-media';
    this.startCleanupScheduler();
  }

  async saveTemporaryFile(buffer: Buffer, originalFilename: string, mimeType: string): Promise<TempFileInfo> {
    const fileId = uuidv4();
    const extension = originalFilename.split('.').pop() || 'bin';
    const filename = `temp/${Date.now()}-${fileId}.${extension}`;

    // Upload to Supabase Storage
    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(filename, buffer, {
        contentType: mimeType,
        upsert: false
      });

    if (error) {
      throw new Error(`Failed to upload to Supabase: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(filename);

    return {
      filepath: filename,
      url: publicUrl,
      filename: originalFilename,
      createdAt: new Date()
    };
  }

  async savePermanentFile(buffer: Buffer, path: string, mimeType: string): Promise<string> {
    const permanentPath = `baselines/${path}`;

    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(permanentPath, buffer, {
        contentType: mimeType,
        upsert: true  // Allow overwriting for evolution updates
      });

    if (error) {
      throw new Error(`Failed to save baseline: ${error.message}`);
    }

    const { data: { publicUrl } } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(permanentPath);

    return publicUrl;
  }

  async fetchImageDataFromUrl(url: string): Promise<{ data: Buffer, mimeType: string }> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https:') ? https : http;

      protocol.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to fetch image: HTTP ${response.statusCode}`));
          return;
        }

        const contentType = response.headers['content-type'] || 'image/jpeg';
        const chunks: Buffer[] = [];

        response.on('data', (chunk) => {
          chunks.push(chunk);
        });

        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            data: buffer,
            mimeType: contentType
          });
        });

        response.on('error', (error) => {
          reject(new Error(`Failed to fetch image data: ${error.message}`));
        });
      }).on('error', (error) => {
        reject(new Error(`Failed to fetch image: ${error.message}`));
      });
    });
  }

  private async startCleanupScheduler(): Promise<void> {
    setInterval(async () => {
      await this.cleanupExpiredFiles();
    }, this.cleanupIntervalMs);
  }

  private async cleanupExpiredFiles(): Promise<void> {
    const oneHourAgo = new Date(Date.now() - this.cleanupIntervalMs);
    const cutoffTimestamp = oneHourAgo.getTime();

    try {
      // List files in temp/ folder (exclude baselines/ directory)
      const { data: files, error } = await this.supabase.storage
        .from(this.bucketName)
        .list('temp/', { limit: 100 });

      if (error || !files) return;

      // Filter files older than 1 hour based on filename timestamp
      const expiredFiles = files
        .filter(file => {
          const timestamp = parseInt(file.name.split('-')[0]);
          return timestamp < cutoffTimestamp;
        })
        .map(file => `temp/${file.name}`);

      if (expiredFiles.length > 0) {
        await this.supabase.storage
          .from(this.bucketName)
          .remove(expiredFiles);

        console.log(`Cleaned up ${expiredFiles.length} expired media files`);
      }
    } catch (error) {
      console.error('Media cleanup failed:', error);
    }
  }
}