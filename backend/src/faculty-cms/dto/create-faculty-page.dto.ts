import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

/** Hero banner within faculty page. */
export class FacultyHeroSectionDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  backgroundImages?: string[];

  @IsString()
  @IsNotEmpty()
  mainHead!: string;

  @IsOptional()
  @IsString()
  mainHead_ar?: string;

  @IsString()
  @IsNotEmpty()
  subHead!: string;

  @IsOptional()
  @IsString()
  subHead_ar?: string;
}

/** Quote block. */
export class FacultyQuoteDto {
  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  content_ar?: string;

  @IsString()
  @IsNotEmpty()
  author!: string;

  @IsOptional()
  @IsString()
  author_ar?: string;

  @IsString()
  @IsNotEmpty()
  position!: string;

  @IsOptional()
  @IsString()
  position_ar?: string;
}

export class FacultyVisionDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  title_ar?: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  content_ar?: string;

  @IsString()
  @IsNotEmpty()
  icon!: string;
}

export class FacultyGoalDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  title_ar?: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  content_ar?: string;
}

export class FacultyProgramDto {
  @IsString()
  @IsNotEmpty()
  tag!: string;

  @IsOptional()
  @IsString()
  tag_ar?: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  title_ar?: string;

  @IsString()
  @IsNotEmpty()
  subTitle!: string;

  @IsOptional()
  @IsString()
  subTitle_ar?: string;

  @IsString()
  @IsNotEmpty()
  level!: string;

  @IsOptional()
  @IsString()
  level_ar?: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  content_ar?: string;

  @IsNumber()
  @Min(0)
  hours!: number;

  @IsString()
  @IsNotEmpty()
  track!: string;

  @IsOptional()
  @IsString()
  track_ar?: string;
}

export class FacultyAcceptanceConditionDto {
  @IsString()
  @IsNotEmpty()
  conditionTitle!: string;

  @IsOptional()
  @IsString()
  conditionTitle_ar?: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  content_ar?: string;

  @IsString()
  @IsNotEmpty()
  detail!: string;

  @IsOptional()
  @IsString()
  detail_ar?: string;
}

export class FacultyRequiredPaperDto {
  @IsString()
  @IsNotEmpty()
  point!: string;

  @IsOptional()
  @IsString()
  point_ar?: string;
}

export class FacultyCreditHoursDetailDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  title_ar?: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  content_ar?: string;
}

/** POST/PATCH payload for faculty page — full create shape; patch uses PartialType. */
export class CreateFacultyPageDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  title_ar?: string;

  @ValidateNested()
  @Type(() => FacultyHeroSectionDto)
  heroSection!: FacultyHeroSectionDto;

  @IsString()
  @IsNotEmpty()
  pageCatalog!: string;

  @IsOptional()
  @IsString()
  pageCatalog_ar?: string;

  @IsInt()
  @Min(0)
  specializations!: number;

  @IsInt()
  @Min(0)
  currentStudents!: number;

  @IsInt()
  @Min(0)
  graduatedStudents!: number;

  @IsString()
  @IsNotEmpty()
  about!: string;

  @IsOptional()
  @IsString()
  about_ar?: string;

  @ValidateNested()
  @Type(() => FacultyQuoteDto)
  quote!: FacultyQuoteDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FacultyVisionDto)
  vision!: FacultyVisionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FacultyGoalDto)
  goals!: FacultyGoalDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FacultyProgramDto)
  programs!: FacultyProgramDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FacultyAcceptanceConditionDto)
  acceptanceConditions!: FacultyAcceptanceConditionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FacultyRequiredPaperDto)
  requiredPapers!: FacultyRequiredPaperDto[];

  @IsString()
  @IsNotEmpty()
  applicationDuration!: string;

  @IsOptional()
  @IsString()
  applicationDuration_ar?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FacultyCreditHoursDetailDto)
  creditHoursDetails!: FacultyCreditHoursDetailDto[];
}
