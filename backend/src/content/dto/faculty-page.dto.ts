import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import type { FacultyPageContent } from '../entities/faculty-page.entity';

type Content = FacultyPageContent;

/** Hero section: background image hash, English name, code, accreditation badge, brochure PDF hash, students count. */
export class FacultyPageHeroDto implements Readonly<Content['hero']> {
  @IsString()
  @IsNotEmpty()
  backgroundImage!: string;

  @IsString()
  @IsNotEmpty()
  englishName!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  accreditation?: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  brochure!: string;

  @IsInt()
  @Min(0)
  studentsCount!: number;
}

/** Dean quote card inside the about section. */
export class FacultyPageDeanDto implements Readonly<Content['about']['dean']> {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  quote!: string;
}

/** About section: faculty overview text and dean quote. */
export class FacultyPageAboutDto implements Readonly<Content['about']> {
  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => FacultyPageDeanDto)
  dean!: FacultyPageDeanDto;
}

/** A titled text card (vision, mission). */
export class FacultyPageTextCardDto implements Readonly<Content['visionMission']['vision']> {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  text!: string;
}

/** Vision and mission section. */
export class FacultyPageVisionMissionDto implements Readonly<Content['visionMission']> {
  @IsDefined()
  @ValidateNested()
  @Type(() => FacultyPageTextCardDto)
  vision!: FacultyPageTextCardDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => FacultyPageTextCardDto)
  mission!: FacultyPageTextCardDto;
}

/** One strategic goal card. */
export class FacultyPageGoalDto implements Readonly<Content['goals'][number]> {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;
}

/** One academic program card; `studyPlan` is the study plan PDF hash. */
export class FacultyPageProgramDto implements Readonly<Content['programs'][number]> {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  englishName!: string;

  @IsString()
  @IsNotEmpty()
  degree!: string;

  @IsString()
  @IsNotEmpty()
  duration!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsInt()
  @Min(1)
  creditHours!: number;

  @IsString()
  @IsNotEmpty()
  track!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tag?: string;

  @IsString()
  @IsNotEmpty()
  studyPlan!: string;
}

/** Minimum high school grade (percentage) with its note. */
export class FacultyPageMinimumGradeDto implements Readonly<Content['admission']['minimumGrade']> {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  value!: number;

  @IsString()
  @IsNotEmpty()
  note!: string;
}

/** A text admission criterion (English proficiency, interview) with its note. */
export class FacultyPageTextCriterionDto implements Readonly<Content['admission']['interview']> {
  @IsString()
  @IsNotEmpty()
  value!: string;

  @IsString()
  @IsNotEmpty()
  note!: string;
}

/** Admission section: criteria, required documents, application deadline (ISO date). */
export class FacultyPageAdmissionDto implements Readonly<Content['admission']> {
  @IsDefined()
  @ValidateNested()
  @Type(() => FacultyPageMinimumGradeDto)
  minimumGrade!: FacultyPageMinimumGradeDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => FacultyPageTextCriterionDto)
  englishProficiency!: FacultyPageTextCriterionDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => FacultyPageTextCriterionDto)
  interview!: FacultyPageTextCriterionDto;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  documents!: string[];

  @IsDateString()
  applicationDeadline!: string;
}

/** A titled card made of paragraphs. */
export class FacultyPageParagraphsCardDto implements Readonly<Content['studySystem']['system']> {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  paragraphs!: string[];
}

/** Study system and graduation requirements section. */
export class FacultyPageStudySystemDto implements Readonly<Content['studySystem']> {
  @IsDefined()
  @ValidateNested()
  @Type(() => FacultyPageParagraphsCardDto)
  system!: FacultyPageParagraphsCardDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => FacultyPageParagraphsCardDto)
  graduation!: FacultyPageParagraphsCardDto;
}

/** Body for replacing a faculty sub page content. */
export class FacultyPageDto implements FacultyPageContent {
  @IsDefined()
  @ValidateNested()
  @Type(() => FacultyPageHeroDto)
  hero!: FacultyPageHeroDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => FacultyPageAboutDto)
  about!: FacultyPageAboutDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => FacultyPageVisionMissionDto)
  visionMission!: FacultyPageVisionMissionDto;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => FacultyPageGoalDto)
  goals!: FacultyPageGoalDto[];

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => FacultyPageProgramDto)
  programs!: FacultyPageProgramDto[];

  @IsDefined()
  @ValidateNested()
  @Type(() => FacultyPageAdmissionDto)
  admission!: FacultyPageAdmissionDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => FacultyPageStudySystemDto)
  studySystem!: FacultyPageStudySystemDto;
}
