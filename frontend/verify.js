import puppeteer from 'puppeteer';

const baseUrl = 'http://localhost:5173';
const modules = [
  'employees', 'clients', 'projects', 'modules', 'task-types', 'holidays',
  'resources', 'allocations', 'tasks', 'timesheets', 'approvals', 'reports', 'admin'
];

async function runTests() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  const results = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[Console Error] ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    console.log(`[Page Error] ${error.message}`);
  });

  page.on('requestfailed', request => {
    console.log(`[Network Error] ${request.url()} - ${request.failure().errorText}`);
  });

  // Login
  await page.goto(`${baseUrl}/login`);
  await page.type('input[type="email"]', 'admin@projectmatrix.com');
  await page.type('input[type="password"]', 'admin');
  await page.click('button[type="submit"]');
  // Wait for some element on the dashboard to ensure login worked, or just a small timeout
  await new Promise(r => setTimeout(r, 2000));
  
  for (const mod of modules) {
    console.log(`Testing module: ${mod}`);
    let status = 'Pass';
    let errors = [];
    
    // Listen for errors
    const errorListener = msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    };
    const pageErrorListener = err => errors.push(err.message);
    const networkErrorListener = req => {
      if(req.url().includes('localhost')) {
         errors.push(`Network failed: ${req.url()}`);
      }
    };
    const responseListener = res => {
      if(!res.ok() && res.url().includes('localhost')) {
         errors.push(`API Error: ${res.url()} [${res.status()}]`);
      }
    };
    
    page.on('console', errorListener);
    page.on('pageerror', pageErrorListener);
    page.on('requestfailed', networkErrorListener);
    page.on('response', responseListener);

    try {
      await page.goto(`${baseUrl}/${mod}`, { waitUntil: 'networkidle0' });
      // give it a second to render
      await new Promise(r => setTimeout(r, 1000));
      
      // Try to click an "Add" button if exists
      const addBtn = await page.$('button::-p-text(Add)');
      if (addBtn) {
         await addBtn.click();
         await new Promise(r => setTimeout(r, 500));
         const closeBtn = await page.$('button::-p-text(Cancel)');
         if(closeBtn) await closeBtn.click();
      }
    } catch (e) {
      errors.push(`Navigation failed: ${e.message}`);
    }

    page.off('console', errorListener);
    page.off('pageerror', pageErrorListener);
    page.off('requestfailed', networkErrorListener);
    page.off('response', responseListener);

    if (errors.length > 0) {
      status = 'Fail';
    }

    results.push({ mod, status, errors: [...new Set(errors)] });
  }

  await browser.close();

  console.log('\n--- VERIFICATION REPORT ---');
  console.log('Module | Status | Errors Found | Priority');
  console.log('------------------------------------------------');
  for (const r of results) {
    let priority = r.status === 'Fail' ? 'High' : 'None';
    console.log(`${r.mod} | ${r.status} | ${r.errors.join(', ')} | ${priority}`);
  }
}

runTests().catch(console.error);
