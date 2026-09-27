import { Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { partnershipPage } from 'schema';
import type { Partnerships } from 'src/content/entities/partnerships.entity';
import { DATABASE, type Db } from 'src/database/database.module';
import type { UpdatePartnershipDto } from './dto/update-partnership.dto';

/** Reads and patches the singleton partnerships page document. */
@Injectable()
export class PartnershipsCmsService {
  private readonly logger = new Logger(PartnershipsCmsService.name);

  constructor(@Inject(DATABASE) private readonly db: Db) {}

  /** Returns the partnerships content, or null before the first patch. */
  async get(): Promise<Partnerships | null> {
    try {
      const row = await this.db.query.partnershipPage.findFirst();
      return row?.content ?? null;
    } catch (error) {
      this.logger.error('Partnerships fetch failed', error);
      throw new InternalServerErrorException('Partnerships fetch failed', {
        cause: error,
      });
    }
  }

  /** Merges a partial body over stored content; inserts on first patch. */
  async update(dto: UpdatePartnershipDto): Promise<{ status: string }> {
    try {
      const existing = await this.db.query.partnershipPage.findFirst();
      //  partial until every field patched once
      const merged = {
        ...existing?.content,
        ...dto,
      } as Partnerships;

      if (existing)
        await this.db
          .update(partnershipPage)
          .set({ content: merged })
          .where(eq(partnershipPage.id, existing.id));
      else await this.db.insert(partnershipPage).values({ content: merged });

      this.logger.log('Partnerships page patched');
      return { status: 'ok' };
    } catch (error) {
      this.logger.error('Partnerships patch failed', error);
      throw new InternalServerErrorException('Partnerships patch failed', {
        cause: error,
      });
    }
  }
}
