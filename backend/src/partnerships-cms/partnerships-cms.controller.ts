import { Body, Controller, Get, HttpCode, HttpStatus, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { DynamicContentGuard } from 'src/dynamic_content/dynamic_content.guard';
import { PartnershipsCmsService } from './partnerships-cms.service';
import type { Partnerships } from 'src/content/entities/partnerships.entity';
import { UpdatePartnershipDto } from './dto/update-partnership.dto';

@Controller('cms')
/** Public partnerships page read; guarded partial update (pure JSON, no media). */
export class PartnershipsCmsController {
  constructor(private readonly partnershipsCmsService: PartnershipsCmsService) {}

  /** GET /cms/partnership — public partnerships page content. */
  @Get('partnership')
  async get(): Promise<Partnerships | null> {
    return await this.partnershipsCmsService.get();
  }

  /** PATCH /cms/partnership — merges a partial body over stored content. */
  @Patch('partnership')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, DynamicContentGuard)
  async update(@Body() dto: UpdatePartnershipDto) {
    return await this.partnershipsCmsService.update(dto);
  }
}
