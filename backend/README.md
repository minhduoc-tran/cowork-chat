# CoWork Chat Backend

Node.js/Express/TypeScript backend with PostgreSQL database and Drizzle ORM.

## Prerequisites

- Node.js 20+
- pnpm
- Docker

## Docker Setup

### Start PostgreSQL

```bash
docker compose up -d
```

### Stop PostgreSQL

```bash
docker compose down
```

### View logs

```bash
docker compose logs -f postgres
```

### Remove data volume

```bash
docker compose down -v
```

## Database Migration

After starting the database, run migrations to sync the schema:

```bash
pnpm db:migrate
```

Or generate migrations from schema changes:

```bash
pnpm db:generate
```

To view and manage the database schema visually:

```bash
pnpm db:studio
```

## Development

### Start development server

```bash
pnpm dev
```

### Build for production

```bash
pnpm build
```

### Start production server

```bash
pnpm start
```

## Troubleshooting

### Database connection refused

Ensure PostgreSQL is running:

```bash
docker compose ps
```

If not running, start it:

```bash
docker compose up -d
```

### Migration errors

Reset the database by stopping, removing the volume, and restarting:

```bash
docker compose down -v
docker compose up -d
pnpm db:migrate
```

### Port already in use

If port 5432 is occupied, stop other PostgreSQL instances:

```bash
docker compose down
```

Or modify `docker-compose.yml` to use a different port.