import { PartialType } from '@nestjs/mapped-types';
import { CreateFacultyPageDto } from './create-faculty-page.dto';

/** PATCH body — every field optional for partial merge. */
export class UpdateFacultyPageDto extends PartialType(CreateFacultyPageDto) {}
