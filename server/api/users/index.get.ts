import { defineEventHandler } from "h3";
import { getDb } from "../../db/client";
import { requireUser } from "../../utils/auth";

/** Lista os dois usuários do app (para o seletor "eu" / "parceiro(a)"). */
export default defineEventHandler((event) => {
  requireUser(event);
  const users = getDb().prepare("SELECT id, name, email FROM users ORDER BY name").all();
  return { users };
});
