import { prisma } from "./prisma";
import { hashPassword } from "./password";
import { env } from "../config/env";

/** Cria o usuario administrador inicial a partir das variaveis de ambiente, se ainda nao existir. */
export async function bootstrapInitialAdmin(): Promise<void> {
  if (!env.initialAdmin.password) {
    console.warn("INITIAL_ADMIN_PASSWORD nao definida - pulando criacao do admin inicial.");
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email: env.initialAdmin.email.toLowerCase() } });
  if (existing) return;

  const passwordHash = await hashPassword(env.initialAdmin.password);
  await prisma.user.create({
    data: {
      name: env.initialAdmin.name,
      email: env.initialAdmin.email.toLowerCase(),
      passwordHash,
      role: "ADMIN",
      active: true,
    },
  });
  console.log(`Administrador inicial criado: ${env.initialAdmin.email}`);
}
