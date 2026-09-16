import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ContentService } from './content.service';
import {
  CreateContactDto,
  CreateNewsDto,
  UpdateNewsDto,
} from './dto/content.dto';
import type { contacts, news } from 'schema';
import { DynamicContentGuard } from 'src/dynamic_content/dynamic_content.guard';
import { AuthGuard } from 'src/auth/auth.guard';

type News = typeof news.$inferSelect;
type Contact = typeof contacts.$inferSelect;

/** News/contact endpoints (auth + dynamic-content guarded). */
@Controller('content')
@UseGuards(AuthGuard, DynamicContentGuard)
export class ContentController {
  constructor(private readonly contentService: ContentService) {}
  /** GET /content/news */
  @Get('news')
  async news(): Promise<News[]> {
    return await this.contentService.news();
  }
  /** GET /content/news/:title */
  @Get('news/:title')
  async newsByTitle(@Param('title') title: string): Promise<News | null> {
    return await this.contentService.getNewsByTitle(title);
  }

  /** POST /content/news */
  @Post('news')
  @HttpCode(HttpStatus.CREATED)
  async createNews(@Body() dto: CreateNewsDto): Promise<{ status: string }> {
    return await this.contentService.createNews(dto);
  }

  /** PATCH /content/news/:title */
  @Patch('/news/:title')
  @HttpCode(HttpStatus.OK)
  updateNews(
    @Param('title') title: string,
    @Body() dto: UpdateNewsDto,
  ): Promise<{ status: string }> {
    return this.contentService.updateNewsByTitle(title, dto);
  }
  /** DELETE /content/news/:title */
  @Delete('/news/:title')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteNews(@Param('title') title: string): Promise<{ status: string }> {
    return this.contentService.deleteNewsByTitle(title);
  }

  /** GET /content/contact */
  @Get('contact')
  async contacts(): Promise<Contact[]> {
    return await this.contentService.contacts();
  }

  /** POST /content/contact */
  @Post('contact')
  @HttpCode(HttpStatus.CREATED)
  createContact(@Body() dto: CreateContactDto): Promise<{ status: string }> {
    return this.contentService.createContact(dto);
  }

  /** PATCH /content/contact/:name */
  @Patch('/contact/:name')
  @HttpCode(HttpStatus.OK)
  updateContact(
    @Param('name') name: string,
    @Body() dto: CreateContactDto,
  ): Promise<{ status: string }> {
    return this.contentService.updateContactByName(name, dto);
  }

  /** DELETE /content/contact/:name */
  @Delete('/contact/:name')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteContact(@Param('name') name: string): Promise<{ status: string }> {
    return this.contentService.deleteContactByName(name);
  }
}
