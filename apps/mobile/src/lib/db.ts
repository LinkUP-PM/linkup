import * as SQLite from "expo-sqlite";
import { applySchemaMigrations, SCHEMA } from "./schema";
import { seedDemo } from "./seed-demo";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync("linkup.db");
      // Tabelas primeiro; índices de colunas novas ficam em applySchemaMigrations
      // para banco legado não abortar antes do ALTER.
      await db.execAsync(SCHEMA);
      await applySchemaMigrations(db);
      await seedDemo(db);
      return db;
    })().catch((error: unknown) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}
