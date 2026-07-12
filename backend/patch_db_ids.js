const fs = require('fs');

let code = fs.readFileSync('backend/db.js', 'utf8');

const entityPrefixes = {
  'insertEmployee': 'E',
  'insertClient': 'C',
  'insertProject': 'P',
  'insertModule': 'M',
  'insertAllocation': 'A',
  'insertTask': 'T',
  'insertTimesheet': 'TS',
  'insertLeave': 'L'
};

for (const [method, prefix] of Object.entries(entityPrefixes)) {
  const regex = new RegExp(`(async ${method}\\([a-zA-Z_]+\\) \\{\\s*if \\(this\\.isFallback\\) \\{[\\s\\S]*?\\}\\s*)(const \\[result\\] = await this\\.pool\\.execute\\(|await this\\.pool\\.execute\\()`, 'm');
  
  const replacement = `$1const newId = '${prefix}' + Date.now().toString().slice(-5) + Math.floor(Math.random()*100);\n    arguments[0].id = arguments[0].id || newId;\n    $2`;
  code = code.replace(regex, replacement);
}

fs.writeFileSync('backend/db.js', code);
console.log('Patched db.js for ID generation');
