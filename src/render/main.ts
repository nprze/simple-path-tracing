import tracer from "./tracer.ts";

async function runApp() {
  await tracer.create();
  tracer.get().run();
}

runApp();