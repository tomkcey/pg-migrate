import path from "path";
import { Migrator } from "./migrator";
import { Logger } from "./interfaces";
import { UnrecognizedCommandError } from "./errors";

const COMMANDS = ["create", "up", "down"] as const;

async function main(logger: Logger) {
    const [command, name] = process.argv.slice(2);

    if (!COMMANDS.some((c) => c === command)) {
        throw new UnrecognizedCommandError(command, COMMANDS);
    }

    const migrationPath = path.join(__dirname, "..", "migrations");

    logger.info(`Migration path: ${migrationPath}`);

    const migrator = new Migrator({
        path: migrationPath,
        table: "migrations",
        database: {
            host: "localhost",
            port: 5432,
            user: "localuser",
            password: "localpass",
            database: "localdb",
            ssl: false,
        },
    });

    switch (command) {
        case "create":
            await migrator.create(name);
            break;
        case "up":
            await migrator.up();
            break;
        case "down":
            await migrator.down();
            break;
    }
}

void main({
    info(message) {
        process.stdout.write(`\n[INFO]: ${message}`);
    },
    error(message) {
        process.stderr.write(`\n[ERROR]: ${message}`);
    },
}).catch((error) => {
    console.error(error.message);
});
