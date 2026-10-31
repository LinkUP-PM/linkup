import type { Role } from "@linkup/shared";

const ROLES = new Set<Role>(["CANDIDATE", "RECRUITER", "EMPLOYER"]);

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && ROLES.has(value as Role);
}

export function homeHrefForRole(role: Role): string {
  if (role === "EMPLOYER") return "/(employer)";
  if (role === "RECRUITER") return "/(recruiter)";
  return "/(candidate)";
}

/** Root stack route name for the role group (no leading slash). */
export function homeGroupForRole(role: Role): "(candidate)" | "(employer)" | "(recruiter)" {
  if (role === "EMPLOYER") return "(employer)";
  if (role === "RECRUITER") return "(recruiter)";
  return "(candidate)";
}

export function loginHrefForRole(role: Role): string {
  if (role === "EMPLOYER") return "/login/contratante";
  if (role === "RECRUITER") return "/login/recrutador";
  return "/login/candidato";
}
