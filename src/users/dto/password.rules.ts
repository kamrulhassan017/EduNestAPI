import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Password rules shared by register, admin create and change password.
 * 8–72 characters (bcrypt only uses the first 72 bytes), at least one letter
 * and one number.
 */
export function IsAcceptablePassword(example = 'Passw0rd!') {
  return applyDecorators(
    ApiProperty({ example, minLength: 8, maxLength: 72 }),
    IsString(),
    MinLength(8),
    MaxLength(72),
    Matches(/(?=.*[A-Za-z])(?=.*\d)/, {
      message: 'password must contain at least one letter and one number',
    }),
  );
}

/** Trims and lower-cases emails so "Rabby@X.com " and "rabby@x.com" are the same account. */
export function IsNormalizedEmail(example = 'student@edunest.local') {
  return applyDecorators(
    ApiProperty({ example, maxLength: 255 }),
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.trim().toLowerCase() : value,
    ),
    IsEmail(),
    MaxLength(255),
  );
}

/** A person's display name, trimmed, 2–100 characters. */
export function IsPersonName(example = 'Md. Kamrul Hassan Rabby') {
  return applyDecorators(
    ApiProperty({ example, minLength: 2, maxLength: 100 }),
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.trim() : value,
    ),
    IsString(),
    IsNotEmpty(),
    MinLength(2),
    MaxLength(100),
  );
}
