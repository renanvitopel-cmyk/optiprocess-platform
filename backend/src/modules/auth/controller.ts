import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { comparePassword } from "../../lib/password";
import { AUTH_COOKIE_NAME, signAuthToken } from "../../lib/jwt";
import { env } from "../../config/env";
import { asyncHandler } from "../../utils/asyncHandler";
import { UnauthorizedError } from "../../utils/errors";
import { writeAuditLog } from "../../utils/audit";

const loginSchema = z.object({
  email: z.string().email("Informe um e-mail valido."),
  password: z.string().min(1, "Informe a senha."),
});

const cookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: "strict" as const,
  maxAge: 12 * 60 * 60 * 1000,
  path: "/",
};

function serializeUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  clientId: string | null;
  client: { id: string; companyName: string; tradeName: string | null } | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    clientId: user.clientId,
    client: user.client,
  };
}

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { client: { select: { id: true, companyName: true, tradeName: true } } },
  });

  if (!user || !user.active || user.deletedAt) {
    throw new UnauthorizedError("E-mail ou senha invalidos.");
  }

  const passwordOk = await comparePassword(password, user.passwordHash);
  if (!passwordOk) {
    throw new UnauthorizedError("E-mail ou senha invalidos.");
  }

  const token = signAuthToken({ sub: user.id, role: user.role, clientId: user.clientId });
  res.cookie(AUTH_COOKIE_NAME, token, cookieOptions);

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await writeAuditLog({ userId: user.id, action: "LOGIN", entityType: "User", entityId: user.id });

  res.json({ user: serializeUser(user), token });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie(AUTH_COOKIE_NAME, { path: "/" });
  res.status(204).send();
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();

  const user = await prisma.user.findUnique({
    where: { id: req.user.sub },
    include: { client: { select: { id: true, companyName: true, tradeName: true } } },
  });

  if (!user || !user.active || user.deletedAt) throw new UnauthorizedError();

  res.json({ user: serializeUser(user) });
});
