import type {
  CandidateLanguage,
  HiringArea,
  JobContractType,
  JobSeniority,
  LanguageLevel,
  RecruiterCertificate,
  RecruiterProfile as RecruiterProfileDto,
  RecruiterProfileInput,
  RecruiterWorkMode,
} from "@linkup/shared";
import {
  isHiringArea,
  isJobContractType,
  isJobSeniority,
  isLanguageLevel,
  isRecruiterProfileComplete,
  isRecruiterWorkMode,
  MAX_RECRUITER_CERTIFICATES,
} from "@linkup/shared";
import type {
  RecruiterProfile,
  RecruiterWorkMode as PrismaRecruiterWorkMode,
} from "@prisma/client";
import { httpError } from "./http.js";
import { prisma } from "./prisma.js";

function trimOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
}

function parseHiringAreas(value: unknown): HiringArea[] {
  return parseStringList(value).filter(isHiringArea);
}

function parseSeniorities(value: unknown): JobSeniority[] {
  return parseStringList(value).filter(isJobSeniority);
}

function parseContractTypes(value: unknown): JobContractType[] {
  return parseStringList(value).filter(isJobContractType);
}

function parseLanguages(value: unknown): CandidateLanguage[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const row = item as { language?: unknown; level?: unknown; id?: unknown };
      const language = typeof row.language === "string" ? row.language.trim() : "";
      if (language.length < 2) return null;
      const level: LanguageLevel = isLanguageLevel(row.level) ? row.level : "BASIC";
      return {
        id: typeof row.id === "string" && row.id ? row.id : `lang-${index}`,
        language,
        level,
      };
    })
    .filter((item): item is CandidateLanguage => item != null);
}

function parseCertificates(value: unknown): RecruiterCertificate[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const row = item as { title?: unknown; id?: unknown };
      const title = typeof row.title === "string" ? row.title.trim() : "";
      if (title.length < 2) return null;
      return {
        id: typeof row.id === "string" && row.id ? row.id : `cert-${index}`,
        title,
      };
    })
    .filter((item): item is RecruiterCertificate => item != null)
    .slice(0, MAX_RECRUITER_CERTIFICATES);
}

function emptyProfile(): RecruiterProfileDto {
  return {
    fullName: "",
    headline: "",
    phone: "",
    linkedinUrl: null,
    state: "",
    city: "",
    bio: null,
    workMode: null,
    consultancyName: null,
    consultancyWebsite: null,
    yearsExperience: null,
    availability: null,
    focusAreas: [],
    seniorities: [],
    contractTypes: [],
    languages: [],
    certificates: [],
    isComplete: false,
    updatedAt: new Date().toISOString(),
  };
}

export function toRecruiterProfileDto(row: RecruiterProfile | null): RecruiterProfileDto {
  if (!row) return emptyProfile();

  const workMode: RecruiterWorkMode | null = isRecruiterWorkMode(row.workMode)
    ? row.workMode
    : null;

  const profile: RecruiterProfileDto = {
    fullName: row.fullName,
    headline: row.headline,
    phone: row.phone,
    linkedinUrl: row.linkedinUrl,
    state: row.state,
    city: row.city,
    bio: row.bio,
    workMode,
    consultancyName: row.consultancyName,
    consultancyWebsite: row.consultancyWebsite,
    yearsExperience: row.yearsExperience,
    availability: row.availability,
    focusAreas: parseHiringAreas(row.focusAreasJson),
    seniorities: parseSeniorities(row.senioritiesJson),
    contractTypes: parseContractTypes(row.contractTypesJson),
    languages: parseLanguages(row.languagesJson),
    certificates: parseCertificates(row.certificatesJson),
    isComplete: false,
    updatedAt: row.updatedAt.toISOString(),
  };
  profile.isComplete = isRecruiterProfileComplete(profile);
  return profile;
}

export async function loadRecruiterProfile(userId: string): Promise<RecruiterProfileDto> {
  const row = await prisma.recruiterProfile.findUnique({ where: { userId } });
  return toRecruiterProfileDto(row);
}

export async function saveRecruiterProfile(
  userId: string,
  input: RecruiterProfileInput,
): Promise<RecruiterProfileDto> {
  const fullName = input.fullName.trim();
  const headline = input.headline.trim();
  const phone = input.phone.replace(/\D/g, "").slice(0, 11);

  let workMode: PrismaRecruiterWorkMode | null = null;
  if (input.workMode != null) {
    if (!isRecruiterWorkMode(input.workMode)) {
      throw httpError(400, "INVALID_BODY", "Modo de atuação inválido.");
    }
    workMode = input.workMode;
  }

  let yearsExperience: number | null = null;
  if (input.yearsExperience != null) {
    const years = Number(input.yearsExperience);
    if (!Number.isInteger(years) || years < 0 || years > 60) {
      throw httpError(400, "INVALID_BODY", "Anos de experiência inválidos.");
    }
    yearsExperience = years;
  }

  const focusAreas = (input.focusAreas ?? []).filter(isHiringArea);
  const seniorities = (input.seniorities ?? []).filter(isJobSeniority);
  const contractTypes = (input.contractTypes ?? []).filter(isJobContractType);

  const languages = (input.languages ?? []).map((item, index) => {
    const language = item.language.trim();
    if (language.length < 2) {
      throw httpError(400, "INVALID_BODY", `Idioma ${index + 1}: informe o idioma.`);
    }
    if (!isLanguageLevel(item.level)) {
      throw httpError(400, "INVALID_BODY", `Idioma ${index + 1}: nível inválido.`);
    }
    return { id: `lang-${index}`, language, level: item.level };
  });

  const certificates = (input.certificates ?? [])
    .map((item, index) => ({
      id: `cert-${index}`,
      title: item.title.trim(),
    }))
    .filter((item) => item.title.length >= 2)
    .slice(0, MAX_RECRUITER_CERTIFICATES);

  const data = {
    fullName,
    headline,
    phone,
    linkedinUrl: trimOrNull(input.linkedinUrl),
    state: (input.state ?? "").trim().toUpperCase(),
    city: (input.city ?? "").trim(),
    bio: trimOrNull(input.bio),
    workMode,
    consultancyName: trimOrNull(input.consultancyName),
    consultancyWebsite: trimOrNull(input.consultancyWebsite),
    yearsExperience,
    availability: trimOrNull(input.availability),
    focusAreasJson: focusAreas,
    senioritiesJson: seniorities,
    contractTypesJson: contractTypes,
    languagesJson: languages,
    certificatesJson: certificates,
  };

  const row = await prisma.recruiterProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });

  return toRecruiterProfileDto(row);
}
