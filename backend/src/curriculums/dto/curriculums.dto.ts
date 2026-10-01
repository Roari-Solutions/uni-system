import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { OptionalEnglishNameDto } from 'src/common/dto/localized-name.dto';
import { REQUIREMENT_TYPES, type RequirementType } from 'src/common/requirement-type';
import { ABBREVIATION_PATTERN } from '../abbreviation';
import { DEPARTMENT_FILTER, SPECIALIZATION_FILTER } from 'src/common/specialization';
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

  /** A university requirement belongs to every faculty, so it names none. */
  @ValidateIf((dto: CreateCurriculumDto) => dto.requirementType !== 'university')
  @IsUUID()
  facultyId!: string;

  /** XXXX0000; see ABBREVIATION_PATTERN. */
  @IsString()
  @Matches(ABBREVIATION_PATTERN)
  abbreviation!: string;

  /** Study year 1-6, not a calendar year. */
  @NormaliseAcademicYear()
  @IsIn(ACADEMIC_YEARS)
  academicYear!: AcademicYear;

  /** Semester 1 or 2 of that academic year. */
  @NormaliseSemester()
  @IsIn(SEMESTERS)
  semester!: Semester;

  /** University, faculty or major requirement. */
  @IsIn(REQUIREMENT_TYPES)
  requirementType!: RequirementType;

  /** Credit hours; they weight this curriculum's grade points in the GPA. */
  @IsInt()
  @Min(1)
  @Max(12)
  courseHours!: number;

  /**
   * Major requirements only: the faculty's specialization whose students take
   * it. A new major names this or a department; ignored for university and
   * faculty requirements.
   */
  @IsOptional()
  @ValidateIf((_dto: unknown, value: unknown) => value !== null)
  @IsUUID()
  specializationId?: string | null;

  /**
   * Major requirements only, in place of a specialization: the faculty's
   * department whose students (of any of its specializations) take it. Sent
   * with a specialization, it must be that specialization's department.
   */
  @IsOptional()
  @ValidateIf((_dto: unknown, value: unknown) => value !== null)
  @IsUUID()
  departmentId?: string | null;
}

/** Body for patching a curriculum (all fields optional). */
export class UpdateCurriculumDto extends PartialType(CreateCurriculumDto) {
  /**
   * The caller has seen the GRADES_ORPHANED warning and accepts that grades held
   * by students of faculties that stop offering the curriculum no longer count.
   * They are kept as history either way.
   */
  @IsOptional()
  @IsBoolean()
  confirmOrphanedGrades?: boolean;
}

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

  @IsOptional()
  @IsIn(REQUIREMENT_TYPES)
  requirementType?: RequirementType;

  /** A specialization's majors, or "none" for the majors tied to neither a specialization nor a department. */
  @IsOptional()
  @Matches(SPECIALIZATION_FILTER)
  specializationId?: string;

  /**
   * A department's majors (its own and its specializations'), or "none" for
   * the majors outside every department.
   */
  @IsOptional()
  @Matches(DEPARTMENT_FILTER)
  departmentId?: string;

  /** Free-text match against either language's name or the abbreviation. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}

/** Query for GET /gr/curriculum/suggest-abbreviation: the inputs the code is built from. */
export class SuggestAbbreviationQueryDto {
  /** Not needed for a university requirement: its letters carry no faculty. */
  @ValidateIf((dto: SuggestAbbreviationQueryDto) => dto.requirementType !== 'university')
  @IsUUID()
  facultyId!: string;

  @NormaliseAcademicYear()
  @IsIn(ACADEMIC_YEARS)
  academicYear!: AcademicYear;

  @NormaliseSemester()
  @IsIn(SEMESTERS)
  semester!: Semester;

  @IsIn(REQUIREMENT_TYPES)
  requirementType!: RequirementType;

  /** Supplies the course letters for university and major requirements. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameEn?: string;
}
