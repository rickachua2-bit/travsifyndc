import { config } from "dotenv";
import path from "path";

// Load .env relative to the current file
config({ path: path.resolve(process.cwd(), ".env") });

import { seedGlobalData } from "./src/server/seed-data";

async function main() {
  console.log("Process started with env:", process.env.SUPABASE_URL ? "URL FOUND" : "URL MISSING");
  await seedGlobalData();
}

main();
