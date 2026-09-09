import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
// node:sqlite é marcado "experimental" no Node 22, mas a API é estável o
// suficiente para um projeto pessoal de 2 usuários — evita depender de um
// módulo nativo (better-sqlite3) que precisaria compilar em cada ambiente.
import { DatabaseSync } from "node:sqlite";
import { SCHEMA_SQL } from "./schema";

const DB_PATH = process.env.BITUSFIT_DB_PATH ?? join(".data", "bitusfit.db");

function ensureDir(path: string) {
  const dir = dirname(path);
  if (dir && dir !== "." && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

let instance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (instance) return instance;
  ensureDir(DB_PATH);
  instance = new DatabaseSync(DB_PATH);
  instance.exec("PRAGMA journal_mode = WAL;");
  instance.exec("PRAGMA foreign_keys = ON;");
  instance.exec(SCHEMA_SQL);
  return instance;
}

/** Executa `fn` dentro de uma transação SQLite, com rollback em caso de erro. */
export function withTransaction<T>(fn: (db: DatabaseSync) => T): T {
  const db = getDb();
  db.exec("BEGIN");
  try {
    const result = fn(db);
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
