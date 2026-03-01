# Smart Campus Operations Hub

Spring Boot + React + PostgreSQL (Supabase) project with Docker-based local orchestration and GitHub Actions CI.

## CI/CD Badges

![CI Pipeline](https://github.com/StatCrew/-SmartCampusOperationsHub-/actions/workflows/ci.yml/badge.svg)
[![CI Pipeline](https://github.com/StatCrew/-SmartCampusOperationsHub-/actions/workflows/ci.yml/badge.svg)](https://github.com/StatCrew/-SmartCampusOperationsHub-/actions/workflows/ci.yml)

## Tech Stack

- **Backend:** Spring Boot 4, Java 21, Maven
- **Frontend:** React + Vite
- **Database:** PostgreSQL (Supabase) / MySQL optional
- **Containers:** Docker + Docker Compose
- **CI/CD:** GitHub Actions

## Project Structure

```text
backend/    Spring Boot API
frontend/   React app (served by Nginx in Docker)
docker-compose.yml
.env        Environment variables
.github/workflows/ci.yml
```

## Prerequisites

- Docker Desktop (with Compose)
- For non-Docker local development:
  - Java 21+
  - Node.js 20.19+ (or 22.12+)

## Environment Variables

Create a `.env` file in the project root:

```env
# Backend
SPRING_DATASOURCE_URL=jdbc:postgresql://db.fyoagalaxrwayzznzuvg.supabase.co:5432/postgres?sslmode=require
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=your_supabase_password_here
SPRING_DATASOURCE_DRIVER_CLASS_NAME=org.postgresql.Driver
SPRING_JPA_DATABASE_PLATFORM=org.hibernate.dialect.PostgreSQLDialect
SPRING_JPA_HIBERNATE_DDL_AUTO=update

# Frontend
BACKEND_API_URL=http://localhost:8080
```

> Optional: Uncomment MySQL settings if you want local development using MySQL.

## Run Locally with Docker (Recommended)

From the repository root:

```bash
docker compose up --build
```

Run in detached mode:

```bash
docker compose up --build -d
```

Stop services:

```bash
docker compose down
```

## Service URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- PostgreSQL / MySQL: depends on your configuration

## Local Development Without Docker

### Backend

```bash
cd backend
./mvnw clean package
./mvnw spring-boot:run
```

Windows:

```bat
cd backend
mvnw.cmd clean package
mvnw.cmd spring-boot:run
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Useful Commands

Backend tests:

```bash
cd backend
./mvnw test
```

Frontend lint/build:

```bash
cd frontend
npm run lint
npm run build
```

Compose logs:

```bash
docker compose logs -f
```

## CI/CD (GitHub Actions)

Workflow file: `.github/workflows/ci.yml`

It runs on push/pull_request to `main` and includes:

1. `backend-build`
   - Sets up Java 21
   - Runs Maven package (`./mvnw -B clean package`)
2. `frontend-build`
   - Sets up Node 20.19.0
   - Runs `npm install`, `npm run lint`, `npm run build`
3. `docker-build`
   - Runs `docker compose build`

## Notes

- Docker Compose automatically reads `.env` for backend and frontend configuration.
- Backend includes test-time H2 configuration for CI test reliability.
- For Supabase/PostgreSQL, make sure your credentials are correct in `.env`.
