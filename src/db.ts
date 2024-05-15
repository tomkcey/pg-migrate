import { Client, QueryResultRow } from "pg";
import { SQLStatement } from "sql-template-strings";

enum ExecutorState {
    Connected,
    Disconnected,
}

export abstract class Executor<T> {
    protected state: ExecutorState = ExecutorState.Disconnected;

    constructor(protected client: Client) {}

    protected abstract map(row: QueryResultRow): T;

    public async execute(statement: SQLStatement): Promise<T[]> {
        if (this.state === ExecutorState.Disconnected) {
            await this.client.connect();
            this.state = ExecutorState.Connected;
        }

        const { rows } = await this.client.query(statement);
        return rows.map((row) => this.map(row));
    }

    public async transaction<U>(
        fn: (executor: Executor<T>) => Promise<U>,
    ): Promise<U> {
        return this.client
            .query("BEGIN")
            .then(() => fn(this))
            .then(async (result) => {
                await this.client.query("COMMIT");
                return result;
            })
            .catch(async (error) => {
                await this.client.query("ROLLBACK");
                throw error;
            });
    }

    public async disconnect(): Promise<void> {
        if (this.state === ExecutorState.Connected) {
            await this.client.end();
            this.state = ExecutorState.Disconnected;
        }
    }
}
