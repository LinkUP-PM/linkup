import * as SQLite from "expo-sqlite";
import { applySchemaMigrations, SCHEMA } from "./schema";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync("linkup.db");
      await db.execAsync(SCHEMA);
      await applySchemaMigrations(db);
      return db;
    })().catch((error: unknown) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}
