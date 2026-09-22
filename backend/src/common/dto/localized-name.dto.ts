import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** Written to name_en when no English name is supplied. */
export const MISSING_NAME = '-';

/** A name in both UI languages; mirrors the frontend's `Localized` type. */
export class LocalizedNameDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  en!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  ar!: string;
}

/** A name whose English half may be omitted; the service stores MISSING_NAME. */
export class OptionalEnglishNameDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  ar!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  en?: string;
}
