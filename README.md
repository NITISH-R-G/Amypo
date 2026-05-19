# Assessment Engine

An automated evaluation engine for HTML/CSS/JS tasks using Puppeteer. It runs student submissions in a sandboxed Chromium environment, grades them with DOM/CSS assertions, visual diffs, and computes partial scores with a weighted rubric.

## Architecture & Project Structure

This is a monorepo consisting of three workspaces:

- **`backend/`**: Express.js API handling submissions, retrieving results, and orchestrating evaluation jobs. Uses PostgreSQL and Sequelize.
- **`worker/`**: Background worker utilizing BullMQ and Puppeteer to process evaluation jobs. Runs headless Chrome in isolation.
- **`frontend/`**: React/Vite web application providing dashboards for Students, Trainers, and Admins to manage and view assessments.

## Quick Start (Docker)

The easiest way to get started is using Docker Compose.

1. Ensure Docker and Docker Compose are installed.
2. Run the full stack:
   ```bash
   docker compose up -d
   ```
3. The services will be available at:
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:4000`

## Local Development (Without Docker)

You will need Node.js (v20+), PostgreSQL, and Redis.

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Database & Redis**
   Ensure PostgreSQL is running and you have created a database (e.g., `assessment_engine`). Ensure Redis is running on the default port `6379`. Update `backend/.env` with your DB credentials if necessary.

3. **Start the Backend**
   ```bash
   npm run start:backend
   ```

4. **Start the Worker**
   ```bash
   npm run start:worker
   ```

5. **Start the Frontend**
   ```bash
   npm run start:frontend
   ```

## Demo Seed

You can populate the database with a sample roadmap and question by running the backend seeding script:
```bash
npm run demo --workspace=backend
```

## Security Overview

The sandbox runner utilizes multiple layers of security to prevent cheating and container escapes:
- `iframe`, `localStorage`, `sessionStorage`, `eval()`, and `window.open` are completely disabled in the browser context.
- Hard timeouts for all execution blocks prevent infinite loops.
- All network requests inside the sandbox are intercepted and blocked unless they match the allowed library whitelisted domains (e.g., `cdn.tailwindcss.com`).
- Input validation sanitizes paths to prevent directory traversal in artifact retrieval.
