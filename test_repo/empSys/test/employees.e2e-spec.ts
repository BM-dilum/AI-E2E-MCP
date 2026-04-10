import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { Employee } from '../src/employees/entities/employee.entity';
import * as request from 'supertest';

describe('EmployeesController (e2e)', () => {
  let app: INestApplication;
  let server: any;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    await app.init();
    server = app.getHttpServer();
  });

  beforeEach(async () => {
    const dataSource = app.get('DataSource');
    const repository = dataSource.getRepository(Employee);
    await repository.clear();
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

    const response = await request(server).post('/employees').send(payload).expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(Number),
      ...payload,
      salary: 75000,
    });
    expect(response.body.createdAt).toBeDefined();
    expect(response.body.updatedAt).toBeDefined();
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

    const response = await request(server).post('/employees').send(payload).expect(400);

    expect(response.body.message).toEqual(
      expect.arrayContaining([
        expect.stringContaining('firstName should not be empty'),
        expect.stringContaining('email must be an email'),
        expect.stringContaining('salary must be greater than 0'),
      ]),
    );
  });

  it('get all employees', async () => {
    await request(server).post('/employees').send({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      position: 'Manager',
      salary: 90000,
    });

    await request(server).post('/employees').send({
      firstName: 'Bob',
      lastName: 'Brown',
      email: 'bob.brown@example.com',
      position: 'Analyst',
      salary: 60000,
    });

    const response = await request(server).get('/employees').expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(2);
  });

  it('get one employee by id', async () => {
    const createResponse = await request(server).post('/employees').send({
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice.johnson@example.com',
      position: 'Designer',
      salary: 70000,
    });

    const response = await request(server).get(`/employees/${createResponse.body.id}`).expect(200);

    expect(response.body).toMatchObject({
      id: createResponse.body.id,
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice.johnson@example.com',
      position: 'Designer',
      salary: 70000,
    });
  });

  it('update employee successfully', async () => {
    const createResponse = await request(server).post('/employees').send({
      firstName: 'Mark',
      lastName: 'Taylor',
      email: 'mark.taylor@example.com',
      position: 'Engineer',
      salary: 80000,
    });

    const response = await request(server)
      .patch(`/employees/${createResponse.body.id}`)
      .send({
        position: 'Senior Engineer',
        salary: 95000,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      id: createResponse.body.id,
      firstName: 'Mark',
      lastName: 'Taylor',
      email: 'mark.taylor@example.com',
      position: 'Senior Engineer',
      salary: 95000,
    });
  });

  it('delete employee successfully', async () => {
    const createResponse = await request(server).post('/employees').send({
      firstName: 'Emma',
      lastName: 'Wilson',
      email: 'emma.wilson@example.com',
      position: 'HR',
      salary: 65000,
    });

    await request(server).delete(`/employees/${createResponse.body.id}`).expect(204);

    await request(server).get(`/employees/${createResponse.body.id}`).expect(404);
  });

  it('return 404 for non-existent employee', async () => {
    const employeeId = 9999;
    const response = await request(server).get(`/employees/${employeeId}`).expect(404);

    expect(response.body.message).toEqual(
      expect.arrayContaining([
        expect.stringContaining(String(employeeId)),
        expect.stringContaining('not found'),
      ]),
    );
  });
});