import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Uploaded file shape used by CMS multipart PATCH endpoints. */
export type MediaFile = {
  buffer: Buffer;
  fieldname: string;
  mimetype: string;
  originalname: string;
  size: number;
};

/** Shared upload cap for CMS images and PDFs. */
export const MAX_MEDIA_BYTES = 20 * 1024 * 1024;

/** Root directory for stored CMS files; override locally via MEDIA_DIR. */
export const MEDIA_DIR = process.env.MEDIA_DIR ?? join('/data/');

/** Disk directory for stored CMS images. */
export const MEDIA_IMAGES_DIR = join(MEDIA_DIR, 'images');

/** Disk directory for stored CMS PDFs. */
export const MEDIA_PDFS_DIR = join(MEDIA_DIR, 'pdfs');

/** Disk directory for stored CMS PDFs. */

const IMAGE_EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/** Sniffs real image content; the multipart mime comes from the client and lies. */
function isImageBuffer(buffer: Buffer, ext: string): boolean {
  if (ext === 'png')
    return (
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    );
  if (ext === 'jpg') return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8;
  if (ext === 'gif')
    return buffer.length >= 6 && buffer.subarray(0, 6).toString('ascii').startsWith('GIF8');
  if (ext === 'webp')
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  return false;
}

/** Sniffs real PDF content (%PDF- magic). */
function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-';
}

/** Stores CMS images and PDFs on local disk; returns the public URL. */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  /** Stores an image and returns its `/images/...` URL. */
  async storeImage(buffer: Buffer, mime: string): Promise<string> {
    const ext = IMAGE_EXT_BY_MIME[mime];
    if (!ext) {
      this.logger.warn(`Rejected image upload: unsupported mime ${mime}`);
      throw new BadRequestException({ code: 'PI' });
    }
    if (!Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.length > MAX_MEDIA_BYTES)
      throw new BadRequestException({ code: 'PI' });
    if (!isImageBuffer(buffer, ext)) {
      this.logger.warn(
        `Rejected image upload: claimed ${mime} but content is not a ${ext} image (${buffer.length} bytes)`,
      );
      throw new BadRequestException({ code: 'PI' });
    }

    const digest = createHash('sha256').update(buffer).digest('hex');

    return this.writeMediaFile(MEDIA_IMAGES_DIR, '/images', `${digest}.${ext}`, buffer);
  }

  /** Stores a PDF and returns its `/pdfs/...` URL. */
  async storePdf(buffer: Buffer, mime: string): Promise<string> {
    if (mime !== 'application/pdf') {
      this.logger.warn(`Rejected PDF upload: unsupported mime ${mime}`);
      throw new BadRequestException({ code: 'PI' });
    }
    if (!Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.length > MAX_MEDIA_BYTES)
      throw new BadRequestException({ code: 'PI' });
    if (!isPdfBuffer(buffer)) {
      this.logger.warn(`Rejected PDF upload: content is not a PDF (${buffer.length} bytes)`);
      throw new BadRequestException({ code: 'PI' });
    }

    const digest = createHash('sha256').update(buffer).digest('hex');

    return this.writeMediaFile(MEDIA_PDFS_DIR, '/pdfs', `${digest}.pdf`, buffer);
  }

  private async writeMediaFile(
    dir: string,
    prefix: string,
    filename: string,
    buffer: Buffer,
  ): Promise<string> {
    try {
      await mkdir(dir, { recursive: true });
      // Same bytes always hash to the same name, so overwrite is idempotent.
      await writeFile(join(dir, filename), buffer);

      return `${prefix}/${filename}`;
    } catch (error) {
      this.logger.error('Media store failed', error);
      throw new InternalServerErrorException('Media store failed', {
        cause: error,
      });
    }
  }
}
