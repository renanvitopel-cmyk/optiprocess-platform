import { createApp } from "./app";
import { env } from "./config/env";
import { bootstrapInitialAdmin } from "./lib/bootstrap";
import { iniciarGeracaoAutomatica } from "./lib/planRunner";

async function main() {
  await bootstrapInitialAdmin();

  // Planos preventivos passam a gerar a OS sozinhos ao chegar a antecedencia configurada -
  // ate aqui isso dependia de alguem lembrar de clicar, o que na pratica so acontece
  // depois de vencer. A rodada e' idempotente (uma OS por ciclo).
  iniciarGeracaoAutomatica(60);

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`OptiProcess API rodando na porta ${env.port} (${env.nodeEnv})`);
  });
}

main().catch((error) => {
  console.error("Falha ao iniciar o servidor:", error);
  process.exit(1);
});
