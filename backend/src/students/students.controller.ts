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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { GrGurdGuard, type GrRequest } from 'src/gr-gurd/gr-gurd.guard';
import { StudentsService } from './students.service';
import { CreateStudentDto, ListStudentsQueryDto, UpdateStudentDto } from './dto/students.dto';

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

  @Post()
  async CreateStudent(@Body() dto: CreateStudentDto, @Req() req: GrRequest) {
    return await this.studentsService.createStudent(dto, req.grCaller);
  }

  @Patch(':id')
  async UpdateStudent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentDto,
    @Req() req: GrRequest,
  ) {
    return await this.studentsService.updateStudent(id, dto, req.grCaller);
  }

  @Delete(':id')
  async DeleteStudent(@Param('id', ParseUUIDPipe) id: string, @Req() req: GrRequest) {
    return await this.studentsService.deleteStudent(id, req.grCaller);
  }
}
