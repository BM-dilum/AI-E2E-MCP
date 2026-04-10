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
    private readonly employeesRepository: Repository<Employee>,
  ) {}

  private isDuplicateEmailError(error: any): boolean {
    const code = error?.code;
    const errno = error?.errno;
    const message = String(error?.message || '').toLowerCase();

    return (
      code === '23505' ||
      code === 'ER_DUP_ENTRY' ||
      code === 'SQLITE_CONSTRAINT' ||
      code === 'SQLITE_CONSTRAINT_UNIQUE' ||
      code === 'SQLITE_CONSTRAINT_PRIMARYKEY' ||
      errno === 1062 ||
      message.includes('unique constraint') ||
      message.includes('duplicate') ||
      message.includes('constraint failed') ||
      message.includes('not unique')
    );
  }

  async create(createEmployeeDto: CreateEmployeeDto): Promise<Employee> {
    const existingEmployee = await this.employeesRepository.findOne({
      where: { email: createEmployeeDto.email },
    });

    if (existingEmployee) {
      throw new BadRequestException('Employee with this email already exists');
    }

    const employee = this.employeesRepository.create(createEmployeeDto);

    try {
      return await this.employeesRepository.save(employee);
    } catch (error) {
      if (this.isDuplicateEmailError(error)) {
        throw new BadRequestException('Employee with this email already exists');
      }
      throw error;
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
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return employee;
  }

  async update(id: number, updateEmployeeDto: UpdateEmployeeDto): Promise<Employee> {
    const employee = await this.findOne(id);

    if (updateEmployeeDto.email && updateEmployeeDto.email !== employee.email) {
      const existingEmployee = await this.employeesRepository.findOne({
        where: { email: updateEmployeeDto.email },
      });

      if (existingEmployee && existingEmployee.id !== id) {
        throw new BadRequestException('Employee with this email already exists');
      }
    }

    const updatedEmployee = this.employeesRepository.merge(employee, updateEmployeeDto);

    try {
      return await this.employeesRepository.save(updatedEmployee);
    } catch (error) {
      if (this.isDuplicateEmailError(error)) {
        throw new BadRequestException('Employee with this email already exists');
      }
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    const employee = await this.findOne(id);
    await this.employeesRepository.remove(employee);
  }
}