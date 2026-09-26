import { Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { DATABASE, type Db } from 'src/database/database.module';
import type { ContactUs } from 'src/content/entities/contact-us-page.entity';
import { contactUsPage } from 'schema';
import { eq } from 'drizzle-orm';
import type { UpdateContactUsCmDto } from './dto/update-contact-us-cm.dto';

/** Reads and patches the singleton contact-us page document. */
@Injectable()
export class ContactUsCmsService {
  private readonly logger = new Logger(ContactUsCmsService.name);

  constructor(@Inject(DATABASE) private readonly db: Db) {}

  /** Returns the contact-us content, or null before the first patch. */
  async get(): Promise<ContactUs | null> {
    try {
      const row = await this.db.query.contactUsPage.findFirst();
      return row?.content ?? null;
    } catch (error) {
      this.logger.error('Contact-us fetch failed', error);
      throw new InternalServerErrorException('Contact-us fetch failed', {
        cause: error,
      });
    }
  }

  /** Merges a partial body over stored content; inserts on first patch. */
  async update(dto: UpdateContactUsCmDto): Promise<{ status: string }> {
    try {
      const existing = await this.db.query.contactUsPage.findFirst();
      //  partial until every field patched once
      const merged = { ...existing?.content, ...dto } as ContactUs;

      if (existing)
        await this.db
          .update(contactUsPage)
          .set({ content: merged })
          .where(eq(contactUsPage.id, existing.id));
      else await this.db.insert(contactUsPage).values({ content: merged });

      this.logger.log('Contact-us page patched');
      return { status: 'ok' };
    } catch (error) {
      this.logger.error('Contact-us patch failed', error);
      throw new InternalServerErrorException('Contact-us patch failed', {
        cause: error,
      });
    }
  }
}
