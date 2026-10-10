import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApplicationService, type ApplicationCompletionFiles } from './application.service';
import { ApplicationUpdateDto, BulkApplicationsDto } from './dto/create-application.dto';
import { MedicalFormDto } from './dto/medical-form.dto';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import type { MediaFile } from 'src/media/media.service';
import { plainToInstance, type ClassConstructor } from 'class-transformer';
import { validate } from 'class-validator';
import { ApplicantGuard } from 'src/auth/applicant.guard';

interface BodyWrapper {
  body: string;
}

@Controller('application')
export class ApplicationController {
  private readonly logger = new Logger(ApplicationController.name);

  constructor(private readonly applicationService: ApplicationService) {}

  /** Parses a multipart `body` string field into a validated DTO. */
  private async parseJsonBody<T extends object>(
    type: ClassConstructor<T>,
    body: BodyWrapper,
    formNumber: string,
  ): Promise<T> {
    let raw: unknown;
    try {
      raw = JSON.parse(body?.body);
    } catch {
      this.logger.warn(`Request for ${formNumber}: body is not valid JSON`);
      throw new BadRequestException({ code: 'PI' });
    }
    if (typeof raw !== 'object' || raw === null) {
      this.logger.warn(`Request for ${formNumber}: body is not a JSON object`);
      throw new BadRequestException({ code: 'PI' });
    }
    // the global ValidationPipe only sees the string wrapper, so the parsed DTO is checked here
    const dto = plainToInstance(type, raw);
    const errors = await validate(dto);
    if (errors.length) {
      this.logger.warn(
        `Request for ${formNumber}: validation failed: ${errors.map((e) => e.property).join(', ')}`,
      );
      throw new BadRequestException({ code: 'PI' });
    }
    return dto;
  }

  /** GET /application — every staged application. */
  @Get()
  async list() {
    return await this.applicationService.listApplications();
  }

  /** GET /application/medical — every medical fitness form. */
  @Get('medical')
  async listMedical() {
    this.logger.log('Listing medical forms');
    return await this.applicationService.listMedicalForms();
  }

  /** GET /application/:formNumber — one application by its form number. */
  @Get(':formNumber')
  async getByFormNumber(@Param('formNumber') formNumber: string) {
    return await this.applicationService.getByFormNumber(formNumber);
  }

  /** PATCH /application/:formNumber — update one application by its form number. */
  @Patch(':formNumber')
  @UseGuards(ApplicantGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'nationalIdFile', maxCount: 1 },
      { name: 'studentPhoto', maxCount: 1 },
      { name: 'highSchoolCertificate', maxCount: 1 },
      { name: 'finantialAidDocuments', maxCount: 10 },
    ]),
  )
  async completeApplication(
    @Param('formNumber') formNumber: string,
    @Body() body: BodyWrapper,
    @UploadedFiles()
    files: ApplicationCompletionFiles,
  ) {
    this.logger.log(
      `Completing ${formNumber}: body ${body?.body ? 'present' : 'missing'}, files {${Object.entries(
        files ?? {},
      )
        .map(([key, value]) => `${key}: ${value?.length ?? 0}`)
        .join(', ')}}`,
    );
    const dto = await this.parseJsonBody(ApplicationUpdateDto, body, formNumber);
    const result = await this.applicationService.completeApplication(formNumber, files, dto);
    this.logger.log(`Completed ${formNumber}`);
    return result;
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

  /** POST /application/medical/:formNumber — saves the medical form plus signature image. */
  @Post('medical/:formNumber')
  @UseInterceptors(FileInterceptor('doctorSignature'))
  async saveMedical(
    @Param('formNumber') formNumber: string,
    @Body() body: BodyWrapper,
    @UploadedFile() signature?: MediaFile,
  ) {
    this.logger.log(
      `Saving medical form for ${formNumber}: signature ${signature ? 'present' : 'missing'}`,
    );
    const dto = await this.parseJsonBody(MedicalFormDto, body, formNumber);
    const result = await this.applicationService.saveMedicalForm(formNumber, dto, signature);
    this.logger.log(`Saved medical form for ${formNumber}`);
    return result;
  }

  /** GET /application/medical/:formNumber — the medical fitness form. */
  @Get('medical/:formNumber')
  async getMedical(@Param('formNumber') formNumber: string) {
    this.logger.log(`Getting medical form for ${formNumber}`);
    const result = await this.applicationService.getMedicalForm(formNumber);
    this.logger.log(`Got medical form for ${formNumber}`);
    return result;
  }
}
