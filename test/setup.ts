import { GenericContainer, Wait } from "testcontainers";
import { orchestrator } from "./orchestrator";

export default async function setup() {
    process.stdout.write("\n");

    await orchestrator.add(
        "postgres",
        new GenericContainer("postgres:latest")
            .withNetworkMode("host")
            .withExposedPorts({ container: 5432, host: 5432 })
            .withEnvironment({
                POSTGRES_PASSWORD: "test",
                POSTGRES_USER: "test",
                POSTGRES_DB: "test",
                PGPASSWORD: "test",
            })
            .withName("postgres-test")
            .withWaitStrategy(
                Wait.forLogMessage(
                    "database system is ready to accept connections",
                    2,
                ),
            ),
    );
}
