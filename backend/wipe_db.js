import { DB } from './db.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await DB.init();
  console.log("Wiping demo data from MySQL...");
  
  // Disable foreign key checks for clearing
  await DB.pool.query('SET FOREIGN_KEY_CHECKS = 0');
  
  const tables = ['allocations', 'tasks', 'timesheets', 'leaves', 'modules', 'projects'];
  for (const table of tables) {
    await DB.pool.query(`TRUNCATE TABLE ${table}`);
  }
  
  await DB.pool.query("DELETE FROM employees WHERE id != 'E006'");
  
  await DB.pool.query('SET FOREIGN_KEY_CHECKS = 1');
  
  console.log("Database wiped successfully.");
  process.exit(0);
}

run().catch(console.error);
