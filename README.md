![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/tomkcey/pg-migrate/ci.yml?branch=master)

# How to use

### Creating a migration file

For creating migration files you can use the CLI.

`npx @tomkcey/pg-migrate create <migration_filename>`

While database access is not required at this step, kkowing where to store those migrations is. In any case, here's all the environment variables you will need to use this program through the CLI.

```.env
PGUSER=<username>
PGPASSWORD=<password>
PGHOST=localhost
PGPORT=5432
PGDATABASE=<database>
PGSSL=<true/false>
MIGRATION_PATH=<absolute-path-to-migrations-dir>
MIGRATION_TABLE=<tablename>
```

Only `MIGRATION_PATH` is required if only using migration file creation through the CLI.

### Running migrations up

```ts
import { Migrator, MigratorOptions } from "@tomkcey/pg-migrate";

const options: MigratorOptions = { ... }

const migrator = new Migrator(options, someLogger);

await migrator.up();
```

or `npx @tomkcey/pg-migrate up`

### Running migrations down

```ts
import { Migrator, MigratorOptions } from "@tomkcey/pg-migrate";

const options: MigratorOptions = { ... }

const migrator = new Migrator(options, someLogger);

await migrator.down();
```

or `npx @tomkcey/pg-migrate down`

---

## Roadmap

-   Create custom errors
-   Add tests to `up` and `down` in Migrator
