import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesModule } from './employees/employees.module';
import { Employee } from './employees/entities/employee.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'empSys.sqlite',
      entities: [Employee],
      synchronize: process.env.NODE_ENV === 'development',
      autoLoadEntities: true,
    }),
    EmployeesModule,
  ],
})
export class AppModule {}