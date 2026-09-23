import { Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { deanshipPage } from 'schema';
import type { DeanshipAndCenters } from 'src/content/entities/deanship-and-centers-page.entity';
import { DATABASE, type Db } from 'src/database/database.module';
import type { UpdateDeanshipCmDto } from './dto/update-deanship-cm.dto';

/** Reads and patches the singleton deanship page document. */
@Injectable()
export class DeanshipCmsService {
  private readonly logger = new Logger(DeanshipCmsService.name);

  constructor(@Inject(DATABASE) private readonly db: Db) {}

  /** Returns the deanship content, or null before the first patch. */
  async get(): Promise<DeanshipAndCenters | null> {
    try {
      const row = await this.db.query.deanshipPage.findFirst();
      return row?.content ?? null;
    } catch (error) {
      this.logger.error('Deanship fetch failed', error);
      throw new InternalServerErrorException('Deanship fetch failed', {
        cause: error,
      });
    }
  }

  /** Merges a partial body over stored content; inserts on first patch. */
  async update(dto: UpdateDeanshipCmDto): Promise<{ status: string }> {
    try {
      const existing = await this.db.query.deanshipPage.findFirst();
      //  partial until every field patched once
      const merged = {
        ...existing?.content,
        ...dto,
      } as DeanshipAndCenters;

      if (existing)
        await this.db
          .update(deanshipPage)
          .set({ content: merged })
          .where(eq(deanshipPage.id, existing.id));
      else await this.db.insert(deanshipPage).values({ content: merged });

      this.logger.log('Deanship page patched');
      return { status: 'true' };
    } catch (error) {
      this.logger.error('Deanship patch failed', error);
      throw new InternalServerErrorException('Deanship patch failed', {
        cause: error,
      });
    }
  }
}
