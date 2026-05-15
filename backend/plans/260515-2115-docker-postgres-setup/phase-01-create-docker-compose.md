---
title: "Phase 1 - Create docker-compose.yml"
description: "Create docker-compose.yml with PostgreSQL 16 Alpine"
status: pending
dependencies: []
created: 2026-05-15
---

## Context

- Part of: `plans/260515-2115-docker-postgres-setup/plan.md`
- Working directory: `/Users/tmduoc/working/coding/personal-projects/cowork-chat/backend`

## Overview

- **Priority**: P2
- **Status**: pending

Create `docker-compose.yml` with PostgreSQL 16 Alpine, named volume for persistence, and health check.

## Requirements

1. PostgreSQL 16 Alpine image
2. Named volume `postgres_data` for data persistence
3. Health check using `pg_isready` command
4. Default port 5432
5. Database: `coworkchat` (or configurable via environment)
6. User/password via environment variables with defaults for dev

## docker-compose.yml

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    container_name: coworkchat-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: coworkchat
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres -d coworkchat']
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s
    restart: unless-stopped

volumes:
  postgres_data:
    name: coworkchat-postgres-data
```

## Implementation Steps

1. Create `docker-compose.yml` in project root

## Success Criteria

- `docker compose up -d` starts the container
- `docker compose ps` shows postgres as healthy
- `docker compose down -v` removes volume (for clean reset testing)
- Health check passes within 30 seconds

## Security Considerations

- Credentials are for local dev only (postgres/postgres)
- Volume named to prevent accidental deletion with `docker compose down`
- No production use intended