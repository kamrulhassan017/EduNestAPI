import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';

export class LoginResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Send as "Authorization: Bearer <accessToken>"',
  })
  accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty({
    example: '1h',
    description: 'Token lifetime (JWT_EXPIRES_IN)',
  })
  expiresIn!: string;

  @ApiProperty({ type: () => User })
  user!: User;
}
