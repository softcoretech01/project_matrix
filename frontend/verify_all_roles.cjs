const puppeteer = require('puppeteer');
const fs = require('fs');

const roles = [
  { role: 'Admin', email: 'admin@projectmatrix.com', pass: 'admin' },
  { role: 'Management', email: 'emily@projectmatrix.com', pass: 'password123' },
  { role: 'PM', email: 'sophia@projectmatrix.com', pass: 'password123' },
  { role: 'Team Lead', email: 'liam@projectmatrix.com', pass: 'password123' },
  { role: 'Employee', email: 'ravi@projectmatrix.com', pass: 'password123' }
];

const paths = [
  { name: 'Dashboard', path: '/' },
  { name: 'Employees', path: '/employees' },
  { name: 'Clients', path: '/clients' },
  { name: 'Projects', path: '/projects' },
  { name: 'Modules', path: '/modules' },
  { name: 'Task Types', path: '/task-types' },
  { name: 'Holidays', path: '/holidays' },
  { name: 'Resources', path: '/resources' },
  { name: 'Allocations', path: '/allocations' },
  { name: 'Tasks', path: '/tasks' },
  { name: 'Timesheets', path: '/timesheets' },
  { name: 'Leaves', path: '/leaves' },
  { name: 'Approvals', path: '/approvals' },
  { name: 'Reports', path: '/reports' },
  { name: 'Administration', path: '/admin' }
];

async function run() {
  const browser = await puppeteer.launch();
  let results = {};

  for (const user of roles) {
    console.log(`\n=== Verifying Role: ${user.role} ===`);
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    let roleIssues = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon.ico')) {
           roleIssues.push({ type: 'console', msg: text });
        }
      }
    });
    
    page.on('pageerror', err => {
      roleIssues.push({ type: 'react', msg: err.message });
    });
    
    page.on('response', async res => {
      if (res.url().includes('/api/') && !res.ok()) {
         roleIssues.push({ type: 'api', url: res.url(), status: res.status() });
      }
    });
    
    await page.goto('http://localhost:5173/login');
    await new Promise(r => setTimeout(r, 1000));
    
    await page.type('input[type="email"]', user.email);
    await page.type('input[type="password"]', user.pass);
    await page.click('button[type="submit"]');
    
    await new Promise(r => setTimeout(r, 2000));
    
    for (const view of paths) {
      await page.goto(`http://localhost:5173${view.path}`);
      await new Promise(r => setTimeout(r, 1500));
      
      const pageErrors = await page.evaluate((pageName) => {
        let errs = [];
        if (document.body.innerText.includes('NaN')) {
          errs.push({ type: 'NaN', msg: `Found NaN on ${pageName}` });
        }
        if (document.body.innerText.includes('undefined')) {
          errs.push({ type: 'undefined', msg: `Found undefined on ${pageName}` });
        }
        
        const selects = document.querySelectorAll('select');
        selects.forEach((sel, i) => {
          if (sel.options.length <= 1) { 
             errs.push({ type: 'empty-dropdown', msg: `Empty dropdown on ${pageName}` });
          }
        });
        
        return errs;
      }, view.name);
      
      roleIssues = roleIssues.concat(pageErrors.map(e => ({ ...e, page: view.name })));
    }
    
    results[user.role] = roleIssues;
    await page.close();
  }
  
  await browser.close();
  fs.writeFileSync('verify_results.json', JSON.stringify(results, null, 2));
  console.log("Verification Complete");
}

run().catch(err => {
  console.error("Test Script Error:", err);
  process.exit(1);
});
