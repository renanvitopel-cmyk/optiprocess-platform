/**
 * Cria (ou promove) um administrador de emergencia, imprimindo uma senha aleatoria
 * UMA UNICA VEZ no log do deploy. Existe porque o plano free do Render nao da Shell
 * e a rede local perdeu acesso direto ao Postgres - sem isso nao ha como recuperar
 * um acesso administrativo. Roda so quando BOOTSTRAP_ADMIN_EMAIL esta definido e
 * deve ser removido do start assim que o acesso for restabelecido.
 *
 * A senha NUNCA vem do codigo: e' sorteada aqui e trocada pelo proprio admin depois.
 */
import { randomInt } from "crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function randomPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 16; i++) out += alphabet[randomInt(alphabet.length)];
  return out;
}

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase();
  if (!email) {
    console.log("[bootstrapAdmin] BOOTSTRAP_ADMIN_EMAIL nao definido - nada a fazer.");
    return;
  }

  const password = randomPassword();
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    create: { name: process.env.BOOTSTRAP_ADMIN_NAME ?? "Administrador", email, passwordHash, role: "ADMIN" },
    update: { passwordHash, role: "ADMIN", active: true },
  });

  console.log("=".repeat(70));
  console.log(`[bootstrapAdmin] ADMIN pronto: ${user.email}`);
  console.log(`[bootstrapAdmin] SENHA (troque agora, aparece so aqui): ${password}`);
  console.log("=".repeat(70));
}

main()
  .catch((e) => {
    console.error("[bootstrapAdmin] falhou:", e);
  })
  .finally(() => prisma.$disconnect());
