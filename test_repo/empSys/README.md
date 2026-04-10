# NestJS Employee Management System

A simple NestJS application for managing employees with full CRUD operations, SQLite persistence, TypeORM, and request validation, built for development and testing.

## Overview

This project provides:

- Create an employee
- Get all employees
- Get an employee by ID
- Update an employee by ID
- Delete an employee by ID
- Input validation using `class-validator` and `class-transformer`
- TypeORM repository-based data access
- SQLite database with automatic schema synchronization for development/testing

## Tech Stack

- NestJS
- TypeScript
- TypeORM
- SQLite
- class-validator
- class-transformer

## Setup

### Prerequisites

- Node.js 18+ recommended
- npm

### Install dependencies

```bash
npm install
```

## Run the Application

Start the NestJS server:

```bash
npm run start:dev
```

The application will run on:

```bash
http://localhost:3000
```

## Run Tests

Run end-to-end tests:

```bash
npm run test:e2e
```

## API Endpoints

### Create Employee

- Method: `POST`
- Path: `/employees`

Sample payload:

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "position": "Software Engineer",
  "salaryCents": 7500000
}
```

### Get All Employees

- Method: `GET`
- Path: `/employees`

### Get Employee by ID

- Method: `GET`
- Path: `/employees/:id`

Example:

```bash
GET /employees/1
```

### Update Employee by ID

- Method: `PATCH`
- Path: `/employees/:id`

Sample payload:

```json
{
  "position": "Senior Software Engineer",
  "salaryCents": 9000000
}
```

### Delete Employee by ID

- Method: `DELETE`
- Path: `/employees/:id`

Example:

```bash
DELETE /employees/1
```

## Validation Rules

### Create Employee

- `firstName`: required string
- `lastName`: required string
- `email`: required valid email
- `position`: required string
- `salaryCents`: required integer number greater than 0, representing salary in cents

### Update Employee

- All fields optional
- Validation applies to any provided fields
- `salaryCents`, when provided, must be an integer number greater than 0, representing salary in cents

## Notes

- The database is configured with `synchronize: true` for this test project.
- Employee email addresses must be unique.
- The application returns appropriate HTTP status codes for success and error cases.