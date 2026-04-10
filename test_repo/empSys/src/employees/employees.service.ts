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
    private readonly employeesRepository: Repository<Employee>,
  ) {}

  private isUniqueConstraintViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = error.driverError as { code?: string; detail?: string; message?: string } | undefined;
    const message = (driverError?.message ?? '').toLowerCase();
    const detail = (driverError?.detail ?? '').toLowerCase();

    return driverError?.code === '23505' || message.includes('unique') || detail.includes('unique');
  }

  async create(createEmployeeDto: CreateEmployeeDto): Promise<Employee> {
    const employee = this.employeesRepository.create(createEmployeeDto);

    try {
      return await this.employeesRepository.save(employee);
    } catch (error) {
      if (this.isUniqueConstraintViolation(error)) {
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
      throw new NotFoundException(`Employee with id ${id} not found`);
    }

    return employee;
  }

  async update(id: number, updateEmployeeDto: UpdateEmployeeDto): Promise<Employee> {
    const employee = await this.findOne(id);

    const updatedEmployee = this.employeesRepository.merge(employee, updateEmployeeDto);

    try {
      return await this.employeesRepository.save(updatedEmployee);
    } catch (error) {
      if (this.isUniqueConstraintViolation(error)) {
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