import type { FastifyInstance } from "fastify";
import type { Me } from "@linkup/shared";
import { requireUser } from "../lib/http.js";

function toMe(user: { id: string; email: string; role: Me["role"]; createdAt: Date }): Me {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function meRoutes(app: FastifyInstance) {
  app.get("/me", async (request) => {
    const user = await requireUser(request);
    return toMe(user);
  });
}
