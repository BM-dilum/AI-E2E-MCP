import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesModule } from './employees/employees.module';
import { Employee } from './employees/entities/employee.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DB_PATH ?? 'empSys.sqlite',
      entities: [Employee],
      synchronize: process.env.TYPEORM_SYNCHRONIZE === 'true',
      autoLoadEntities: true,
    }),
    EmployeesModule,
  ],
})
export class AppModule {}