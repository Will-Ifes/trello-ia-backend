import { IsString, MinLength } from 'class-validator';

export class ResetDto {
  @IsString()
  token!: string;

  @MinLength(6)
  newPassword!: string;
}
