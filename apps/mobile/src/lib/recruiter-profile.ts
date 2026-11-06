import type {
  CandidateLanguage,
  HiringArea,
  JobContractType,
  JobSeniority,
  LanguageLevel,
  RecruiterCertificate,
  RecruiterProfile,
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
import { getDb } from "./db";
import { fail } from "./errors";
import { createId } from "./ids";

type RecruiterProfileRow = {
  user_id: string;
  full_name: string;
  headline: string;
  phone: string;
  linkedin_url: string | null;
  state: string;
  city: string;
  bio: string | null;
  work_mode: string | null;
  consultancy_name: string | null;
  consultancy_website: string | null;
  years_experience: number | null;
  availability: string | null;
  focus_areas_json: string;
  seniorities_json: string;
  contract_types_json: string;
  languages_json: string;
  certificates_json: string;
  updated_at: string;
};

type StoredLanguage = { language: string; level: LanguageLevel };
type StoredCertificate = { title: string };

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

function parseLanguages(raw: string | null | undefined): CandidateLanguage[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
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
  } catch {
    return [];
  }
}

function parseCertificates(raw: string | null | undefined): RecruiterCertificate[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
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
  } catch {
    return [];
  }
}

function emptyProfile(updatedAt: string): RecruiterProfile {
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
    updatedAt,
  };
}

function rowToProfile(row: RecruiterProfileRow | null, fallbackUpdatedAt: string): RecruiterProfile {
  if (!row) return emptyProfile(fallbackUpdatedAt);

  const workMode: RecruiterWorkMode | null = isRecruiterWorkMode(row.work_mode)
    ? row.work_mode
    : null;

  const profile: RecruiterProfile = {
    fullName: row.full_name ?? "",
    headline: row.headline ?? "",
    phone: row.phone ?? "",
    linkedinUrl: row.linkedin_url,
    state: row.state ?? "",
    city: row.city ?? "",
    bio: row.bio,
    workMode,
    consultancyName: row.consultancy_name,
    consultancyWebsite: row.consultancy_website,
    yearsExperience: row.years_experience,
    availability: row.availability,
    focusAreas: parseHiringAreas(row.focus_areas_json),
    seniorities: parseSeniorities(row.seniorities_json),
    contractTypes: parseContractTypes(row.contract_types_json),
    languages: parseLanguages(row.languages_json),
    certificates: parseCertificates(row.certificates_json),
    isComplete: false,
    updatedAt: row.updated_at || fallbackUpdatedAt,
  };
  profile.isComplete = isRecruiterProfileComplete(profile);
  return profile;
}

function normalizeFocusAreas(items: HiringArea[] | undefined): HiringArea[] {
  if (!items || items.length === 0) return [];
  const unique = new Set<HiringArea>();
  for (const item of items) {
    if (!isHiringArea(item)) fail("INVALID_BODY", "Área de foco inválida.");
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

function normalizeLanguages(
  items: RecruiterProfileInput["languages"],
): StoredLanguage[] {
  if (!items || items.length === 0) return [];
  return items.map((item, index) => {
    const language = item.language.trim();
    if (language.length < 2) {
      fail("INVALID_BODY", `Idioma ${index + 1}: informe o idioma.`);
    }
    if (!isLanguageLevel(item.level)) {
      fail("INVALID_BODY", `Idioma ${index + 1}: nível inválido.`);
    }
    return { language, level: item.level };
  });
}

function normalizeCertificates(
  items: RecruiterProfileInput["certificates"],
): StoredCertificate[] {
  if (!items || items.length === 0) return [];
  return items
    .map((item) => ({ title: item.title.trim() }))
    .filter((item) => item.title.length >= 2)
    .slice(0, MAX_RECRUITER_CERTIFICATES);
}

export async function loadRecruiterProfile(userId: string): Promise<RecruiterProfile> {
  const db = await getDb();
  const row = await db.getFirstAsync<RecruiterProfileRow>(
    `SELECT * FROM recruiter_profiles WHERE user_id = ?`,
    userId,
  );
  return rowToProfile(row, new Date().toISOString());
}

export async function saveRecruiterProfile(
  userId: string,
  input: RecruiterProfileInput,
): Promise<RecruiterProfile> {
  const fullName = input.fullName.trim();
  const headline = input.headline.trim();
  const phone = input.phone.replace(/\D/g, "").slice(0, 11);

  let workMode: RecruiterWorkMode | null = null;
  if (input.workMode != null) {
    if (!isRecruiterWorkMode(input.workMode)) {
      fail("INVALID_BODY", "Modo de atuação inválido.");
    }
    workMode = input.workMode;
  }

  let yearsExperience: number | null = null;
  if (input.yearsExperience != null) {
    const years = Number(input.yearsExperience);
    if (!Number.isInteger(years) || years < 0 || years > 60) {
      fail("INVALID_BODY", "Anos de experiência inválidos.");
    }
    yearsExperience = years;
  }

  const focusAreas = normalizeFocusAreas(input.focusAreas);
  const seniorities = normalizeSeniorities(input.seniorities);
  const contractTypes = normalizeContractTypes(input.contractTypes);
  const languages = normalizeLanguages(input.languages);
  const certificates = normalizeCertificates(input.certificates);
  const updatedAt = new Date().toISOString();

  const languagesWithIds = languages.map((item) => ({
    id: createId(),
    language: item.language,
    level: item.level,
  }));
  const certificatesWithIds = certificates.map((item) => ({
    id: createId(),
    title: item.title,
  }));

  const db = await getDb();
  await db.runAsync(
    `INSERT INTO recruiter_profiles (
      user_id, full_name, headline, phone, linkedin_url, state, city, bio,
      work_mode, consultancy_name, consultancy_website, years_experience, availability,
      focus_areas_json, seniorities_json, contract_types_json, languages_json, certificates_json,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      full_name = excluded.full_name,
      headline = excluded.headline,
      phone = excluded.phone,
      linkedin_url = excluded.linkedin_url,
      state = excluded.state,
      city = excluded.city,
      bio = excluded.bio,
      work_mode = excluded.work_mode,
      consultancy_name = excluded.consultancy_name,
      consultancy_website = excluded.consultancy_website,
      years_experience = excluded.years_experience,
      availability = excluded.availability,
      focus_areas_json = excluded.focus_areas_json,
      seniorities_json = excluded.seniorities_json,
      contract_types_json = excluded.contract_types_json,
      languages_json = excluded.languages_json,
      certificates_json = excluded.certificates_json,
      updated_at = excluded.updated_at`,
    userId,
    fullName,
    headline,
    phone,
    trimOrNull(input.linkedinUrl),
    (input.state ?? "").trim().toUpperCase(),
    (input.city ?? "").trim(),
    trimOrNull(input.bio),
    workMode,
    trimOrNull(input.consultancyName),
    trimOrNull(input.consultancyWebsite),
    yearsExperience,
    trimOrNull(input.availability),
    JSON.stringify(focusAreas),
    JSON.stringify(seniorities),
    JSON.stringify(contractTypes),
    JSON.stringify(languagesWithIds),
    JSON.stringify(certificatesWithIds),
    updatedAt,
  );

  return loadRecruiterProfile(userId);
}
