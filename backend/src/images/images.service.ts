import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { images } from 'schema';
import { DATABASE, type Db } from 'src/database/database.module';

/** Disk directory served at /images/ by main.ts. */ // update it later for the nginx path and set the dir owner to my user in the server
export const IMAGES_DIR = join(process.cwd(), 'images');
/** Max accepted upload size (5 MB). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** Allowed upload mime types mapped to file extension. */
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

@Injectable()
/** Stores uploaded image bytes as /images/<sha256>.<ext>; idempotent. */
export class ImagesService {
  constructor(@Inject(DATABASE) private readonly db: Db) {}

  /** Saves bytes and returns the public path-only URL. */
  async store(buffer: Buffer, mime: string): Promise<string> {
    const ext = EXT_BY_MIME[mime];
    if (!ext) throw new BadRequestException({ code: 'PI' });
    if (buffer.length > MAX_IMAGE_BYTES) throw new BadRequestException({ code: 'PI' });

    const hash = createHash('sha256').update(buffer).digest('hex');
    try {
      await mkdir(IMAGES_DIR, { recursive: true });
      const file = join(IMAGES_DIR, `${hash}.${ext}`);
      await access(file).catch(() => writeFile(file, buffer));
      await this.db
        .insert(images)
        .values({ hash, ext, mime, size: buffer.length })
        .onConflictDoNothing();
    } catch (error) {
      throw new InternalServerErrorException('Image store failed', {
        cause: error,
      });
    }
    return `/images/${hash}.${ext}`;
  }
}
