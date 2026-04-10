import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesModule } from './employees/employees.module';
import { Employee } from './employees/entities/employee.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('NODE_ENV');
        const synchronize = nodeEnv === 'development' || nodeEnv === 'test';

        return {
          type: 'sqlite',
          database: configService.get<string>('DATABASE_PATH') || 'empSys.sqlite',
          entities: [Employee],
          synchronize,
          autoLoadEntities: true,
        };
      },
    }),
    EmployeesModule,
  ],
})
export class AppModule {}