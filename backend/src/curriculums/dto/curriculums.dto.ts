import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

/** Body for creating a curriculum. */
export class CreateCurriculumDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  year!: string;

  @IsString()
  @IsNotEmpty()
  abbreviation!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  courseHours?: number;

  @IsString()
  @IsNotEmpty()
  faculty!: string;
}

/** Body for patching a curriculum (all fields optional). */
export class UpdateCurriculumDto extends PartialType(CreateCurriculumDto) {}
