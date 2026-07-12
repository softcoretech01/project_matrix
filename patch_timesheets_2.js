const fs = require('fs');
const file = 'frontend/src/views/Timesheets.jsx';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/'2026-06-18', \/\/ Current system date mock/g, "new Date().toISOString().split('T')[0], // Current system date mock");
fs.writeFileSync(file, code);
console.log('Patched timesheets regex');
