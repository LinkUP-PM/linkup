import initSqlJs, { type Database, type SqlValue } from "sql.js/dist/sql-wasm-browser.js";
import { applySchemaMigrations, SCHEMA } from "./schema";

const IDB_NAME = "linkup";
const IDB_STORE = "sqlite";
const IDB_KEY = "linkup.db";

type SqlParam = string | number | null | boolean | Uint8Array;

export type WebDatabase = {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, ...params: SqlParam[]): Promise<void>;
  getFirstAsync<T>(source: string, ...params: SqlParam[]): Promise<T | null>;
  getAllAsync<T>(source: string, ...params: SqlParam[]): Promise<T[]>;
};

let dbPromise: Promise<WebDatabase> | null = null;

function bindable(params: readonly SqlParam[]): SqlValue[] {
  return params.map((value) => {
    if (value == null) return null;
    if (typeof value === "boolean") return value ? 1 : 0;
    return value;
  });
}

function cell(value: SqlValue): SqlValue {
  return typeof value === "bigint" ? Number(value) : value;
}

function queryAll(database: Database, source: string, params: readonly SqlParam[]): Record<string, SqlValue>[] {
  const statement = database.prepare(source);
  try {
    if (params.length > 0) statement.bind(bindable(params));
    const rows: Record<string, SqlValue>[] = [];
    while (statement.step()) {
      const raw = statement.getAsObject();
      const row: Record<string, SqlValue> = {};
      for (const [key, value] of Object.entries(raw)) {
        row[key] = cell(value);
      }
      rows.push(row);
    }
    return rows;
  } finally {
    statement.free();
  }
}

function openStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(IDB_STORE)) {
        request.result.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Não foi possível abrir o banco no navegador."));
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Falha ao ler o banco no navegador."));
  });
}

async function loadSnapshot(): Promise<Uint8Array | null> {
  if (typeof indexedDB === "undefined") return null;
  const idb = await openStore();
  try {
    const tx = idb.transaction(IDB_STORE, "readonly");
    const value = await requestToPromise(tx.objectStore(IDB_STORE).get(IDB_KEY));
    if (!value) return null;
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    return null;
  } finally {
    idb.close();
  }
}

async function saveSnapshot(bytes: Uint8Array): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const idb = await openStore();
  try {
    const tx = idb.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(bytes.slice(), IDB_KEY);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Falha ao gravar o banco no navegador."));
      tx.onabort = () => reject(tx.error ?? new Error("Gravação do banco cancelada."));
    });
  } finally {
    idb.close();
  }
}

async function openWebDatabase(): Promise<WebDatabase> {
  const SQL = await initSqlJs({
    locateFile: (file) => `/${file}`,
  });
  const saved = await loadSnapshot().catch(() => null);
  let database: Database;
  if (saved) {
    try {
      database = new SQL.Database(saved);
    } catch {
      database = new SQL.Database();
    }
  } else {
    database = new SQL.Database();
  }
  database.exec(SCHEMA);

  const persist = async () => {
    await saveSnapshot(database.export());
  };

  const runner: WebDatabase = {
    async execAsync(source: string) {
      database.exec(source);
      await persist();
    },
    async runAsync(source: string, ...params: SqlParam[]) {
      database.run(source, bindable(params));
      await persist();
    },
    async getFirstAsync<T>(source: string, ...params: SqlParam[]) {
      const rows = queryAll(database, source, params);
      return (rows[0] as T | undefined) ?? null;
    },
    async getAllAsync<T>(source: string, ...params: SqlParam[]) {
      return queryAll(database, source, params) as T[];
    },
  };

  await applySchemaMigrations(runner);
  await persist();

  return runner;
}

export async function getDb(): Promise<WebDatabase> {
  if (!dbPromise) {
    dbPromise = openWebDatabase().catch((error: unknown) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}
