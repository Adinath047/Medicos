# EMR Microservices Deployment Guide

This guide walks you through deploying the partitioned EMR microservices stack and NGINX Load Balancer Gateway to a cloud server (VPS, EC2) or container-as-a-service platforms (Railway, Render).

---

## 🛠️ Option 1: VPS / EC2 Deployment (Docker Compose)
*This is the recommended and simplest method, as it spins up the entire Gateway, Clinical replicas, and Auth/Billing/Sync services in a single command.*

### Prerequisites
1. A Linux cloud server (Ubuntu 22.04 LTS recommended) with a public IP.
2. **Docker** and **Docker Compose** installed.
   ```bash
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
   ```

### Deployment Steps
1. **Clone your repository** onto the server:
   ```bash
   git clone https://github.com/Adinath047/Medicos.git
   cd Medicos
   ```
2. **Configure Environment Secrets**:
   Create a `server/.env` file with your production keys:
   ```env
   NODE_ENV=production
   DATABASE_URL=postgresql://postgres:[password]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres
   JWT_SECRET=generate-a-secure-random-string-here
   SUPER_ADMIN_KEY=your-super-admin-login-key
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_KEY=your-supabase-service-role-key
   SUPABASE_ENABLED=true
   ```
3. **Start the Stack**:
   Run Docker Compose in detached mode:
   ```bash
   docker compose up -d --build
   ```
4. **Verify Running Containers**:
   ```bash
   docker compose ps
   ```
   You should see:
   * `medicos_gateway` (listening on public port `3000`)
   * `medicos_auth`
   * `medicos_clinical_1`
   * `medicos_clinical_2`
   * `medicos_billing`
   * `medicos_sync`

5. **Access the App**:
   Open your browser and navigate to `http://<your-server-ip>:3000`.

---

## ☁️ Option 2: Cloud Container Platform (Railway / Render)
*If you prefer deploying individual managed containers directly on Railway or Render, follow these steps.*

### 1. Provision Backend Microservices
Create **four separate Web Services** pointing to the same Git repository (`https://github.com/Adinath047/Medicos`):

1. **`auth-service`**:
   * Build Command: (leave default / Nixpacks)
   * Start Command: `node server/server.js`
   * Environment Variables:
     * `SERVICE_NAME=auth`
     * `PORT=4000`
     * (Add your `DATABASE_URL`, `JWT_SECRET`, and `SUPER_ADMIN_KEY` from the `.env` list)

2. **`clinical-service`**:
   * Build Command: (leave default / Nixpacks)
   * Start Command: `node server/server.js`
   * Environment Variables:
     * `SERVICE_NAME=clinical`
     * `PORT=4000`
     * (Add other database env variables)

3. **`billing-service`**:
   * Build Command: (leave default / Nixpacks)
   * Start Command: `node server/server.js`
   * Environment Variables:
     * `SERVICE_NAME=billing`
     * `PORT=4000`
     * (Add other database env variables)

4. **`sync-service`**:
   * Build Command: (leave default / Nixpacks)
   * Start Command: `node server/server.js`
   * Environment Variables:
     * `SERVICE_NAME=sync`
     * `PORT=4000`
     * (Add other database env variables)

### 2. Configure Private Network URLs
Platforms like Railway/Render assign internal DNS hostnames (e.g. `http://auth-service.railway.internal`). Note down these hostnames.

### 3. Deploy NGINX Gateway
1. Update [nginx.conf](file:///Users/apple/Desktop/Medicos/Medicos/nginx.conf) to replace Docker DNS names with your platform's internal hostnames:
   ```nginx
   upstream auth_backend {
       server auth-service.railway.internal:4000;
   }
   upstream clinical_backend {
       server clinical-service.railway.internal:4000;
   }
   upstream billing_backend {
       server billing-service.railway.internal:4000;
   }
   upstream sync_backend {
       server sync-service.railway.internal:4000;
   }
   ```
2. Push the updated config to Git.
3. Deploy an **NGINX/Static** service on the cloud platform:
   * Build it using the project's root `Dockerfile` (which compiles the React frontend assets).
   * Map port `3000` as the public domain endpoint.
   * NGINX will serve the static files and act as the gateway, proxying API calls to the private services.

---

## 🗄️ Database Setup (Supabase / PostgreSQL)
Ensure your cloud database has all EMR tables, automatic triggers, and composite query optimization indexes configured:

1. Connect to your Supabase SQL Editor.
2. Copy and run all commands from [server/db/supabase_schema.sql](file:///Users/apple/Desktop/Medicos/Medicos/server/db/supabase_schema.sql).
3. The server startup script will automatically check if the `medicines` table is empty and seed it with the resolved generic list on boot.
