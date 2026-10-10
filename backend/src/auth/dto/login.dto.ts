import { IsIn, IsNotEmpty, isString, IsString } from 'class-validator';
import { PORTAL_KEYS, type Portal } from 'src/iam/portals';

/** Login request body: credentials plus the portal the form belongs to. */
export class LoginDto {
  @IsString()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  /** Which sign-in form was used; it decides who is let in. */
  @IsIn(PORTAL_KEYS)
  portal!: Portal;
}

export class ApplicantLoginDto {
  @IsString()
  @IsNotEmpty()
  formNumber!: string;

  @IsString()
  @IsNotEmpty()
  facultyName!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}
