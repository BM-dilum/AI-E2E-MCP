# Employee Management System (empSys)

A NestJS-based Employee Management System built with TypeScript, TypeORM, and SQLite.  
This project provides full CRUD operations for managing employees with validation, clean modular architecture, and production-style NestJS patterns.

## Features

- Create an employee
- Get all employees
- Get employee by ID
- Update employee by ID
- Delete employee by ID
- Request payload validation
- Proper HTTP status codes and exception handling
- TypeORM repository pattern
- SQLite database
- Global validation pipe

## Tech Stack

- NestJS
- TypeScript
- TypeORM
- SQLite
- class-validator
- class-transformer

## Project Structure

- src/main.ts
- src/app.module.ts
- src/employees/
  - employees.module.ts
  - employees.controller.ts
  - employees.service.ts
  - entities/employee.entity.ts
  - dto/create-employee.dto.ts
  - dto/update-employee.dto.ts
- test/employees.e2e-spec.ts

## Setup Instructions

All commands below should be run from the project root directory: test_repo/empSys.

### 1. Install dependencies

cd test_repo/empSys
npm install

### 2. Run the application

cd test_repo/empSys
npm run start:dev

The server will start on the configured PORT environment variable. If PORT is not set, the application defaults to 3000:

http://localhost:3000

### 3. Run tests

cd test_repo/empSys
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

Example:
GET /employees/1

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
- salary: required number greater than 0

## Notes

- The application uses SQLite with TypeORM synchronization enabled only in non-production environments (NODE_ENV !== 'production'). In production, synchronization is disabled.
- Validation is enforced globally using NestJS ValidationPipe.
- Employee email must be unique. Duplicate emails are rejected on create and update.