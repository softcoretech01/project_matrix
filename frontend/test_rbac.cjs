const puppeteer = require('puppeteer');

const baseUrl = 'http://localhost:5173';

const roles = [
  { name: 'Admin', email: 'admin@projectmatrix.com', pass: 'admin', expectedPaths: ['/dashboard', '/masters/employees', '/masters/clients', '/masters/projects', '/masters/modules', '/masters/holidays', '/masters/task-types', '/resources/allocations', '/resources/planner', '/tasks/create', '/tasks/my', '/tasks/board', '/timesheets/daily', '/timesheets/weekly', '/timesheets/history', '/leaves/apply', '/approvals/timesheets', '/approvals/tasks', '/leaves/approve', '/reports', '/admin/roles'] },
  { name: 'PM', email: 'sophia@projectmatrix.com', pass: 'password123', expectedPaths: ['/dashboard', '/resources/allocations', '/resources/planner', '/tasks/create', '/tasks/board', '/approvals/timesheets', '/approvals/tasks', '/leaves/approve', '/reports'] },
  { name: 'Team Lead', email: 'liam@projectmatrix.com', pass: 'password123', expectedPaths: ['/dashboard', '/tasks/my', '/tasks/board', '/approvals/timesheets', '/approvals/tasks', '/leaves/approve', '/reports'] },
  { name: 'Employee', email: 'ravi@projectmatrix.com', pass: 'password123', expectedPaths: ['/dashboard', '/tasks/my', '/tasks/board', '/timesheets/daily', '/timesheets/weekly', '/timesheets/history', '/leaves/apply'] },
  { name: 'Management', email: 'emily@projectmatrix.com', pass: 'password123', expectedPaths: ['/dashboard', '/reports'] }
];

const allPaths = ['/dashboard', '/masters/employees', '/masters/clients', '/masters/projects', '/masters/modules', '/masters/holidays', '/masters/task-types', '/resources/allocations', '/resources/planner', '/tasks/create', '/tasks/my', '/tasks/board', '/timesheets/daily', '/timesheets/weekly', '/timesheets/history', '/leaves/apply', '/approvals/timesheets', '/approvals/tasks', '/leaves/approve', '/reports', '/admin/roles'];

async function runTests() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const results = {};

  for (const role of roles) {
    console.log(`\nTesting Role: ${role.name}`);
    let pass = true;
    let errors = [];

    // Login
    await page.goto(`${baseUrl}/`);
    await page.waitForSelector('.quick-login-btn');
    await page.evaluate((email) => {
       const btns = Array.from(document.querySelectorAll('.quick-login-btn'));
       const btn = btns.find(b => {
           if (email.includes('admin')) return b.innerText === 'Admin';
           if (email.includes('sophia')) return b.innerText === 'PM';
           if (email.includes('liam')) return b.innerText === 'Team Lead';
           if (email.includes('ravi')) return b.innerText === 'Employee 1';
           if (email.includes('emily')) return b.innerText === 'Management';
           return false;
       });
       if(btn) btn.click();
    }, role.email);
    
    // Wait for navigation to dashboard
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 3000 });
    } catch(e) {}
    
    if (page.url() !== `${baseUrl}/dashboard`) {
      const errorText = await page.evaluate(() => {
        const errEl = document.querySelector('.text-danger');
        return errEl ? errEl.innerText : 'No error message found';
      });
      errors.push(`Login failed, did not land on dashboard. URL: ${page.url()}. Error text: ${errorText}`);
      pass = false;
    } else {
      console.log('✓ Login successful');
    }

    // Check Sidebar
    const sidebarLinks = await page.$$eval('.menu-item', links => links.map(l => l.getAttribute('href')));
    const expectedPathsSet = new Set(role.expectedPaths);
    
    // Validate accessible modules are in sidebar
    for (const expected of role.expectedPaths) {
      if (!sidebarLinks.includes(expected)) {
        errors.push(`Sidebar missing expected link: ${expected}`);
        pass = false;
      }
    }
    
    // Validate blocked modules are NOT in sidebar
    for (const link of sidebarLinks) {
      if (!expectedPathsSet.has(link)) {
        errors.push(`Sidebar has unauthorized link: ${link}`);
        pass = false;
      }
    }
    
    if (pass) console.log('✓ Sidebar visibility correct');

    // Test Manual URL Access
    for (const p of allPaths) {
      await page.goto(`${baseUrl}${p}`, { waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 100));
      
      const currentUrl = page.url();
      const isAllowed = expectedPathsSet.has(p);
      
      if (isAllowed) {
        if (!currentUrl.endsWith(p)) {
          errors.push(`Accessible module blocked: ${p} (Redirected to ${currentUrl})`);
          pass = false;
        }
      } else {
        if (currentUrl.endsWith(p)) {
          errors.push(`Blocked module accessible: ${p} (No redirect occurred)`);
          pass = false;
        }
      }
    }
    if (pass) console.log('✓ Manual URL access correct');

    // Test Backend API by looking for failed API requests during navigation
    let apiAuthFailed = false;
    page.on('response', response => {
      if (!response.ok() && response.url().includes('localhost')) {
         if (response.status() === 403 || response.status() === 401) {
            // we expect 403 for some endpoints if we bypass, but since we are navigating to dashboard, it shouldn't hit 403 on allowed pages.
            if(expectedPathsSet.has(new URL(page.url()).pathname)) {
               errors.push(`Unexpected API Error on allowed page: ${response.url()} [${response.status()}]`);
               pass = false;
            }
         }
      }
    });

    results[role.name] = { status: pass ? 'PASS' : 'FAIL', errors };
    
    // Logout
    await page.evaluate(() => window.localStorage.clear());
    await page.goto(`${baseUrl}/`);
    await new Promise(r => setTimeout(r, 1000));
  }

  await browser.close();

  console.log('\n=======================================');
  console.log('         FINAL RBAC REPORT');
  console.log('=======================================');
  for (const role of roles) {
    console.log(`${role.name}: ${results[role.name].status}`);
    if (results[role.name].errors.length > 0) {
       console.log('Errors:');
       results[role.name].errors.forEach(e => console.log('  - ' + e));
    }
  }
}

runTests().catch(console.error);
