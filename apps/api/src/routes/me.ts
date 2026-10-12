import type { FastifyInstance } from "fastify";
import type { Me } from "@linkup/shared";
import { httpError, isRole, requireUser } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";

function toMe(user: { id: string; role: Me["role"]; createdAt: Date }): Me {
  return {
    id: user.id,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function meRoutes(app: FastifyInstance) {
  app.get("/me", async (request) => {
    const user = await requireUser(request);
    return toMe(user);
  });

  app.put("/me/role", async (request) => {
    const user = await requireUser(request);
    const body = request.body as { role?: unknown } | null;
    if (!body || !isRole(body.role)) {
      throw httpError(
        400,
        "INVALID_BODY",
        "Envie { \"role\": \"CANDIDATE\" | \"RECRUITER\" | \"EMPLOYER\" }.",
      );
    }

    if (user.role) {
      throw httpError(409, "ROLE_ALREADY_SET", "Este dispositivo já escolheu um papel.");
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role: body.role },
    });

    return toMe(updated);
  });

  app.delete("/me/role", async (request) => {
    const user = await requireUser(request);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role: null },
    });
    return toMe(updated);
  });
}
