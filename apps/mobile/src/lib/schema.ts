export const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  status TEXT NOT NULL,
  extracted_text TEXT,
  result_json TEXT,
  error_message TEXT,
  model_used TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_analyses_user_created ON analyses(user_id, created_at);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  looking_for TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'DRAFT',
  seniority TEXT,
  contract_type TEXT,
  openings INTEGER NOT NULL DEFAULT 1,
  pcd_exclusive INTEGER NOT NULL DEFAULT 0,
  work_model TEXT,
  city TEXT,
  state TEXT,
  responsibilities TEXT NOT NULL DEFAULT '',
  requirements_json TEXT NOT NULL DEFAULT '[]',
  nice_to_have_json TEXT NOT NULL DEFAULT '[]',
  benefits_json TEXT NOT NULL DEFAULT '[]',
  salary_min INTEGER,
  salary_max INTEGER,
  additional_info TEXT NOT NULL DEFAULT '',
  stages_json TEXT NOT NULL DEFAULT '[]',
  published_at TEXT,
  employer_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_jobs_employer_created ON jobs(employer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY NOT NULL,
  job_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  analysis_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'SUBMITTED',
  recruiter_note TEXT,
  decision_message TEXT,
  submission_count INTEGER NOT NULL DEFAULT 1,
  recruiter_tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE,
  UNIQUE (job_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_candidate_created ON applications(candidate_id, created_at);
CREATE INDEX IF NOT EXISTS idx_applications_job_status ON applications(job_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_status_created ON applications(status, created_at);

CREATE TABLE IF NOT EXISTS recruiter_note_entries (
  id TEXT PRIMARY KEY NOT NULL,
  application_id TEXT NOT NULL,
  text TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_recruiter_notes_app_created ON recruiter_note_entries(application_id, created_at);

CREATE TABLE IF NOT EXISTS resumes (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_uri TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_resumes_user_kind ON resumes(user_id, kind);
CREATE UNIQUE INDEX IF NOT EXISTS idx_resumes_user_main ON resumes(user_id) WHERE kind = 'MAIN';

CREATE TABLE IF NOT EXISTS interviews (
  id TEXT PRIMARY KEY NOT NULL,
  application_id TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PROPOSED',
  created_at TEXT NOT NULL,
  responded_at TEXT,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_interviews_app_created ON interviews(application_id, created_at);
CREATE INDEX IF NOT EXISTS idx_interviews_status_scheduled ON interviews(status, scheduled_at);

CREATE TABLE IF NOT EXISTS application_events (
  id TEXT PRIMARY KEY NOT NULL,
  application_id TEXT NOT NULL,
  type TEXT NOT NULL,
  at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_application_events_app_at ON application_events(application_id, at);
CREATE INDEX IF NOT EXISTS idx_application_events_at ON application_events(at);

CREATE TABLE IF NOT EXISTS candidate_profiles (
  user_id TEXT PRIMARY KEY NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  birth_date TEXT NOT NULL DEFAULT '',
  gender TEXT NOT NULL DEFAULT '',
  linkedin_url TEXT,
  disability_status TEXT NOT NULL DEFAULT 'NO',
  disability_detail TEXT,
  disability_cid TEXT,
  laudo_file_name TEXT,
  laudo_file_uri TEXT,
  laudo_file_size_bytes INTEGER,
  lives_in_brazil INTEGER NOT NULL DEFAULT 1,
  cep TEXT NOT NULL DEFAULT '',
  street TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  objective TEXT,
  salary_expectation INTEGER,
  work_model TEXT,
  availability TEXT,
  skills_json TEXT NOT NULL DEFAULT '[]',
  diversity_pronoun TEXT,
  diversity_gender_identity TEXT,
  diversity_orientation TEXT,
  diversity_race TEXT,
  diversity_origin_city TEXT,
  diversity_share_consent INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS candidate_educations (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  level TEXT NOT NULL,
  course TEXT NOT NULL,
  institution TEXT NOT NULL,
  start_month TEXT NOT NULL,
  end_month TEXT,
  ongoing INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_candidate_educations_user ON candidate_educations(user_id, sort_order);

CREATE TABLE IF NOT EXISTS candidate_experiences (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  start_month TEXT NOT NULL,
  end_month TEXT,
  current INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_candidate_experiences_user ON candidate_experiences(user_id, sort_order);

CREATE TABLE IF NOT EXISTS candidate_languages (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  language TEXT NOT NULL,
  level TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_candidate_languages_user ON candidate_languages(user_id, sort_order);

CREATE TABLE IF NOT EXISTS candidate_certificates (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_candidate_certificates_user ON candidate_certificates(user_id, sort_order);

CREATE TABLE IF NOT EXISTS employer_profiles (
  user_id TEXT PRIMARY KEY NOT NULL,
  trade_name TEXT NOT NULL DEFAULT '',
  legal_name TEXT NOT NULL DEFAULT '',
  cnpj TEXT,
  industry TEXT,
  company_size TEXT,
  founded_year INTEGER,
  website TEXT,
  linkedin_url TEXT,
  about TEXT,
  lives_in_brazil INTEGER NOT NULL DEFAULT 1,
  cep TEXT NOT NULL DEFAULT '',
  street TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  contact_name TEXT NOT NULL DEFAULT '',
  contact_role TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  commercial_email TEXT,
  hiring_areas_json TEXT NOT NULL DEFAULT '[]',
  seniorities_json TEXT NOT NULL DEFAULT '[]',
  contract_types_json TEXT NOT NULL DEFAULT '[]',
  work_models_json TEXT NOT NULL DEFAULT '[]',
  benefits_json TEXT NOT NULL DEFAULT '[]',
  culture_values_json TEXT NOT NULL DEFAULT '[]',
  inclusion_note TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recruiter_profiles (
  user_id TEXT PRIMARY KEY NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  headline TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  linkedin_url TEXT,
  state TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  bio TEXT,
  work_mode TEXT,
  consultancy_name TEXT,
  consultancy_website TEXT,
  years_experience INTEGER,
  availability TEXT,
  focus_areas_json TEXT NOT NULL DEFAULT '[]',
  seniorities_json TEXT NOT NULL DEFAULT '[]',
  contract_types_json TEXT NOT NULL DEFAULT '[]',
  languages_json TEXT NOT NULL DEFAULT '[]',
  certificates_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`;

type SqlRunner = {
  getAllAsync: <T>(source: string) => Promise<T[]>;
  runAsync: (source: string) => Promise<unknown>;
};

/**
 * Colunas adicionadas depois do CREATE — CREATE IF NOT EXISTS não altera banco já instalado.
 * Só roda ALTER se a coluna ainda não existir (ALTER que falha pode estragar a conexão no sql.js/expo-sqlite).
 */
export async function applySchemaMigrations(db: SqlRunner): Promise<void> {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(applications)`);
  const names = new Set(cols.map((col) => col.name));

  if (!names.has("submission_count")) {
    await db.runAsync(
      `ALTER TABLE applications ADD COLUMN submission_count INTEGER NOT NULL DEFAULT 1`,
    );
  }

  if (!names.has("recruiter_tags")) {
    await db.runAsync(
      `ALTER TABLE applications ADD COLUMN recruiter_tags TEXT NOT NULL DEFAULT '[]'`,
    );
  }

  const jobCols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(jobs)`);
  const jobNames = new Set(jobCols.map((col) => col.name));
  const legacyJobsNeedPublish = !jobNames.has("status");

  const jobAlters: { name: string; sql: string }[] = [
    { name: "status", sql: `ALTER TABLE jobs ADD COLUMN status TEXT NOT NULL DEFAULT 'DRAFT'` },
    { name: "seniority", sql: `ALTER TABLE jobs ADD COLUMN seniority TEXT` },
    { name: "contract_type", sql: `ALTER TABLE jobs ADD COLUMN contract_type TEXT` },
    { name: "openings", sql: `ALTER TABLE jobs ADD COLUMN openings INTEGER NOT NULL DEFAULT 1` },
    {
      name: "pcd_exclusive",
      sql: `ALTER TABLE jobs ADD COLUMN pcd_exclusive INTEGER NOT NULL DEFAULT 0`,
    },
    { name: "work_model", sql: `ALTER TABLE jobs ADD COLUMN work_model TEXT` },
    { name: "city", sql: `ALTER TABLE jobs ADD COLUMN city TEXT` },
    { name: "state", sql: `ALTER TABLE jobs ADD COLUMN state TEXT` },
    {
      name: "responsibilities",
      sql: `ALTER TABLE jobs ADD COLUMN responsibilities TEXT NOT NULL DEFAULT ''`,
    },
    {
      name: "requirements_json",
      sql: `ALTER TABLE jobs ADD COLUMN requirements_json TEXT NOT NULL DEFAULT '[]'`,
    },
    {
      name: "nice_to_have_json",
      sql: `ALTER TABLE jobs ADD COLUMN nice_to_have_json TEXT NOT NULL DEFAULT '[]'`,
    },
    {
      name: "benefits_json",
      sql: `ALTER TABLE jobs ADD COLUMN benefits_json TEXT NOT NULL DEFAULT '[]'`,
    },
    { name: "salary_min", sql: `ALTER TABLE jobs ADD COLUMN salary_min INTEGER` },
    { name: "salary_max", sql: `ALTER TABLE jobs ADD COLUMN salary_max INTEGER` },
    {
      name: "additional_info",
      sql: `ALTER TABLE jobs ADD COLUMN additional_info TEXT NOT NULL DEFAULT ''`,
    },
    {
      name: "stages_json",
      sql: `ALTER TABLE jobs ADD COLUMN stages_json TEXT NOT NULL DEFAULT '[]'`,
    },
    { name: "published_at", sql: `ALTER TABLE jobs ADD COLUMN published_at TEXT` },
  ];

  for (const alter of jobAlters) {
    if (!jobNames.has(alter.name)) {
      await db.runAsync(alter.sql);
      jobNames.add(alter.name);
    }
  }

  if (jobNames.has("status")) {
    await db.runAsync(
      `CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at)`,
    );
  }

  // Só na primeira migração: vagas já existentes passam a PUBLISHED.
  if (legacyJobsNeedPublish && jobNames.has("status")) {
    await db.runAsync(
      `UPDATE jobs
       SET status = 'PUBLISHED',
           published_at = COALESCE(published_at, created_at)`,
    );
  }

  await db.runAsync(
    `CREATE TABLE IF NOT EXISTS recruiter_note_entries (
      id TEXT PRIMARY KEY NOT NULL,
      application_id TEXT NOT NULL,
      text TEXT NOT NULL,
      action TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    )`,
  );
  await db.runAsync(
    `CREATE INDEX IF NOT EXISTS idx_recruiter_notes_app_created ON recruiter_note_entries(application_id, created_at)`,
  );
  await db.runAsync(
    `CREATE INDEX IF NOT EXISTS idx_applications_status_created ON applications(status, created_at)`,
  );

  await db.runAsync(
    `CREATE TABLE IF NOT EXISTS resumes (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      label TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_uri TEXT NOT NULL,
      file_size_bytes INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
  );
  await db.runAsync(
    `CREATE INDEX IF NOT EXISTS idx_resumes_user_kind ON resumes(user_id, kind)`,
  );
  await db.runAsync(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_resumes_user_main ON resumes(user_id) WHERE kind = 'MAIN'`,
  );

  await db.runAsync(
    `CREATE TABLE IF NOT EXISTS interviews (
      id TEXT PRIMARY KEY NOT NULL,
      application_id TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PROPOSED',
      created_at TEXT NOT NULL,
      responded_at TEXT,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    )`,
  );
  await db.runAsync(
    `CREATE INDEX IF NOT EXISTS idx_interviews_app_created ON interviews(application_id, created_at)`,
  );
  await db.runAsync(
    `CREATE INDEX IF NOT EXISTS idx_interviews_status_scheduled ON interviews(status, scheduled_at)`,
  );

  await db.runAsync(
    `CREATE TABLE IF NOT EXISTS application_events (
      id TEXT PRIMARY KEY NOT NULL,
      application_id TEXT NOT NULL,
      type TEXT NOT NULL,
      at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    )`,
  );
  await db.runAsync(
    `CREATE INDEX IF NOT EXISTS idx_application_events_app_at ON application_events(application_id, at)`,
  );
  await db.runAsync(
    `CREATE INDEX IF NOT EXISTS idx_application_events_at ON application_events(at)`,
  );

  // Backfill leve: SUBMITTED a partir de created_at; eventos de entrevista a partir de interviews.
  await db.runAsync(
    `INSERT INTO application_events (id, application_id, type, at, created_at)
     SELECT 'bf-sub-' || id, id, 'SUBMITTED', created_at, created_at
     FROM applications a
     WHERE NOT EXISTS (
       SELECT 1 FROM application_events e
       WHERE e.application_id = a.id AND e.type = 'SUBMITTED'
     )`,
  );
  await db.runAsync(
    `INSERT INTO application_events (id, application_id, type, at, created_at)
     SELECT 'bf-iv-' || id,
       application_id,
       CASE status
         WHEN 'ACCEPTED' THEN 'INTERVIEW_ACCEPTED'
         WHEN 'DECLINED' THEN 'INTERVIEW_DECLINED'
         ELSE 'INTERVIEW_PROPOSED'
       END,
       scheduled_at,
       created_at
     FROM interviews i
     WHERE NOT EXISTS (
       SELECT 1 FROM application_events e
       WHERE e.id = 'bf-iv-' || i.id
     )`,
  );

  await db.runAsync(
    `CREATE TABLE IF NOT EXISTS candidate_profiles (
      user_id TEXT PRIMARY KEY NOT NULL,
      full_name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      birth_date TEXT NOT NULL DEFAULT '',
      gender TEXT NOT NULL DEFAULT '',
      linkedin_url TEXT,
      disability_status TEXT NOT NULL DEFAULT 'NO',
      disability_detail TEXT,
      disability_cid TEXT,
      laudo_file_name TEXT,
      laudo_file_uri TEXT,
      laudo_file_size_bytes INTEGER,
      lives_in_brazil INTEGER NOT NULL DEFAULT 1,
      cep TEXT NOT NULL DEFAULT '',
      street TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      objective TEXT,
      salary_expectation INTEGER,
      work_model TEXT,
      availability TEXT,
      skills_json TEXT NOT NULL DEFAULT '[]',
      diversity_pronoun TEXT,
      diversity_gender_identity TEXT,
      diversity_orientation TEXT,
      diversity_race TEXT,
      diversity_origin_city TEXT,
      diversity_share_consent INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
  );
  await db.runAsync(
    `CREATE TABLE IF NOT EXISTS candidate_educations (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      level TEXT NOT NULL,
      course TEXT NOT NULL,
      institution TEXT NOT NULL,
      start_month TEXT NOT NULL,
      end_month TEXT,
      ongoing INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
  );
  await db.runAsync(
    `CREATE INDEX IF NOT EXISTS idx_candidate_educations_user ON candidate_educations(user_id, sort_order)`,
  );
  await db.runAsync(
    `CREATE TABLE IF NOT EXISTS candidate_experiences (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      company TEXT NOT NULL,
      role TEXT NOT NULL,
      start_month TEXT NOT NULL,
      end_month TEXT,
      current INTEGER NOT NULL DEFAULT 0,
      description TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
  );
  await db.runAsync(
    `CREATE INDEX IF NOT EXISTS idx_candidate_experiences_user ON candidate_experiences(user_id, sort_order)`,
  );
  await db.runAsync(
    `CREATE TABLE IF NOT EXISTS candidate_languages (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      language TEXT NOT NULL,
      level TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
  );
  await db.runAsync(
    `CREATE INDEX IF NOT EXISTS idx_candidate_languages_user ON candidate_languages(user_id, sort_order)`,
  );
  await db.runAsync(
    `CREATE TABLE IF NOT EXISTS candidate_certificates (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
  );
  await db.runAsync(
    `CREATE INDEX IF NOT EXISTS idx_candidate_certificates_user ON candidate_certificates(user_id, sort_order)`,
  );

  await db.runAsync(
    `CREATE TABLE IF NOT EXISTS employer_profiles (
      user_id TEXT PRIMARY KEY NOT NULL,
      trade_name TEXT NOT NULL DEFAULT '',
      legal_name TEXT NOT NULL DEFAULT '',
      cnpj TEXT,
      industry TEXT,
      company_size TEXT,
      founded_year INTEGER,
      website TEXT,
      linkedin_url TEXT,
      about TEXT,
      lives_in_brazil INTEGER NOT NULL DEFAULT 1,
      cep TEXT NOT NULL DEFAULT '',
      street TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      contact_name TEXT NOT NULL DEFAULT '',
      contact_role TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      commercial_email TEXT,
      hiring_areas_json TEXT NOT NULL DEFAULT '[]',
      seniorities_json TEXT NOT NULL DEFAULT '[]',
      contract_types_json TEXT NOT NULL DEFAULT '[]',
      work_models_json TEXT NOT NULL DEFAULT '[]',
      benefits_json TEXT NOT NULL DEFAULT '[]',
      culture_values_json TEXT NOT NULL DEFAULT '[]',
      inclusion_note TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
  );

  await db.runAsync(
    `CREATE TABLE IF NOT EXISTS recruiter_profiles (
      user_id TEXT PRIMARY KEY NOT NULL,
      full_name TEXT NOT NULL DEFAULT '',
      headline TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      linkedin_url TEXT,
      state TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      bio TEXT,
      work_mode TEXT,
      consultancy_name TEXT,
      consultancy_website TEXT,
      years_experience INTEGER,
      availability TEXT,
      focus_areas_json TEXT NOT NULL DEFAULT '[]',
      seniorities_json TEXT NOT NULL DEFAULT '[]',
      contract_types_json TEXT NOT NULL DEFAULT '[]',
      languages_json TEXT NOT NULL DEFAULT '[]',
      certificates_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
  );
}