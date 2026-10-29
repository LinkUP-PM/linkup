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
  description TEXT NOT NULL,
  looking_for TEXT NOT NULL,
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
}