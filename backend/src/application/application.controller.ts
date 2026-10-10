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
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ApplicationService, type ApplicationCompletionFiles } from './application.service';
import { ApplicationUpdateDto, BulkApplicationsDto } from './dto/create-application.dto';
import { FileFieldsInterceptor, FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

interface BodyWrapper {
  body: string;
}

@Controller('application')
export class ApplicationController {
  private readonly logger = new Logger(ApplicationController.name);

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

  /** PATCH /application/:formNumber — update one application by its form number. */
  @Patch(':formNumber')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'nationalIdFile', maxCount: 1 },
      { name: 'studentPhoto', maxCount: 1 },
      { name: 'highSchoolCertificate', maxCount: 1 },
      { name: 'finantialAidDocuments', maxCount: 10 },
    ]),
  )
  async copleteApplication(
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
    let raw: unknown;
    try {
      raw = JSON.parse(body?.body);
    } catch {
      this.logger.warn(`Completing ${formNumber}: body is not valid JSON`);
      throw new BadRequestException({ code: 'PI' });
    }
    if (typeof raw !== 'object' || raw === null) {
      this.logger.warn(`Completing ${formNumber}: body is not a JSON object`);
      throw new BadRequestException({ code: 'PI' });
    }
    // the global ValidationPipe only sees the string wrapper, so the parsed DTO is checked here
    const dto = plainToInstance(ApplicationUpdateDto, raw);
    const errors = await validate(dto);
    if (errors.length) {
      this.logger.warn(
        `Completing ${formNumber}: validation failed: ${errors.map((e) => e.property).join(', ')}`,
      );
      throw new BadRequestException({ code: 'PI' });
    }
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
}
