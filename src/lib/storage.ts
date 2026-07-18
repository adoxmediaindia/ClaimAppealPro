import { createServerSideClient } from '@/lib/supabase';
import { ApiError } from '@/lib/errors';
import log from '@/lib/logger';

export interface StorageProvider {
  generateUploadUrl(
    userId: string,
    fileName: string,
    mimeType: string,
    fileSize: number
  ): Promise<{ uploadUrl: string; storagePath: string }>;
  
  generateDownloadUrl(storagePath: string): Promise<string>;
  
  deleteFile(storagePath: string): Promise<void>;

  downloadFile(storagePath: string): Promise<Buffer>;

  uploadFile(storagePath: string, buffer: Buffer, mimeType: string): Promise<void>;
}

export class SupabaseStorageProvider implements StorageProvider {
  private bucketName = 'denials';

  async uploadFile(storagePath: string, buffer: Buffer, mimeType: string): Promise<void> {
    const supabase = await createServerSideClient();
    const { error } = await supabase.storage
      .from(this.bucketName)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      log.error({ storagePath }, 'Supabase Storage file upload failed', error);
      throw new ApiError(500, 'STORAGE_UPLOAD_ERROR', 'Failed to upload file to storage.');
    }
  }


  /**
   * Generates a secure presigned upload URL directly from Supabase Storage.
   * Restricts sizes <= 10MB and validates MIME types.
   */
  async generateUploadUrl(
    userId: string,
    fileName: string,
    mimeType: string,
    fileSize: number
  ): Promise<{ uploadUrl: string; storagePath: string }> {
    const correlationId = crypto.randomUUID();
    
    // 1. Validate File Size limit (10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (fileSize > MAX_SIZE) {
      throw new ApiError(400, 'FILE_TOO_LARGE', 'File size exceeds the maximum 10MB limit.');
    }

    // 2. Validate MIME types (PDF, JPG, PNG only)
    const ALLOWED_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!ALLOWED_MIMES.includes(mimeType)) {
      throw new ApiError(400, 'INVALID_FILE_TYPE', 'Only PDF, JPG, and PNG files are allowed.');
    }

    // 3. Resolve file extension safely
    const ext = fileName.split('.').pop() || 'dat';
    const uniqueFileId = crypto.randomUUID();
    
    // Randomized path structure preventing traversal and resource enumeration attacks
    const storagePath = `users/${userId}/claims/${uniqueFileId}.${ext}`;

    log.info(
      { correlationId, userId, fileName, mimeType, fileSize, storagePath },
      'Generating presigned upload URL from Supabase Storage'
    );

    const supabase = await createServerSideClient();
    
    // Supabase createSignedUploadUrl automatically expires after default seconds (typically 300s)
    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .createSignedUploadUrl(storagePath);

    if (error) {
      log.error({ correlationId, errorCode: error.name }, 'Supabase Storage presigned URL generation failed', error);
      throw new ApiError(500, 'STORAGE_UPLOAD_ERROR', 'Failed to generate presigned upload URL.');
    }

    return {
      uploadUrl: data.signedUrl,
      storagePath,
    };
  }

  /**
   * Generates a temporary signed download URL for private files.
   * Expiration defaults to 15 minutes (900 seconds).
   */
  async generateDownloadUrl(storagePath: string): Promise<string> {
    const supabase = await createServerSideClient();
    
    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .createSignedUrl(storagePath, 900); // 15 mins expiry

    if (error) {
      log.error({ storagePath }, 'Supabase Storage signed download URL generation failed', error);
      throw new ApiError(500, 'STORAGE_DOWNLOAD_ERROR', 'Failed to retrieve file download URL.');
    }

    return data.signedUrl;
  }

  /**
   * Deletes a file from Supabase Storage bucket.
   */
  async deleteFile(storagePath: string): Promise<void> {
    const supabase = await createServerSideClient();
    
    const { error } = await supabase.storage
      .from(this.bucketName)
      .remove([storagePath]);

    if (error) {
      log.error({ storagePath }, 'Supabase Storage file deletion failed', error);
      throw new ApiError(500, 'STORAGE_DELETION_ERROR', 'Failed to delete file from storage bucket.');
    }
  }

  /**
   * Downloads a file from Supabase Storage private bucket and returns its binary Buffer.
   */
  async downloadFile(storagePath: string): Promise<Buffer> {
    const supabase = await createServerSideClient();
    
    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .download(storagePath);

    if (error) {
      log.error({ storagePath }, 'Supabase Storage file download failed', error);
      throw new ApiError(500, 'STORAGE_DOWNLOAD_ERROR', 'Failed to download file from bucket.');
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
