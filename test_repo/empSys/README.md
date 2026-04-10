# NestJS Employee Management System

A production-style NestJS application for managing employees with full CRUD operations, validation, and SQLite persistence using TypeORM.

## Features

- Create an employee
- Get all employees
- Get employee by ID
- Update employee by ID
- Delete employee by ID
- Request validation with class-validator and class-transformer
- SQLite database with TypeORM
- Clean modular NestJS architecture
- E2E test coverage for core API flows

## Project Structure

- `src/main.ts` - application bootstrap and global validation pipe
- `src/app.module.ts` - root module and TypeORM configuration
- `src/employees/` - employee feature module
  - controller
  - service
  - entity
  - DTOs
- `test/employees.e2e-spec.ts` - end-to-end tests

## Prerequisites

- Node.js 18+
- npm

## Setup

Install dependencies:

npm install

## Run the Application

Start the NestJS server:

npm run start:dev

The application will run on:

http://localhost:3000

## Run Tests

Run end-to-end tests:

npm run test:e2e

## API Endpoints

### Create Employee

POST /employees

Request body:

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

Request body:

{
  "position": "Senior Software Engineer",
  "salary": 90000
}

### Delete Employee by ID

DELETE /employees/:id

## Validation Rules

- `firstName`: required string
- `lastName`: required string
- `email`: required valid email and unique
- `position`: required string
- `salary`: required number greater than 0

## Notes

- The database is configured with SQLite and schema synchronization is enabled only when `NODE_ENV === 'development'`; production should use migrations with `synchronize` disabled.
- Global validation is enabled with whitelist and forbidNonWhitelisted options.
- IDs are parsed as integers in controller routes.