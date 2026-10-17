/**
 * Next.js instrumentation hook — runs once when the server process boots.
 * The Node-only scheduler logic lives in ./instrumentation-node and is imported
 * only inside the nodejs-runtime branch so it is stripped from the edge bundle.
 * Runs on the long-lived Liara Node server (`next start`), never on edge.
 */
export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        const { start } = await import("./instrumentation-node");
        await start();
    }
}
