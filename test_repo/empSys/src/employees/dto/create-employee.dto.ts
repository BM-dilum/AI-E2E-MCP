import { IsDecimal, IsEmail, IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

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
  @IsDecimal({ decimal_digits: '0,2' })
  salary: number;
}