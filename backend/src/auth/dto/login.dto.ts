import { IsIn, IsNotEmpty, IsString } from 'class-validator';
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
