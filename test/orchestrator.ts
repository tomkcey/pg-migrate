import { GenericContainer, StartedTestContainer } from "testcontainers";

class Orchestrator {
    private containers: Record<string, StartedTestContainer> = {};

    public async add(name: string, image: GenericContainer) {
        process.stdout.write(`\nStarting container ${name}`);
        const container = await image.start();
        this.containers[name] = container;
    }

    public async stop() {
        for (const key in this.containers) {
            process.stdout.write(`\nStopping container ${key}`);
            await this.containers[key].stop();
        }
    }
}

export const orchestrator = new Orchestrator();
