import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesModule } from './employees/employees.module';
import { Employee } from './employees/entities/employee.entity';

const isProduction = process.env.NODE_ENV === 'production';
const synchronize = process.env.TYPEORM_SYNCHRONIZE
  ? process.env.TYPEORM_SYNCHRONIZE === 'true'
  : !isProduction;

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'empSys.sqlite',
      entities: [Employee],
      synchronize,
      autoLoadEntities: true,
    }),
    EmployeesModule,
  ],
})
export class AppModule {}