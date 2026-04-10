import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto): Promise<Employee> {
    const existingEmployee = await this.employeeRepository.findOne({
      where: { email: createEmployeeDto.email },
    });

    if (existingEmployee) {
      throw new BadRequestException('Employee with this email already exists');
    }

    const employee = this.employeeRepository.create(createEmployeeDto);

    try {
      return await this.employeeRepository.save(employee);
    } catch (error) {
      if (this.isUniqueEmailViolation(error)) {
        throw new BadRequestException('Employee with this email already exists');
      }
      throw error;
    }
  }

  async findAll(): Promise<Employee[]> {
    return this.employeeRepository.find({
      order: {
        id: 'ASC',
      },
    });
  }

  async findOne(id: number): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
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
      const existingEmployee = await this.employeeRepository.findOne({
        where: { email: updateEmployeeDto.email },
      });

      if (existingEmployee && existingEmployee.id !== id) {
        throw new BadRequestException('Employee with this email already exists');
      }
    }

    Object.assign(employee, updateEmployeeDto);

    try {
      return await this.employeeRepository.save(employee);
    } catch (error) {
      if (this.isUniqueEmailViolation(error)) {
        throw new BadRequestException('Employee with this email already exists');
      }
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    const employee = await this.findOne(id);
    await this.employeeRepository.remove(employee);
  }

  private isUniqueEmailViolation(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const dbError = error as { code?: string; detail?: string; message?: string };

    return (
      dbError.code === '23505' ||
      dbError.code === 'ER_DUP_ENTRY' ||
      dbError.code === 'SQLITE_CONSTRAINT' ||
      (typeof dbError.message === 'string' && dbError.message.toLowerCase().includes('unique')) ||
      (typeof dbError.detail === 'string' && dbError.detail.toLowerCase().includes('email'))
    );
  }
}