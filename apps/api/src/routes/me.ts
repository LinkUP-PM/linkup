import type { FastifyInstance } from "fastify";
import type {
  CandidateProfileInput,
  EmployerProfileInput,
  Me,
  RecruiterProfileInput,
} from "@linkup/shared";
import {
  deleteCandidateLaudo,
  loadCandidateProfile,
  saveCandidateLaudo,
  saveCandidateProfile,
} from "../lib/candidate-profile.js";
import { loadEmployerProfile, saveEmployerProfile } from "../lib/employer-profile.js";
import { httpError, requireUser } from "../lib/http.js";
import { readPdfUpload } from "../lib/pdf-upload.js";
import { loadRecruiterProfile, saveRecruiterProfile } from "../lib/recruiter-profile.js";

function toMe(user: { id: string; email: string; role: Me["role"]; createdAt: Date }): Me {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

function readBodyAs<T>(body: unknown, message: string): T {
  if (!body || typeof body !== "object") {
    throw httpError(400, "INVALID_BODY", message);
  }
  return body as T;
}

export async function meRoutes(app: FastifyInstance) {
  app.get("/me", async (request) => {
    const user = await requireUser(request);
    return toMe(user);
  });

  app.get("/me/profile", async (request) => {
    const user = await requireUser(request);
    if (user.role !== "CANDIDATE") {
      throw httpError(403, "FORBIDDEN", "Esta ação não está disponível para o seu papel.");
    }
    return loadCandidateProfile(user.id);
  });

  app.put("/me/profile", async (request) => {
    const user = await requireUser(request);
    if (user.role !== "CANDIDATE") {
      throw httpError(403, "FORBIDDEN", "Esta ação não está disponível para o seu papel.");
    }
    return saveCandidateProfile(
      user.id,
      readBodyAs<CandidateProfileInput>(request.body, "Envie o JSON do cadastro do candidato."),
    );
  });

  app.post("/me/profile/laudo", async (request) => {
    const user = await requireUser(request);
    if (user.role !== "CANDIDATE") {
      throw httpError(403, "FORBIDDEN", "Esta ação não está disponível para o seu papel.");
    }
    const file = await request.file();
    const uploaded = await readPdfUpload(file);
    return saveCandidateLaudo(user.id, uploaded);
  });

  app.delete("/me/profile/laudo", async (request) => {
    const user = await requireUser(request);
    if (user.role !== "CANDIDATE") {
      throw httpError(403, "FORBIDDEN", "Esta ação não está disponível para o seu papel.");
    }
    return deleteCandidateLaudo(user.id);
  });

  app.get("/me/employer-profile", async (request) => {
    const user = await requireUser(request);
    if (user.role !== "EMPLOYER") {
      throw httpError(403, "FORBIDDEN", "Esta ação não está disponível para o seu papel.");
    }
    return loadEmployerProfile(user.id);
  });

  app.put("/me/employer-profile", async (request) => {
    const user = await requireUser(request);
    if (user.role !== "EMPLOYER") {
      throw httpError(403, "FORBIDDEN", "Esta ação não está disponível para o seu papel.");
    }
    return saveEmployerProfile(
      user.id,
      readBodyAs<EmployerProfileInput>(request.body, "Envie o JSON do perfil da empresa."),
    );
  });

  app.get("/me/recruiter-profile", async (request) => {
    const user = await requireUser(request);
    if (user.role !== "RECRUITER") {
      throw httpError(403, "FORBIDDEN", "Esta ação não está disponível para o seu papel.");
    }
    return loadRecruiterProfile(user.id);
  });

  app.put("/me/recruiter-profile", async (request) => {
    const user = await requireUser(request);
    if (user.role !== "RECRUITER") {
      throw httpError(403, "FORBIDDEN", "Esta ação não está disponível para o seu papel.");
    }
    return saveRecruiterProfile(
      user.id,
      readBodyAs<RecruiterProfileInput>(request.body, "Envie o JSON do perfil do recrutador."),
    );
  });
}
