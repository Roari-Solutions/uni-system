import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

/** Hero banner section. */
export class ExhibitionHeroSectionDto {
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

/** One exhibition image; imageLink is file-set, optional in body. */
export class ExhibitionImageDto {
  @IsOptional()
  @IsString()
  imageLink?: string;

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
  date!: string;
}

/** Full images-exhibition page body; PATCH uses the partial child. */
export class CreateExhibitionCmDto {
  @ValidateNested()
  @Type(() => ExhibitionHeroSectionDto)
  heroSection!: ExhibitionHeroSectionDto;

  @IsInt()
  @Min(0)
  imagesNumber!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExhibitionImageDto)
  images!: ExhibitionImageDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExhibitionImageDto)
  moreImages!: ExhibitionImageDto[];
}
