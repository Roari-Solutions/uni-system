import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { contacts, news } from 'schema';
import { DATABASE, type Db } from 'src/database/database.module';
import {
  CreateContactDto,
  CreateNewsDto,
  UpdateNewsDto,
} from './dto/content.dto';

/** CRUD for news items and contact entries. */
@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(@Inject(DATABASE) private readonly db: Db) {}
  /** Lists all news items. */
  async news() {
    try {
      const rows = await this.db.query.news.findMany();
      // ponytail: strip server ids/timestamps
      return rows.map(({ id: _id, createdAt: _ca, updatedAt: _ua, ...rest }) => rest);
    } catch (error) {
      this.logger.error('Failed to fetch news', error);
      throw new InternalServerErrorException('Content operation failed', {
        cause: error,
      });
    }
  }
  /** Finds one news item by title, or null. */
  async getNewsByTitle(title: string) {
    try {
      const result = await this.db.query.news.findFirst({
        where: eq(news.title, title),
      });
      if (!result) return null;
      // ponytail: strip server ids/timestamps
      const { id: _id, createdAt: _ca, updatedAt: _ua, ...rest } = result;
      return rest;
    } catch (error) {
      this.logger.error(`Failed to fetch news by title: ${title}`, error);
      throw new InternalServerErrorException('Content operation failed', {
        cause: error,
      });
    }
  }
  /** Creates a news item; throws ConflictException on duplicate title. */
  async createNews(dto: CreateNewsDto): Promise<{ status: string }> {
    try {
      const existing = await this.db.query.news.findFirst({
        where: eq(news.title, dto.title),
      });
      if (existing) {
        this.logger.warn(`News already exists: ${dto.title}`);
        throw new ConflictException();
      }
      await this.db.insert(news).values(dto);
      this.logger.log(`Created news: ${dto.title}`);
      return { status: 'Ok' };
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      this.logger.error('Failed to create news', error);
      throw new InternalServerErrorException('Content operation failed', {
        cause: error,
      });
    }
  }
  /** Updates a news item; throws NotFoundException when missing. */
  async updateNewsByTitle(
    title: string,
    dto: UpdateNewsDto,
  ): Promise<{ status: string }> {
    if (!dto || !Object.keys(dto).length) throw new BadRequestException();
    try {
      const [updated] = await this.db
        .update(news)
        .set(dto)
        .where(eq(news.title, title))
        .returning();
      if (!updated) throw new NotFoundException();

      this.logger.log(`Updated news: ${title}`);
      return { status: 'Ok' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to update news: ${title}`, error);
      throw new InternalServerErrorException('Content operation failed', {
        cause: error,
      });
    }
  }
  /** Deletes a news item; throws NotFoundException when missing. */
  async deleteNewsByTitle(title: string): Promise<{ status: string }> {
    try {
      const [deleted] = await this.db
        .delete(news)
        .where(eq(news.title, title))
        .returning({ title: news.title });
      if (!deleted) throw new NotFoundException();

      this.logger.log(`Deleted news: ${title}`);
      return { status: 'Ok' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to delete news: ${title}`, error);
      throw new InternalServerErrorException('Content operation failed', {
        cause: error,
      });
    }
  }

  /** Lists all contact entries. */
  async contacts() {
    try {
      const rows = await this.db.query.contacts.findMany();
      // ponytail: strip server ids/timestamps
      return rows.map(({ id: _id, createdAt: _ca, updatedAt: _ua, ...rest }) => rest);
    } catch (error) {
      this.logger.error('Failed to fetch contacts', error);
      throw new InternalServerErrorException('Content operation failed', {
        cause: error,
      });
    }
  }

  /** Creates a contact; throws ConflictException on duplicate name. */
  async createContact(dto: CreateContactDto): Promise<{ status: string }> {
    try {
      const existing = await this.db.query.contacts.findFirst({
        where: eq(contacts.name, dto.name),
      });
      if (existing) {
        this.logger.warn(`Contact already exists: ${dto.name}`);
        throw new ConflictException();
      }
      await this.db.insert(contacts).values(dto);
      this.logger.log(`Created contact: ${dto.name}`);
      return { status: 'Ok' };
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      this.logger.error('Failed to create contact', error);
      throw new InternalServerErrorException('Content operation failed', {
        cause: error,
      });
    }
  }

  /** Updates a contact; throws NotFoundException when missing. */
  async updateContactByName(
    name: string,
    dto: CreateContactDto,
  ): Promise<{ status: string }> {
    try {
      const updated = await this.db
        .update(contacts)
        .set(dto)
        .where(eq(contacts.name, name))
        .returning({ name: contacts.name });
      if (!updated.length) throw new NotFoundException();

      this.logger.log(`Updated contact: ${name}`);
      return { status: 'Ok' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to update contact: ${name}`, error);
      throw new InternalServerErrorException('Content operation failed', {
        cause: error,
      });
    }
  }

  /** Deletes a contact; throws NotFoundException when missing. */
  async deleteContactByName(name: string): Promise<{ status: string }> {
    try {
      const deleted = await this.db
        .delete(contacts)
        .where(eq(contacts.name, name))
        .returning({ name: contacts.name });
      if (!deleted.length) throw new NotFoundException();

      this.logger.log(`Deleted contact: ${name}`);
      return { status: 'Ok' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to delete contact: ${name}`, error);
      throw new InternalServerErrorException('Content operation failed', {
        cause: error,
      });
    }
  }
}
