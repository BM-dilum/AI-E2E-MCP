# NestJS Employee Management System

A production-style NestJS application for managing employees with full CRUD operations, SQLite persistence, TypeORM, and request validation.

## Features

- Create an employee
- Get all employees
- Get an employee by ID
- Update an employee by ID
- Delete an employee by ID
- Input validation with class-validator and class-transformer
- TypeORM repository pattern
- SQLite database
- Global validation pipe
- Clean modular NestJS architecture

## Project Structure

- `src/main.ts` - application bootstrap
- `src/app.module.ts` - root module and TypeORM configuration
- `src/employees/` - employee feature module
  - controller
  - service
  - entity
  - DTOs

## Prerequisites

- Node.js 18+
- npm

## Setup

Install dependencies:

npm install

## Run the Application

Start the development server:

npm run start:dev

The application will run on:

http://localhost:3000

## Run Tests

Run end-to-end tests:

npm run test:e2e

## API Endpoints

### Create Employee
POST /employees

Sample payload:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "position": "Software Engineer",
  "salary": 75000
}
```

### Get All Employees
GET /employees

### Get Employee by ID
GET /employees/:id

### Update Employee by ID
PATCH /employees/:id

Sample payload:
```json
{
  "firstName": "Jane",
  "position": "Senior Software Engineer",
  "salary": 90000
}
```

### Delete Employee by ID
DELETE /employees/:id

## Validation Rules

- `firstName`: required string
- `lastName`: required string
- `email`: required valid email
- `position`: required string
- `salary`: required number greater than 0

## Notes

- The database is configured with `synchronize: true` for this test project.
- SQLite data is stored locally by TypeORM.
- Validation errors return standard NestJS 400 responses.