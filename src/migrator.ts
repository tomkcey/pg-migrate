import { Explorer } from "./fs";
import { Executor } from "./db";
import { Client, QueryResultRow } from "pg";
import { createReadStream } from "fs";
import { Readable } from "stream";
import SQL from "sql-template-strings";
import path from "path";
import { NameAlreadyExistsError } from "./errors";
import { constants, decode, encode, formatName, isNotNil, pad } from "./utils";
import { Logger, Migration } from "./interfaces";

export interface MigratorOptions {
    path: string;
    table: string;
    database: {
        host: string;
        port: number;
        user: string;
        password: string;
        database: string;
        ssl: boolean;
    };
}

export class Migrator extends Executor<Migration> {
    constructor(
        protected options: MigratorOptions,
        private logger: Logger,
    ) {
        super(new Client(options.database));
    }

    protected map(row: QueryResultRow): Migration {
        return {
            name: row.name,
            createdAt: new Date(row.created_at),
        };
    }

    protected parseChunkedStatement(chunks: string[]): string[] {
        return chunks.join(constants.EMPTY).split(constants.COLON);
    }

    public async create(name: string): Promise<void> {
        const explorer = new Explorer(this.options.path);

        await explorer
            .find((entry) => decode(entry.directory).name === formatName(name))
            .then((result) => {
                if (isNotNil(result)) {
                    throw new NameAlreadyExistsError(name);
                }
            });

        const migration: Migration = {
            name,
            createdAt: new Date(),
        };

        const encodedMigration = encode(migration);

        await explorer.write(encodedMigration, [
            {
                filename: encode({ ...migration, direction: constants.UP }),
                readable: Readable.from(
                    `-- Migration up script for ${migration.name}.`,
                ),
            },
            {
                filename: encode({ ...migration, direction: constants.DOWN }),
                readable: Readable.from(
                    `-- Migration down script for ${migration.name}.`,
                ),
            },
        ]);

        this.logger.info(`Migration ${encodedMigration} created.`);
    }

    public async up(): Promise<void> {
        const explorer = new Explorer(this.options.path);

        // Get list of migrations on local system
        const local = await explorer.list();
        if (local.length < 1) {
            return;
        }

        await this.connect();

        // Get list of migrations on remote system
        const remote = await this.execute(
            SQL`SELECT * FROM`.append(pad(this.options.table)),
        ).catch(() => []);

        // Determine which local migrations aren't yet registered on the remote system
        // They are the migrations we want to run
        const runnables = local.filter(
            ({ directory }) =>
                !remote.some(
                    ({ name }) => name === directory.split(constants.SEP).pop(),
                ),
        );

        // If there are no migrations to run, end the function
        // Otherwise, create the table if it doesn't exist
        if (runnables.length > 0) {
            await this.execute(
                SQL`CREATE TABLE IF NOT EXISTS`
                    .append(pad(this.options.table))
                    .append(
                        SQL`(
							name TEXT NOT NULL,
							created_at TIMESTAMPTZ NOT NULL
						)`,
                    ),
            );
        } else {
            await this.disconnect();
            return;
        }

        await this.transaction(async (executor) => {
            // For each migration to run
            for (const { directory, files } of runnables) {
                // Read the contents of its up script
                const file = files.find((filename) =>
                    filename.includes(constants.UP),
                );
                if (!file) {
                    throw new Error("Something went wrong.");
                }

                const readable = createReadStream(
                    path.join(this.options.path, directory, file),
                    { encoding: "utf8" },
                );

                // Put it into a buffer
                const chunks: string[] = [];
                for await (const chunk of readable) {
                    chunks.push(chunk);
                }

                // Decode the migration to insert from the file name
                const migration = decode(file);

                // Execute the up script
                const stmnts = this.parseChunkedStatement(chunks);
                for (const statement of stmnts) {
                    const stmnt = SQL``.append(statement);
                    await executor.execute(stmnt);
                }

                this.logger.info(
                    `Applied ${migration.name}\n${SQL``.append(chunks.join(constants.EMPTY)).text}`,
                );

                // Insert a new row in the migrations table
                await executor.execute(
                    SQL`INSERT INTO`
                        .append(pad(this.options.table))
                        .append(
                            SQL`(name, created_at) VALUES (${migration.name}, ${migration.createdAt})`,
                        ),
                );

                this.logger.info(`Migration ${directory} ran.`);
            }
        }).catch((error) =>
            this.logger.error(
                `Something went wrong, canceling migrations.\n${JSON.stringify(error, null, 2)}`,
            ),
        );

        this.logger.info("Migration up complete.");

        await this.disconnect();
    }

    public async down() {
        const explorer = new Explorer(this.options.path);

        await this.connect();

        // Get list of migrations on remote system from most recent to oldest
        const remote = await this.execute(
            SQL`SELECT * FROM`
                .append(pad(this.options.table))
                .append(SQL`ORDER BY created_at DESC`),
        );

        await this.transaction(async (executor) => {
            for (const migration of remote) {
                // Read the contents of its down script
                const downMigration = await explorer.find((entry) =>
                    entry.files.some((filename) =>
                        filename.includes(constants.DOWN),
                    ),
                );

                if (!downMigration) {
                    await this.disconnect();
                    throw new Error("Something went wrong.");
                }

                const file = downMigration.files.find((filename) =>
                    filename.includes(constants.DOWN),
                );
                if (!file) {
                    await this.disconnect();
                    throw new Error("Something went wrong.");
                }

                const readable = createReadStream(
                    path.join(this.options.path, downMigration.directory, file),
                    { encoding: "utf8" },
                );

                // Put it into a buffer
                const chunks: string[] = [];
                for await (const chunk of readable) {
                    chunks.push(chunk);
                }

                // Execute the down script

                // Execute the up script
                const stmnts = this.parseChunkedStatement(chunks);
                for (const statement of stmnts) {
                    const stmnt = SQL``.append(statement);
                    await executor.execute(stmnt);
                }

                this.logger.info(
                    `Applied ${migration.name}\n${SQL``.append(chunks.join(constants.EMPTY)).text}`,
                );

                // Delete the row from the migrations table
                await executor.execute(
                    SQL`DELETE FROM`
                        .append(pad(this.options.table))
                        .append(SQL`WHERE name = ${migration.name}`),
                );

                this.logger.info(`Migration ${encode(migration)} reverted.`);
            }
        }).catch((error) =>
            this.logger.error(
                `Something went wrong, canceling migrations.\n${JSON.stringify(error, null, 2)}`,
            ),
        );

        this.logger.info("Migration down complete.");

        await this.disconnect();
    }
}
