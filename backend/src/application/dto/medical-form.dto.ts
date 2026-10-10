import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

/** Body for POST /application/medical/:formNumber. */
export class MedicalFormDto {
  @IsBoolean()
  leftEye!: boolean;

  @IsBoolean()
  rightEye!: boolean;

  @IsBoolean()
  leftEar!: boolean;

  @IsBoolean()
  rightEar!: boolean;

  @IsBoolean()
  upperLimbs!: boolean;

  @IsBoolean()
  lowerLimbs!: boolean;

  @IsIn(['male', 'female'])
  gender!: 'male' | 'female';

  @IsIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
  bloodType!: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

  @IsOptional()
  @IsBoolean()
  hiv?: boolean;

  @IsOptional()
  @IsBoolean()
  virusC?: boolean;

  @IsOptional()
  @IsBoolean()
  virusB?: boolean;

  @IsOptional()
  @IsBoolean()
  medicallyFit?: boolean;

  @IsOptional()
  @IsString()
  doctorName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
