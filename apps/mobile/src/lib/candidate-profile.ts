import type {
  CandidateCertificate,
  CandidateEducation,
  CandidateExperience,
  CandidateLanguage,
  CandidateProfile,
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
import { getDb } from "./db";
import { fail } from "./errors";
import { createId } from "./ids";
import { deleteLaudoPdf } from "./laudo-files";

export type CandidateProfileRow = {
  user_id: string;
  full_name: string;
  phone: string;
  birth_date: string;
  gender: string;
  linkedin_url: string | null;
  disability_status: string;
  disability_detail: string | null;
  disability_cid: string | null;
  laudo_file_name: string | null;
  laudo_file_uri: string | null;
  laudo_file_size_bytes: number | null;
  lives_in_brazil: number;
  cep: string;
  street: string;
  state: string;
  city: string;
  objective: string | null;
  salary_expectation: number | null;
  work_model: string | null;
  availability: string | null;
  skills_json: string;
  diversity_pronoun: string | null;
  diversity_gender_identity: string | null;
  diversity_orientation: string | null;
  diversity_race: string | null;
  diversity_origin_city: string | null;
  diversity_share_consent: number;
  updated_at: string;
};

type EducationRow = {
  id: string;
  user_id: string;
  level: string;
  course: string;
  institution: string;
  start_month: string;
  end_month: string | null;
  ongoing: number;
  sort_order: number;
};

type ExperienceRow = {
  id: string;
  user_id: string;
  company: string;
  role: string;
  start_month: string;
  end_month: string | null;
  current: number;
  description: string;
  sort_order: number;
};

type LanguageRow = {
  id: string;
  user_id: string;
  language: string;
  level: string;
  sort_order: number;
};

type CertificateRow = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  sort_order: number;
};

function parseSkills(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .map((item) => item.trim())
      .slice(0, MAX_CANDIDATE_SKILLS);
  } catch {
    return [];
  }
}

function emptyProfile(userId: string, updatedAt: string): CandidateProfile {
  return {
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
    updatedAt,
  };
}

function toEducation(row: EducationRow): CandidateEducation {
  return {
    id: row.id,
    level: (isEducationLevel(row.level) ? row.level : "OTHER") as EducationLevel,
    course: row.course,
    institution: row.institution,
    startMonth: row.start_month,
    endMonth: row.end_month,
    ongoing: row.ongoing === 1,
  };
}

function toExperience(row: ExperienceRow): CandidateExperience {
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    startMonth: row.start_month,
    endMonth: row.end_month,
    current: row.current === 1,
    description: row.description,
  };
}

function toLanguage(row: LanguageRow): CandidateLanguage {
  return {
    id: row.id,
    language: row.language,
    level: (isLanguageLevel(row.level) ? row.level : "BASIC") as LanguageLevel,
  };
}

function toCertificate(row: CertificateRow): CandidateCertificate {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
  };
}

export function profileFromParts(
  row: CandidateProfileRow | null,
  educations: EducationRow[],
  experiences: ExperienceRow[],
  languages: LanguageRow[],
  certificates: CertificateRow[],
  fallbackUpdatedAt: string,
): CandidateProfile {
  if (!row) {
    return emptyProfile("", fallbackUpdatedAt);
  }

  const disabilityStatus: DisabilityStatus = isDisabilityStatus(row.disability_status)
    ? row.disability_status
    : "NO";
  const workModel: WorkModel | null = isWorkModel(row.work_model) ? row.work_model : null;

  const profile: CandidateProfile = {
    fullName: row.full_name ?? "",
    phone: row.phone ?? "",
    birthDate: row.birth_date ?? "",
    gender: row.gender ?? "",
    linkedinUrl: row.linkedin_url,
    disabilityStatus,
    disabilityDetail: row.disability_detail,
    disabilityCid: row.disability_cid,
    laudo:
      row.laudo_file_name && row.laudo_file_size_bytes != null
        ? { fileName: row.laudo_file_name, fileSizeBytes: row.laudo_file_size_bytes }
        : null,
    livesInBrazil: row.lives_in_brazil !== 0,
    cep: row.cep ?? "",
    street: row.street ?? "",
    state: row.state ?? "",
    city: row.city ?? "",
    objective: row.objective,
    salaryExpectation: row.salary_expectation,
    workModel,
    availability: row.availability,
    skills: parseSkills(row.skills_json),
    educations: educations.map(toEducation),
    experiences: experiences.map(toExperience),
    languages: languages.map(toLanguage),
    certificates: certificates.map(toCertificate),
    diversityPronoun: row.diversity_pronoun,
    diversityGenderIdentity: row.diversity_gender_identity,
    diversityOrientation: row.diversity_orientation,
    diversityRace: row.diversity_race,
    diversityOriginCity: row.diversity_origin_city,
    diversityShareConsent: row.diversity_share_consent === 1,
    isComplete: false,
    updatedAt: row.updated_at || fallbackUpdatedAt,
  };
  profile.isComplete = isCandidateProfileComplete(profile);
  return profile;
}

export function toProfileSummary(profile: CandidateProfile | null): CandidateProfileSummary | null {
  if (!profile || profile.fullName.trim().length < 2) return null;
  const latestEducation = profile.educations[0]
    ? {
        level: profile.educations[0].level,
        course: profile.educations[0].course,
        institution: profile.educations[0].institution,
      }
    : null;
  const latestExperience = profile.experiences[0]
    ? {
        company: profile.experiences[0].company,
        role: profile.experiences[0].role,
      }
    : null;
  return {
    fullName: profile.fullName.trim(),
    city: profile.city.trim(),
    state: profile.state.trim().toUpperCase(),
    objective: profile.objective?.trim() || null,
    latestEducation,
    latestExperience,
  };
}

function trimOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeMonth(value: string, label: string): string {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}$/.test(trimmed)) {
    fail("INVALID_BODY", `${label} deve estar no formato AAAA-MM.`);
  }
  return trimmed;
}

function normalizeEducations(
  items: CandidateProfileInput["educations"],
): Array<Omit<CandidateEducation, "id"> & { id?: string }> {
  if (!items || items.length === 0) return [];
  return items.map((item, index) => {
    if (!isEducationLevel(item.level)) {
      fail("INVALID_BODY", `Formação ${index + 1}: nível inválido.`);
    }
    const course = item.course.trim();
    const institution = item.institution.trim();
    if (course.length < 2 || institution.length < 2) {
      fail("INVALID_BODY", `Formação ${index + 1}: informe curso e instituição.`);
    }
    const startMonth = normalizeMonth(item.startMonth, `Formação ${index + 1}: início`);
    const ongoing = Boolean(item.ongoing);
    const endMonth = ongoing
      ? null
      : normalizeMonth(item.endMonth ?? "", `Formação ${index + 1}: fim`);
    return {
      level: item.level,
      course,
      institution,
      startMonth,
      endMonth,
      ongoing,
    };
  });
}

function normalizeExperiences(
  items: CandidateProfileInput["experiences"],
): Array<Omit<CandidateExperience, "id">> {
  if (!items || items.length === 0) return [];
  return items.map((item, index) => {
    const company = item.company.trim();
    const role = item.role.trim();
    if (company.length < 2 || role.length < 2) {
      fail("INVALID_BODY", `Experiência ${index + 1}: informe empresa e cargo.`);
    }
    const startMonth = normalizeMonth(item.startMonth, `Experiência ${index + 1}: início`);
    const current = Boolean(item.current);
    const endMonth = current
      ? null
      : normalizeMonth(item.endMonth ?? "", `Experiência ${index + 1}: fim`);
    return {
      company,
      role,
      startMonth,
      endMonth,
      current,
      description: (item.description ?? "").trim(),
    };
  });
}

function normalizeLanguages(
  items: CandidateProfileInput["languages"],
): Array<Omit<CandidateLanguage, "id">> {
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
  items: CandidateProfileInput["certificates"],
): Array<Omit<CandidateCertificate, "id">> {
  if (!items || items.length === 0) return [];
  return items.map((item, index) => {
    const title = item.title.trim();
    if (title.length < 2) {
      fail("INVALID_BODY", `Certificado ${index + 1}: informe o título.`);
    }
    return {
      title,
      description: (item.description ?? "").trim(),
    };
  });
}

export function normalizeProfileInput(input: CandidateProfileInput): {
  core: {
    fullName: string;
    phone: string;
    birthDate: string;
    gender: string;
    linkedinUrl: string | null;
    disabilityStatus: DisabilityStatus;
    disabilityDetail: string | null;
    disabilityCid: string | null;
    livesInBrazil: boolean;
    cep: string;
    street: string;
    state: string;
    city: string;
    objective: string | null;
    salaryExpectation: number | null;
    workModel: WorkModel | null;
    availability: string | null;
    skills: string[];
    diversityPronoun: string | null;
    diversityGenderIdentity: string | null;
    diversityOrientation: string | null;
    diversityRace: string | null;
    diversityOriginCity: string | null;
    diversityShareConsent: boolean;
  };
  educations: Array<Omit<CandidateEducation, "id">>;
  experiences: Array<Omit<CandidateExperience, "id">>;
  languages: Array<Omit<CandidateLanguage, "id">>;
  certificates: Array<Omit<CandidateCertificate, "id">>;
} {
  if (!isDisabilityStatus(input.disabilityStatus)) {
    fail("INVALID_BODY", "Informe a situação de deficiência.");
  }

  const fullName = input.fullName.trim().replace(/\s+/g, " ");
  const phone = input.phone.replace(/\D/g, "").slice(0, 11);
  const birthDate = input.birthDate.trim();
  const gender = input.gender.trim();
  const disabilityDetail = trimOrNull(input.disabilityDetail);
  const disabilityCid = trimOrNull(input.disabilityCid);

  if (input.disabilityStatus === "YES" && (!disabilityDetail || disabilityDetail.length < 2)) {
    fail("INVALID_BODY", "Descreva a deficiência.");
  }

  const livesInBrazil = Boolean(input.livesInBrazil);
  const cep = input.cep.replace(/\D/g, "");
  const street = input.street.trim();
  const state = input.state.trim().toUpperCase();
  const city = input.city.trim();

  if (input.workModel != null && input.workModel !== undefined && !isWorkModel(input.workModel)) {
    fail("INVALID_BODY", "Modelo de trabalho inválido.");
  }

  let salaryExpectation: number | null = null;
  if (input.salaryExpectation != null && input.salaryExpectation !== undefined) {
    if (
      typeof input.salaryExpectation !== "number" ||
      !Number.isFinite(input.salaryExpectation) ||
      input.salaryExpectation < 0
    ) {
      fail("INVALID_BODY", "Pretensão salarial inválida.");
    }
    salaryExpectation = Math.round(input.salaryExpectation);
  }

  const skills = (input.skills ?? [])
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, MAX_CANDIDATE_SKILLS);

  return {
    core: {
      fullName,
      phone,
      birthDate,
      gender,
      linkedinUrl: trimOrNull(input.linkedinUrl),
      disabilityStatus: input.disabilityStatus,
      disabilityDetail: input.disabilityStatus === "YES" ? disabilityDetail : null,
      disabilityCid: input.disabilityStatus === "YES" ? disabilityCid : null,
      livesInBrazil,
      cep,
      street,
      state,
      city,
      objective: trimOrNull(input.objective),
      salaryExpectation,
      workModel: input.workModel ?? null,
      availability: trimOrNull(input.availability),
      skills,
      diversityPronoun: trimOrNull(input.diversityPronoun),
      diversityGenderIdentity: trimOrNull(input.diversityGenderIdentity),
      diversityOrientation: trimOrNull(input.diversityOrientation),
      diversityRace: trimOrNull(input.diversityRace),
      diversityOriginCity: trimOrNull(input.diversityOriginCity),
      diversityShareConsent: Boolean(input.diversityShareConsent),
    },
    educations: normalizeEducations(input.educations),
    experiences: normalizeExperiences(input.experiences),
    languages: normalizeLanguages(input.languages),
    certificates: normalizeCertificates(input.certificates),
  };
}

export async function loadCandidateProfile(userId: string): Promise<CandidateProfile> {
  const db = await getDb();
  const row = await db.getFirstAsync<CandidateProfileRow>(
    `SELECT * FROM candidate_profiles WHERE user_id = ?`,
    userId,
  );
  const educations = await db.getAllAsync<EducationRow>(
    `SELECT * FROM candidate_educations WHERE user_id = ? ORDER BY sort_order ASC, id ASC`,
    userId,
  );
  const experiences = await db.getAllAsync<ExperienceRow>(
    `SELECT * FROM candidate_experiences WHERE user_id = ? ORDER BY sort_order ASC, id ASC`,
    userId,
  );
  const languages = await db.getAllAsync<LanguageRow>(
    `SELECT * FROM candidate_languages WHERE user_id = ? ORDER BY sort_order ASC, id ASC`,
    userId,
  );
  const certificates = await db.getAllAsync<CertificateRow>(
    `SELECT * FROM candidate_certificates WHERE user_id = ? ORDER BY sort_order ASC, id ASC`,
    userId,
  );
  return profileFromParts(row, educations, experiences, languages, certificates, new Date().toISOString());
}

export async function loadCandidateProfileSummary(
  userId: string,
): Promise<CandidateProfileSummary | null> {
  const profile = await loadCandidateProfile(userId);
  return toProfileSummary(profile);
}

export async function loadCandidateProfileSummaries(
  userIds: string[],
): Promise<Map<string, CandidateProfileSummary>> {
  const map = new Map<string, CandidateProfileSummary>();
  const unique = [...new Set(userIds.filter(Boolean))];
  await Promise.all(
    unique.map(async (userId) => {
      const summary = await loadCandidateProfileSummary(userId);
      if (summary) map.set(userId, summary);
    }),
  );
  return map;
}

export async function saveCandidateProfile(
  userId: string,
  input: CandidateProfileInput,
): Promise<CandidateProfile> {
  const normalized = normalizeProfileInput(input);
  const db = await getDb();
  const existing = await db.getFirstAsync<CandidateProfileRow>(
    `SELECT * FROM candidate_profiles WHERE user_id = ?`,
    userId,
  );
  const updatedAt = new Date().toISOString();

  let laudoFileName = existing?.laudo_file_name ?? null;
  let laudoFileUri = existing?.laudo_file_uri ?? null;
  let laudoFileSize = existing?.laudo_file_size_bytes ?? null;

  if (normalized.core.disabilityStatus !== "YES") {
    if (laudoFileUri) {
      await deleteLaudoPdf(laudoFileUri);
    }
    laudoFileName = null;
    laudoFileUri = null;
    laudoFileSize = null;
  }

  await db.runAsync(
    `INSERT INTO candidate_profiles (
      user_id, full_name, phone, birth_date, gender, linkedin_url,
      disability_status, disability_detail, disability_cid,
      laudo_file_name, laudo_file_uri, laudo_file_size_bytes,
      lives_in_brazil, cep, street, state, city,
      objective, salary_expectation, work_model, availability, skills_json,
      diversity_pronoun, diversity_gender_identity, diversity_orientation,
      diversity_race, diversity_origin_city, diversity_share_consent, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      full_name = excluded.full_name,
      phone = excluded.phone,
      birth_date = excluded.birth_date,
      gender = excluded.gender,
      linkedin_url = excluded.linkedin_url,
      disability_status = excluded.disability_status,
      disability_detail = excluded.disability_detail,
      disability_cid = excluded.disability_cid,
      laudo_file_name = excluded.laudo_file_name,
      laudo_file_uri = excluded.laudo_file_uri,
      laudo_file_size_bytes = excluded.laudo_file_size_bytes,
      lives_in_brazil = excluded.lives_in_brazil,
      cep = excluded.cep,
      street = excluded.street,
      state = excluded.state,
      city = excluded.city,
      objective = excluded.objective,
      salary_expectation = excluded.salary_expectation,
      work_model = excluded.work_model,
      availability = excluded.availability,
      skills_json = excluded.skills_json,
      diversity_pronoun = excluded.diversity_pronoun,
      diversity_gender_identity = excluded.diversity_gender_identity,
      diversity_orientation = excluded.diversity_orientation,
      diversity_race = excluded.diversity_race,
      diversity_origin_city = excluded.diversity_origin_city,
      diversity_share_consent = excluded.diversity_share_consent,
      updated_at = excluded.updated_at`,
    userId,
    normalized.core.fullName,
    normalized.core.phone,
    normalized.core.birthDate,
    normalized.core.gender,
    normalized.core.linkedinUrl,
    normalized.core.disabilityStatus,
    normalized.core.disabilityDetail,
    normalized.core.disabilityCid,
    laudoFileName,
    laudoFileUri,
    laudoFileSize,
    normalized.core.livesInBrazil ? 1 : 0,
    normalized.core.cep,
    normalized.core.street,
    normalized.core.state,
    normalized.core.city,
    normalized.core.objective,
    normalized.core.salaryExpectation,
    normalized.core.workModel,
    normalized.core.availability,
    JSON.stringify(normalized.core.skills),
    normalized.core.diversityPronoun,
    normalized.core.diversityGenderIdentity,
    normalized.core.diversityOrientation,
    normalized.core.diversityRace,
    normalized.core.diversityOriginCity,
    normalized.core.diversityShareConsent ? 1 : 0,
    updatedAt,
  );

  await db.runAsync(`DELETE FROM candidate_educations WHERE user_id = ?`, userId);
  await db.runAsync(`DELETE FROM candidate_experiences WHERE user_id = ?`, userId);
  await db.runAsync(`DELETE FROM candidate_languages WHERE user_id = ?`, userId);
  await db.runAsync(`DELETE FROM candidate_certificates WHERE user_id = ?`, userId);

  for (let i = 0; i < normalized.educations.length; i++) {
    const item = normalized.educations[i];
    await db.runAsync(
      `INSERT INTO candidate_educations
        (id, user_id, level, course, institution, start_month, end_month, ongoing, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      await createId(),
      userId,
      item.level,
      item.course,
      item.institution,
      item.startMonth,
      item.endMonth,
      item.ongoing ? 1 : 0,
      i,
    );
  }

  for (let i = 0; i < normalized.experiences.length; i++) {
    const item = normalized.experiences[i];
    await db.runAsync(
      `INSERT INTO candidate_experiences
        (id, user_id, company, role, start_month, end_month, current, description, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      await createId(),
      userId,
      item.company,
      item.role,
      item.startMonth,
      item.endMonth,
      item.current ? 1 : 0,
      item.description,
      i,
    );
  }

  for (let i = 0; i < normalized.languages.length; i++) {
    const item = normalized.languages[i];
    await db.runAsync(
      `INSERT INTO candidate_languages (id, user_id, language, level, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      await createId(),
      userId,
      item.language,
      item.level,
      i,
    );
  }

  for (let i = 0; i < normalized.certificates.length; i++) {
    const item = normalized.certificates[i];
    await db.runAsync(
      `INSERT INTO candidate_certificates (id, user_id, title, description, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      await createId(),
      userId,
      item.title,
      item.description,
      i,
    );
  }

  return loadCandidateProfile(userId);
}

export async function updateLaudoMeta(
  userId: string,
  meta: { fileName: string; fileUri: string; fileSizeBytes: number } | null,
): Promise<CandidateProfile> {
  const db = await getDb();
  const existing = await db.getFirstAsync<CandidateProfileRow>(
    `SELECT * FROM candidate_profiles WHERE user_id = ?`,
    userId,
  );
  if (!existing) {
    fail("INVALID_BODY", "Preencha o cadastro antes de anexar o laudo.");
  }
  if (existing.disability_status !== "YES") {
    fail("INVALID_BODY", "O laudo só pode ser anexado quando a deficiência for Sim.");
  }

  if (existing.laudo_file_uri && existing.laudo_file_uri !== meta?.fileUri) {
    await deleteLaudoPdf(existing.laudo_file_uri);
  }

  const updatedAt = new Date().toISOString();
  await db.runAsync(
    `UPDATE candidate_profiles
     SET laudo_file_name = ?, laudo_file_uri = ?, laudo_file_size_bytes = ?, updated_at = ?
     WHERE user_id = ?`,
    meta?.fileName ?? null,
    meta?.fileUri ?? null,
    meta?.fileSizeBytes ?? null,
    updatedAt,
    userId,
  );
  return loadCandidateProfile(userId);
}

export async function getLaudoFileUri(userId: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ laudo_file_uri: string | null }>(
    `SELECT laudo_file_uri FROM candidate_profiles WHERE user_id = ?`,
    userId,
  );
  return row?.laudo_file_uri ?? null;
}
