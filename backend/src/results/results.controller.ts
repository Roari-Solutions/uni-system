import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { GrGurdGuard, type GrRequest } from 'src/gr-gurd/gr-gurd.guard';
import { ResultsService } from './results.service';
import { GenerateResultDto, ListResultsQueryDto } from './dto/results.dto';

/** Board and final results per batch (auth + faculty-scope guarded). */
@Controller('gr/results')
@UseGuards(AuthGuard, GrGurdGuard)
export class ResultsController {
  constructor(@Inject() private readonly resultsService: ResultsService) {}

  /** GET /gr/results — every generated result the caller may see, newest first. */
  @Get()
  async ListResults(
    @Req() req: GrRequest,
    @Query() query: ListResultsQueryDto,
  ) {
    return await this.resultsService.listResults(req.grCaller, query);
  }

  /** POST /gr/results — generates (or regenerates, while pending) a batch's board results. */
  @Post()
  async GenerateResult(@Req() req: GrRequest, @Body() dto: GenerateResultDto) {
    return await this.resultsService.generateResult(dto, req.grCaller);
  }

  /** GET /gr/results/:id — one result with its frozen sheet. */
  @Get(':id')
  async GetResult(
    @Req() req: GrRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return await this.resultsService.getResult(id, req.grCaller);
  }

  /** POST /gr/results/:id/approve — the board approved it; locks the batch's grades. */
  @Post(':id/approve')
  async ApproveResult(
    @Req() req: GrRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return await this.resultsService.approveResult(id, req.grCaller);
  }

  /** GET /gr/results/:id/resits — the cells that may take a Sup & Sub re-exam. */
  @Get(':id/resits')
  async ResitCandidates(
    @Req() req: GrRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return await this.resultsService.resitCandidates(id, req.grCaller);
  }

  /** DELETE /gr/results/:id — discards pending board results. */
  @Delete(':id')
  async DiscardResult(
    @Req() req: GrRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return await this.resultsService.discardResult(id, req.grCaller);
  }
}
