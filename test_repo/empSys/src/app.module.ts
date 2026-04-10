import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesModule } from './employees/employees.module';
import { Employee } from './employees/entities/employee.entity';

const shouldSynchronize = ['development', 'test'].includes(process.env.NODE_ENV || '');

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'empSys.sqlite',
      entities: [Employee],
      synchronize: shouldSynchronize,
      autoLoadEntities: true,
    }),
    EmployeesModule,
  ],
})
export class AppModule {}