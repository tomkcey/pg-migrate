import { Client, QueryResultRow } from "pg";
import SQL from "sql-template-strings";

import { access, opendir, rm } from "fs/promises";
import path from "path";

import { Migrator, MigratorOptions } from "./migrator";
import { NameAlreadyExistsError } from "./errors";
import { constants, isNil, pad } from "./utils";
import { Migration } from "./interfaces";
import { Executor } from "./db";

const PATH = path.join(__dirname, "..", "migrations");
const TABLE = "migrations";
const OPTIONS: MigratorOptions = {
    path: PATH,
    table: TABLE,
    database: {
        host: "localhost",
        port: 5432,
        user: "test",
        password: "test",
        database: "test",
        ssl: false,
    },
};

const logger = {
    info: (x: string) => process.stdout.write(`\n[INFO] ${x}`),
    error: (x: string) => process.stderr.write(`\n[ERROR] ${x}`),
};

async function cleanup() {
    await rm(PATH, { recursive: true, force: true });
}

export class Inspector extends Executor<Migration> {
    constructor(protected options: MigratorOptions) {
        super(new Client(options.database));
    }

    protected map(row: QueryResultRow): Migration {
        return {
            name: row.name,
            createdAt: new Date(row.created_at),
        };
    }

    public async getMigrations(): Promise<Migration[]> {
        return this.execute(
            SQL`SELECT * FROM`
                .append(pad(this.options.table))
                .append(SQL`ORDER BY created_at DESC`),
        );
    }
}

describe(Migrator.name, () => {
    async function checkDirEntries(): Promise<string[]> {
        return access(PATH)
            .then(() =>
                opendir(PATH).then(async (dir) => {
                    const entries: string[] = [];
                    for await (const entry of dir) {
                        if (entry.isDirectory()) {
                            entries.push(entry.name);
                        }
                    }
                    return entries;
                }),
            )
            .catch(() => []);
    }

    describe(Migrator.prototype.create.name, () => {
        const migrator = new Migrator(OPTIONS, logger);

        afterEach(async () => cleanup());

        it("creates a migration", async () => {
            const before = await checkDirEntries();
            expect(before).toHaveLength(0);

            await migrator.create("test");

            const after = await checkDirEntries();
            expect(after).toHaveLength(1);
        });

        it("doesn't create a migration if one of the same name already exists", async () => {
            const before = await checkDirEntries();
            expect(before).toHaveLength(0);

            await migrator.create("test");

            const after = await checkDirEntries();
            expect(after).toHaveLength(1);

            await expect(async () => migrator.create("test")).rejects.toThrow(
                NameAlreadyExistsError,
            );
        });
    });

    describe(`${Migrator.prototype.up.name}/${Migrator.prototype.down.name}`, () => {
        const MIGRATIONS_NAMES = [["test"], ["test", "test-again"]] as const;

        afterEach(async () => cleanup());

        it.each(MIGRATIONS_NAMES)("runs migrations", async (...names) => {
            const db = new Inspector(OPTIONS);
            await db.connect();

            // CREATE
            {
                const migrator = new Migrator(OPTIONS, logger);
                for (const name of names) {
                    if (isNil(name)) {
                        fail("Cannot happen");
                    }

                    await migrator.create(name);
                }
            }

            // UP
            {
                const migrator = new Migrator(OPTIONS, logger);
                await migrator.up();

                const entries = await checkDirEntries();
                for (const name of names) {
                    if (isNil(name)) {
                        fail("Cannot happen");
                    }

                    expect(
                        entries.some((entry) =>
                            entry.includes(
                                name.replace(
                                    constants.SEP,
                                    constants.UNDERSCORE,
                                ),
                            ),
                        ),
                    ).toBe(true);
                }

                const remoteMigratons = await db.getMigrations();
                expect(remoteMigratons.length).toBe(names.length);
            }

            // DOWN
            {
                const migrator = new Migrator(OPTIONS, logger);
                await migrator.down();

                const entries = await checkDirEntries();
                for (const name of names) {
                    if (isNil(name)) {
                        fail("Cannot happen");
                    }

                    expect(
                        entries.some((entry) =>
                            entry.includes(
                                name.replace(
                                    constants.SEP,
                                    constants.UNDERSCORE,
                                ),
                            ),
                        ),
                    ).toBe(true);
                }

                const remoteMigratons = await db.getMigrations();
                expect(remoteMigratons.length).toBe(0);
            }

            await db.disconnect();
        });
    });
});
