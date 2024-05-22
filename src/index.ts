#!/usr/bin/env node

import { Migrator, MigratorOptions } from "./migrator";
import { Logger } from "./interfaces";
import { UnrecognizedCommandError, isMigrationError } from "./errors";
import { getConfig } from "./config";

export { Migrator, MigratorOptions };

const COMMANDS = ["create", "up", "down"] as const;

async function main(logger: Logger) {
    const [command, name] = process.argv.slice(2);

    if (!COMMANDS.some((c) => c === command)) {
        throw new UnrecognizedCommandError(command, COMMANDS);
    }

    const config = getConfig();

    const migrator = new Migrator(config, logger);

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

if (require.main === module) {
    void main({
        info(message) {
            process.stdout.write(`\n[INFO]: ${message}`);
        },
        error(message) {
            process.stderr.write(`\n[ERROR]: ${message}`);
        },
    }).catch((error) => {
        if (isMigrationError(error)) {
            process.stderr.write(`\n[ERROR]: ${error.message}`);
            return;
        }

        throw error;
    });
}
