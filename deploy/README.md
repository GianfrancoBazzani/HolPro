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
