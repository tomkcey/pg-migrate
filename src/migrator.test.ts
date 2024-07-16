import path from "path";
import { Migrator, MigratorOptions } from "./migrator";
import { access, opendir, rm } from "fs/promises";
import { NameAlreadyExistsError } from "./errors";

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

describe(Migrator.name, () => {
    const migrator = new Migrator(OPTIONS, logger);

    describe(Migrator.prototype.create.name, () => {
        afterEach(async () => cleanup());

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
});
