import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  ACADEMIC_YEARS,
  NormaliseAcademicYear,
  NormaliseSemester,
  SEMESTERS,
  type AcademicYear,
  type Semester,
} from 'src/common/academic-year';
import { SPECIALIZATION_FILTER } from 'src/common/specialization';

export const RESULT_KINDS = ['regular', 'resit'] as const;
export type ResultKind = (typeof RESULT_KINDS)[number];

export const RESULT_STATUSES = ['pending', 'approved'] as const;
export type ResultStatus = (typeof RESULT_STATUSES)[number];

/** A calendar acceptance year, e.g. "2024". */
const ACCEPTANCE_YEAR = /^\d{4}$/;

/** The header lines staff type; a blank one prints as a dotted line to fill by hand. */
export class ResultHeaderDto {
  @IsString()
  @MaxLength(200)
  program!: string;

  @IsString()
  @MaxLength(200)
  batch!: string;

  @IsString()
  @MaxLength(200)
  academicYearLabel!: string;

  @IsString()
  @MaxLength(100)
  examDate!: string;

  @IsString()
  @MaxLength(100)
  collegeBoardDate!: string;

  @IsString()
  @MaxLength(100)
  centralBoardDate!: string;
}

/** Body for POST /gr/results/preview: the batch, the semester, which exams, and who is left off. */
export class PreviewResultDto {
  @IsUUID()
  facultyId!: string;

  /** Study year 1-6: the batch's current level. */
  @NormaliseAcademicYear()
  @IsIn(ACADEMIC_YEARS)
  academicYear!: AcademicYear;

  /** Omitted for every student at the level, whatever their acceptance year. */
  @IsOptional()
  @IsString()
  @Matches(ACCEPTANCE_YEAR)
  acceptanceYear?: string;

  /** The specialization the result is for; omitted for the students without one. */
  @IsOptional()
  @IsUUID()
  specializationId?: string;

  @NormaliseSemester()
  @IsIn(SEMESTERS)
  semester!: Semester;

  @IsIn(RESULT_KINDS)
  kind!: ResultKind;

  /** Students of the batch removed from the sheet by hand. */
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  excludedStudentIds?: string[];
}

/** Body for POST /gr/results: the preview's batch plus the header lines it prints. */
export class GenerateResultDto extends PreviewResultDto {
  @ValidateNested()
  @Type(() => ResultHeaderDto)
  header!: ResultHeaderDto;
}

/** Query filters for GET /gr/results. */
export class ListResultsQueryDto {
  @IsOptional()
  @IsUUID()
  facultyId?: string;

  @IsOptional()
  @NormaliseAcademicYear()
  @IsIn(ACADEMIC_YEARS)
  academicYear?: AcademicYear;

  @IsOptional()
  @IsString()
  @Matches(ACCEPTANCE_YEAR)
  acceptanceYear?: string;

  @IsOptional()
  @NormaliseSemester()
  @IsIn(SEMESTERS)
  semester?: Semester;

  /** A specialization's results, or "none" for those of the students without one. */
  @IsOptional()
  @Matches(SPECIALIZATION_FILTER)
  specializationId?: string;

  @IsOptional()
  @IsIn(RESULT_STATUSES)
  status?: ResultStatus;
}
