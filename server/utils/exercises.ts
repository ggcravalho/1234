import { getDb } from "../db/client";
import type { Exercise } from "../types";
import { newId } from "./id";

function normalize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function rowToExercise(row: { id: string; name: string; muscle_group: string | null }): Exercise {
  return { id: row.id, name: row.name, muscleGroup: row.muscle_group };
}

export function listExercises(): Exercise[] {
  const rows = getDb()
    .prepare("SELECT id, name, muscle_group FROM exercises ORDER BY name COLLATE NOCASE")
    .all() as { id: string; name: string; muscle_group: string | null }[];
  return rows.map(rowToExercise);
}

/**
 * Procura um exercício existente no catálogo cujo nome corresponda (com
 * tolerância a acentos/maiúsculas e a um nome contido no outro). Usado ao
 * interpretar planos vindos da IA, para reaproveitar o catálogo compartilhado
 * em vez de criar duplicatas como "Supino Reto" vs "supino reto com barra".
 */
export function matchExercise(name: string): Exercise | null {
  const target = normalize(name);
  if (!target) return null;
  const all = listExercises();

  const exact = all.find((e) => normalize(e.name) === target);
  if (exact) return exact;

  const partial = all.find((e) => {
    const n = normalize(e.name);
    return n.includes(target) || target.includes(n);
  });
  return partial ?? null;
}

export function createExercise(name: string, muscleGroup: string | null): Exercise {
  const existing = matchExercise(name);
  if (existing) return existing;

  const db = getDb();
  const id = newId();
  db.prepare("INSERT INTO exercises (id, name, muscle_group) VALUES (?, ?, ?)").run(
    id,
    name.trim(),
    muscleGroup,
  );
  return { id, name: name.trim(), muscleGroup };
}

/** Garante que o exercício exista no catálogo, criando se necessário. */
export function findOrCreateExercise(name: string, muscleGroup: string | null): Exercise {
  return matchExercise(name) ?? createExercise(name, muscleGroup);
}

export function updateExercise(
  id: string,
  updates: { name?: string; muscleGroup?: string | null },
): Exercise | null {
  const db = getDb();
  const current = db.prepare("SELECT id, name, muscle_group FROM exercises WHERE id = ?").get(id) as
    | { id: string; name: string; muscle_group: string | null }
    | undefined;
  if (!current) return null;

  const name = updates.name?.trim() || current.name;
  const muscleGroup =
    updates.muscleGroup !== undefined ? updates.muscleGroup : current.muscle_group;
  db.prepare("UPDATE exercises SET name = ?, muscle_group = ? WHERE id = ?").run(
    name,
    muscleGroup,
    id,
  );
  return { id, name, muscleGroup };
}
