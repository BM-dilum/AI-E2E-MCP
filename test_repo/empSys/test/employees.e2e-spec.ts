import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Employee } from '../src/employees/entities/employee.entity';

describe('EmployeesController (e2e)', () => {
  let app: INestApplication;
  let server: any;
  let employeeRepository: Repository<Employee>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule, TypeOrmModule.forFeature([Employee])],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
    server = app.getHttpServer();
    employeeRepository = moduleFixture.get<Repository<Employee>>(getRepositoryToken(Employee));
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    await employeeRepository.clear();
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
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      position: payload.position,
      salary: payload.salary,
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
      salary: -10,
      extraField: 'not allowed',
    };

    const response = await request(server).post('/employees').send(payload).expect(400);

    expect(response.body.message).toEqual(
      expect.arrayContaining([
        expect.stringContaining('firstName'),
        expect.stringContaining('email'),
        expect.stringContaining('salary'),
      ]),
    );
  });

  it('get all employees', async () => {
    const payload = {
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice.smith@example.com',
      position: 'Manager',
      salary: 90000,
    };

    await request(server).post('/employees').send(payload).expect(201);

    const response = await request(server).get('/employees').expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(1);
    expect(response.body[0]).toHaveProperty('id');
  });

  it('get one employee by id', async () => {
    const createResponse = await request(server)
      .post('/employees')
      .send({
        firstName: 'Bob',
        lastName: 'Brown',
        email: 'bob.brown@example.com',
        position: 'Analyst',
        salary: 65000,
      })
      .expect(201);

    const id = createResponse.body.id;

    const response = await request(server).get(`/employees/${id}`).expect(200);

    expect(response.body).toMatchObject({
      id,
      firstName: 'Bob',
      lastName: 'Brown',
      email: 'bob.brown@example.com',
      position: 'Analyst',
      salary: 65000,
    });
  });

  it('update employee successfully', async () => {
    const createResponse = await request(server)
      .post('/employees')
      .send({
        firstName: 'Carol',
        lastName: 'White',
        email: 'carol.white@example.com',
        position: 'Designer',
        salary: 70000,
      })
      .expect(201);

    const id = createResponse.body.id;

    const response = await request(server)
      .patch(`/employees/${id}`)
      .send({
        position: 'Senior Designer',
        salary: 80000,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      id,
      firstName: 'Carol',
      lastName: 'White',
      email: 'carol.white@example.com',
      position: 'Senior Designer',
      salary: 80000,
    });
  });

  it('delete employee successfully', async () => {
    const createResponse = await request(server)
      .post('/employees')
      .send({
        firstName: 'David',
        lastName: 'Green',
        email: 'david.green@example.com',
        position: 'QA Engineer',
        salary: 60000,
      })
      .expect(201);

    const id = createResponse.body.id;

    await request(server).delete(`/employees/${id}`).expect(200);

    await request(server).get(`/employees/${id}`).expect(404);
  });

  it('return 404 for non-existent employee', async () => {
    const response = await request(server).get('/employees/999999').expect(404);

    expect(response.body.message).toBe('Employee not found');
  });
});