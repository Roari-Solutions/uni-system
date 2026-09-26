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

  @IsString()
  @IsNotEmpty()
  subHead!: string;
}

/** Quote block. */
export class FacultyQuoteDto {
  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsString()
  @IsNotEmpty()
  author!: string;

  @IsString()
  @IsNotEmpty()
  position!: string;
}

export class FacultyVisionDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsString()
  @IsNotEmpty()
  icon!: string;
}

export class FacultyGoalDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;
}

export class FacultyProgramDto {
  @IsString()
  @IsNotEmpty()
  tag!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  subTitle!: string;

  @IsString()
  @IsNotEmpty()
  level!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsNumber()
  @Min(0)
  hours!: number;

  @IsString()
  @IsNotEmpty()
  track!: string;
}

export class FacultyAcceptanceConditionDto {
  @IsString()
  @IsNotEmpty()
  conditionTitle!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsString()
  @IsNotEmpty()
  detail!: string;
}

export class FacultyRequiredPaperDto {
  @IsString()
  @IsNotEmpty()
  point!: string;
}

export class FacultyCreditHoursDetailDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;
}

/** POST/PATCH payload for faculty page — full create shape; patch uses PartialType. */
export class CreateFacultyPageDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ValidateNested()
  @Type(() => FacultyHeroSectionDto)
  heroSection!: FacultyHeroSectionDto;

  @IsString()
  @IsNotEmpty()
  pageCatalog!: string;

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FacultyCreditHoursDetailDto)
  creditHoursDetails!: FacultyCreditHoursDetailDto[];
}
