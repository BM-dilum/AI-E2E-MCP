import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  private handleUniqueEmailError(error: unknown): never {
    if (error instanceof QueryFailedError) {
      const driverError = error.driverError as { code?: string; detail?: string; message?: string };
      const isUniqueViolation =
        driverError?.code === '23505' ||
        /unique/i.test(driverError?.message ?? '') ||
        /duplicate/i.test(driverError?.message ?? '') ||
        /email/i.test(driverError?.detail ?? '');

      if (isUniqueViolation) {
        throw new BadRequestException('An employee with this email already exists');
      }
    }

    throw error;
  }

  async create(createEmployeeDto: CreateEmployeeDto): Promise<Employee> {
    const existingEmployee = await this.employeeRepository.findOne({
      where: { email: createEmployeeDto.email },
    });

    if (existingEmployee) {
      throw new BadRequestException('An employee with this email already exists');
    }

    const employee = this.employeeRepository.create(createEmployeeDto);

    try {
      return await this.employeeRepository.save(employee);
    } catch (error) {
      this.handleUniqueEmailError(error);
    }
  }

  async findAll(): Promise<Employee[]> {
    return this.employeeRepository.find({
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { id },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  async update(id: number, updateEmployeeDto: UpdateEmployeeDto): Promise<Employee> {
    const employee = await this.findOne(id);

    if (updateEmployeeDto.email && updateEmployeeDto.email !== employee.email) {
      const existingEmployee = await this.employeeRepository.findOne({
        where: { email: updateEmployeeDto.email },
      });

      if (existingEmployee && existingEmployee.id !== id) {
        throw new BadRequestException('An employee with this email already exists');
      }
    }

    Object.assign(employee, updateEmployeeDto);

    try {
      return await this.employeeRepository.save(employee);
    } catch (error) {
      this.handleUniqueEmailError(error);
    }
  }

  async remove(id: number): Promise<void> {
    const employee = await this.findOne(id);
    await this.employeeRepository.remove(employee);
  }
}