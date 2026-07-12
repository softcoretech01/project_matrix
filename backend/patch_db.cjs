const fs = require('fs');
let code = fs.readFileSync('backend/db.js', 'utf8');

const replacements = [
  { search: `[emp.id,`, replace: `[emp.id || ('E' + Date.now().toString().slice(-6)),` },
  { search: `[cli.id,`, replace: `[cli.id || ('C' + Date.now().toString().slice(-6)),` },
  { search: `[p.id,`, replace: `[p.id || ('P' + Date.now().toString().slice(-6)),` },
  { search: `[m.id,`, replace: `[m.id || ('M' + Date.now().toString().slice(-6)),` },
  { search: `[a.id,`, replace: `[a.id || ('A' + Date.now().toString().slice(-6)),` },
  { search: `[ts.id,`, replace: `[ts.id || ('TS' + Date.now().toString().slice(-5)),` },
  { search: `[l.id,`, replace: `[l.id || ('L' + Date.now().toString().slice(-6)),` }
];

replacements.forEach(r => {
  code = code.replace(r.search, r.replace);
});

// For Tasks, it was [t.id, t.projectId...
code = code.replace(`[t.id,`, `[t.id || ('T' + Date.now().toString().slice(-6)),`);

// Note: taskTypes is already handled in the codebase. Holidays uses AUTO_INCREMENT.

fs.writeFileSync('backend/db.js', code);
console.log('Successfully patched db.js array bindings for auto-ID generation!');
