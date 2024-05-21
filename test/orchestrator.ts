import { GenericContainer, StartedTestContainer } from "testcontainers";

class Orchestrator {
    private containers: Map<string, StartedTestContainer> = new Map();

    public async add(name: string, image: GenericContainer) {
        process.stdout.write(`\nStarting container ${name}`);
        const container = await image.start();
        this.containers.set(name, container);
    }

    public async stop() {
        for (const [name, container] of this.containers.entries()) {
            process.stdout.write(`\nStopping container ${name}`);
            await container.stop();
        }
    }
}

export const orchestrator = new Orchestrator();
