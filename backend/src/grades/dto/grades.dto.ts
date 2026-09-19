import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

/** Body for creating a grade. */
export class CreateGradeDto {
  @IsString()
  @IsNotEmpty()
  uniNo!: string;

  @IsString()
  @IsNotEmpty()
  curriculum!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  score!: number;

  @IsString()
  @IsNotEmpty()
  year!: string;

  @IsOptional()
  @IsIn(['1', '2'])
  semester?: '1' | '2';
}

/** Body for patching a grade (all fields optional). */
export class UpdateGradeDto extends PartialType(CreateGradeDto) {}

/** Identifiers narrowing one grade row of a student (DELETE /grades/:uniNo). */
export class GradeIdentifiersDto {
  @IsOptional()
  @IsString()
  curriculum?: string;

  @IsOptional()
  @IsString()
  year?: string;

  @IsOptional()
  @IsIn(['1', '2'])
  semester?: '1' | '2';
}
