![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/tomkcey/pg-migrate/ci.yml?branch=master)

# How to use

### Creating a migration file

`npx @tomkcey/pg-migrate create <migration_filename>`

### Running migrations up

```ts
import { Migrator, MigratorOptions } from "@tomkcey/pg-migrate";

const options: MigratorOptions = { ... }

const migrator = new Migrator(options, someLogger);

await migrator.up();
```

### Running migrations down

```ts
import { Migrator, MigratorOptions } from "@tomkcey/pg-migrate";

const options: MigratorOptions = { ... }

const migrator = new Migrator(options, someLogger);

await migrator.down();
```

---

## Roadmap

-   Create custom errors
-   Add tests to `up` and `down` in Migrator
