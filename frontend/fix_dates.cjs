const fs = require('fs');
const path = require('path');
const views = 'src/views';
const files = ['Leaves.jsx', 'Masters.jsx', 'Resources.jsx', 'Tasks.jsx', 'Timesheets.jsx'];

files.forEach(f => {
  const p = path.join(views, f);
  let code = fs.readFileSync(p, 'utf8');

  // Add toInputDate to import if it's not there
  if (!code.includes('toInputDate')) {
    code = code.replace(
      /import \{ apiHeaders, formatDate \} from '\.\.\/utils\/helpers';/,
      "import { apiHeaders, formatDate, toInputDate } from '../utils/helpers';"
    );
  }

  // Replace value={x} with value={toInputDate(x)} in <input type="date">
  code = code.replace(/<input([^>]*?)type="date"([^>]*?)value=\{([^}]+)\}/g, (match, p1, p2, p3) => {
    if (p3.includes('toInputDate(')) return match;
    return `<input${p1}type="date"${p2}value={toInputDate(${p3})}`;
  });

  fs.writeFileSync(p, code);
});
console.log('Done!');
