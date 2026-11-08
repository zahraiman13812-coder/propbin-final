require("@next/env").loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const { Client } = require("pg");

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function test() {
  try {
    await client.connect();

    const result = await client.query(
      "SELECT current_database() AS db, current_user AS username"
    );

    console.log("CONNECTED:", result.rows);
    console.log("اتصال به PostgreSQL موفق بود!");
  } catch (error) {
    console.error("ERROR:", error.code, error.message);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

test();
