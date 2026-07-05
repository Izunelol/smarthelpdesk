import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateArticleDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @MinLength(10)
  content: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}
