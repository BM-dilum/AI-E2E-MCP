import { IsEmail, IsNotEmpty, IsNumber, IsPositive, IsString, MaxDecimalPlaces } from 'class-validator';

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
  @MaxDecimalPlaces(2)
  salary: number;
}