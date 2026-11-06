export type FeedbackPoint = {
  title: string;
  detail: string;
};

export type Suggestion = {
  action: string;
  why: string;
  example?: string;
};

export type AnalysisDimensions = {
  structure: { summary: string };
  clarity: { summary: string };
  skills: {
    identified: string[];
    missing: string[];
    summary: string;
  };
  keywords: {
    present: string[];
    missing: string[];
    summary: string;
  };
};

export type AnalysisResult = {
  strengths: FeedbackPoint[];
  attentionPoints: FeedbackPoint[];
  suggestions: Suggestion[];
  dimensions: AnalysisDimensions;
};

export type AnalysisStatus =
  | "PENDING"
  | "EXTRACTING"
  | "ANALYZING"
  | "COMPLETED"
  | "FAILED";

export type AnalysisSummary = {
  id: string;
  fileName: string;
  status: AnalysisStatus;
  createdAt: string;
};

export type AnalysisDetail = AnalysisSummary & {
  fileSizeBytes: number;
  result: AnalysisResult | null;
  errorMessage?: string;
};

export type Role = "CANDIDATE" | "RECRUITER" | "EMPLOYER";

export type ApplicationStatus =
  | "SUBMITTED"
  | "DISCARDED"
  | "FORWARDED"
  | "ADJUSTMENT_REQUESTED"
  | "ACCEPTED"
  | "REJECTED";

export type DecisionAction = "ACCEPT" | "REJECT" | "REQUEST_ADJUSTMENT";

export type InterviewStatus = "PROPOSED" | "ACCEPTED" | "DECLINED";

export type InterviewRespondAction = "ACCEPT" | "DECLINE";

export type ApplicationEventType =
  | "SUBMITTED"
  | "RESUBMITTED"
  | "FORWARDED"
  | "DISCARDED"
  | "ADJUSTMENT_REQUESTED"
  | "ACCEPTED"
  | "REJECTED"
  | "INTERVIEW_PROPOSED"
  | "INTERVIEW_ACCEPTED"
  | "INTERVIEW_DECLINED";

export type AgendaItem = {
  id: string;
  applicationId: string;
  jobId: string;
  jobTitle: string;
  type: ApplicationEventType;
  /** ISO — dia/hora em que o item aparece no calendário. */
  date: string;
  createdAt: string;
  /** Recrutador e contratante. */
  candidateEmail?: string;
  /** Recrutador e contratante: nome do cadastro, se houver. */
  candidateName?: string;
  interviewStatus?: InterviewStatus | null;
};

export type Interview = {
  id: string;
  applicationId: string;
  jobId: string;
  jobTitle: string;
  scheduledAt: string;
  status: InterviewStatus;
  createdAt: string;
  respondedAt?: string | null;
  /** Recrutador e contratante: identifica o candidato. */
  candidateEmail?: string;
  /** Recrutador e contratante: nome do cadastro, se houver. */
  candidateName?: string;
};

export type Me = {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
};

/** Resposta de deficiência no cadastro do candidato. */
export type DisabilityStatus = "NO" | "YES" | "PREFER_NOT_SAY";

export type WorkModel = "ONSITE" | "HYBRID" | "REMOTE" | "FLEXIBLE";

export type EducationLevel =
  | "HIGH_SCHOOL"
  | "TECHNICAL"
  | "UNDERGRADUATE"
  | "POSTGRADUATE"
  | "MASTERS"
  | "DOCTORATE"
  | "OTHER";

export type LanguageLevel = "BASIC" | "INTERMEDIATE" | "ADVANCED" | "FLUENT";

export type CandidateEducation = {
  id: string;
  level: EducationLevel;
  course: string;
  institution: string;
  startMonth: string;
  endMonth: string | null;
  ongoing: boolean;
};

export type CandidateExperience = {
  id: string;
  company: string;
  role: string;
  startMonth: string;
  endMonth: string | null;
  current: boolean;
  description: string;
};

export type CandidateLanguage = {
  id: string;
  language: string;
  level: LanguageLevel;
};

export type CandidateCertificate = {
  id: string;
  title: string;
  description: string;
};

export type CandidateLaudoMeta = {
  fileName: string;
  fileSizeBytes: number;
};

/** Perfil completo — só o candidato lê e edita. */
export type CandidateProfile = {
  fullName: string;
  phone: string;
  birthDate: string;
  gender: string;
  linkedinUrl: string | null;
  disabilityStatus: DisabilityStatus;
  disabilityDetail: string | null;
  disabilityCid: string | null;
  laudo: CandidateLaudoMeta | null;
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
  educations: CandidateEducation[];
  experiences: CandidateExperience[];
  languages: CandidateLanguage[];
  certificates: CandidateCertificate[];
  diversityPronoun: string | null;
  diversityGenderIdentity: string | null;
  diversityOrientation: string | null;
  diversityRace: string | null;
  diversityOriginCity: string | null;
  diversityShareConsent: boolean;
  /** Bloco pessoal + endereço obrigatórios preenchidos. */
  isComplete: boolean;
  updatedAt: string;
};

/** Payload de escrita do perfil (sem metadados do laudo). */
export type CandidateProfileInput = {
  fullName: string;
  phone: string;
  birthDate: string;
  gender: string;
  linkedinUrl?: string | null;
  disabilityStatus: DisabilityStatus;
  disabilityDetail?: string | null;
  disabilityCid?: string | null;
  livesInBrazil: boolean;
  cep: string;
  street: string;
  state: string;
  city: string;
  objective?: string | null;
  salaryExpectation?: number | null;
  workModel?: WorkModel | null;
  availability?: string | null;
  skills?: string[];
  educations?: Omit<CandidateEducation, "id">[];
  experiences?: Omit<CandidateExperience, "id">[];
  languages?: Omit<CandidateLanguage, "id">[];
  certificates?: Omit<CandidateCertificate, "id">[];
  diversityPronoun?: string | null;
  diversityGenderIdentity?: string | null;
  diversityOrientation?: string | null;
  diversityRace?: string | null;
  diversityOriginCity?: string | null;
  diversityShareConsent?: boolean;
};

/** Resumo profissional visível a recrutador e contratante. */
export type CandidateProfileSummary = {
  fullName: string;
  city: string;
  state: string;
  objective: string | null;
  latestEducation: {
    level: EducationLevel;
    course: string;
    institution: string;
  } | null;
  latestExperience: {
    company: string;
    role: string;
  } | null;
};

export const MAX_CANDIDATE_SKILLS = 30;

export const DISABILITY_STATUS_LABELS: Record<DisabilityStatus, string> = {
  NO: "Não",
  YES: "Sim",
  PREFER_NOT_SAY: "Prefiro não dizer",
};

export const WORK_MODEL_LABELS: Record<WorkModel, string> = {
  ONSITE: "Presencial",
  HYBRID: "Híbrido",
  REMOTE: "Remoto",
  FLEXIBLE: "Flexível",
};

export const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
  HIGH_SCHOOL: "Ensino médio",
  TECHNICAL: "Técnico",
  UNDERGRADUATE: "Graduação",
  POSTGRADUATE: "Pós-graduação",
  MASTERS: "Mestrado",
  DOCTORATE: "Doutorado",
  OTHER: "Outro",
};

export const LANGUAGE_LEVEL_LABELS: Record<LanguageLevel, string> = {
  BASIC: "Básico",
  INTERMEDIATE: "Intermediário",
  ADVANCED: "Avançado",
  FLUENT: "Fluente",
};

export const DISABILITY_STATUSES: readonly DisabilityStatus[] = [
  "NO",
  "YES",
  "PREFER_NOT_SAY",
] as const;

export const WORK_MODELS: readonly WorkModel[] = [
  "ONSITE",
  "HYBRID",
  "REMOTE",
  "FLEXIBLE",
] as const;

export const EDUCATION_LEVELS: readonly EducationLevel[] = [
  "HIGH_SCHOOL",
  "TECHNICAL",
  "UNDERGRADUATE",
  "POSTGRADUATE",
  "MASTERS",
  "DOCTORATE",
  "OTHER",
] as const;

export const LANGUAGE_LEVELS: readonly LanguageLevel[] = [
  "BASIC",
  "INTERMEDIATE",
  "ADVANCED",
  "FLUENT",
] as const;

export function isDisabilityStatus(value: unknown): value is DisabilityStatus {
  return typeof value === "string" && (DISABILITY_STATUSES as readonly string[]).includes(value);
}

export function isWorkModel(value: unknown): value is WorkModel {
  return typeof value === "string" && (WORK_MODELS as readonly string[]).includes(value);
}

export function isEducationLevel(value: unknown): value is EducationLevel {
  return typeof value === "string" && (EDUCATION_LEVELS as readonly string[]).includes(value);
}

export function isLanguageLevel(value: unknown): value is LanguageLevel {
  return typeof value === "string" && (LANGUAGE_LEVELS as readonly string[]).includes(value);
}

export function isCandidateProfileComplete(profile: {
  fullName: string;
  phone: string;
  birthDate: string;
  gender: string;
  disabilityStatus: DisabilityStatus;
  disabilityDetail: string | null;
  livesInBrazil: boolean;
  cep: string;
  street: string;
  state: string;
  city: string;
}): boolean {
  if (profile.fullName.trim().length < 2) return false;
  if (profile.phone.trim().length < 8) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(profile.birthDate.trim())) return false;
  if (profile.gender.trim().length < 1) return false;
  if (!isDisabilityStatus(profile.disabilityStatus)) return false;
  if (
    profile.disabilityStatus === "YES" &&
    (!profile.disabilityDetail || profile.disabilityDetail.trim().length < 2)
  ) {
    return false;
  }
  if (profile.livesInBrazil) {
    const cepDigits = profile.cep.replace(/\D/g, "");
    if (cepDigits.length !== 8) return false;
  }
  if (profile.street.trim().length < 2) return false;
  if (profile.state.trim().length < 2) return false;
  if (profile.city.trim().length < 2) return false;
  return true;
}

/** Destino ao tocar uma lacuna na força do perfil (passo do cadastro ou biblioteca). */
export type CandidateProfileStrengthDestination = 0 | 1 | 2 | 3 | "resume";

export type CandidateProfileStrengthItem = {
  id: string;
  label: string;
  done: boolean;
  destination: CandidateProfileStrengthDestination;
  /** Se false, aparece como recomendação e não entra em done/total. */
  required: boolean;
};

export type CandidateProfileStrength = {
  done: number;
  total: number;
  items: CandidateProfileStrengthItem[];
};

const MIN_STRENGTH_SKILLS = 3;

function isPersonalBasicsComplete(profile: {
  fullName: string;
  phone: string;
  birthDate: string;
  gender: string;
  disabilityStatus: DisabilityStatus;
  disabilityDetail: string | null;
}): boolean {
  if (profile.fullName.trim().length < 2) return false;
  if (profile.phone.trim().length < 8) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(profile.birthDate.trim())) return false;
  if (profile.gender.trim().length < 1) return false;
  if (!isDisabilityStatus(profile.disabilityStatus)) return false;
  if (
    profile.disabilityStatus === "YES" &&
    (!profile.disabilityDetail || profile.disabilityDetail.trim().length < 2)
  ) {
    return false;
  }
  return true;
}

function isAddressBasicsComplete(profile: {
  livesInBrazil: boolean;
  cep: string;
  street: string;
  state: string;
  city: string;
}): boolean {
  if (profile.livesInBrazil) {
    const cepDigits = profile.cep.replace(/\D/g, "");
    if (cepDigits.length !== 8) return false;
  }
  if (profile.street.trim().length < 2) return false;
  if (profile.state.trim().length < 2) return false;
  if (profile.city.trim().length < 2) return false;
  return true;
}

/**
 * Completude acionável do perfil do candidato (além do mínimo de isComplete).
 * Experiência é recomendação: não impede 100% (primeiro emprego).
 */
export function candidateProfileStrength(
  profile: CandidateProfile | null,
  hasMainResume: boolean,
): CandidateProfileStrength {
  const personalDone = profile ? isPersonalBasicsComplete(profile) : false;
  const addressDone = profile ? isAddressBasicsComplete(profile) : false;
  const contactDone = personalDone && addressDone;
  const contactDestination: CandidateProfileStrengthDestination = personalDone ? 1 : 0;

  const objectiveDone = Boolean(profile?.objective?.trim());
  const educationDone = (profile?.educations.length ?? 0) >= 1;
  const skillsDone = (profile?.skills.length ?? 0) >= MIN_STRENGTH_SKILLS;
  const workModelDone = profile?.workModel != null;
  const experienceDone = (profile?.experiences.length ?? 0) >= 1;

  const items: CandidateProfileStrengthItem[] = [
    {
      id: "contact",
      label: "Contato e endereço",
      done: contactDone,
      destination: contactDestination,
      required: true,
    },
    {
      id: "objective",
      label: "Objetivo profissional",
      done: objectiveDone,
      destination: 2,
      required: true,
    },
    {
      id: "education",
      label: "Formação (pelo menos 1)",
      done: educationDone,
      destination: 3,
      required: true,
    },
    {
      id: "skills",
      label: `Habilidades (pelo menos ${MIN_STRENGTH_SKILLS})`,
      done: skillsDone,
      destination: 3,
      required: true,
    },
    {
      id: "workModel",
      label: "Modelo de trabalho",
      done: workModelDone,
      destination: 2,
      required: true,
    },
    {
      id: "mainResume",
      label: "Currículo principal",
      done: hasMainResume,
      destination: "resume",
      required: true,
    },
    {
      id: "experience",
      label: "Experiência profissional",
      done: experienceDone,
      destination: 3,
      required: false,
    },
  ];

  const required = items.filter((item) => item.required);
  return {
    done: required.filter((item) => item.done).length,
    total: required.length,
    items,
  };
}

/** Áreas de contratação / especialidade (contratante e recrutador). */
export type HiringArea =
  | "TECHNOLOGY"
  | "PRODUCT"
  | "DATA"
  | "DESIGN"
  | "SALES"
  | "OPERATIONS"
  | "FINANCE"
  | "HEALTH"
  | "EDUCATION"
  | "INDUSTRY"
  | "SERVICES"
  | "OTHER";

export type CompanySize = "1_10" | "11_50" | "51_200" | "201_1000" | "1000_PLUS";

export type RecruiterWorkMode = "CONSULTANCY" | "INDEPENDENT" | "IN_HOUSE";

export const HIRING_AREAS: readonly HiringArea[] = [
  "TECHNOLOGY",
  "PRODUCT",
  "DATA",
  "DESIGN",
  "SALES",
  "OPERATIONS",
  "FINANCE",
  "HEALTH",
  "EDUCATION",
  "INDUSTRY",
  "SERVICES",
  "OTHER",
] as const;

export const HIRING_AREA_LABELS: Record<HiringArea, string> = {
  TECHNOLOGY: "Tecnologia",
  PRODUCT: "Produto",
  DATA: "Dados",
  DESIGN: "Design",
  SALES: "Comercial",
  OPERATIONS: "Operações",
  FINANCE: "Financeiro",
  HEALTH: "Saúde",
  EDUCATION: "Educação",
  INDUSTRY: "Indústria",
  SERVICES: "Serviços",
  OTHER: "Outro",
};

export const COMPANY_SIZES: readonly CompanySize[] = [
  "1_10",
  "11_50",
  "51_200",
  "201_1000",
  "1000_PLUS",
] as const;

export const COMPANY_SIZE_LABELS: Record<CompanySize, string> = {
  "1_10": "1–10 pessoas",
  "11_50": "11–50 pessoas",
  "51_200": "51–200 pessoas",
  "201_1000": "201–1000 pessoas",
  "1000_PLUS": "1000+ pessoas",
};

export const RECRUITER_WORK_MODES: readonly RecruiterWorkMode[] = [
  "CONSULTANCY",
  "INDEPENDENT",
  "IN_HOUSE",
] as const;

export const RECRUITER_WORK_MODE_LABELS: Record<RecruiterWorkMode, string> = {
  CONSULTANCY: "Consultoria",
  INDEPENDENT: "Autônomo",
  IN_HOUSE: "Interno",
};

export const MAX_EMPLOYER_VALUES = 5;
export const MAX_RECRUITER_CERTIFICATES = 8;
export const MIN_PROFILE_ABOUT_LENGTH = 40;

export function isHiringArea(value: unknown): value is HiringArea {
  return typeof value === "string" && (HIRING_AREAS as readonly string[]).includes(value);
}

export function isCompanySize(value: unknown): value is CompanySize {
  return typeof value === "string" && (COMPANY_SIZES as readonly string[]).includes(value);
}

export function isRecruiterWorkMode(value: unknown): value is RecruiterWorkMode {
  return (
    typeof value === "string" && (RECRUITER_WORK_MODES as readonly string[]).includes(value)
  );
}

/** Remove máscara e deixa só dígitos do CNPJ. */
export function cnpjDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 14);
}

/** Valida CNPJ com 14 dígitos e dígitos verificadores. */
export function isValidCnpj(value: string): boolean {
  const digits = cnpjDigits(value);
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const calc = (base: string, factors: number[]): number => {
    const sum = factors.reduce((acc, factor, i) => acc + Number(base[i]) * factor, 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const d1 = calc(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(digits.slice(0, 12) + String(d1), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return digits.endsWith(`${d1}${d2}`);
}

export type EmployerProfile = {
  tradeName: string;
  legalName: string;
  cnpj: string | null;
  industry: HiringArea | null;
  companySize: CompanySize | null;
  foundedYear: number | null;
  website: string | null;
  linkedinUrl: string | null;
  about: string | null;
  livesInBrazil: boolean;
  cep: string;
  street: string;
  state: string;
  city: string;
  contactName: string;
  contactRole: string;
  phone: string;
  commercialEmail: string | null;
  hiringAreas: HiringArea[];
  seniorities: JobSeniority[];
  contractTypes: JobContractType[];
  workModels: WorkModel[];
  benefits: string[];
  cultureValues: string[];
  inclusionNote: string | null;
  isComplete: boolean;
  updatedAt: string;
};

export type EmployerProfileInput = {
  tradeName: string;
  legalName?: string;
  cnpj?: string | null;
  industry?: HiringArea | null;
  companySize?: CompanySize | null;
  foundedYear?: number | null;
  website?: string | null;
  linkedinUrl?: string | null;
  about?: string | null;
  livesInBrazil: boolean;
  cep: string;
  street: string;
  state: string;
  city: string;
  contactName: string;
  contactRole: string;
  phone: string;
  commercialEmail?: string | null;
  hiringAreas?: HiringArea[];
  seniorities?: JobSeniority[];
  contractTypes?: JobContractType[];
  workModels?: WorkModel[];
  benefits?: string[];
  cultureValues?: string[];
  inclusionNote?: string | null;
};

export type RecruiterCertificate = {
  id: string;
  title: string;
};

export type RecruiterProfile = {
  fullName: string;
  headline: string;
  phone: string;
  linkedinUrl: string | null;
  state: string;
  city: string;
  bio: string | null;
  workMode: RecruiterWorkMode | null;
  consultancyName: string | null;
  consultancyWebsite: string | null;
  yearsExperience: number | null;
  availability: string | null;
  focusAreas: HiringArea[];
  seniorities: JobSeniority[];
  contractTypes: JobContractType[];
  languages: CandidateLanguage[];
  certificates: RecruiterCertificate[];
  isComplete: boolean;
  updatedAt: string;
};

export type RecruiterProfileInput = {
  fullName: string;
  headline: string;
  phone: string;
  linkedinUrl?: string | null;
  state: string;
  city: string;
  bio?: string | null;
  workMode?: RecruiterWorkMode | null;
  consultancyName?: string | null;
  consultancyWebsite?: string | null;
  yearsExperience?: number | null;
  availability?: string | null;
  focusAreas?: HiringArea[];
  seniorities?: JobSeniority[];
  contractTypes?: JobContractType[];
  languages?: Omit<CandidateLanguage, "id">[];
  certificates?: Omit<RecruiterCertificate, "id">[];
};

export type EmployerProfileStrengthDestination = 0 | 1 | 2 | 3 | 4;
export type RecruiterProfileStrengthDestination = 0 | 1 | 2;

export type EmployerProfileStrengthItem = {
  id: string;
  label: string;
  done: boolean;
  destination: EmployerProfileStrengthDestination;
  required: boolean;
};

export type RecruiterProfileStrengthItem = {
  id: string;
  label: string;
  done: boolean;
  destination: RecruiterProfileStrengthDestination;
  required: boolean;
};

export type EmployerProfileStrength = {
  done: number;
  total: number;
  items: EmployerProfileStrengthItem[];
};

export type RecruiterProfileStrength = {
  done: number;
  total: number;
  items: RecruiterProfileStrengthItem[];
};

export function isEmployerProfileComplete(profile: {
  tradeName: string;
  industry: HiringArea | null;
  companySize: CompanySize | null;
  about: string | null;
  state: string;
  city: string;
  contactName: string;
  contactRole: string;
  phone: string;
}): boolean {
  if (profile.tradeName.trim().length < 2) return false;
  if (!profile.industry || !isHiringArea(profile.industry)) return false;
  if (!profile.companySize || !isCompanySize(profile.companySize)) return false;
  if ((profile.about?.trim().length ?? 0) < MIN_PROFILE_ABOUT_LENGTH) return false;
  if (profile.state.trim().length < 2) return false;
  if (profile.city.trim().length < 2) return false;
  if (profile.contactName.trim().length < 2) return false;
  if (profile.contactRole.trim().length < 2) return false;
  if (profile.phone.trim().length < 8) return false;
  return true;
}

export function isRecruiterProfileComplete(profile: {
  fullName: string;
  headline: string;
  phone: string;
  state: string;
  city: string;
  bio: string | null;
  focusAreas: HiringArea[];
}): boolean {
  if (profile.fullName.trim().length < 2) return false;
  if (profile.headline.trim().length < 2) return false;
  if (profile.phone.trim().length < 8) return false;
  if (profile.state.trim().length < 2) return false;
  if (profile.city.trim().length < 2) return false;
  if ((profile.bio?.trim().length ?? 0) < MIN_PROFILE_ABOUT_LENGTH) return false;
  if (profile.focusAreas.length < 1) return false;
  return true;
}

export function employerProfileStrength(
  profile: EmployerProfile | null,
): EmployerProfileStrength {
  const companyDone = Boolean(
    profile &&
      profile.tradeName.trim().length >= 2 &&
      profile.industry &&
      profile.companySize &&
      (profile.about?.trim().length ?? 0) >= MIN_PROFILE_ABOUT_LENGTH,
  );
  const addressDone = Boolean(
    profile && profile.state.trim().length >= 2 && profile.city.trim().length >= 2,
  );
  const contactDone = Boolean(
    profile &&
      profile.contactName.trim().length >= 2 &&
      profile.contactRole.trim().length >= 2 &&
      profile.phone.trim().length >= 8,
  );
  const cnpjDone = Boolean(profile?.cnpj && isValidCnpj(profile.cnpj));
  const websiteDone = Boolean(profile?.website?.trim());
  const areasDone = (profile?.hiringAreas.length ?? 0) >= 1;
  const benefitsDone = (profile?.benefits.length ?? 0) >= 1;

  const items: EmployerProfileStrengthItem[] = [
    {
      id: "company",
      label: "Empresa (nome, setor, porte e sobre)",
      done: companyDone,
      destination: 0,
      required: true,
    },
    {
      id: "address",
      label: "Cidade e UF",
      done: addressDone,
      destination: 1,
      required: true,
    },
    {
      id: "contact",
      label: "Responsável e telefone",
      done: contactDone,
      destination: 2,
      required: true,
    },
    {
      id: "cnpj",
      label: "CNPJ",
      done: cnpjDone,
      destination: 0,
      required: false,
    },
    {
      id: "website",
      label: "Site da empresa",
      done: websiteDone,
      destination: 0,
      required: false,
    },
    {
      id: "hiringAreas",
      label: "Áreas de contratação",
      done: areasDone,
      destination: 3,
      required: false,
    },
    {
      id: "benefits",
      label: "Benefícios oferecidos",
      done: benefitsDone,
      destination: 3,
      required: false,
    },
  ];

  const required = items.filter((item) => item.required);
  return {
    done: required.filter((item) => item.done).length,
    total: required.length,
    items,
  };
}

export function recruiterProfileStrength(
  profile: RecruiterProfile | null,
): RecruiterProfileStrength {
  const personalDone = Boolean(
    profile &&
      profile.fullName.trim().length >= 2 &&
      profile.headline.trim().length >= 2 &&
      profile.phone.trim().length >= 8 &&
      profile.state.trim().length >= 2 &&
      profile.city.trim().length >= 2 &&
      (profile.bio?.trim().length ?? 0) >= MIN_PROFILE_ABOUT_LENGTH,
  );
  const areasDone = (profile?.focusAreas.length ?? 0) >= 1;
  const linkedinDone = Boolean(profile?.linkedinUrl?.trim());
  const yearsDone = profile?.yearsExperience != null && profile.yearsExperience >= 0;
  const languageDone = (profile?.languages.length ?? 0) >= 1;

  const items: RecruiterProfileStrengthItem[] = [
    {
      id: "personal",
      label: "Nome, headline, telefone, cidade e bio",
      done: personalDone,
      destination: 0,
      required: true,
    },
    {
      id: "focusAreas",
      label: "Áreas de foco (pelo menos 1)",
      done: areasDone,
      destination: 2,
      required: true,
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      done: linkedinDone,
      destination: 0,
      required: false,
    },
    {
      id: "years",
      label: "Anos de experiência",
      done: yearsDone,
      destination: 1,
      required: false,
    },
    {
      id: "language",
      label: "Idioma",
      done: languageDone,
      destination: 2,
      required: false,
    },
  ];

  const required = items.filter((item) => item.required);
  return {
    done: required.filter((item) => item.done).length,
    total: required.length,
    items,
  };
}

/** Slot na biblioteca do candidato: 1 principal + até 3 versões focadas. */
export type ResumeKind = "MAIN" | "FOCUSED";

export type Resume = {
  id: string;
  kind: ResumeKind;
  label: string;
  fileName: string;
  fileSizeBytes: number;
  createdAt: string;
  updatedAt: string;
};

export const MAX_FOCUSED_RESUMES = 3;
export const MAIN_RESUME_LABEL = "Currículo principal";

export type AuthResponse = {
  token: string;
  user: Me;
};

export type JobStatus = "DRAFT" | "PUBLISHED";

export type JobSeniority = "JUNIOR" | "MID" | "SENIOR" | "SPECIALIST";

export type JobContractType =
  | "CLT"
  | "PJ"
  | "INTERNSHIP"
  | "TEMPORARY"
  | "APPRENTICE"
  | "FREELANCER";

export type JobStage = {
  label: string;
  note: string;
};

export type Job = {
  id: string;
  title: string;
  description: string;
  lookingFor: string;
  employerId: string;
  createdAt: string;
  status: JobStatus;
  seniority: JobSeniority | null;
  contractType: JobContractType | null;
  openings: number;
  pcdExclusive: boolean;
  workModel: WorkModel | null;
  city: string | null;
  state: string | null;
  responsibilities: string;
  requirements: string[];
  niceToHave: string[];
  benefits: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  additionalInfo: string;
  stages: JobStage[];
  publishedAt: string | null;
  /** Recrutador: candidaturas ainda na fila (SUBMITTED). */
  queueCount?: number;
  /** Contratante: encaminhadas aguardando decisão (FORWARDED). */
  pendingDecisionCount?: number;
  /** Recrutador: já encaminhadas (FORWARDED). */
  forwardedCount?: number;
  /** Recrutador: aguardando reenvio do candidato (ADJUSTMENT_REQUESTED). */
  adjustmentCount?: number;
  /** Recrutador: DISCARDED + ACCEPTED + REJECTED. */
  closedCount?: number;
};

/** Payload de criação/atualização de vaga (rascunho ou publicação). */
export type JobInput = {
  title: string;
  description?: string;
  lookingFor?: string;
  status?: JobStatus;
  seniority?: JobSeniority | null;
  contractType?: JobContractType | null;
  openings?: number;
  pcdExclusive?: boolean;
  workModel?: WorkModel | null;
  city?: string | null;
  state?: string | null;
  responsibilities?: string;
  requirements?: string[];
  niceToHave?: string[];
  benefits?: string[];
  salaryMin?: number | null;
  salaryMax?: number | null;
  additionalInfo?: string;
  stages?: JobStage[];
};

export const JOB_STATUSES: readonly JobStatus[] = ["DRAFT", "PUBLISHED"] as const;

export const JOB_SENIORITIES: readonly JobSeniority[] = [
  "JUNIOR",
  "MID",
  "SENIOR",
  "SPECIALIST",
] as const;

export const JOB_CONTRACT_TYPES: readonly JobContractType[] = [
  "CLT",
  "PJ",
  "INTERNSHIP",
  "TEMPORARY",
  "APPRENTICE",
  "FREELANCER",
] as const;

export const JOB_SENIORITY_LABELS: Record<JobSeniority, string> = {
  JUNIOR: "Júnior",
  MID: "Pleno",
  SENIOR: "Sênior",
  SPECIALIST: "Especialista",
};

export const JOB_CONTRACT_TYPE_LABELS: Record<JobContractType, string> = {
  CLT: "CLT",
  PJ: "PJ",
  INTERNSHIP: "Estágio",
  TEMPORARY: "Temporário",
  APPRENTICE: "Aprendiz",
  FREELANCER: "Freelancer",
};

export const JOB_BENEFIT_OPTIONS = [
  "Vale-refeição",
  "Vale-alimentação",
  "Plano de saúde",
  "Plano odontológico",
  "Vale-transporte",
  "Home office",
  "Horário flexível",
  "PLR / bônus",
  "Gympass / bem-estar",
  "Auxílio educação",
] as const;

export const DEFAULT_JOB_STAGES: readonly JobStage[] = [
  { label: "Envio do currículo", note: "O candidato encaminha o PDF pela vaga." },
  { label: "Triagem", note: "O recrutador analisa e encaminha ou descarta." },
  { label: "Decisão", note: "O contratante aceita, rejeita ou pede ajuste." },
  { label: "Entrevista", note: "Quando houver avanço, a data aparece na agenda." },
] as const;

export const BRAZIL_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export function isJobStatus(value: unknown): value is JobStatus {
  return typeof value === "string" && (JOB_STATUSES as readonly string[]).includes(value);
}

export function isJobSeniority(value: unknown): value is JobSeniority {
  return typeof value === "string" && (JOB_SENIORITIES as readonly string[]).includes(value);
}

export function isJobContractType(value: unknown): value is JobContractType {
  return typeof value === "string" && (JOB_CONTRACT_TYPES as readonly string[]).includes(value);
}

export function lookingForFromRequirements(requirements: string[]): string {
  return requirements
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .join("; ");
}

export function normalizeStringList(value: unknown, max = 40): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim().replace(/\s+/g, " ");
    if (trimmed.length < 1) continue;
    if (trimmed.length > 120) continue;
    if (!out.includes(trimmed)) out.push(trimmed);
    if (out.length >= max) break;
  }
  return out;
}

export function normalizeJobStages(value: unknown): JobStage[] {
  if (!Array.isArray(value)) return [...DEFAULT_JOB_STAGES];
  const out: JobStage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as { label?: unknown; note?: unknown };
    if (typeof row.label !== "string") continue;
    const label = row.label.trim().replace(/\s+/g, " ");
    if (label.length < 2) continue;
    const note =
      typeof row.note === "string" ? row.note.trim().replace(/\s+/g, " ") : "";
    out.push({ label: label.slice(0, 80), note: note.slice(0, 200) });
    if (out.length >= 12) break;
  }
  return out.length > 0 ? out : [...DEFAULT_JOB_STAGES];
}

export function canPublishJob(input: {
  title: string;
  description: string;
  workModel: WorkModel | null;
  city: string | null;
  state: string | null;
  seniority: JobSeniority | null;
  contractType: JobContractType | null;
  requirements: string[];
}): string | null {
  if (input.title.trim().length < 3) return "Informe um título com pelo menos 3 caracteres.";
  if (!input.seniority) return "Escolha a senioridade.";
  if (!input.contractType) return "Escolha o tipo de contrato.";
  if (!input.workModel) return "Escolha a modalidade de trabalho.";
  if (
    (input.workModel === "ONSITE" || input.workModel === "HYBRID") &&
    (input.city?.trim().length ?? 0) < 2
  ) {
    return "Informe a cidade para vaga presencial ou híbrida.";
  }
  if (
    (input.workModel === "ONSITE" || input.workModel === "HYBRID") &&
    (input.state?.trim().length ?? 0) < 2
  ) {
    return "Informe o estado para vaga presencial ou híbrida.";
  }
  if (input.description.trim().length < 3) {
    return "Descreva o contexto da vaga com pelo menos 3 caracteres.";
  }
  if (input.requirements.filter((r) => r.trim().length > 0).length < 1) {
    return "Inclua ao menos um requisito obrigatório.";
  }
  return null;
}

/** Tags internas do recrutador (só ele vê). Conjunto fixo do MVP. */
export type RecruiterTag =
  | "forte"
  | "duvida"
  | "perfil-senior"
  | "comunicar-depois";

export const RECRUITER_TAGS: readonly RecruiterTag[] = [
  "forte",
  "duvida",
  "perfil-senior",
  "comunicar-depois",
] as const;

export const RECRUITER_TAG_LABELS: Record<RecruiterTag, string> = {
  forte: "Forte",
  duvida: "Dúvida",
  "perfil-senior": "Perfil sênior",
  "comunicar-depois": "Comunicar depois",
};

export type RecruiterNoteAction = "NOTE" | "FORWARD" | "DISCARD";

export type RecruiterNoteEntry = {
  id: string;
  text: string;
  action: RecruiterNoteAction;
  createdAt: string;
};

export type ApplicationSummary = {
  id: string;
  jobId: string;
  jobTitle: string;
  status: ApplicationStatus;
  analysisId: string;
  createdAt: string;
  updatedAt: string;
  decisionMessage?: string | null;
  /** Recrutador (sempre) e contratante (agenda/entrevista). */
  candidateEmail?: string;
  /** Recrutador e contratante: resumo profissional do cadastro. */
  candidateProfile?: CandidateProfileSummary | null;
  /** Só aparece para o recrutador. 1 na primeira vez; incrementa no reenvio. */
  submissionCount?: number;
  /** Só aparece para o recrutador. Até 3 competências da análise. */
  previewSkills?: string[];
  /** Só aparece para o recrutador. Até 2 títulos de pontos fortes. */
  previewStrengths?: string[];
  /** Só aparece para o recrutador. Até 1 título de ponto de atenção. */
  previewAttention?: string[];
  /** Só aparece para o recrutador. Tags internas. */
  recruiterTags?: RecruiterTag[];
  /** Convite atual (PROPOSED ou ACCEPTED), se houver. */
  interviewStatus?: InterviewStatus | null;
  /** Data/hora do convite atual. */
  interviewScheduledAt?: string | null;
};

export type ApplicationDetail = ApplicationSummary & {
  /** Só aparece para o recrutador. Atalho da última nota do histórico. */
  recruiterNote?: string | null;
  /** Só aparece para o recrutador. Histórico append-only, mais recente primeiro. */
  recruiterNotes?: RecruiterNoteEntry[];
  analysis?: AnalysisDetail | null;
  /** Histórico de convites, mais recente primeiro. */
  interviews?: Interview[];
};

export function isRecruiterTag(value: unknown): value is RecruiterTag {
  return typeof value === "string" && (RECRUITER_TAGS as readonly string[]).includes(value);
}

export function normalizeRecruiterTags(value: unknown): RecruiterTag[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<RecruiterTag>();
  const out: RecruiterTag[] = [];
  for (const item of value) {
    if (isRecruiterTag(item) && !seen.has(item)) {
      seen.add(item);
      out.push(item);
    }
  }
  return out;
}

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_CREDENTIALS"
  | "ROLE_MISMATCH"
  | "EMAIL_TAKEN"
  | "INVALID_FILE"
  | "FILE_TOO_LARGE"
  | "TEXT_NOT_EXTRACTABLE"
  | "TEXT_TOO_SHORT"
  | "AI_UNAVAILABLE"
  | "AI_INVALID_RESPONSE"
  | "NOT_FOUND"
  | "ROLE_REQUIRED"
  | "FORBIDDEN"
  | "ALREADY_APPLIED"
  | "INVALID_BODY"
  | "INVALID_TRANSITION"
  | "INTERNAL";

export type ApiErrorBody = {
  error: ApiErrorCode;
  message: string;
};

export const ROLE_LABELS: Record<Role, string> = {
  CANDIDATE: "Candidato",
  RECRUITER: "Recrutador",
  EMPLOYER: "Contratante",
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  SUBMITTED: "Candidatura enviada",
  DISCARDED: "Não avançou",
  FORWARDED: "Encaminhada ao contratante",
  ADJUSTMENT_REQUESTED: "Pedido de ajuste",
  ACCEPTED: "Aceita",
  REJECTED: "Recusada",
};

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  PROPOSED: "Aguardando resposta",
  ACCEPTED: "Data confirmada",
  DECLINED: "Data recusada",
};

export const APPLICATION_EVENT_LABELS: Record<ApplicationEventType, string> = {
  SUBMITTED: "Currículo enviado",
  RESUBMITTED: "Currículo reenviado",
  FORWARDED: "Encaminhada ao contratante",
  DISCARDED: "Descartada na triagem",
  ADJUSTMENT_REQUESTED: "Pedido de ajuste",
  ACCEPTED: "Candidatura aceita",
  REJECTED: "Candidatura recusada",
  INTERVIEW_PROPOSED: "Entrevista proposta",
  INTERVIEW_ACCEPTED: "Entrevista confirmada",
  INTERVIEW_DECLINED: "Entrevista recusada",
};

function isPoint(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const v = value as FeedbackPoint;
  return typeof v.title === "string" && v.title.length >= 3 && typeof v.detail === "string" && v.detail.length >= 8;
}

function isSuggestion(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const v = value as Suggestion;
  return (
    typeof v.action === "string" &&
    v.action.length >= 8 &&
    typeof v.why === "string" &&
    v.why.length >= 8 &&
    (v.example === undefined || typeof v.example === "string")
  );
}

export function isAnalysisResult(value: unknown): value is AnalysisResult {
  if (!value || typeof value !== "object") return false;
  const v = value as AnalysisResult;
  return (
    Array.isArray(v.strengths) &&
    v.strengths.length > 0 &&
    v.strengths.every(isPoint) &&
    Array.isArray(v.attentionPoints) &&
    v.attentionPoints.length > 0 &&
    v.attentionPoints.every(isPoint) &&
    Array.isArray(v.suggestions) &&
    v.suggestions.length > 0 &&
    v.suggestions.every(isSuggestion) &&
    typeof v.dimensions?.structure?.summary === "string" &&
    typeof v.dimensions?.clarity?.summary === "string" &&
    Array.isArray(v.dimensions?.skills?.identified) &&
    Array.isArray(v.dimensions?.skills?.missing) &&
    typeof v.dimensions?.skills?.summary === "string" &&
    Array.isArray(v.dimensions?.keywords?.present) &&
    Array.isArray(v.dimensions?.keywords?.missing) &&
    typeof v.dimensions?.keywords?.summary === "string"
  );
}
