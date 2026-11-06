import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class TitleDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 120)
  title!: string;
}

export class BoardDto extends TitleDto {
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsString()
  @Length(0, 2000)
  description?: string;
}

export class CardDto extends TitleDto {
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsString()
  @Length(0, 10000)
  description?: string;
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;
}

export class UpdateCardDto {
  @ValidateIf((_, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 120)
  title?: string;
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsString()
  @Length(0, 10000)
  description?: string;
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsBoolean()
  completed?: boolean;
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsString()
  @Length(1, 100)
  listId?: string;
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(1000000)
  position?: number;
}

export class GenerateBoardDto {
  @IsString()
  @Length(10, 2000)
  prompt!: string;
}
