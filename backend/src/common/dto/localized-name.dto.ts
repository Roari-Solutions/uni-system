import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

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
