import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { BulkApplicationsDto } from './dto/create-application.dto';

@Controller('application')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  /** GET /application — every staged application. */
  @Get()
  async list() {
    return await this.applicationService.listApplications();
  }

  /** GET /application/:formNumber — one application by its form number. */
  @Get(':formNumber')
  async getByFormNumber(@Param('formNumber') formNumber: string) {
    return await this.applicationService.getByFormNumber(formNumber);
  }

  /** POST /application/bulk/check — the import's dry run; writes nothing. */
  @Post('bulk/check')
  @HttpCode(HttpStatus.OK)
  async check(@Body() dto: BulkApplicationsDto) {
    return await this.applicationService.checkBulk(dto);
  }

  /** POST /application/bulk — imports the rows that pass, skipping the rest. */
  @Post('bulk')
  async import(@Body() dto: BulkApplicationsDto) {
    return await this.applicationService.importBulk(dto);
  }
}
