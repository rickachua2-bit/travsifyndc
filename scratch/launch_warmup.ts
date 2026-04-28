import { seedGlobalData } from "../src/server/seed-data";
import { config } from "dotenv";
import path from "path";

// Load .env
config({ path: path.resolve(__dirname, "../.env") });

async function run() {
  console.log("Triggering manual Global Warm Up...");
  try {
    await seedGlobalData();
    console.log("Warm Up Completed successfully!");
  } catch (err) {
    console.error("Warm Up Failed:", err);
  }
}

run();
