# Deployment

This directory holds the container files for the HolPro web application and its
database.

| File                 | Purpose                                            |
| -------------------- | -------------------------------------------------- |
| `Dockerfile`         | Two-stage image for `packages/web-app`.             |
| `docker-compose.yml` | The web application and a MySQL 8.4 database.       |
| `.env.example`       | The template for the secrets of both containers.    |

The database keeps its state in the named volume `database-data`. The state
survives a restart and a `docker compose down`.

## 1. Create the environment file

Copy the template and set a value for each empty variable.

```sh
cp deploy/.env.example deploy/.env
```

Notes on the variables:

- `PORT` is the port of the web application. Compose publishes it on the host.
- `DATABASE_URL` must use the host name `database` and the port `3306`. This is
  the address of the database container inside the Compose network.
- `MYSQL_USER`, `MYSQL_PASSWORD` and `MYSQL_DATABASE` must agree with
  `DATABASE_URL`.
- `MYSQL_PORT` is the loopback port for the migration. It is not public.
- Generate `BETTER_AUTH_SECRET` with `openssl rand -hex 32`.

CAUTION: MySQL reads `MYSQL_USER`, `MYSQL_PASSWORD` and `MYSQL_DATABASE` only on
the first start of an empty volume. To change them later, you must delete the
volume.

## 2. Start the containers

```sh
docker compose -f deploy/docker-compose.yml --project-directory deploy up -d --build
```

Compose starts the web application only after the database reports a good
health check.

## 3. Initialize the database

The new database has no tables. Run the migration one time from the host, after
step 2. Use the same user and password that you set in `deploy/.env`.

```sh
DATABASE_URL="mysql://holpro:<MYSQL_PASSWORD>@127.0.0.1:<MYSQL_PORT>/holpro" \
  pnpm --filter @holpro/db db:migrate
```

Confirm the result:

```sh
docker compose -f deploy/docker-compose.yml --project-directory deploy \
  exec database mysql -u holpro -p holpro -e "SHOW TABLES;"
```

Repeat this step each time that you add a migration.

## 4. Open the application

Go to `http://localhost:<PORT>`.

## Other commands

Read the logs:

```sh
docker compose -f deploy/docker-compose.yml --project-directory deploy logs -f
```

Stop the containers and keep the data:

```sh
docker compose -f deploy/docker-compose.yml --project-directory deploy down
```

WARNING: The next command deletes the database content permanently.

```sh
docker compose -f deploy/docker-compose.yml --project-directory deploy down -v
```

## Assistant streaming

Configure the assistant variables in `.env.example`, apply migration `0004`
using the migration workflow above, and run one web-app container. Mastra
creates its storage tables in the existing MySQL database; allow schema
creation for the application user. The in-memory mock jobs and progress
registry do not support multiple replicas or recovery after a process restart.

For a reverse proxy, adapt `nginx.example.conf` inside your TLS server block.
It disables response buffering, allows long SSE connections and accepts the
10 MB voice upload plus multipart overhead. HTTPS is required for browser
microphone access outside localhost. See the web-app README for variables and
the live release checklist.

## Private MCP and plan documents

Set `MCP_TOKEN_SECRET` from `openssl rand -base64 32` in `deploy/.env`; the runtime
requires this dedicated signing key. The Docker build key is a placeholder only
and is absent from the runtime stage. Apply migration `0005` after `0004` using
the migration workflow above. Keep one web-app process for publication SSE.
`BETTER_AUTH_URL` must resolve to this application from inside its container.
The dedicated `/api/mcp` nginx location permits 16 MB request bodies; voice
upload limits remain enforced by their own routes. See the web-app README for
plan isolation details and the live release checklist.
