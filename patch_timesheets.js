const fs = require('fs');
const file = 'frontend/src/views/Timesheets.jsx';
let code = fs.readFileSync(file, 'utf8');

// Replace mock dates
code = code.replace(/const \[dailyForm, setDailyForm\] = useState\(\{\n\s*date: '2026-06-18', \/\/ Current system date mock/g, 
  'const [dailyForm, setDailyForm] = useState({\n    date: new Date().toISOString().split(\'T\')[0],');

code = code.replace(/const \[filterMonth, setFilterMonth\] = useState\('2026-06'\);/g, 
  'const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));');

const currentWeekDaysCode = `(()=>{
  const c = new Date();
  const f = c.getDate() - c.getDay() + 1;
  const r = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(c.getTime());
    d.setDate(f + i);
    r.push(d.toISOString().split('T')[0]);
  }
  return r;
})()`;

code = code.replace(/const weekDays = \['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19'\];/g, 
  `const weekDays = ${currentWeekDaysCode};`);

const dictCode = (val) => `(()=>{
  const c = new Date();
  const f = c.getDate() - c.getDay() + 1;
  const r = {};
  for (let i = 0; i < 5; i++) {
    const d = new Date(c.getTime());
    d.setDate(f + i);
    r[d.toISOString().split('T')[0]] = ${val};
  }
  return r;
})()`;

code = code.replace(/hours: \{ '2026-06-15': 0, '2026-06-16': 0, '2026-06-17': 0, '2026-06-18': 0, '2026-06-19': 0 \}/g, 
  `hours: ${dictCode('0')}`);
  
code = code.replace(/descriptions: \{ '2026-06-15': '', '2026-06-16': '', '2026-06-17': '', '2026-06-18': '', '2026-06-19': '' \}/g, 
  `descriptions: ${dictCode("''")}`);
  
code = code.replace(/timesheetIds: \{ '2026-06-15': '', '2026-06-16': '', '2026-06-17': '', '2026-06-18': '', '2026-06-19': '' \}/g, 
  `timesheetIds: ${dictCode("''")}`);

code = code.replace(/submittedDate: statusType === 'Submitted' \? '2026-06-18' : null/g, 
  "submittedDate: statusType === 'Submitted' ? new Date().toISOString().split('T')[0] : null");

// Check the grid header specifically for the June 15 - June 19 string
code = code.replace(/Weekly Hours Grid \(Week of June 15 - June 19, 2026\)/g, "Weekly Hours Grid (Current Week)");

fs.writeFileSync(file, code);
console.log('Patched timesheets');
