# empSys

A NestJS Employee Management System built with TypeScript, TypeORM, and SQLite.  
This project provides full CRUD operations for employees with request validation, clean modular architecture, and end-to-end tests.

## Features

- Create an employee
- Get all employees
- Get employee by ID
- Update employee by ID
- Delete employee by ID
- Input validation using class-validator and class-transformer
- TypeORM repository pattern
- SQLite database
- Global validation pipe
- Clean NestJS modular structure

## Project Structure

- src/main.ts
- src/app.module.ts
- src/employees/employees.module.ts
- src/employees/employees.controller.ts
- src/employees/employees.service.ts
- src/employees/entities/employee.entity.ts
- src/employees/dto/create-employee.dto.ts
- src/employees/dto/update-employee.dto.ts
- test/employees.e2e-spec.ts

## Setup Instructions

### 1. Install dependencies

npm install

### 2. Run the application

npm run start:dev

The app will start on the default port, or on the port specified by the PORT environment variable. For example:

PORT=4000 npm run start:dev

### 3. Run tests

npm run test:e2e

## API Endpoints

### Create Employee
POST /employees

Sample payload:
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "position": "Software Engineer",
  "salary": 75000
}

### Get All Employees
GET /employees

### Get Employee by ID
GET /employees/:id

### Update Employee by ID
PATCH /employees/:id

Sample payload:
{
  "firstName": "Jane",
  "salary": 80000
}

### Delete Employee by ID
DELETE /employees/:id

## Validation Rules

- firstName: required string
- lastName: required string
- email: required valid email
- position: required string
- salary: required integer greater than or equal to 1

## Notes

- The application uses SQLite with TypeORM synchronization controlled by the TYPEORM_SYNCHRONIZE environment variable.
- Synchronization defaults to enabled outside production and disabled in production unless explicitly overridden.
- Validation is applied globally in `main.ts` with:
  - whitelist: true
  - forbidNonWhitelisted: true
  - transform: true