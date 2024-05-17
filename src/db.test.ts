import SQL from "sql-template-strings";
import { Executor } from "./db";
import { Client, QueryResultRow } from "pg";

interface MockRow {
    count: number;
}

class MockExecutor extends Executor<MockRow> {
    constructor(client: Client) {
        super(client);
    }

    protected map(row: QueryResultRow): MockRow {
        return { count: Number(row.count) };
    }
}

function factory() {
    return new Client({
        host: "localhost",
        port: 5432,
        user: "test",
        password: "test",
        database: "test",
        ssl: false,
    });
}

describe(Executor.name, () => {
    describe(`${Executor.prototype.connect.name}/${Executor.prototype.disconnect.name}`, () => {
        afterEach(() => jest.resetAllMocks());
        afterAll(() => jest.restoreAllMocks());

        it("should connect and disconnect", async () => {
            const client = factory();

            const connectSpy = jest.spyOn(client, "connect");
            const disconnectSpy = jest.spyOn(client, "end");

            const executor = new MockExecutor(client);

            await executor.connect();
            await executor.disconnect();

            expect(connectSpy).toHaveBeenCalledTimes(1);
            expect(disconnectSpy).toHaveBeenCalledTimes(1);
        });

        it("should not connect if already connected", async () => {
            const client = factory();

            const connectSpy = jest.spyOn(client, "connect");

            const executor = new MockExecutor(client);

            await executor.connect();
            await executor.connect();
            await executor.disconnect();

            expect(connectSpy).toHaveBeenCalledTimes(1);
        });

        it("should not disconnect if already disconnected", async () => {
            const client = factory();

            const disconnectSpy = jest.spyOn(client, "end");

            const executor = new MockExecutor(client);

            await executor.connect();
            await executor.disconnect();
            await executor.disconnect();

            expect(disconnectSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe(`${Executor.prototype.execute.name}`, () => {
        const executor = new MockExecutor(factory());

        beforeAll(async () => executor.connect());
        afterAll(async () => executor.disconnect());

        it("returns the row mapped to defined type", async () => {
            const [result] = await executor.execute(SQL`SELECT 1 AS count`);

            expect(result).toEqual({ count: 1 });
        });
    });

    describe(`${Executor.prototype.transaction.name}`, () => {
        const executor = new MockExecutor(factory());

        beforeAll(async () => executor.connect());
        afterAll(async () => executor.disconnect());

        it("returns the value returned by the callback passed fto the transaction method", async () => {
            const result = await executor.transaction(async (exzqtor) => {
                await exzqtor.execute(
                    SQL`CREATE TABLE test (id SERIAL PRIMARY KEY)`,
                );
                await exzqtor.execute(SQL`INSERT INTO test DEFAULT VALUES`);
                const [row] = await exzqtor.execute(
                    SQL`SELECT COUNT(*) AS count FROM test`,
                );

                return row;
            });

            expect(result).toEqual({ count: 1 });
        });
    });
});
