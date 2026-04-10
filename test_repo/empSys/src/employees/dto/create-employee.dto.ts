import { IsEmail, IsNotEmpty, IsNumber, IsPositive, IsString, Matches } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  position: string;

  @IsNumber()
  @IsPositive()
  @Matches(/^\d+(\.\d{1,2})?$/)
  salary: number;
}