import bcrypt from "bcryptjs";
import { createError, deleteCookie, getCookie, type H3Event, setCookie } from "h3";
import { getDb } from "../db/client";
import type { User } from "../types";
import { newId } from "./id";

const COOKIE_NAME = "bf_session";
const SESSION_DAYS = 30;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createSession(userId: string): string {
  const db = getDb();
  const token = newId();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(
    token,
    userId,
    expiresAt,
  );
  return token;
}

export function setSessionCookie(event: H3Event, token: string) {
  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie(event: H3Event) {
  const token = getCookie(event, COOKIE_NAME);
  if (token) {
    getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
  }
  deleteCookie(event, COOKIE_NAME, { path: "/" });
}

export function getSessionUser(event: H3Event): User | null {
  const token = getCookie(event, COOKIE_NAME);
  if (!token) return null;

  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id as id, u.name as name, u.email as email, s.expires_at as expiresAt
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`,
    )
    .get(token) as { id: string; name: string; email: string; expiresAt: string } | undefined;

  if (!row) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  return { id: row.id, name: row.name, email: row.email };
}

export function requireUser(event: H3Event): User {
  const user = getSessionUser(event);
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Não autenticado" });
  }
  return user;
}
