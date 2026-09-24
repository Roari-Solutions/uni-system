import { Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { DATABASE, type Db } from 'src/database/database.module';
import type { ScientificAffairsPage } from 'src/content/entities/scientific-affairs-page.entity';
import type { UpdateScientificAffairsDto } from './dto/update-scientific-affairs.dto';
import type { MemoryFile } from 'src/main-cms/main-cms.service';
import { hash } from 'crypto';
import { join } from 'path';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { scientificAffairsPage } from 'schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class ScientificAffairsService {
  constructor(@Inject(DATABASE) private readonly db: Db) {}
  private readonly logger = new Logger(ScientificAffairsService.name);
  PDF_PATH = 'pdfs/';

  /** Stores PDF bytes by content hash; returns the public URL, or null for non-PDFs. */
  async storePdf(buffer: Buffer, mime: string): Promise<string | null> {
    if (mime !== 'application/pdf') return null;
    const hashString = hash('sha256', buffer);
    const filePath = join(this.PDF_PATH, `${hashString}.pdf`);
    await access(filePath).catch(() => writeFile(filePath, buffer));
    return `/pdfs/${hashString}.pdf`;
  }

  async get() {
    try {
      const content = (await this.db.query.scientificAffairsPage.findFirst())?.content ?? {};
      return content;
    } catch (error) {
      this.logger.error('Scientific-affairs fetch failed', error);
      throw new InternalServerErrorException(
        'Cant get the content of scintefifc affairs page table',
        { cause: error },
      );
    }
  }

  async update(dto: UpdateScientificAffairsDto, files: MemoryFile[]) {
    try {
      const existing = await this.db.query.scientificAffairsPage.findFirst();

      const newContent = {
        ...existing?.content,
        ...dto,
      } as ScientificAffairsPage;
      await mkdir(this.PDF_PATH, { recursive: true });

      for (const f of files) {
        const m = /^pdf_(\d+)$/.exec(f.fieldname); // .at(-1) gets 1-9 but breaks at 10 this fixes it
        if (!m) continue;
        const url = await this.storePdf(f.buffer, f.mimetype);

        const card = newContent.resources?.[Number(m[1])];
        if (card && url) card.pdfLink = url;
      }

      if (existing)
        await this.db
          .update(scientificAffairsPage)
          .set({ content: newContent })
          .where(eq(scientificAffairsPage.id, existing.id));
      else await this.db.insert(scientificAffairsPage).values({ content: newContent });
      this.logger.log('Scientific-affairs page patched');
      return { status: 'ok' };
    } catch (error) {
      this.logger.error('Scientific-affairs patch failed', error);
      throw new InternalServerErrorException('Scientific-affairs patch failed', {
        cause: error,
      });
    }
  }
}
