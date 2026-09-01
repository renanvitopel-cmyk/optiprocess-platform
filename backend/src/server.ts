import { createApp } from "./app";
import { env } from "./config/env";
import { bootstrapInitialAdmin } from "./lib/bootstrap";

async function main() {
  await bootstrapInitialAdmin();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`OptiProcess API rodando na porta ${env.port} (${env.nodeEnv})`);
  });
}

main().catch((error) => {
  console.error("Falha ao iniciar o servidor:", error);
  process.exit(1);
});
