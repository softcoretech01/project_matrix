const fs = require('fs');
const path = require('path');

const rolesMap = {
  'admin.js': ["'Admin'"],
  'allocations.js': ["'Admin'", "'PM'"],
  'clients.js': ["'Admin'"],
  'employees.js': ["'Admin'"],
  'holidays.js': ["'Admin'"],
  'leaves.js': ["'Admin'", "'PM'", "'Team Lead'", "'Employee'"],
  'modules.js': ["'Admin'"],
  'projects.js': ["'Admin'"],
  'reports.js': ["'Admin'", "'Management'", "'PM'", "'Team Lead'"],
  'taskType.js': ["'Admin'"],
  'tasks.js': ["'Admin'", "'PM'", "'Team Lead'", "'Employee'"],
  'timesheets.js': ["'Admin'", "'PM'", "'Team Lead'", "'Employee'"]
};

const dir = 'd:/ProjectMatrix/backend/routes';

Object.keys(rolesMap).forEach(file => {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  const roles = rolesMap[file].join(', ');
  
  // Replace `router.METHOD('...', authenticate, async`
  // with `router.METHOD('...', authenticate, authorizeRoles(...), async`
  
  // We need to ensure authorizeRoles is imported
  if (!content.includes('authorizeRoles')) {
    content = content.replace(/import \{ authenticate \} from '\.\.\/middleware\/auth\.js';/, "import { authenticate, authorizeRoles } from '../middleware/auth.js';");
  }

  // Regex to match router.get/post/put/delete that only have authenticate
  const regex = /(router\.(?:get|post|put|delete)\(['`"][^'`"]+['`"],\s*authenticate)(,\s*async\s*\()/g;
  
  content = content.replace(regex, `$1, authorizeRoles(${roles})$2`);
  
  // Also we might already have authorizeRoles('Admin') on POST/PUT/DELETE in some files, 
  // but if the matrix specifies different roles, we should replace the existing authorizeRoles.
  const regexExisting = /(router\.(?:get|post|put|delete)\(['`"][^'`"]+['`"],\s*authenticate,\s*authorizeRoles\()[^\)]+(\)(?:,\s*upload\.single\([^)]+\))?,\s*async\s*\()/g;
  content = content.replace(regexExisting, `$1${roles}$2`);

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file} with roles: ${roles}`);
});
