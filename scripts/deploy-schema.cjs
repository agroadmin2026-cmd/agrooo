const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("❌ DIRECT_URL o DATABASE_URL no definida en variables de entorno.");
    process.exit(1);
  }

  console.log("Conectando a Supabase PostgreSQL...");
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("✅ Conexión establecida con éxito.");

  const sqlPath = path.join(__dirname, "..", "supabase", "schema.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  console.log("Ejecutando schema.sql en Supabase...");
  await client.query(sql);
  console.log("✅ Tablas, funciones RPC, RLS y datos iniciales aplicados exitosamente.");

  await client.end();
}

main().catch((err) => {
  console.error("❌ Error ejecutando migración:", err);
  process.exit(1);
});
