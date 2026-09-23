import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';

/** Quote block with author and position. */
export class QuoteDto {
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

/** One strategic card. */
export class StrategicCardDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;
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
}

/** Single button label. */
export class ButtonDto {
  @IsString()
  @IsNotEmpty()
  content!: string;
}

/** Quality and standards block. */
export class QualityAndStandardsDto {
  @IsString()
  @IsNotEmpty()
  content!: string;

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

  @IsString()
  @IsNotEmpty()
  catchingPhrase!: string;

  @IsString()
  @IsNotEmpty()
  subCatchingPhrase!: string;

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

  @IsString()
  @IsNotEmpty()
  subHeading!: string;

  @IsString()
  @IsNotEmpty()
  about!: string;

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
