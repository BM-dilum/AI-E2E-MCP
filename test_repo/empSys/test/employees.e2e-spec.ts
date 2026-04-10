import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Employee } from '../src/employees/entities/employee.entity';

describe('EmployeesController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let employeeRepository: ReturnType<DataSource['getRepository']>;
  let createdEmployeeId: number;

  beforeAll(async () => {
    const testDataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [Employee],
      synchronize: true,
      dropSchema: true,
    });

    if (!testDataSource.isInitialized) {
      await testDataSource.initialize();
    }

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DataSource)
      .useValue(testDataSource)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    dataSource = app.get(DataSource);
    employeeRepository = dataSource.getRepository(Employee);
  });

  beforeEach(async () => {
    await employeeRepository.clear();
    createdEmployeeId = 0;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
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
      salary: 0,
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
    await employeeRepository.save(
      employeeRepository.create({
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice.smith@example.com',
        position: 'Manager',
        salary: 90000,
      }),
    );

    await employeeRepository.save(
      employeeRepository.create({
        firstName: 'Bob',
        lastName: 'Brown',
        email: 'bob.brown@example.com',
        position: 'Analyst',
        salary: 60000,
      }),
    );

    const response = await request(app.getHttpServer())
      .get('/employees')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(2);
  });

  it('get one employee by id', async () => {
    const employee = await employeeRepository.save(
      employeeRepository.create({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
        position: 'Designer',
        salary: 68000,
      }),
    );

    const response = await request(app.getHttpServer())
      .get(`/employees/${employee.id}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      position: employee.position,
      salary: employee.salary,
    });
  });

  it('update employee successfully', async () => {
    const employee = await employeeRepository.save(
      employeeRepository.create({
        firstName: 'Mark',
        lastName: 'Taylor',
        email: 'mark.taylor@example.com',
        position: 'Support',
        salary: 50000,
      }),
    );

    const payload = {
      position: 'Senior Support',
      salary: 55000,
    };

    const response = await request(app.getHttpServer())
      .patch(`/employees/${employee.id}`)
      .send(payload)
      .expect(200);

    expect(response.body).toMatchObject({
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      position: payload.position,
      salary: payload.salary,
    });
  });

  it('delete employee successfully', async () => {
    const employee = await employeeRepository.save(
      employeeRepository.create({
        firstName: 'Sara',
        lastName: 'Connor',
        email: 'sara.connor@example.com',
        position: 'Engineer',
        salary: 82000,
      }),
    );

    await request(app.getHttpServer())
      .delete(`/employees/${employee.id}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/employees/${employee.id}`)
      .expect(404);
  });

  it('return 404 for non-existent employee', async () => {
    await request(app.getHttpServer()).get('/employees/999999').expect(404);
    await request(app.getHttpServer()).patch('/employees/999999').send({ position: 'Lead' }).expect(404);
    await request(app.getHttpServer()).delete('/employees/999999').expect(404);
  });
});