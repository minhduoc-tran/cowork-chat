---
title: "Phase 3 - Documentation Update"
description: "Update README.md with Docker commands for local development"
status: pending
dependencies: [phase-01-create-docker-compose, phase-02-configure-env]
created: 2026-05-15
---

## Context

- Part of: `plans/260515-2115-docker-postgres-setup/plan.md`
- Working directory: `/Users/tmduoc/working/coding/personal-projects/cowork-chat/backend`

## Overview

- **Priority**: P2
- **Status**: pending

Create README.md with Docker commands and local development setup instructions.

## Requirements

1. Create README.md if not exists (project has no README)
2. Document Docker Compose commands
3. Document database setup workflow
4. Include troubleshooting section

## Implementation Steps

### 1. Create README.md

```markdown
# CoWorkChat Backend

Node.js/Express/TypeScript project with PostgreSQL and Drizzle ORM.

## Prerequisites

- Node.js 20+
- pnpm
- Docker and Docker Compose

## Getting Started

### 1. Start PostgreSQL with Docker

\`\`\`bash
docker compose up -d
\`\`\`

Wait for PostgreSQL to be healthy (check with `docker compose ps`).

### 2. Install dependencies

\`\`\`bash
pnpm install
\`\`\`

### 3. Configure environment

Copy `.env.example` to `.env` (if not already done):

\`\`\`bash
cp .env.example .env
\`\`\`

The default DATABASE_URL in `.env.example` is configured for Docker PostgreSQL.

### 4. Run database migrations

\`\`\`bash
pnpm db:migrate
\`\`\`

### 5. Start development server

\`\`\`bash
pnpm dev
\`\`\`

## Docker Commands

| Command | Description |
|---------|-------------|
| `docker compose up -d` | Start PostgreSQL in background |
| `docker compose ps` | Check container status and health |
| `docker compose logs -f` | View PostgreSQL logs |
| `docker compose down` | Stop PostgreSQL (data persists) |
| `docker compose down -v` | Stop and delete volume (fresh start) |

## Database Management

### Generate migration files

\`\`\`bash
pnpm db:generate
\`\`\`

### Apply migrations

\`\`\`bash
pnpm db:migrate
\`\`\`

### Open Drizzle Studio

\`\`\`bash
pnpm db:studio
\`\`\`

## Troubleshooting

### PostgreSQL not starting

Check Docker is running:
```bash
docker info
```

View logs:
```bash
docker compose logs postgres
```

### Connection refused

Ensure PostgreSQL is healthy:
```bash
docker compose ps
```

Wait ~10 seconds for health check to pass on first start.

### Reset database (delete all data)

\`\`\`bash
docker compose down -v
docker compose up -d
pnpm db:migrate
\`\`\`
```

## Tech Stack

- Node.js + Express + TypeScript
- Drizzle ORM
- PostgreSQL 16 (Docker Alpine)
- pnpm