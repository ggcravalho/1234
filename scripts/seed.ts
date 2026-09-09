// Cria (ou atualiza a senha de) as duas contas de usuário do app, a partir
// de variáveis de ambiente. Rode com `pnpm seed`.
import "dotenv/config";
import { getDb } from "../server/db/client";
import { hashPassword } from "../server/utils/auth";
import { newId } from "../server/utils/id";

type SeedUser = { name: string; email: string; password: string };

function readSeedUser(n: 1 | 2): SeedUser | null {
  const name = process.env[`SEED_USER${n}_NAME`];
  const email = process.env[`SEED_USER${n}_EMAIL`];
  const password = process.env[`SEED_USER${n}_PASSWORD`];
  if (!name || !email || !password) return null;
  return { name, email: email.trim().toLowerCase(), password };
}

async function upsertUser(u: SeedUser) {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(u.email) as
    | { id: string }
    | undefined;
  const passwordHash = await hashPassword(u.password);

  if (existing) {
    db.prepare("UPDATE users SET name = ?, password_hash = ? WHERE id = ?").run(
      u.name,
      passwordHash,
      existing.id,
    );
    console.log(`Atualizado: ${u.name} <${u.email}>`);
  } else {
    db.prepare("INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)").run(
      newId(),
      u.name,
      u.email,
      passwordHash,
    );
    console.log(`Criado: ${u.name} <${u.email}>`);
  }
}

async function main() {
  const users = [readSeedUser(1), readSeedUser(2)].filter((u): u is SeedUser => u !== null);
  if (users.length === 0) {
    console.error(
      "Nenhum usuário configurado. Defina SEED_USER1_NAME/EMAIL/PASSWORD e SEED_USER2_NAME/EMAIL/PASSWORD no .env.",
    );
    process.exit(1);
  }
  for (const u of users) {
    await upsertUser(u);
  }
  console.log("Concluído.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
