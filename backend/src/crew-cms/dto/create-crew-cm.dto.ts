import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  ValidateNested,
} from 'class-validator';

/** One stats entry (numbers stay shared). */
export class CrewStatsDetailDto {
  @IsInt()
  @Min(0)
  stats!: number;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  content_ar?: string;
}

/** One strategic card. */
export class CrewStrategicCardDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  name_ar?: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  content_ar?: string;
}

/** One basic-vision entry (icon stays shared). */
export class CrewBasicVisionDto {
  @IsString()
  @IsNotEmpty()
  icon!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  content_ar?: string;
}

/** One word-from-department entry. */
export class CrewWordFromDeptDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  title_ar?: string;

  @IsString()
  @IsNotEmpty()
  details!: string;

  @IsOptional()
  @IsString()
  details_ar?: string;

  @IsString()
  @IsNotEmpty()
  profName!: string;

  @IsOptional()
  @IsString()
  profName_ar?: string;
}

/** One job-description entry (icon stays shared). */
export class CrewJobDescDto {
  @IsString()
  @IsNotEmpty()
  icon!: string;

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
}

/** One guideline entry (icon + guideLink stay shared). */
export class CrewGuidelineDto {
  @IsString()
  @IsNotEmpty()
  icon!: string;

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

  @IsUrl()
  guideLink!: string;
}

/** One contact card (icon stays shared). */
export class CrewContactCardDto {
  @IsString()
  @IsNotEmpty()
  icon!: string;

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
}

/** Contacts block. */
export class CrewContactsDto {
  @IsString()
  @IsNotEmpty()
  heading!: string;

  @IsOptional()
  @IsString()
  heading_ar?: string;

  @IsString()
  @IsNotEmpty()
  subHead!: string;

  @IsOptional()
  @IsString()
  subHead_ar?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrewContactCardDto)
  card!: CrewContactCardDto[];
}

/** POST/PATCH payload for a crew page — photo is file-set, optional in body. */
export class CreateCrewCmDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  name_ar?: string;

  @IsString()
  @IsNotEmpty()
  subHead!: string;

  @IsOptional()
  @IsString()
  subHead_ar?: string;

  @IsString()
  @IsNotEmpty()
  about!: string;

  @IsOptional()
  @IsString()
  about_ar?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrewStatsDetailDto)
  statsDetails!: CrewStatsDetailDto[];

  @IsString()
  @IsNotEmpty()
  departmentGuide!: string;

  @IsOptional()
  @IsString()
  departmentGuide_ar?: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsString()
  @IsNotEmpty()
  tag!: string;

  @IsOptional()
  @IsString()
  tag_ar?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrewStrategicCardDto)
  strategicCards!: CrewStrategicCardDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrewBasicVisionDto)
  basicVision!: CrewBasicVisionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrewWordFromDeptDto)
  wordFromDept!: CrewWordFromDeptDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrewJobDescDto)
  jobDesc!: CrewJobDescDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrewGuidelineDto)
  guidelines!: CrewGuidelineDto[];

  @ValidateNested()
  @Type(() => CrewContactsDto)
  contacts!: CrewContactsDto;
}
