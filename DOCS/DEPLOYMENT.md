# Deployment Guide: Viernulvier Archief

This deployment guide outlines the process for moving the Viernulvier Archief project from development into a production environment. Since we are using Docker, the transition is designed to be as seamless as possible, provided the environment is configured correctly.

---

## Building and Starting the Application

The production environment relies on Docker and Docker Compose. The application is containerized into three main functional units: the frontend, the backend, and the object storage (Garage).

### 1. Build the Images
From the root directory, build the production-ready images:
```bash
docker compose build
```

### 2. Launch Services
Start the containers in detached mode:
```bash
docker compose up -d
```
This will initialize the PostgreSQL database, the Garage S3 storage, the backend, and the frontend.

---

## Environment Variables

You must create a .env file in the root directory. Unlike development, never use default secrets in production.

| Variable | Description | Production Recommendation |
| :--- | :--- | :--- |
| DB_PORT | Port for PostgreSQL | Use 5432 (internal to Docker) |
| BACKEND_PORT | Port for the API | Usually 3000 |
| FRONTEND_PORT | Port for the UI | Usually 5173 or 80 (via proxy) |
| DATABASE_URL | Connection string | postgres://user:password@db:5432/dbname |
| GARAGE_RPC_SECRET | Internal Garage communication | Generate a long random string |
| GARAGE_ADMIN_TOKEN | Garage admin access | Generate a long random string |
| VIERNULVIER_API_TOKEN| External API integration | Provided by Viernulvier |
| DEBUG | Debug mode | Must be set to False |

> you can use `openssl rand -hex 32` to generate secure secrets 

---

## Database Setup

Once the containers are running, you need to initialize the database schema.

1. **Run Migrations:**
   This applies the SQL schema to the production database.
   ```bash
   docker exec -t viernulvier-backend pnpm run migrate
   ```

2. **Seed Production Admin:**
   Generate the initial admin user. Note: Immediately change the password upon first login.
   ```bash
   docker exec -t viernulvier-backend pnpm run create-admin
   ```

---

## Periodic Synchronization Job

The project requires a periodic sync to keep the archive updated. While the specific sync script is located in the backend, it should be triggered via a system crontab or a Docker-sidecar container.
