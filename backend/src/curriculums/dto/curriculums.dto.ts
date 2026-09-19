import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { OptionalEnglishNameDto } from 'src/common/dto/localized-name.dto';
import {
  ACADEMIC_YEARS,
  NormaliseAcademicYear,
  NormaliseSemester,
  SEMESTERS,
  type AcademicYear,
  type Semester,
} from 'src/common/academic-year';

/** Body for creating a curriculum. */
export class CreateCurriculumDto {
  @ValidateNested()
  @Type(() => OptionalEnglishNameDto)
  name!: OptionalEnglishNameDto;

  @IsUUID()
  facultyId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  abbreviation!: string;

  /** Study year 1-6, not a calendar year. */
  @NormaliseAcademicYear()
  @IsIn(ACADEMIC_YEARS)
  academicYear!: AcademicYear;

  /** Semester 1 or 2 of that academic year. */
  @NormaliseSemester()
  @IsIn(SEMESTERS)
  semester!: Semester;
}

/** Body for patching a curriculum (all fields optional). */
export class UpdateCurriculumDto extends PartialType(CreateCurriculumDto) {}

/** Query filters for GET /gr/curriculum, shared by the list view and the entry cascade. */
export class ListCurriculumsQueryDto {
  @IsOptional()
  @IsUUID()
  facultyId?: string;

  @IsOptional()
  @NormaliseAcademicYear()
  @IsIn(ACADEMIC_YEARS)
  academicYear?: AcademicYear;

  @IsOptional()
  @NormaliseSemester()
  @IsIn(SEMESTERS)
  semester?: Semester;

  /** Free-text match against either language's name or the abbreviation. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}
