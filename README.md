# School Management API

Backend-only School Management REST API built with Node.js and Express. Data is held in memory and resets whenever the process restarts; this project does not connect to a database.

## Requirements

- Node.js 20+
- pnpm 12 (or a compatible package manager)

## Setup

```sh
pnpm install
cp .env.example .env
```

Set a unique `JWT_SECRET` of at least 32 characters and change `ADMIN_PASSWORD` before starting the server. The configured admin account is created at startup and is never created through public registration.

```sh
pnpm dev
pnpm test
```

The server listens on `http://localhost:3000` by default. `GET /health` is a public health check. Each restart starts with empty school records and a newly bootstrapped admin account.

## Authentication and roles

Register a student at `POST /api/auth/register`, then log in at `POST /api/auth/login`. Both return a signed bearer token. Include it on protected endpoints as `Authorization: Bearer <token>`. Public registration accepts only the `student` role; a role field of `admin` or `teacher` is rejected. Admins create teacher/student accounts using `POST /api/auth/users`.

| Role | Permissions |
| --- | --- |
| Admin | Full CRUD for students, teachers, classes, subjects, and results; provision student/teacher accounts. |
| Teacher | View students, teachers, classes, and subjects; create, view, and update results. |
| Student | View own student profile, own results, own class, and subjects. |

Students can list subjects, while class and result queries are scoped to their own records. Teachers cannot delete records or manage users. Admin accounts are configured only through environment variables.

## Endpoints

All paths below are prefixed with `/api` except `/health`.

| Method | Path | Access |
| --- | --- | --- |
| POST | `/auth/register` | Public, rate limited |
| POST | `/auth/login` | Public, rate limited |
| POST | `/auth/users` | Admin |
| GET/POST | `/students` | Admin; teachers can GET |
| GET/PUT/DELETE | `/students/:id` | Admin; teachers can GET; students can GET their own record |
| GET/POST | `/teachers` | Admin; teachers can GET |
| GET/PUT/DELETE | `/teachers/:id` | Admin; teachers can GET |
| GET/POST/PUT/DELETE | `/classes` and `/classes/:id` | Admin; teachers can GET; students can GET their own class |
| GET/POST/PUT/DELETE | `/subjects` and `/subjects/:id` | Admin; teachers and students can GET |
| GET/POST/PUT/DELETE | `/results` and `/results/:id` | Admin; teachers can GET/POST/PUT; students can GET their own results |

Use UUIDs for record IDs and relationship IDs. Scores are numbers from 0 through 100. Error responses use `{ "success": false, "message": "..." }`. Missing/invalid authentication returns 401; an authenticated user lacking access returns 403.

## Security and validation

- Passwords are hashed with bcrypt and never returned.
- JWT signing requires `JWT_SECRET`; tokens expire after two hours.
- Helmet security headers and a 32 KB JSON body limit are enabled.
- Registration and login are limited to 10 requests per IP per 15 minutes.
- Request logs include timestamp, method, URL, status, and elapsed time.
- Request bodies, IDs, query parameters, roles, scores, and record references are validated.
- Unhandled errors are returned as a generic 500 response without exposing internals.

## API testing

Import [`postman/School-Management-API.postman_collection.json`](postman/School-Management-API.postman_collection.json) into Postman. The collection has a `baseUrl` variable and scripts that retain registered user tokens and created IDs. Login as the configured admin using `.env` values to test administrator routes. The automated tests use Supertest and isolated in-memory state.

## Project layout

```text
src/
  app.js
  server.js
  data/store.js
  middleware/
  routes/api.js
  utils/
test/
postman/
```