import { createError, defineEventHandler, readBody } from "h3";
import { getDb } from "../../db/client";
import { createSession, setSessionCookie, verifyPassword } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string; password?: string }>(event);
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password;

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: "Informe e-mail e senha." });
  }

  const user = getDb()
    .prepare("SELECT id, name, email, password_hash FROM users WHERE email = ?")
    .get(email) as { id: string; name: string; email: string; password_hash: string } | undefined;

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    throw createError({ statusCode: 401, statusMessage: "E-mail ou senha inválidos." });
  }

  const token = createSession(user.id);
  setSessionCookie(event, token);

  return { id: user.id, name: user.name, email: user.email };
});
