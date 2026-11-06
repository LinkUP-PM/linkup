import type {
  CompanySize,
  EmployerProfile,
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
import { getDb } from "./db";
import { fail } from "./errors";

type EmployerProfileRow = {
  user_id: string;
  trade_name: string;
  legal_name: string;
  cnpj: string | null;
  industry: string | null;
  company_size: string | null;
  founded_year: number | null;
  website: string | null;
  linkedin_url: string | null;
  about: string | null;
  lives_in_brazil: number;
  cep: string;
  street: string;
  state: string;
  city: string;
  contact_name: string;
  contact_role: string;
  phone: string;
  commercial_email: string | null;
  hiring_areas_json: string;
  seniorities_json: string;
  contract_types_json: string;
  work_models_json: string;
  benefits_json: string;
  culture_values_json: string;
  inclusion_note: string | null;
  updated_at: string;
};

function trimOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseStringList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .map((item) => item.trim());
  } catch {
    return [];
  }
}

function parseHiringAreas(raw: string | null | undefined): HiringArea[] {
  return parseStringList(raw).filter(isHiringArea);
}

function parseSeniorities(raw: string | null | undefined): JobSeniority[] {
  return parseStringList(raw).filter(isJobSeniority);
}

function parseContractTypes(raw: string | null | undefined): JobContractType[] {
  return parseStringList(raw).filter(isJobContractType);
}

function parseWorkModels(raw: string | null | undefined): WorkModel[] {
  return parseStringList(raw).filter(isWorkModel);
}

function emptyProfile(updatedAt: string): EmployerProfile {
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
    updatedAt,
  };
}

function rowToProfile(row: EmployerProfileRow | null, fallbackUpdatedAt: string): EmployerProfile {
  if (!row) return emptyProfile(fallbackUpdatedAt);

  const industry: HiringArea | null = isHiringArea(row.industry) ? row.industry : null;
  const companySize: CompanySize | null = isCompanySize(row.company_size) ? row.company_size : null;

  const profile: EmployerProfile = {
    tradeName: row.trade_name ?? "",
    legalName: row.legal_name ?? "",
    cnpj: row.cnpj,
    industry,
    companySize,
    foundedYear: row.founded_year,
    website: row.website,
    linkedinUrl: row.linkedin_url,
    about: row.about,
    livesInBrazil: row.lives_in_brazil !== 0,
    cep: row.cep ?? "",
    street: row.street ?? "",
    state: row.state ?? "",
    city: row.city ?? "",
    contactName: row.contact_name ?? "",
    contactRole: row.contact_role ?? "",
    phone: row.phone ?? "",
    commercialEmail: row.commercial_email,
    hiringAreas: parseHiringAreas(row.hiring_areas_json),
    seniorities: parseSeniorities(row.seniorities_json),
    contractTypes: parseContractTypes(row.contract_types_json),
    workModels: parseWorkModels(row.work_models_json),
    benefits: parseStringList(row.benefits_json),
    cultureValues: parseStringList(row.culture_values_json).slice(0, MAX_EMPLOYER_VALUES),
    inclusionNote: row.inclusion_note,
    isComplete: false,
    updatedAt: row.updated_at || fallbackUpdatedAt,
  };
  profile.isComplete = isEmployerProfileComplete(profile);
  return profile;
}

function normalizeCnpj(value: string | null | undefined): string | null {
  if (value == null || value.trim() === "") return null;
  const digits = cnpjDigits(value);
  if (digits.length === 0) return null;
  if (!isValidCnpj(digits)) {
    fail("INVALID_BODY", "CNPJ inválido.");
  }
  return digits;
}

function normalizeHiringAreas(items: HiringArea[] | undefined): HiringArea[] {
  if (!items || items.length === 0) return [];
  const unique = new Set<HiringArea>();
  for (const item of items) {
    if (!isHiringArea(item)) fail("INVALID_BODY", "Área de contratação inválida.");
    unique.add(item);
  }
  return [...unique];
}

function normalizeSeniorities(items: JobSeniority[] | undefined): JobSeniority[] {
  if (!items || items.length === 0) return [];
  const unique = new Set<JobSeniority>();
  for (const item of items) {
    if (!isJobSeniority(item)) fail("INVALID_BODY", "Senioridade inválida.");
    unique.add(item);
  }
  return [...unique];
}

function normalizeContractTypes(items: JobContractType[] | undefined): JobContractType[] {
  if (!items || items.length === 0) return [];
  const unique = new Set<JobContractType>();
  for (const item of items) {
    if (!isJobContractType(item)) fail("INVALID_BODY", "Tipo de contrato inválido.");
    unique.add(item);
  }
  return [...unique];
}

function normalizeWorkModels(items: WorkModel[] | undefined): WorkModel[] {
  if (!items || items.length === 0) return [];
  const unique = new Set<WorkModel>();
  for (const item of items) {
    if (!isWorkModel(item)) fail("INVALID_BODY", "Modelo de trabalho inválido.");
    unique.add(item);
  }
  return [...unique];
}

const BENEFIT_SET = new Set<string>(JOB_BENEFIT_OPTIONS);

function normalizeBenefits(items: string[] | undefined): string[] {
  if (!items || items.length === 0) return [];
  const unique = new Set<string>();
  for (const item of items) {
    const trimmed = item.trim();
    if (!BENEFIT_SET.has(trimmed)) fail("INVALID_BODY", `Benefício inválido: ${trimmed}.`);
    unique.add(trimmed);
  }
  return [...unique];
}

function normalizeCultureValues(items: string[] | undefined): string[] {
  if (!items || items.length === 0) return [];
  return items
    .map((item) => item.trim())
    .filter((item) => item.length >= 2)
    .slice(0, MAX_EMPLOYER_VALUES);
}

export async function loadEmployerProfile(userId: string): Promise<EmployerProfile> {
  const db = await getDb();
  const row = await db.getFirstAsync<EmployerProfileRow>(
    `SELECT * FROM employer_profiles WHERE user_id = ?`,
    userId,
  );
  return rowToProfile(row, new Date().toISOString());
}

export async function saveEmployerProfile(
  userId: string,
  input: EmployerProfileInput,
): Promise<EmployerProfile> {
  const tradeName = input.tradeName.trim();
  const contactName = input.contactName.trim();
  const contactRole = input.contactRole.trim();
  const phone = input.phone.replace(/\D/g, "").slice(0, 11);

  let industry: HiringArea | null = null;
  if (input.industry != null) {
    if (!isHiringArea(input.industry)) fail("INVALID_BODY", "Setor inválido.");
    industry = input.industry;
  }
  let companySize: CompanySize | null = null;
  if (input.companySize != null) {
    if (!isCompanySize(input.companySize)) fail("INVALID_BODY", "Porte inválido.");
    companySize = input.companySize;
  }

  let foundedYear: number | null = null;
  if (input.foundedYear != null) {
    const year = Number(input.foundedYear);
    const current = new Date().getFullYear();
    if (!Number.isInteger(year) || year < 1800 || year > current) {
      fail("INVALID_BODY", "Ano de fundação inválido.");
    }
    foundedYear = year;
  }

  const cnpj = normalizeCnpj(input.cnpj);
  const livesInBrazil = Boolean(input.livesInBrazil);
  const cep = (input.cep ?? "").replace(/\D/g, "");
  if (livesInBrazil && cep.length > 0 && cep.length !== 8) {
    fail("INVALID_BODY", "CEP deve ter 8 dígitos.");
  }

  const hiringAreas = normalizeHiringAreas(input.hiringAreas);
  const seniorities = normalizeSeniorities(input.seniorities);
  const contractTypes = normalizeContractTypes(input.contractTypes);
  const workModels = normalizeWorkModels(input.workModels);
  const benefits = normalizeBenefits(input.benefits);
  const cultureValues = normalizeCultureValues(input.cultureValues);
  const updatedAt = new Date().toISOString();

  const db = await getDb();
  await db.runAsync(
    `INSERT INTO employer_profiles (
      user_id, trade_name, legal_name, cnpj, industry, company_size, founded_year,
      website, linkedin_url, about, lives_in_brazil, cep, street, state, city,
      contact_name, contact_role, phone, commercial_email,
      hiring_areas_json, seniorities_json, contract_types_json, work_models_json,
      benefits_json, culture_values_json, inclusion_note, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      trade_name = excluded.trade_name,
      legal_name = excluded.legal_name,
      cnpj = excluded.cnpj,
      industry = excluded.industry,
      company_size = excluded.company_size,
      founded_year = excluded.founded_year,
      website = excluded.website,
      linkedin_url = excluded.linkedin_url,
      about = excluded.about,
      lives_in_brazil = excluded.lives_in_brazil,
      cep = excluded.cep,
      street = excluded.street,
      state = excluded.state,
      city = excluded.city,
      contact_name = excluded.contact_name,
      contact_role = excluded.contact_role,
      phone = excluded.phone,
      commercial_email = excluded.commercial_email,
      hiring_areas_json = excluded.hiring_areas_json,
      seniorities_json = excluded.seniorities_json,
      contract_types_json = excluded.contract_types_json,
      work_models_json = excluded.work_models_json,
      benefits_json = excluded.benefits_json,
      culture_values_json = excluded.culture_values_json,
      inclusion_note = excluded.inclusion_note,
      updated_at = excluded.updated_at`,
    userId,
    tradeName,
    (input.legalName ?? "").trim(),
    cnpj,
    industry,
    companySize,
    foundedYear,
    trimOrNull(input.website),
    trimOrNull(input.linkedinUrl),
    trimOrNull(input.about),
    livesInBrazil ? 1 : 0,
    cep,
    (input.street ?? "").trim(),
    (input.state ?? "").trim().toUpperCase(),
    (input.city ?? "").trim(),
    contactName,
    contactRole,
    phone,
    trimOrNull(input.commercialEmail),
    JSON.stringify(hiringAreas),
    JSON.stringify(seniorities),
    JSON.stringify(contractTypes),
    JSON.stringify(workModels),
    JSON.stringify(benefits),
    JSON.stringify(cultureValues),
    trimOrNull(input.inclusionNote),
    updatedAt,
  );

  return loadEmployerProfile(userId);
}
