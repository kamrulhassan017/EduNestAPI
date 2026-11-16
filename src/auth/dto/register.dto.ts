import {
  IsAcceptablePassword,
  IsNormalizedEmail,
  IsPersonName,
} from '../../users/dto/password.rules';

/** Public self-registration. The account is always created as a student. */
export class RegisterDto {
  @IsPersonName('Nusrat Jahan')
  name!: string;

  @IsNormalizedEmail('nusrat.jahan@edunest.local')
  email!: string;

  @IsAcceptablePassword()
  password!: string;
}
