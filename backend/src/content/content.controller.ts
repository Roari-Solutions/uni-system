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
  ParseUUIDPipe,
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
// @UseGuards(AuthGuard, DynamicContentGuard)
export class ContentController {
  constructor(private readonly contentService: ContentService) {}
  @Get('news')
  async news(): Promise<News[]> {
    return await this.contentService.news();
  }
  @Get('news/:title')
  async news_by_title(@Param('title') title: string): Promise<News[]> {
    return await this.contentService.get_news_by_title(title);
  }

  @Post('news')
  @HttpCode(HttpStatus.CREATED)
  async creat(@Body() dto: CreateNewsDto): Promise<{ status: string }> {
    return await this.contentService.create_news(dto);
  }

  @Patch('/news/:id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNewsDto,
  ): Promise<{ status: string }> {
    return this.contentService.update_news_by_id(id, dto);
  }
  @Delete('/news/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deltete_news(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ status: string }> {
    return this.contentService.delete_news_by_id(id);
  }

  @Get('contact')
  async contacts(): Promise<Contact[]> {
    return await this.contentService.contacts();
  }

  @Post('contact')
  @HttpCode(HttpStatus.CREATED)
  create_contact(@Body() dto: CreateContactDto): Promise<{ status: string }> {
    return this.contentService.create_contact(dto);
  }

  @Patch('/contact/:id')
  @HttpCode(HttpStatus.OK)
  update_contact(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateContactDto,
  ): Promise<{ status: string }> {
    return this.contentService.update_contact_by_id(id, dto);
  }

  @Delete('/contact/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete_contact(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ status: string }> {
    return this.contentService.delete_contact_by_id(id);
  }
}
