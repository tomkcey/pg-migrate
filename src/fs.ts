import { createWriteStream } from "fs";
import { access, mkdir, opendir } from "fs/promises";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import path from "path";
import { isNil } from "./utils";

interface TraversalResult {
    directory: string;
    files: string[];
}

async function* traverse(dirPath: string): AsyncGenerator<TraversalResult> {
    const directories = await opendir(dirPath);

    for await (const directory of directories) {
        const migrations: string[] = [];

        if (directory.isDirectory()) {
            const files = await opendir(path.join(dirPath, directory.name));

            for await (const file of files) {
                if (file.isFile()) {
                    migrations.push(file.name);
                }
            }
        }

        yield { directory: directory.name, files: migrations };
    }
}

interface WriteData {
    filename: string;
    readable: Readable;
}

async function write(dirPath: string, files: WriteData[]): Promise<void> {
    await mkdir(dirPath, { recursive: true });

    for (const { filename, readable } of files) {
        await pipeline(
            readable,
            createWriteStream(path.join(dirPath, filename)),
        );
    }
}

export class Explorer {
    constructor(protected path: string) {}

    public async list(): Promise<TraversalResult[]> {
        return access(this.path)
            .then(async () => {
                const iterable = traverse(this.path);

                const results: TraversalResult[] = [];

                for await (const result of iterable) {
                    results.push(result);
                }

                return results;
            })
            .catch((_) => {
                // If entry at path doesn't exist, immediately return an empty list
                return [];
            });
    }

    public async find(
        fn: (result: TraversalResult) => boolean,
    ): Promise<TraversalResult | null> {
        return access(this.path)
            .then(async () => {
                const iterable = traverse(this.path);

                let result: TraversalResult | null = null;
                let canContinue = true;

                do {
                    const { value, done } = await iterable.next();

                    if (fn(value)) {
                        result = value;
                    }

                    if (done) {
                        canContinue = false;
                    }
                } while (isNil(result) && canContinue);

                return result;
            })
            .catch((_) => {
                // If entry at path doesn't exist, immediately return an empty list
                return null;
            });
    }

    public async write(directory: string, data: WriteData[]): Promise<void> {
        return write(path.join(this.path, directory), data);
    }
}
