import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { IsAcceptablePassword } from './password.rules';

export class ChangePasswordDto {
  @ApiProperty({ example: 'Passw0rd!' })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @IsAcceptablePassword('NewPassw0rd!')
  newPassword!: string;
}
