import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeesRepository: Repository<Employee>,
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto): Promise<Employee> {
    await this.ensureEmailIsUnique(createEmployeeDto.email);

    const employee = this.employeesRepository.create(createEmployeeDto);

    try {
      return await this.employeesRepository.save(employee);
    } catch (error) {
      this.handleUniqueConstraintError(error);
    }
  }

  async findAll(): Promise<Employee[]> {
    return this.employeesRepository.find({
      order: {
        id: 'ASC',
      },
    });
  }

  async findOne(id: number): Promise<Employee> {
    const employee = await this.employeesRepository.findOne({
      where: { id },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with id ${id} not found`);
    }

    return employee;
  }

  async update(id: number, updateEmployeeDto: UpdateEmployeeDto): Promise<Employee> {
    const employee = await this.findOne(id);

    if (updateEmployeeDto.email && updateEmployeeDto.email !== employee.email) {
      await this.ensureEmailIsUnique(updateEmployeeDto.email, id);
    }

    const updatedEmployee = this.employeesRepository.merge(employee, updateEmployeeDto);

    try {
      return await this.employeesRepository.save(updatedEmployee);
    } catch (error) {
      this.handleUniqueConstraintError(error);
    }
  }

  async remove(id: number): Promise<void> {
    const employee = await this.findOne(id);
    await this.employeesRepository.remove(employee);
  }

  private async ensureEmailIsUnique(email: string, excludeId?: number): Promise<void> {
    const existingEmployee = await this.employeesRepository.findOne({
      where: { email },
    });

    if (existingEmployee && existingEmployee.id !== excludeId) {
      throw new ConflictException('Email already exists');
    }
  }

  private handleUniqueConstraintError(error: unknown): never {
    const message = error instanceof Error ? error.message : '';
    const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code) : '';

    if (
      message.includes('duplicate key value violates unique constraint') ||
      message.includes('UNIQUE constraint failed') ||
      message.includes('Duplicate entry') ||
      message.includes('unique constraint') ||
      code === '23505' ||
      code === 'SQLITE_CONSTRAINT' ||
      code === 'SQLITE_CONSTRAINT_UNIQUE'
    ) {
      throw new ConflictException('Email already exists');
    }

    throw error;
  }
}