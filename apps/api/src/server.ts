import { buildApp } from "./app.js";
import { config } from "./config.js";

if (!config.databaseUrl) {
  console.error("DATABASE_URL é obrigatório. Copie apps/api/.env.example para apps/api/.env.");
  process.exit(1);
}

const app = await buildApp();
await app.listen({ port: config.port, host: "0.0.0.0" });
