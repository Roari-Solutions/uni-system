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

@Controller('content')
@UseGuards(AuthGuard, DynamicContentGuard)
export class ContentController {
  constructor(private readonly contentService: ContentService) {}
  @Get('news')
  async news(): Promise<News[]> {
    return await this.contentService.news();
  }
  @Get('news/:title')
  async newsByTitle(@Param('title') title: string): Promise<News | null> {
    return await this.contentService.getNewsByTitle(title);
  }

  @Post('news')
  @HttpCode(HttpStatus.CREATED)
  async createNews(@Body() dto: CreateNewsDto): Promise<{ status: string }> {
    return await this.contentService.createNews(dto);
  }

  @Patch('/news/:title')
  @HttpCode(HttpStatus.OK)
  updateNews(
    @Param('title') title: string,
    @Body() dto: UpdateNewsDto,
  ): Promise<{ status: string }> {
    return this.contentService.updateNewsByTitle(title, dto);
  }
  @Delete('/news/:title')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteNews(@Param('title') title: string): Promise<{ status: string }> {
    return this.contentService.deleteNewsByTitle(title);
  }

  @Get('contact')
  async contacts(): Promise<Contact[]> {
    return await this.contentService.contacts();
  }

  @Post('contact')
  @HttpCode(HttpStatus.CREATED)
  createContact(@Body() dto: CreateContactDto): Promise<{ status: string }> {
    return this.contentService.createContact(dto);
  }

  @Patch('/contact/:name')
  @HttpCode(HttpStatus.OK)
  updateContact(
    @Param('name') name: string,
    @Body() dto: CreateContactDto,
  ): Promise<{ status: string }> {
    return this.contentService.updateContactByName(name, dto);
  }

  @Delete('/contact/:name')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteContact(@Param('name') name: string): Promise<{ status: string }> {
    return this.contentService.deleteContactByName(name);
  }
}
