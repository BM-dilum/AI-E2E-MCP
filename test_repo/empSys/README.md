# empSys

A NestJS-based Employee Management System with full CRUD operations, input validation, and SQLite persistence using TypeORM.

## Overview

This project provides a clean, modular NestJS architecture for managing employees with:

- Create employee
- List all employees
- Get employee by ID
- Update employee by ID
- Delete employee by ID
- Request validation with class-validator and class-transformer
- SQLite database via TypeORM
- Global validation pipe configured in the application bootstrap

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

### Install dependencies

From the project root:

npm install

### Run the application

npm run start:dev

The application will start on:

http://localhost:3000

### Run tests

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
  "position": "Senior Software Engineer",
  "salary": 90000
}

### Delete Employee by ID

DELETE /employees/:id

## Validation Rules

- firstName: required string
- lastName: required string
- email: required valid email, unique
- position: required string
- salary: required number greater than 0

## Notes

- The database uses SQLite.
- The database file path is controlled by the DB_PATH environment variable and defaults to empSys.sqlite when not set.
- Schema synchronization is controlled by the TYPEORM_SYNCHRONIZE environment variable and defaults to false.
- Validation is enforced globally using NestJS ValidationPipe with runtime settings aligned to the application bootstrap:
  - whitelist: true
  - forbidNonWhitelisted: true
  - transform: true