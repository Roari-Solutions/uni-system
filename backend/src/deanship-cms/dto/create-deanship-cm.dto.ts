import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

/** Quote block with author and position. */
export class QuoteDto {
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

/** One strategic card. */
export class StrategicCardDto {
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

/** Contact block. */
export class DeanshipContactDto {
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  availability!: string;

  @IsOptional()
  @IsString()
  availability_ar?: string;
}

/** Single button label. */
export class ButtonDto {
  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  content_ar?: string;
}

/** Quality and standards block. */
export class QualityAndStandardsDto {
  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  content_ar?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ButtonDto)
  buttons!: ButtonDto[];
}

/** One checklist entry. */
export class CheckListDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  name_ar?: string;
}

/** Bottom bilingual card. */
export class BottomCardDto {
  @IsString()
  @IsNotEmpty()
  arabicTitle!: string;

  @IsString()
  @IsNotEmpty()
  englishTitle!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  content_ar?: string;

  @IsString()
  @IsNotEmpty()
  catchingPhrase!: string;

  @IsOptional()
  @IsString()
  catchingPhrase_ar?: string;

  @IsString()
  @IsNotEmpty()
  subCatchingPhrase!: string;

  @IsOptional()
  @IsString()
  subCatchingPhrase_ar?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckListDto)
  checkList!: CheckListDto[];
}

/** Full deanship page body; PATCH uses the partial child. */
export class CreateDeanshipCmDto {
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

  @ValidateNested()
  @Type(() => QuoteDto)
  quote!: QuoteDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StrategicCardDto)
  strategicCards!: StrategicCardDto[];

  @ValidateNested()
  @Type(() => DeanshipContactDto)
  contact!: DeanshipContactDto;

  @ValidateNested()
  @Type(() => QualityAndStandardsDto)
  qualityAndStandards!: QualityAndStandardsDto;

  @ValidateNested()
  @Type(() => BottomCardDto)
  bottomCard!: BottomCardDto;
}
