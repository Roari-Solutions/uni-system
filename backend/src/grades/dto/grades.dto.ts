import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
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

  @IsString()
  @IsNotEmpty()
  faculty!: string;
}

/** Body for patching a curriculum (all fields optional). */
export class UpdateCurriculumDto extends PartialType(CreateCurriculumDto) {}

/** Body for creating a student. */
export class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  year!: string;

  @IsString()
  @IsNotEmpty()
  uniNo!: string;

  @IsString()
  @IsNotEmpty()
  acceptanceType!: string;

  @IsString()
  @IsNotEmpty()
  faculty!: string;
}

/** Body for patching a student (all fields optional). */
export class UpdateStudentDto extends PartialType(CreateStudentDto) {}

/** Body for creating a grade. */
export class CreateGradeDto {
  @IsString()
  @IsNotEmpty()
  uniNo!: string;

  @IsString()
  @IsNotEmpty()
  curriculum!: string;

  @IsNumber()
  grade!: number;

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
