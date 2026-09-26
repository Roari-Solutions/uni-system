import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import {
  MAX_MEDIA_BYTES,
  MEDIA_IMAGES_DIR,
  MEDIA_PDFS_DIR,
  MediaService,
} from './media.service';

describe('MediaService', () => {
  let service: MediaService;

  beforeEach(() => {
    service = new MediaService();
  });

  it('rejects unsupported image types', async () => {
    await expect(service.storeImage(Buffer.from('nope'), 'text/plain')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects oversized images', async () => {
    const buffer = Buffer.alloc(MAX_MEDIA_BYTES + 1, 'x');

    await expect(service.storeImage(buffer, 'image/png')).rejects.toThrow(BadRequestException);
  });

  it('stores images idempotently', async () => {
    const buffer = Buffer.from('cms-image');
    const digest = createHash('sha256').update(buffer).digest('hex');

    const first = await service.storeImage(buffer, 'image/png');
    const second = await service.storeImage(buffer, 'image/png');

    expect(first).toBe(`/images/${digest}.png`);
    expect(second).toBe(first);
    await access(join(MEDIA_IMAGES_DIR, `${digest}.png`));
  });

  it('rejects non-PDF uploads', async () => {
    await expect(service.storePdf(Buffer.from('nope'), 'image/png')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects oversized PDFs', async () => {
    const buffer = Buffer.alloc(MAX_MEDIA_BYTES + 1, 'x');

    await expect(service.storePdf(buffer, 'application/pdf')).rejects.toThrow(BadRequestException);
  });

  it('stores PDFs idempotently', async () => {
    const buffer = Buffer.from('%PDF-1.4 cms-pdf');
    const digest = createHash('sha256').update(buffer).digest('hex');

    const first = await service.storePdf(buffer, 'application/pdf');
    const second = await service.storePdf(buffer, 'application/pdf');

    expect(first).toBe(`/pdfs/${digest}.pdf`);
    expect(second).toBe(first);
    await access(join(MEDIA_PDFS_DIR, `${digest}.pdf`));
  });
});
