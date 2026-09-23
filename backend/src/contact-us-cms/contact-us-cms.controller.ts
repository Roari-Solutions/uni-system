import { Controller, Get, Body, Patch, UseGuards } from '@nestjs/common';
import { ContactUsCmsService } from './contact-us-cms.service';
import { UpdateContactUsCmDto } from './dto/update-contact-us-cm.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { DynamicContentGuard } from 'src/dynamic_content/dynamic_content.guard';

@Controller('cms')
export class ContactUsCmsController {
  constructor(private readonly contactUsCmsService: ContactUsCmsService) {}
  @Get('contact')
  findAll() {
    return this.contactUsCmsService.get();
  }
  @Patch('contact')
  @UseGuards(AuthGuard, DynamicContentGuard)
  update(@Body() dto: UpdateContactUsCmDto) {
    return this.contactUsCmsService.update(dto);
  }
}
