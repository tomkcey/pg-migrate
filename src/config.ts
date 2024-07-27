import path from "path";
import { MigratorOptions } from "./migrator";
import dotenv from "dotenv";

dotenv.config();

const DEFAULT_PATH = path.join(__dirname, "..", "migrations");
const DEFAULT_TABLE = "migrations";

export function getConfig(): MigratorOptions {
    return {
        path: process.env.MIGRATION_PATH ?? DEFAULT_PATH,
        table: process.env.MIGRATION_TABLE ?? DEFAULT_TABLE,
        database: {
            host: process.env.PGHOST ?? "localhost",
            port: Number(process.env.PGPORT) ?? 5432,
            user: process.env.PGUSER ?? "postgres",
            password: process.env.PGPASSWORD ?? "postgres",
            database: process.env.PGDATABASE ?? "postgres",
            ssl: Boolean(process.env.PGSSL) ?? false,
        },
    };
}
