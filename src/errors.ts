import { constants, pad } from "./utils";

enum MigrationErrorCode {
    NameAlreadyExists,
    UnrecognizedCommand,
}

abstract class MigrationError extends Error {
    protected abstract readonly code: MigrationErrorCode;

    constructor(message: string) {
        super(message);
    }
}

export class NameAlreadyExistsError extends MigrationError {
    protected readonly code = MigrationErrorCode.NameAlreadyExists;

    constructor(name: string) {
        super(`Migration with name ${name} already exists`);
    }
}

export class UnrecognizedCommandError extends MigrationError {
    protected readonly code = MigrationErrorCode.UnrecognizedCommand;

    constructor(command: string, commands: readonly string[]) {
        super(
            `Command ${command} is not recognized. Use one of [${commands.join(pad(constants.BAR))}] instead`,
        );
    }
}
