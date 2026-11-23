# Multi-Tenant SaaS Helpdesk & Operations Platform

An enterprise-grade, multi-tenant B2B platform combining Helpdesk (Zendesk-style customer support & SLAs), Business Operations (Jira-style task tracking & sprint boards), and an Executive Dashboard.

---

## 🏗️ Architecture & Tech Stack

- **Backend**: Python 3.11+, FastAPI, SQLAlchemy 2.0 (Async)
- **Database**: PostgreSQL 16
- **Caching & Broker**: Redis 7
- **Background Jobs**: Celery
- **Security**: JWT Authentication + Multi-Tenant RBAC (Row-Level / Tenant scoping)
- **Frontend**: React + TypeScript + Tailwind CSS (Phase 5)
- **Containerization**: Docker & Docker Compose

---

## 📁 Repository Layout

```text
saas-platform/
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers & security dependencies
│   │   ├── core/         # Config, DB connection, JWT security
│   │   ├── models/       # SQLAlchemy models (Tenant, User, etc.)
│   │   ├── schemas/      # Pydantic validation schemas
│   │   └── main.py       # FastAPI application entrypoint
│   ├── tests/            # Pytest test suite
│   ├── requirements.txt  # Python dependencies
│   ├── Dockerfile
│   └── .env
├── docker/
│   └── docker-compose.yml # PostgreSQL, Redis, Backend container config
└── README.md
```

---

## 🚀 Quickstart Guide

### 1. Start Database & Redis (Docker)
From the project root:
```bash
docker compose -f docker/docker-compose.yml up postgres redis -d
```

### 2. Set Up the Backend Environment
Open a terminal in the `backend/` directory:
```bash
cd backend
python -m venv .venv
# On Windows PowerShell:
.venv\Scripts\Activate.ps1
# On Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Run the FastAPI Development Server
```bash
uvicorn app.main:app --reload --port 8000
```

### 4. Interactive API Documentation
Open your browser and visit:
- **Swagger UI**: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
- **ReDoc**: [http://localhost:8000/api/v1/redoc](http://localhost:8000/api/v1/redoc)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

## 🧪 Running Automated Tests
```bash
cd backend
pytest
```
