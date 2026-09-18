import { Controller, Get, Inject, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { GrGurdGuard, type GrRequest } from 'src/gr-gurd/gr-gurd.guard';
import { FacultiesService } from './faculties.service';

/** Faculty lookup for the grades dashboard (auth + faculty-scope guarded). */
@Controller('gr/faculties')
@UseGuards(AuthGuard, GrGurdGuard)
export class FacultiesController {
  constructor(@Inject() private readonly facultiesService: FacultiesService) {}

  /** GET /gr/faculties — options for every faculty select in the views. */
  @Get()
  async GetAllFaculties(@Req() req: GrRequest) {
    return await this.facultiesService.listFaculties(req.grCaller);
  }
}
