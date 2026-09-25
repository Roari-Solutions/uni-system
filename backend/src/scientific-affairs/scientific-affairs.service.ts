import {
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DATABASE, type Db } from 'src/database/database.module';
import type { ScientificAffairsPage } from 'src/content/entities/scientific-affairs-page.entity';
import type { UpdateScientificAffairsDto } from './dto/update-scientific-affairs.dto';
import { MediaService, type MediaFile } from 'src/media/media.service';
import { scientificAffairsPage } from 'schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class ScientificAffairsService {
  constructor(
    @Inject(DATABASE) private readonly db: Db,
    private readonly mediaService: MediaService,
  ) {}
  private readonly logger = new Logger(ScientificAffairsService.name);

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

  async update(dto: UpdateScientificAffairsDto, files: MediaFile[]) {
    // ponytail: store uploads before the try so media 400s are not wrapped in 500s
    const pdfByIndex = new Map<number, string>();
    for (const f of files) {
      const m = /^pdf_(\d+)$/.exec(f.fieldname); // .at(-1) gets 1-9 but breaks at 10 this fixes it
      if (!m) continue;
      pdfByIndex.set(Number(m[1]), await this.mediaService.storePdf(f.buffer, f.mimetype));
    }

    try {
      const existing = await this.db.query.scientificAffairsPage.findFirst();

      const newContent = {
        ...existing?.content,
        ...dto,
      } as ScientificAffairsPage;

      for (const [index, url] of pdfByIndex) {
        const card = newContent.resources?.[index];
        if (card) card.pdfLink = url;
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
      if (error instanceof HttpException) throw error;
      this.logger.error('Scientific-affairs patch failed', error);
      throw new InternalServerErrorException('Scientific-affairs patch failed', {
        cause: error,
      });
    }
  }
}
