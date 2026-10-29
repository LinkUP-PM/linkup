import type { FastifyInstance } from "fastify";
import type { AuthResponse, Me, Role } from "@linkup/shared";
import { extractBearerToken, httpError, isRole } from "../lib/http.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { prisma } from "../lib/prisma.js";
import { createSession, revokeSession } from "../lib/session.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 72;

function toMe(user: { id: string; email: string; role: Role; createdAt: Date }): Me {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) return null;
  return email;
}

function readPassword(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.length < MIN_PASSWORD || value.length > MAX_PASSWORD) return null;
  return value;
}

function readAuthBody(body: unknown): { email: string; password: string; role: Role } {
  const raw = body as { email?: unknown; password?: unknown; role?: unknown } | null;
  const email = normalizeEmail(raw?.email);
  const password = readPassword(raw?.password);
  const role = raw?.role;

  if (!email || !password || !isRole(role)) {
    throw httpError(
      400,
      "INVALID_BODY",
      `Envie { "email": "...", "password": "..." (8–${MAX_PASSWORD} chars), "role": "CANDIDATE" | "RECRUITER" | "EMPLOYER" }.`,
    );
  }

  return { email, password, role };
}

async function authResponse(user: {
  id: string;
  email: string;
  role: Role;
  createdAt: Date;
}): Promise<AuthResponse> {
  const token = await createSession(user.id);
  return { token, user: toMe(user) };
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (request, reply) => {
    const { email, password, role } = readAuthBody(request.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw httpError(409, "EMAIL_TAKEN", "Já existe uma conta com este e-mail.");
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash, role },
    });

    const body = await authResponse(user);
    return reply.code(201).send(body);
  });

  app.post("/auth/login", async (request) => {
    const { email, password, role } = readAuthBody(request.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw httpError(401, "INVALID_CREDENTIALS", "E-mail ou senha incorretos.");
    }

    if (user.role !== role) {
      throw httpError(
        403,
        "ROLE_MISMATCH",
        "Esta conta não entra por esta porta. Use a tela do papel certo.",
      );
    }

    return authResponse(user);
  });

  app.delete("/auth/session", async (request, reply) => {
    const token = extractBearerToken(request);
    if (!token) {
      throw httpError(401, "UNAUTHORIZED", "Informe o header Authorization: Bearer <token>.");
    }
    await revokeSession(token);
    return reply.code(204).send();
  });
}
