import { orchestrator } from "./orchestrator";

export default async function teardown() {
    process.stdout.write("\n");

    await orchestrator.stop();
}
