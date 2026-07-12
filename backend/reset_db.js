import { DB } from './db.js';

async function run() {
  await DB.init();
  console.log("Resetting database...");
  await DB.reset();
  console.log("Database reset complete.");
  process.exit(0);
}

run().catch(console.error);
