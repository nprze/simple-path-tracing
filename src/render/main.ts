import physim from "./physim.ts";

async function runApp() {
  await physim.create();
  physim.get().run();
}


runApp();