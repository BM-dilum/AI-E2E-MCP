import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Employee } from '../src/employees/entities/employee.entity';

describe('EmployeesController (e2e)', () => {
  let app: INestApplication;
  let createdEmployeeId: number;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_PATH = ':memory:';
    process.env.TYPEORM_SYNCHRONIZE = 'true';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, TypeOrmModule.forFeature([Employee])],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  beforeEach(async () => {
    const employeeRepository = app.get('EmployeeRepository');
    if (employeeRepository?.clear) {
      await employeeRepository.clear();
    } else {
      const dataSource = app.get('DataSource');
      if (dataSource?.getRepository) {
        await dataSource.getRepository(Employee).clear();
      }
    }
    createdEmployeeId = undefined as unknown as number;
  });

  afterAll(async () => {
    await app.close();
  });

  it('create employee successfully', async () => {
    const payload = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      position: 'Developer',
      salary: 75000,
    };

    const response = await request(app.getHttpServer())
      .post('/employees')
      .send(payload)
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(Number),
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      position: payload.position,
      salary: payload.salary,
    });

    createdEmployeeId = response.body.id;
  });

  it('fail validation for invalid payload', async () => {
    const payload = {
      firstName: '',
      lastName: 'Doe',
      email: 'invalid-email',
      position: 'Developer',
      salary: -10,
      extraField: 'not allowed',
    };

    const response = await request(app.getHttpServer())
      .post('/employees')
      .send(payload)
      .expect(400);

    expect(response.body.message).toEqual(
      expect.arrayContaining([
        expect.stringContaining('firstName'),
        expect.stringContaining('email'),
        expect.stringContaining('salary'),
      ]),
    );
  });

  it('get all employees', async () => {
    await request(app.getHttpServer())
      .post('/employees')
      .send({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        position: 'Manager',
        salary: 90000,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/employees')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      position: 'Manager',
      salary: 90000,
    });
  });

  it('get one employee by id', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/employees')
      .send({
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice.johnson@example.com',
        position: 'Analyst',
        salary: 65000,
      })
      .expect(201);

    const employeeId = createResponse.body.id;

    const response = await request(app.getHttpServer())
      .get(`/employees/${employeeId}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: employeeId,
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice.johnson@example.com',
      position: 'Analyst',
      salary: 65000,
    });
  });

  it('update employee successfully', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/employees')
      .send({
        firstName: 'Bob',
        lastName: 'Brown',
        email: 'bob.brown@example.com',
        position: 'Engineer',
        salary: 70000,
      })
      .expect(201);

    const employeeId = createResponse.body.id;

    const response = await request(app.getHttpServer())
      .patch(`/employees/${employeeId}`)
      .send({
        position: 'Senior Engineer',
        salary: 85000,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      id: employeeId,
      firstName: 'Bob',
      lastName: 'Brown',
      email: 'bob.brown@example.com',
      position: 'Senior Engineer',
      salary: 85000,
    });
  });

  it('delete employee successfully', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/employees')
      .send({
        firstName: 'Carol',
        lastName: 'White',
        email: 'carol.white@example.com',
        position: 'Designer',
        salary: 68000,
      })
      .expect(201);

    const employeeId = createResponse.body.id;

    await request(app.getHttpServer())
      .delete(`/employees/${employeeId}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/employees/${employeeId}`)
      .expect(404);
  });

  it('return 404 for non-existent employee', async () => {
    const response = await request(app.getHttpServer())
      .get('/employees/999999')
      .expect(404);

    expect(response.body.message).toContain('Employee with ID 999999 not found');
  });
});