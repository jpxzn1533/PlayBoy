// Sobe um PostgreSQL real localmente (sem instalação no sistema) usando embedded-postgres.
// Uso: npm run db:local  — mantenha este processo aberto enquanto usa a aplicação.
import EmbeddedPostgres from "embedded-postgres";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

function loadEnv() {
  const file = path.resolve(".env");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}
loadEnv();

const port = Number(process.env.LOCAL_DB_PORT || 5433);
const password = process.env.LOCAL_DB_PASSWORD;
if (!password) {
  console.error("Defina LOCAL_DB_PASSWORD no .env");
  process.exit(1);
}

const databaseDir = path.resolve(".pgdata");
const pg = new EmbeddedPostgres({ databaseDir, user: "postgres", password, port, persistent: true });

if (!existsSync(path.join(databaseDir, "PG_VERSION"))) {
  console.log("[db] Inicializando cluster em", databaseDir);
  await pg.initialise();
}
await pg.start();
try {
  await pg.createDatabase("playboystore");
  console.log("[db] Banco 'playboystore' criado.");
} catch {
  // já existe
}
console.log(`[db] PostgreSQL rodando em localhost:${port} (Ctrl+C para parar)`);

const stop = async () => {
  console.log("\n[db] Encerrando...");
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);
