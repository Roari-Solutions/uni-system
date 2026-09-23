import { Body, Controller, Get, HttpCode, HttpStatus, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { DynamicContentGuard } from 'src/dynamic_content/dynamic_content.guard';
import { DeanshipCmsService } from './deanship-cms.service';
import type { DeanshipAndCenters } from 'src/content/entities/deanship-and-centers-page.entity';
import { UpdateDeanshipCmDto } from './dto/update-deanship-cm.dto';

@Controller('cms')
/** Public deanship page read; guarded partial update (pure JSON, no media). */
export class DeanshipCmsController {
  constructor(private readonly deanshipCmsService: DeanshipCmsService) {}

  /** GET /cms/deanship — public deanship page content. */
  @Get('deanship')
  async get(): Promise<DeanshipAndCenters | null> {
    return await this.deanshipCmsService.get();
  }

  /** PATCH /cms/deanship — merges a partial body over stored content. */
  @Patch('deanship')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, DynamicContentGuard)
  async update(@Body() dto: UpdateDeanshipCmDto) {
    return await this.deanshipCmsService.update(dto);
  }
}
