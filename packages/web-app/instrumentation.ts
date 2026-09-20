export async function register() {
  // Next.js also compiles this entry for Edge. Keep Node APIs in a separate
  // module so the Edge bundle never includes process signal handlers.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerNode } = await import("./instrumentation-node");
    await registerNode();
  }
}
