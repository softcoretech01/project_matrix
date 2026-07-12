import { DB } from './db.js';

async function verify() {
  try {
    await DB.init();
    console.log("Checking MySQL Persistence...");
    
    const projects = await DB.getProjects();
    console.log("Projects:", projects.length);

    const modules = await DB.getModules();
    console.log("Modules:", modules.length);

    const task_types = await DB.getTaskTypes();
    console.log("Task Types:", task_types.length);

    const holidays = await DB.getHolidays();
    console.log("Holidays:", holidays.length);

    const allocations = await DB.getAllocations();
    console.log("Allocations:", allocations.length);

    const tasks = await DB.getTasks();
    console.log("Tasks:", tasks.length);

    const timesheets = await DB.getTimesheets();
    console.log("Timesheets:", timesheets.length);

    console.log("All tables successfully queried from MySQL!");
    process.exit(0);
  } catch (err) {
    console.error("DB Verification Error:", err.message);
    process.exit(1);
  }
}
verify();
