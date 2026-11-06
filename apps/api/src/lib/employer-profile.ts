import type {
  CompanySize,
  EmployerProfile as EmployerProfileDto,
  EmployerProfileInput,
  HiringArea,
  JobContractType,
  JobSeniority,
  WorkModel,
} from "@linkup/shared";
import {
  cnpjDigits,
  isCompanySize,
  isEmployerProfileComplete,
  isHiringArea,
  isJobContractType,
  isJobSeniority,
  isValidCnpj,
  isWorkModel,
  JOB_BENEFIT_OPTIONS,
  MAX_EMPLOYER_VALUES,
} from "@linkup/shared";
import type { EmployerProfile, HiringArea as PrismaHiringArea } from "@prisma/client";
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

function parseWorkModels(value: unknown): WorkModel[] {
  return parseStringList(value).filter(isWorkModel);
}

function emptyProfile(): EmployerProfileDto {
  return {
    tradeName: "",
    legalName: "",
    cnpj: null,
    industry: null,
    companySize: null,
    foundedYear: null,
    website: null,
    linkedinUrl: null,
    about: null,
    livesInBrazil: true,
    cep: "",
    street: "",
    state: "",
    city: "",
    contactName: "",
    contactRole: "",
    phone: "",
    commercialEmail: null,
    hiringAreas: [],
    seniorities: [],
    contractTypes: [],
    workModels: [],
    benefits: [],
    cultureValues: [],
    inclusionNote: null,
    isComplete: false,
    updatedAt: new Date().toISOString(),
  };
}

export function toEmployerProfileDto(row: EmployerProfile | null): EmployerProfileDto {
  if (!row) return emptyProfile();

  const industry: HiringArea | null = isHiringArea(row.industry) ? row.industry : null;
  const companySize: CompanySize | null = isCompanySize(row.companySize) ? row.companySize : null;

  const profile: EmployerProfileDto = {
    tradeName: row.tradeName,
    legalName: row.legalName,
    cnpj: row.cnpj,
    industry,
    companySize,
    foundedYear: row.foundedYear,
    website: row.website,
    linkedinUrl: row.linkedinUrl,
    about: row.about,
    livesInBrazil: row.livesInBrazil,
    cep: row.cep,
    street: row.street,
    state: row.state,
    city: row.city,
    contactName: row.contactName,
    contactRole: row.contactRole,
    phone: row.phone,
    commercialEmail: row.commercialEmail,
    hiringAreas: parseHiringAreas(row.hiringAreasJson),
    seniorities: parseSeniorities(row.senioritiesJson),
    contractTypes: parseContractTypes(row.contractTypesJson),
    workModels: parseWorkModels(row.workModelsJson),
    benefits: parseStringList(row.benefitsJson),
    cultureValues: parseStringList(row.cultureValuesJson).slice(0, MAX_EMPLOYER_VALUES),
    inclusionNote: row.inclusionNote,
    isComplete: false,
    updatedAt: row.updatedAt.toISOString(),
  };
  profile.isComplete = isEmployerProfileComplete(profile);
  return profile;
}

const BENEFIT_SET = new Set<string>(JOB_BENEFIT_OPTIONS);

export async function loadEmployerProfile(userId: string): Promise<EmployerProfileDto> {
  const row = await prisma.employerProfile.findUnique({ where: { userId } });
  return toEmployerProfileDto(row);
}

export async function saveEmployerProfile(
  userId: string,
  input: EmployerProfileInput,
): Promise<EmployerProfileDto> {
  const tradeName = input.tradeName.trim();
  const contactName = input.contactName.trim();
  const contactRole = input.contactRole.trim();
  const phone = input.phone.replace(/\D/g, "").slice(0, 11);

  let industry: PrismaHiringArea | null = null;
  if (input.industry != null) {
    if (!isHiringArea(input.industry)) {
      throw httpError(400, "INVALID_BODY", "Setor inválido.");
    }
    industry = input.industry;
  }

  let companySize: string | null = null;
  if (input.companySize != null) {
    if (!isCompanySize(input.companySize)) {
      throw httpError(400, "INVALID_BODY", "Porte inválido.");
    }
    companySize = input.companySize;
  }

  let foundedYear: number | null = null;
  if (input.foundedYear != null) {
    const year = Number(input.foundedYear);
    const current = new Date().getFullYear();
    if (!Number.isInteger(year) || year < 1800 || year > current) {
      throw httpError(400, "INVALID_BODY", "Ano de fundação inválido.");
    }
    foundedYear = year;
  }

  let cnpj: string | null = null;
  if (input.cnpj != null && input.cnpj.trim() !== "") {
    const digits = cnpjDigits(input.cnpj);
    if (!isValidCnpj(digits)) {
      throw httpError(400, "INVALID_BODY", "CNPJ inválido.");
    }
    cnpj = digits;
  }

  const livesInBrazil = Boolean(input.livesInBrazil);
  const cep = (input.cep ?? "").replace(/\D/g, "");
  if (livesInBrazil && cep.length > 0 && cep.length !== 8) {
    throw httpError(400, "INVALID_BODY", "CEP deve ter 8 dígitos.");
  }

  const hiringAreas = (input.hiringAreas ?? []).filter(isHiringArea);
  const seniorities = (input.seniorities ?? []).filter(isJobSeniority);
  const contractTypes = (input.contractTypes ?? []).filter(isJobContractType);
  const workModels = (input.workModels ?? []).filter(isWorkModel);
  const benefits = (input.benefits ?? [])
    .map((item) => item.trim())
    .filter((item) => BENEFIT_SET.has(item));
  const cultureValues = (input.cultureValues ?? [])
    .map((item) => item.trim())
    .filter((item) => item.length >= 2)
    .slice(0, MAX_EMPLOYER_VALUES);

  const data = {
    tradeName,
    legalName: (input.legalName ?? "").trim(),
    cnpj,
    industry,
    companySize,
    foundedYear,
    website: trimOrNull(input.website),
    linkedinUrl: trimOrNull(input.linkedinUrl),
    about: trimOrNull(input.about),
    livesInBrazil,
    cep,
    street: (input.street ?? "").trim(),
    state: (input.state ?? "").trim().toUpperCase(),
    city: (input.city ?? "").trim(),
    contactName,
    contactRole,
    phone,
    commercialEmail: trimOrNull(input.commercialEmail),
    hiringAreasJson: hiringAreas,
    senioritiesJson: seniorities,
    contractTypesJson: contractTypes,
    workModelsJson: workModels,
    benefitsJson: benefits,
    cultureValuesJson: cultureValues,
    inclusionNote: trimOrNull(input.inclusionNote),
  };

  const row = await prisma.employerProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });

  return toEmployerProfileDto(row);
}
