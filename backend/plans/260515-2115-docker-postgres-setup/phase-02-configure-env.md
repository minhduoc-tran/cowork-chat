---
title: "Phase 2 - Configure DATABASE_URL for Docker"
description: "Update .env with DATABASE_URL for Docker PostgreSQL connection"
status: pending
dependencies: [phase-01-create-docker-compose]
created: 2026-05-15
---

## Context

- Part of: `plans/260515-2115-docker-postgres-setup/plan.md`
- Working directory: `/Users/tmduoc/working/coding/personal-projects/cowork-chat/backend`

## Overview

- **Priority**: P2
- **Status**: pending

Update `.env.example` and optionally `.env` with correct DATABASE_URL for Docker PostgreSQL connection.

## Requirements

1. DATABASE_URL format: `postgresql://user:password@localhost:5432/dbname`
2. Update `.env.example` with correct format
3. Update `.env` if it exists

## Implementation Steps

### 1. Update .env.example

Change from:
```
DATABASE_URL='database_url'
```

To:
```
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/coworkchat'
```

### 2. Update .env (if not gitignored)

```bash
# Same change as .env.example
```

## Success Criteria

- Existing `db:generate` and `db:migrate` scripts work with new DATABASE_URL
- `pnpm dev` can connect to Docker PostgreSQL after container is running

## Docker Commands Reference

| Command | Purpose |
|---------|---------|
| `docker compose up -d` | Start PostgreSQL container |
| `docker compose ps` | Check container health |
| `docker compose down` | Stop container (keeps volume) |
| `docker compose down -v` | Stop and remove volume |
| `docker compose logs -f` | View logs |

## Notes

- Drizzle config (`drizzle.config.ts`) reads DATABASE_URL from environment
- No changes to `drizzle.config.ts` needed as it already uses `dotenv-flow`