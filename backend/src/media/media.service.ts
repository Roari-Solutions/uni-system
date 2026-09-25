import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
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

/** Stores CMS images and PDFs on local disk; returns the public URL. */
@Injectable()
export class MediaService {
  /** Stores an image and returns its `/images/...` URL. */
  async storeImage(buffer: Buffer, mime: string): Promise<string> {
    const ext = IMAGE_EXT_BY_MIME[mime];
    if (!ext) throw new BadRequestException({ code: 'PI' });
    if (!Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.length > MAX_MEDIA_BYTES)
      throw new BadRequestException({ code: 'PI' });

    const digest = createHash('sha256').update(buffer).digest('hex');

    return this.writeMediaFile(MEDIA_IMAGES_DIR, '/images', `${digest}.${ext}`, buffer);
  }

  /** Stores a PDF and returns its `/pdfs/...` URL. */
  async storePdf(buffer: Buffer, mime: string): Promise<string> {
    if (mime !== 'application/pdf') throw new BadRequestException({ code: 'PI' });
    if (!Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.length > MAX_MEDIA_BYTES)
      throw new BadRequestException({ code: 'PI' });

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
      throw new InternalServerErrorException('Media store failed', {
        cause: error,
      });
    }
  }
}
