import {
  IsAcceptablePassword,
  IsNormalizedEmail,
  IsPersonName,
} from '../../users/dto/password.rules';

export class RegisterDto {
  @IsPersonName('Nusrat Jahan')
  name!: string;

  @IsNormalizedEmail('nusrat.jahan@edunest.local')
  email!: string;

  @IsAcceptablePassword()
  password!: string;
}
