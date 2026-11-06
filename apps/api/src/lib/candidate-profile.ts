import type {
  CandidateProfile as CandidateProfileDto,
  CandidateProfileInput,
  CandidateProfileSummary,
  DisabilityStatus,
  EducationLevel,
  LanguageLevel,
  WorkModel,
} from "@linkup/shared";
import {
  isCandidateProfileComplete,
  isDisabilityStatus,
  isEducationLevel,
  isLanguageLevel,
  isWorkModel,
  MAX_CANDIDATE_SKILLS,
} from "@linkup/shared";
import type {
  CandidateCertificate,
  CandidateEducation,
  CandidateExperience,
  CandidateLanguage,
  CandidateProfile,
  DisabilityStatus as PrismaDisabilityStatus,
  EducationLevel as PrismaEducationLevel,
  LanguageLevel as PrismaLanguageLevel,
  WorkModel as PrismaWorkModel,
} from "@prisma/client";
import { httpError } from "./http.js";
import { prisma } from "./prisma.js";

type ProfileWithLists = CandidateProfile & {
  educations: CandidateEducation[];
  experiences: CandidateExperience[];
  languages: CandidateLanguage[];
  certificates: CandidateCertificate[];
};

function parseSkills(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, MAX_CANDIDATE_SKILLS);
}

function trimOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeMonth(value: string, label: string): string {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}$/.test(trimmed)) {
    throw httpError(400, "INVALID_BODY", `${label} deve estar no formato AAAA-MM.`);
  }
  return trimmed;
}

export function toCandidateProfileDto(row: ProfileWithLists | null): CandidateProfileDto {
  if (!row) {
    const empty: CandidateProfileDto = {
      fullName: "",
      phone: "",
      birthDate: "",
      gender: "",
      linkedinUrl: null,
      disabilityStatus: "NO",
      disabilityDetail: null,
      disabilityCid: null,
      laudo: null,
      livesInBrazil: true,
      cep: "",
      street: "",
      state: "",
      city: "",
      objective: null,
      salaryExpectation: null,
      workModel: null,
      availability: null,
      skills: [],
      educations: [],
      experiences: [],
      languages: [],
      certificates: [],
      diversityPronoun: null,
      diversityGenderIdentity: null,
      diversityOrientation: null,
      diversityRace: null,
      diversityOriginCity: null,
      diversityShareConsent: false,
      isComplete: false,
      updatedAt: new Date().toISOString(),
    };
    return empty;
  }

  const profile: CandidateProfileDto = {
    fullName: row.fullName,
    phone: row.phone,
    birthDate: row.birthDate,
    gender: row.gender,
    linkedinUrl: row.linkedinUrl,
    disabilityStatus: row.disabilityStatus as DisabilityStatus,
    disabilityDetail: row.disabilityDetail,
    disabilityCid: row.disabilityCid,
    laudo:
      row.laudoFileName && row.laudoFileSizeBytes != null
        ? { fileName: row.laudoFileName, fileSizeBytes: row.laudoFileSizeBytes }
        : null,
    livesInBrazil: row.livesInBrazil,
    cep: row.cep,
    street: row.street,
    state: row.state,
    city: row.city,
    objective: row.objective,
    salaryExpectation: row.salaryExpectation,
    workModel: (row.workModel as WorkModel | null) ?? null,
    availability: row.availability,
    skills: parseSkills(row.skillsJson),
    educations: row.educations.map((item) => ({
      id: item.id,
      level: item.level as EducationLevel,
      course: item.course,
      institution: item.institution,
      startMonth: item.startMonth,
      endMonth: item.endMonth,
      ongoing: item.ongoing,
    })),
    experiences: row.experiences.map((item) => ({
      id: item.id,
      company: item.company,
      role: item.role,
      startMonth: item.startMonth,
      endMonth: item.endMonth,
      current: item.current,
      description: item.description,
    })),
    languages: row.languages.map((item) => ({
      id: item.id,
      language: item.language,
      level: item.level as LanguageLevel,
    })),
    certificates: row.certificates.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
    })),
    diversityPronoun: row.diversityPronoun,
    diversityGenderIdentity: row.diversityGenderIdentity,
    diversityOrientation: row.diversityOrientation,
    diversityRace: row.diversityRace,
    diversityOriginCity: row.diversityOriginCity,
    diversityShareConsent: row.diversityShareConsent,
    isComplete: false,
    updatedAt: row.updatedAt.toISOString(),
  };
  profile.isComplete = isCandidateProfileComplete(profile);
  return profile;
}

export function toCandidateProfileSummary(
  row:
    | {
        fullName: string;
        city: string;
        state: string;
        objective: string | null;
        educations: Array<{
          level: string;
          course: string;
          institution: string;
        }>;
        experiences: Array<{
          company: string;
          role: string;
        }>;
      }
    | null
    | undefined,
): CandidateProfileSummary | null {
  if (!row || row.fullName.trim().length < 2) return null;
  const latestEducation = row.educations[0]
    ? {
        level: row.educations[0].level as EducationLevel,
        course: row.educations[0].course,
        institution: row.educations[0].institution,
      }
    : null;
  const latestExperience = row.experiences[0]
    ? {
        company: row.experiences[0].company,
        role: row.experiences[0].role,
      }
    : null;
  return {
    fullName: row.fullName.trim(),
    city: row.city.trim(),
    state: row.state.trim().toUpperCase(),
    objective: row.objective?.trim() || null,
    latestEducation,
    latestExperience,
  };
}

const profileInclude = {
  educations: { orderBy: [{ sortOrder: "asc" as const }, { id: "asc" as const }] },
  experiences: { orderBy: [{ sortOrder: "asc" as const }, { id: "asc" as const }] },
  languages: { orderBy: [{ sortOrder: "asc" as const }, { id: "asc" as const }] },
  certificates: { orderBy: [{ sortOrder: "asc" as const }, { id: "asc" as const }] },
};

export async function loadCandidateProfile(userId: string): Promise<CandidateProfileDto> {
  const row = await prisma.candidateProfile.findUnique({
    where: { userId },
    include: profileInclude,
  });
  return toCandidateProfileDto(row);
}

export async function loadCandidateProfileSummary(
  userId: string,
): Promise<CandidateProfileSummary | null> {
  const row = await prisma.candidateProfile.findUnique({
    where: { userId },
    include: profileInclude,
  });
  return toCandidateProfileSummary(row);
}

function normalizeInput(input: CandidateProfileInput) {
  if (!isDisabilityStatus(input.disabilityStatus)) {
    throw httpError(400, "INVALID_BODY", "Informe a situação de deficiência.");
  }

  const fullName = input.fullName.trim().replace(/\s+/g, " ");
  const phone = input.phone.replace(/\D/g, "").slice(0, 11);
  const birthDate = input.birthDate.trim();
  const gender = input.gender.trim();
  const disabilityDetail = trimOrNull(input.disabilityDetail);
  const disabilityCid = trimOrNull(input.disabilityCid);

  if (input.disabilityStatus === "YES" && (!disabilityDetail || disabilityDetail.length < 2)) {
    throw httpError(400, "INVALID_BODY", "Descreva a deficiência.");
  }

  if (input.workModel != null && input.workModel !== undefined && !isWorkModel(input.workModel)) {
    throw httpError(400, "INVALID_BODY", "Modelo de trabalho inválido.");
  }

  let salaryExpectation: number | null = null;
  if (input.salaryExpectation != null && input.salaryExpectation !== undefined) {
    if (
      typeof input.salaryExpectation !== "number" ||
      !Number.isFinite(input.salaryExpectation) ||
      input.salaryExpectation < 0
    ) {
      throw httpError(400, "INVALID_BODY", "Pretensão salarial inválida.");
    }
    salaryExpectation = Math.round(input.salaryExpectation);
  }

  const educations = (input.educations ?? []).map((item, index) => {
    if (!isEducationLevel(item.level)) {
      throw httpError(400, "INVALID_BODY", `Formação ${index + 1}: nível inválido.`);
    }
    const course = item.course.trim();
    const institution = item.institution.trim();
    if (course.length < 2 || institution.length < 2) {
      throw httpError(400, "INVALID_BODY", `Formação ${index + 1}: informe curso e instituição.`);
    }
    const ongoing = Boolean(item.ongoing);
    return {
      level: item.level as PrismaEducationLevel,
      course,
      institution,
      startMonth: normalizeMonth(item.startMonth, `Formação ${index + 1}: início`),
      endMonth: ongoing
        ? null
        : normalizeMonth(item.endMonth ?? "", `Formação ${index + 1}: fim`),
      ongoing,
      sortOrder: index,
    };
  });

  const experiences = (input.experiences ?? []).map((item, index) => {
    const company = item.company.trim();
    const role = item.role.trim();
    if (company.length < 2 || role.length < 2) {
      throw httpError(400, "INVALID_BODY", `Experiência ${index + 1}: informe empresa e cargo.`);
    }
    const current = Boolean(item.current);
    return {
      company,
      role,
      startMonth: normalizeMonth(item.startMonth, `Experiência ${index + 1}: início`),
      endMonth: current
        ? null
        : normalizeMonth(item.endMonth ?? "", `Experiência ${index + 1}: fim`),
      current,
      description: (item.description ?? "").trim(),
      sortOrder: index,
    };
  });

  const languages = (input.languages ?? []).map((item, index) => {
    const language = item.language.trim();
    if (language.length < 2) {
      throw httpError(400, "INVALID_BODY", `Idioma ${index + 1}: informe o idioma.`);
    }
    if (!isLanguageLevel(item.level)) {
      throw httpError(400, "INVALID_BODY", `Idioma ${index + 1}: nível inválido.`);
    }
    return {
      language,
      level: item.level as PrismaLanguageLevel,
      sortOrder: index,
    };
  });

  const certificates = (input.certificates ?? []).map((item, index) => {
    const title = item.title.trim();
    if (title.length < 2) {
      throw httpError(400, "INVALID_BODY", `Certificado ${index + 1}: informe o título.`);
    }
    return {
      title,
      description: (item.description ?? "").trim(),
      sortOrder: index,
    };
  });

  const skills = (input.skills ?? [])
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, MAX_CANDIDATE_SKILLS);

  return {
    fullName,
    phone,
    birthDate,
    gender,
    linkedinUrl: trimOrNull(input.linkedinUrl),
    disabilityStatus: input.disabilityStatus as PrismaDisabilityStatus,
    disabilityDetail: input.disabilityStatus === "YES" ? disabilityDetail : null,
    disabilityCid: input.disabilityStatus === "YES" ? disabilityCid : null,
    livesInBrazil: Boolean(input.livesInBrazil),
    cep: input.cep.replace(/\D/g, ""),
    street: input.street.trim(),
    state: input.state.trim().toUpperCase(),
    city: input.city.trim(),
    objective: trimOrNull(input.objective),
    salaryExpectation,
    workModel: (input.workModel as PrismaWorkModel | null | undefined) ?? null,
    availability: trimOrNull(input.availability),
    skills,
    diversityPronoun: trimOrNull(input.diversityPronoun),
    diversityGenderIdentity: trimOrNull(input.diversityGenderIdentity),
    diversityOrientation: trimOrNull(input.diversityOrientation),
    diversityRace: trimOrNull(input.diversityRace),
    diversityOriginCity: trimOrNull(input.diversityOriginCity),
    diversityShareConsent: Boolean(input.diversityShareConsent),
    educations,
    experiences,
    languages,
    certificates,
  };
}

export async function saveCandidateProfile(
  userId: string,
  input: CandidateProfileInput,
): Promise<CandidateProfileDto> {
  const normalized = normalizeInput(input);

  await prisma.$transaction(async (tx) => {
    const existing = await tx.candidateProfile.findUnique({ where: { userId } });
    const clearLaudo = normalized.disabilityStatus !== "YES";

    await tx.candidateProfile.upsert({
      where: { userId },
      create: {
        userId,
        fullName: normalized.fullName,
        phone: normalized.phone,
        birthDate: normalized.birthDate,
        gender: normalized.gender,
        linkedinUrl: normalized.linkedinUrl,
        disabilityStatus: normalized.disabilityStatus,
        disabilityDetail: normalized.disabilityDetail,
        disabilityCid: normalized.disabilityCid,
        livesInBrazil: normalized.livesInBrazil,
        cep: normalized.cep,
        street: normalized.street,
        state: normalized.state,
        city: normalized.city,
        objective: normalized.objective,
        salaryExpectation: normalized.salaryExpectation,
        workModel: normalized.workModel,
        availability: normalized.availability,
        skillsJson: normalized.skills,
        diversityPronoun: normalized.diversityPronoun,
        diversityGenderIdentity: normalized.diversityGenderIdentity,
        diversityOrientation: normalized.diversityOrientation,
        diversityRace: normalized.diversityRace,
        diversityOriginCity: normalized.diversityOriginCity,
        diversityShareConsent: normalized.diversityShareConsent,
      },
      update: {
        fullName: normalized.fullName,
        phone: normalized.phone,
        birthDate: normalized.birthDate,
        gender: normalized.gender,
        linkedinUrl: normalized.linkedinUrl,
        disabilityStatus: normalized.disabilityStatus,
        disabilityDetail: normalized.disabilityDetail,
        disabilityCid: normalized.disabilityCid,
        livesInBrazil: normalized.livesInBrazil,
        cep: normalized.cep,
        street: normalized.street,
        state: normalized.state,
        city: normalized.city,
        objective: normalized.objective,
        salaryExpectation: normalized.salaryExpectation,
        workModel: normalized.workModel,
        availability: normalized.availability,
        skillsJson: normalized.skills,
        diversityPronoun: normalized.diversityPronoun,
        diversityGenderIdentity: normalized.diversityGenderIdentity,
        diversityOrientation: normalized.diversityOrientation,
        diversityRace: normalized.diversityRace,
        diversityOriginCity: normalized.diversityOriginCity,
        diversityShareConsent: normalized.diversityShareConsent,
        ...(clearLaudo
          ? { laudoFileName: null, laudoFileSizeBytes: null, laudoBytes: null }
          : {}),
      },
    });

    if (existing) {
      await tx.candidateEducation.deleteMany({ where: { userId } });
      await tx.candidateExperience.deleteMany({ where: { userId } });
      await tx.candidateLanguage.deleteMany({ where: { userId } });
      await tx.candidateCertificate.deleteMany({ where: { userId } });
    }

    if (normalized.educations.length > 0) {
      await tx.candidateEducation.createMany({
        data: normalized.educations.map((item) => ({ ...item, userId })),
      });
    }
    if (normalized.experiences.length > 0) {
      await tx.candidateExperience.createMany({
        data: normalized.experiences.map((item) => ({ ...item, userId })),
      });
    }
    if (normalized.languages.length > 0) {
      await tx.candidateLanguage.createMany({
        data: normalized.languages.map((item) => ({ ...item, userId })),
      });
    }
    if (normalized.certificates.length > 0) {
      await tx.candidateCertificate.createMany({
        data: normalized.certificates.map((item) => ({ ...item, userId })),
      });
    }
  });

  return loadCandidateProfile(userId);
}

export async function saveCandidateLaudo(
  userId: string,
  file: { fileName: string; buffer: Buffer },
): Promise<CandidateProfileDto> {
  const existing = await prisma.candidateProfile.findUnique({ where: { userId } });
  if (!existing) {
    throw httpError(400, "INVALID_BODY", "Preencha o cadastro antes de anexar o laudo.");
  }
  if (existing.disabilityStatus !== "YES") {
    throw httpError(400, "INVALID_BODY", "O laudo só pode ser anexado quando a deficiência for Sim.");
  }

  await prisma.candidateProfile.update({
    where: { userId },
    data: {
      laudoFileName: file.fileName,
      laudoFileSizeBytes: file.buffer.byteLength,
      laudoBytes: new Uint8Array(file.buffer),
    },
  });
  return loadCandidateProfile(userId);
}

export async function deleteCandidateLaudo(userId: string): Promise<CandidateProfileDto> {
  const existing = await prisma.candidateProfile.findUnique({ where: { userId } });
  if (!existing) {
    throw httpError(400, "INVALID_BODY", "Preencha o cadastro antes de remover o laudo.");
  }
  await prisma.candidateProfile.update({
    where: { userId },
    data: {
      laudoFileName: null,
      laudoFileSizeBytes: null,
      laudoBytes: null,
    },
  });
  return loadCandidateProfile(userId);
}
