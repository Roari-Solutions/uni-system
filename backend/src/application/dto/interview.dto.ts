import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * Body for PATCH /application/:formNumber/interview. The fees and the outcome
 * are required; only the notes may be left out.
 *
 * The two misspelled names match the applications columns they write to;
 * GET /application/:formNumber hands them back under the same spelling.
 */
export class InterviewDto {
  @IsInt()
  @Min(0)
  registerationFees!: number;

  @IsInt()
  @Min(0)
  studyFees!: number;

  @IsBoolean()
  passedInterview!: boolean;

  @IsOptional()
  @IsString()
  intervewNotes?: string;
}