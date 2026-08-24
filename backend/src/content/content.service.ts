import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
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

@Injectable()
export class ContentService {
  constructor(@Inject(DATABASE) private readonly db: Db) {}
  async news() {
    try {
      return await this.db.query.news.findMany();
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException();
    }
  }
  async get_news_by_title(
    title: string,
  ): Promise<(typeof news.$inferSelect)[]> {
    try {
      return await this.db.query.news.findMany({
        where: eq(news.title, title),
      });
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException();
    }
  }
  async create_news(dto: CreateNewsDto): Promise<{ status: string }> {
    try {
      await this.db.insert(news).values(dto);
      return { status: 'Ok' };
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException();
    }
  }
  async update_news_by_title(
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

      return { status: 'Ok' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.log(error);
      throw new InternalServerErrorException();
    }
  }
  async delete_news_by_title(title: string): Promise<{ status: string }> {
    try {
      const [deleted] = await this.db
        .delete(news)
        .where(eq(news.title, title))
        .returning({ title: news.title });
      if (!deleted) throw new NotFoundException();

      return { status: 'Ok' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.log(error);
      throw new InternalServerErrorException();
    }
  }

  async contacts(): Promise<(typeof contacts.$inferSelect)[]> {
    try {
      return await this.db.query.contacts.findMany();
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException();
    }
  }

  async create_contact(dto: CreateContactDto): Promise<{ status: string }> {
    try {
      const existing = await this.db.query.contacts.findFirst({
        where: eq(contacts.name, dto.name),
      });
      if (existing) throw new ConflictException();
      await this.db.insert(contacts).values(dto);
      return { status: 'Ok' };
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      console.log(error);
      throw new InternalServerErrorException();
    }
  }

  async update_contact_by_name(
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
      return { status: 'Ok' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.log(error);
      throw new InternalServerErrorException();
    }
  }

  async delete_contact_by_name(name: string): Promise<{ status: string }> {
    try {
      const deleted = await this.db
        .delete(contacts)
        .where(eq(contacts.name, name))
        .returning({ name: contacts.name });
      if (!deleted.length) throw new NotFoundException();
      return { status: 'Ok' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.log(error);
      throw new InternalServerErrorException();
    }
  }
}
