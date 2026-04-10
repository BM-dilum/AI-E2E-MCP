import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

type EmployeeApi = Omit<Employee, 'salaryCents'> & { salary: number | null };

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeesRepository: Repository<Employee>,
  ) {}

  private toApi(employee: Employee): EmployeeApi {
    const { salaryCents, ...rest } = employee as Employee & { salaryCents?: number | null };
    return {
      ...rest,
      salary: salaryCents !== null && salaryCents !== undefined ? salaryCents / 100 : null,
    } as EmployeeApi;
  }

  async create(createEmployeeDto: CreateEmployeeDto): Promise<EmployeeApi> {
    const existingEmployee = await this.employeesRepository.findOne({
      where: { email: createEmployeeDto.email },
    });

    if (existingEmployee) {
      throw new BadRequestException('An employee with this email already exists');
    }

    const { salary, ...employeeData } = createEmployeeDto as CreateEmployeeDto & { salary?: number };

    const employee = this.employeesRepository.create({
      ...employeeData,
      ...(salary !== undefined ? { salaryCents: Math.round(salary * 100) } : {}),
    });

    try {
      const savedEmployee = await this.employeesRepository.save(employee);
      return this.toApi(savedEmployee);
    } catch (error) {
      if (
        error?.code === '23505' ||
        error?.errno === 1062 ||
        error?.code === 'SQLITE_CONSTRAINT' ||
        error?.errno === 19
      ) {
        throw new BadRequestException('An employee with this email already exists');
      }
      throw error;
    }
  }

  async findAll(): Promise<EmployeeApi[]> {
    const employees = await this.employeesRepository.find({
      order: {
        id: 'ASC',
      },
    });

    return employees.map((employee) => this.toApi(employee));
  }

  async findOne(id: number): Promise<EmployeeApi> {
    const employee = await this.employeesRepository.findOne({
      where: { id },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with id ${id} not found`);
    }

    return this.toApi(employee);
  }

  async update(id: number, updateEmployeeDto: UpdateEmployeeDto): Promise<EmployeeApi> {
    const employee = await this.employeesRepository.findOne({
      where: { id },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with id ${id} not found`);
    }

    const { salary, ...updateData } = updateEmployeeDto as UpdateEmployeeDto & { salary?: number };

    if (updateData.email && updateData.email !== employee.email) {
      const existingEmployee = await this.employeesRepository.findOne({
        where: { email: updateData.email },
      });

      if (existingEmployee && existingEmployee.id !== id) {
        throw new BadRequestException('An employee with this email already exists');
      }
    }

    Object.assign(employee, updateData);

    if (salary !== undefined) {
      employee.salaryCents = Math.round(salary * 100);
    }

    try {
      const savedEmployee = await this.employeesRepository.save(employee);
      return this.toApi(savedEmployee);
    } catch (error) {
      if (
        error?.code === '23505' ||
        error?.errno === 1062 ||
        error?.code === 'SQLITE_CONSTRAINT' ||
        error?.errno === 19
      ) {
        throw new BadRequestException('An employee with this email already exists');
      }
      throw error;
    }
  }

  async remove(id: number): Promise<EmployeeApi> {
    const employee = await this.employeesRepository.findOne({
      where: { id },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with id ${id} not found`);
    }

    const removedEmployee = await this.employeesRepository.remove(employee);
    return this.toApi(removedEmployee);
  }
}