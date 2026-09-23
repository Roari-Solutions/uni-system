import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { GrGurdGuard, type GrRequest } from 'src/gr-gurd/gr-gurd.guard';
import { StudentsService } from './students.service';
import {
  BulkStudentsDto,
  CreateStudentDto,
  ListStudentsQueryDto,
  UpdateStudentDto,
} from './dto/students.dto';

/** Student endpoints (auth + faculty-scope guarded). */
@Controller('gr/students')
@UseGuards(AuthGuard, GrGurdGuard)
export class StudentsController {
  constructor(@Inject() private readonly studentsService: StudentsService) {}

  /** GET /gr/students — list view rows, and the cascade's student options. */
  @Get()
  async GetAllStudents(@Req() req: GrRequest, @Query() query: ListStudentsQueryDto) {
    return await this.studentsService.listStudents(req.grCaller, query);
  }

  /** GET /gr/students/:id — the details page's registered data. */
  @Get(':id')
  async GetStudent(@Param('id', ParseUUIDPipe) id: string, @Req() req: GrRequest) {
    return await this.studentsService.getStudent(id, req.grCaller);
  }

  @Post()
  async CreateStudent(@Body() dto: CreateStudentDto, @Req() req: GrRequest) {
    return await this.studentsService.createStudent(dto, req.grCaller);
  }

  /** POST /gr/students/bulk/check — the import's dry run; writes nothing. */
  @Post('bulk/check')
  @HttpCode(HttpStatus.OK)
  async CheckBulkStudents(@Body() dto: BulkStudentsDto, @Req() req: GrRequest) {
    return await this.studentsService.checkBulk(dto, req.grCaller);
  }

  /** POST /gr/students/bulk — imports the rows that pass, skipping the rest. */
  @Post('bulk')
  async ImportBulkStudents(@Body() dto: BulkStudentsDto, @Req() req: GrRequest) {
    return await this.studentsService.importBulk(dto, req.grCaller);
  }

  @Patch(':id')
  async UpdateStudent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentDto,
    @Req() req: GrRequest,
  ) {
    return await this.studentsService.updateStudent(id, dto, req.grCaller);
  }

  /** POST /gr/students/:id/reinstate — lifts a suspension or reverses a dismissal (admin only). */
  @Post(':id/reinstate')
  async ReinstateStudent(@Param('id', ParseUUIDPipe) id: string, @Req() req: GrRequest) {
    return await this.studentsService.reinstateStudent(id, req.grCaller);
  }

  @Delete(':id')
  async DeleteStudent(@Param('id', ParseUUIDPipe) id: string, @Req() req: GrRequest) {
    return await this.studentsService.deleteStudent(id, req.grCaller);
  }
}
