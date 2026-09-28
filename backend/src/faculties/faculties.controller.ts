import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { GrGurdGuard, type GrRequest } from 'src/gr-gurd/gr-gurd.guard';
import { FacultiesService } from './faculties.service';
import { SpecializationDto, UpdateFacultyDto } from './dto/faculties.dto';

/** Faculties and their specializations (auth + faculty-scope guarded). */
@Controller('gr/faculties')
@UseGuards(AuthGuard, GrGurdGuard)
export class FacultiesController {
  constructor(@Inject() private readonly facultiesService: FacultiesService) {}

  /** GET /gr/faculties — options for every faculty and specialization select in the views. */
  @Get()
  async GetAllFaculties(@Req() req: GrRequest) {
    return await this.facultiesService.listFaculties(req.grCaller);
  }

  /** PATCH /gr/faculties/specializations/:id — renames a specialization. */
  @Patch('specializations/:id')
  async UpdateSpecialization(
    @Req() req: GrRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SpecializationDto,
  ) {
    return await this.facultiesService.updateSpecialization(
      id,
      dto,
      req.grCaller,
    );
  }

  /** DELETE /gr/faculties/specializations/:id — only while nothing uses it. */
  @Delete('specializations/:id')
  async DeleteSpecialization(
    @Req() req: GrRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return await this.facultiesService.deleteSpecialization(id, req.grCaller);
  }

  /** GET /gr/faculties/:id — the faculty tab: details, specializations and what lacks one. */
  @Get(':id')
  async GetFaculty(
    @Req() req: GrRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return await this.facultiesService.getFaculty(id, req.grCaller);
  }

  /** PATCH /gr/faculties/:id — the faculty's names and two-letter code. */
  @Patch(':id')
  async UpdateFaculty(
    @Req() req: GrRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFacultyDto,
  ) {
    return await this.facultiesService.updateFaculty(id, dto, req.grCaller);
  }

  /** POST /gr/faculties/:id/specializations — adds a specialization to the faculty. */
  @Post(':id/specializations')
  async CreateSpecialization(
    @Req() req: GrRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SpecializationDto,
  ) {
    return await this.facultiesService.createSpecialization(
      id,
      dto,
      req.grCaller,
    );
  }
}
