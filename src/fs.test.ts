import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { Readable } from "stream";
import { Explorer } from "./fs";
import path from "path";

const PATH = path.join(__dirname, "test");

async function setup() {
    await mkdir(PATH);
}

async function teardown() {
    await rm(PATH, { force: true, recursive: true });
}

const explorer = new Explorer(PATH);

describe(Explorer.name, () => {
    describe(Explorer.prototype.list.name, () => {
        describe("uninitialized", () => {
            it("returns nothing if path doesn't exist", async () => {
                const results = await explorer.list();

                expect(results).toEqual([]);
            });
        });

        describe("initialized", () => {
            beforeEach(async () => setup());
            afterEach(async () => teardown());

            it("returns nothing if there are no migrations at path", async () => {
                const results = await explorer.list();

                expect(results).toEqual([]);
            });

            it("returns a list of directories and their migration files if there are migrations at path", async () => {
                {
                    // Additional setup
                    const DIRECTORY = "foo";
                    const FILES = ["bar.sql", "baz.sql"];
                    const MIGRATION_PATH = path.join(PATH, DIRECTORY);

                    await mkdir(MIGRATION_PATH);
                    await Promise.all(
                        FILES.map((file) =>
                            writeFile(path.join(MIGRATION_PATH, file), "--"),
                        ),
                    );
                }

                const results = await explorer.list();

                expect(results).toEqual([
                    { directory: "foo", files: ["baz.sql", "bar.sql"] },
                ]);
            });
        });
    });

    describe(Explorer.prototype.find.name, () => {
        describe("uninitialized", () => {
            it("returns nothing if path doesn't exist", async () => {
                const results = await explorer.find(
                    (result) => result.directory === "foo",
                );

                expect(results).toEqual(null);
            });
        });

        describe("initialized", () => {
            beforeEach(async () => setup());
            afterEach(async () => teardown());

            it("returns nothing if there are no migrations at path", async () => {
                const results = await explorer.find(
                    (result) => result.directory === "foo",
                );

                expect(results).toEqual(null);
            });

            it("returns a list of directories and their migration files if there are migrations at path", async () => {
                {
                    // Additional setup
                    const DIRECTORY = "foo";
                    const FILES = ["bar.sql", "baz.sql"];
                    const MIGRATION_PATH = path.join(PATH, DIRECTORY);

                    await mkdir(MIGRATION_PATH);
                    await Promise.all(
                        FILES.map((file) =>
                            writeFile(path.join(MIGRATION_PATH, file), "--"),
                        ),
                    );
                }

                const results = await explorer.find(
                    (result) => result.directory === "foo",
                );

                expect(results).toEqual({
                    directory: "foo",
                    files: ["baz.sql", "bar.sql"],
                });
            });
        });
    });

    describe(Explorer.prototype.write.name, () => {
        beforeEach(async () => setup());
        afterEach(async () => teardown());

        it("creates a new migration under a new directory at path and N migration files", async () => {
            const DIRECTORY = "foo";
            const FILENAMES = ["foo.sql", "bar.sql"];
            const CONTENT = "-- TEST";

            await explorer.write(
                DIRECTORY,
                FILENAMES.map((filename) => ({
                    filename,
                    readable: Readable.from(CONTENT, { encoding: "utf8" }),
                })),
            );

            for (const filename of FILENAMES) {
                const result = await readFile(
                    path.join(PATH, DIRECTORY, filename),
                    {
                        encoding: "utf8",
                    },
                );

                expect(result).toEqual(CONTENT);
            }
        });
    });
});
