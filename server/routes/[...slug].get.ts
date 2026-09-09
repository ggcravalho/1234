import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defineEventHandler, setResponseHeader } from "h3";

// Fallback de SPA: qualquer rota GET que não seja da API e não corresponda a
// um asset estático (JS/CSS/etc., já servido por publicAssets antes de
// chegar aqui) recebe o index.html, para que o React Router cuide do
// roteamento no cliente — necessário para recarregar a página em rotas como
// /evolucao ou /treino/ao-vivo.
export default defineEventHandler((event) => {
  const indexPath = join(process.cwd(), "public", "index.html");
  if (!existsSync(indexPath)) {
    event.node.res.statusCode = 404;
    return "Not found";
  }
  setResponseHeader(event, "Content-Type", "text/html; charset=utf-8");
  return readFileSync(indexPath, "utf-8");
});
