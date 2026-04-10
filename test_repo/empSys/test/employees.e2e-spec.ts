import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Employee } from '../src/employees/entities/employee.entity';

describe('EmployeesController (e2e)', () => {
  let app: INestApplication;
  let server: any;

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
      }),
    );

    await app.init();
    server = app.getHttpServer();
  });

  beforeEach(async () => {
    const repository = app.get('EmployeeRepository');
    if (repository?.clear) {
      await repository.clear();
    } else {
      const dataSource = app.get('DataSource');
      await dataSource.getRepository(Employee).clear();
    }
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

    expect(response.body.message).toEqual(expect.arrayContaining([expect.any(String)]));
  });

  it('get all employees', async () => {
    await request(server).post('/employees').send({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      position: 'Manager',
      salary: 90000,
    });

    const response = await request(server).get('/employees').expect(200);

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
    const created = await request(server).post('/employees').send({
      firstName: 'Alice',
      lastName: 'Brown',
      email: 'alice.brown@example.com',
      position: 'Analyst',
      salary: 65000,
    });

    const response = await request(server).get(`/employees/${created.body.id}`).expect(200);

    expect(response.body).toMatchObject({
      id: created.body.id,
      firstName: 'Alice',
      lastName: 'Brown',
      email: 'alice.brown@example.com',
      position: 'Analyst',
      salary: 65000,
    });
  });

  it('update employee successfully', async () => {
    const created = await request(server).post('/employees').send({
      firstName: 'Bob',
      lastName: 'Taylor',
      email: 'bob.taylor@example.com',
      position: 'Designer',
      salary: 70000,
    });

    const response = await request(server)
      .patch(`/employees/${created.body.id}`)
      .send({
        position: 'Senior Designer',
        salary: 80000,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      id: created.body.id,
      firstName: 'Bob',
      lastName: 'Taylor',
      email: 'bob.taylor@example.com',
      position: 'Senior Designer',
      salary: 80000,
    });
  });

  it('delete employee successfully', async () => {
    const created = await request(server).post('/employees').send({
      firstName: 'Chris',
      lastName: 'Green',
      email: 'chris.green@example.com',
      position: 'Engineer',
      salary: 85000,
    });

    await request(server).delete(`/employees/${created.body.id}`).expect(200);

    await request(server).get(`/employees/${created.body.id}`).expect(404);
  });

  it('return 404 for non-existent employee', async () => {
    await request(server).get('/employees/99999').expect(404);
    await request(server).patch('/employees/99999').send({ position: 'Lead' }).expect(404);
    await request(server).delete('/employees/99999').expect(404);
  });
});