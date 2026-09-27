import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

/** Hero banner section; backgroundImages is file-set, optional in body. */
export class AboutHeroSectionDto {
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

/** One stats entry. */
export class AboutStatDto {
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
  moreInfo!: string;

  @IsOptional()
  @IsString()
  moreInfo_ar?: string;
}

/** Principles inner card. */
export class AboutPrincipleCardDto {
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

/** Principles block. */
export class AboutPrinciplesDto {
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

  @ValidateNested()
  @Type(() => AboutPrincipleCardDto)
  card!: AboutPrincipleCardDto;
}

/** Journey inner card. */
export class AboutJourneyCardDto {
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
  year!: string;

  @IsOptional()
  @IsString()
  year_ar?: string;

  @IsString()
  @IsNotEmpty()
  tag!: string;

  @IsOptional()
  @IsString()
  tag_ar?: string;
}

/** Journey block. */
export class AboutJourneyDto {
  @ValidateNested()
  @Type(() => AboutJourneyCardDto)
  card!: AboutJourneyCardDto;
}

/** Vision/message inner card. */
export class AboutVisionCardDto {
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
  content!: string;

  @IsOptional()
  @IsString()
  content_ar?: string;
}

/** Vision and message block. */
export class AboutVisionAndMessageDto {
  @ValidateNested()
  @Type(() => AboutVisionCardDto)
  card!: AboutVisionCardDto;
}

/** One goal entry. */
export class AboutGoalDto {
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

/** Academic principles block. */
export class AboutAcademicPrinciplesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AboutVisionCardDto)
  card!: AboutVisionCardDto[];
}

/** One given certificate. */
export class AboutCertificateDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  arTitle!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  content_ar?: string;

  @IsString()
  @IsNotEmpty()
  tag!: string;

  @IsOptional()
  @IsString()
  tag_ar?: string;

  @IsString()
  @IsNotEmpty()
  miniTag!: string;

  @IsOptional()
  @IsString()
  miniTag_ar?: string;
}

/** Full about page body; PATCH uses the partial child. */
export class CreateAboutCmDto {
  @ValidateNested()
  @Type(() => AboutHeroSectionDto)
  heroSection!: AboutHeroSectionDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AboutStatDto)
  stats!: AboutStatDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  collegeImageCard?: string[];

  @ValidateNested()
  @Type(() => AboutPrinciplesDto)
  principles!: AboutPrinciplesDto;

  @ValidateNested()
  @Type(() => AboutJourneyDto)
  journey!: AboutJourneyDto;

  @ValidateNested()
  @Type(() => AboutVisionAndMessageDto)
  visionAndMessage!: AboutVisionAndMessageDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AboutGoalDto)
  goals!: AboutGoalDto[];

  @ValidateNested()
  @Type(() => AboutAcademicPrinciplesDto)
  academicPrinciples!: AboutAcademicPrinciplesDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AboutCertificateDto)
  givenCertificates!: AboutCertificateDto[];

  @IsString()
  @IsNotEmpty()
  admissionTitle!: string;

  @IsOptional()
  @IsString()
  admissionTitle_ar?: string;

  @IsString()
  @IsNotEmpty()
  admissionSubTitle!: string;

  @IsOptional()
  @IsString()
  admissionSubTitle_ar?: string;

  @IsString()
  @IsNotEmpty()
  admissionGuidelines!: string;

  @IsOptional()
  @IsString()
  admissionGuidelines_ar?: string;
}
