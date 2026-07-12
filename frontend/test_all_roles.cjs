const puppeteer = require('puppeteer');

const ROLES = [
  { role: 'Admin', email: 'admin@projectmatrix.com', pass: 'admin' },
  { role: 'PM', email: 'sophia@projectmatrix.com', pass: 'password123' },
  { role: 'Team Lead', email: 'liam@projectmatrix.com', pass: 'password123' },
  { role: 'Employee', email: 'ravi@projectmatrix.com', pass: 'password123' },
  { role: 'Management', email: 'emily@projectmatrix.com', pass: 'password123' }
];

(async () => {
  const browser = await puppeteer.launch();
  
  for (const r of ROLES) {
    console.log(`\n--- TESTING ROLE: ${r.role} ---`);
    const page = await browser.newPage();
    let hasError = false;
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`[${r.role}] PAGE ERROR LOG:`, msg.text());
        hasError = true;
      }
    });
    
    page.on('pageerror', err => {
      console.log(`[${r.role}] PAGE EXCEPTION:`, err.message);
      hasError = true;
    });

    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('http://localhost:5174/');
    await new Promise(res => setTimeout(res, 1000));
    
    // Login
    await page.type('input[type="email"]', r.email);
    await page.type('input[type="password"]', r.pass);
    await page.click('button[type="submit"]');
    await new Promise(res => setTimeout(res, 2000));
    
    if (hasError) {
      console.log(`[${r.role}] FAILED AT LOGIN`);
      continue;
    }

    // Get all clickable menu items
    const menuItems = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.menu-item span:nth-child(2)')).map(el => el.textContent.trim());
    });
    
    console.log(`[${r.role}] Found menus:`, menuItems.join(', '));
    
    for (const menu of menuItems) {
      // Exclude "Sign Out" or toggle if they somehow match
      if (menu === 'Dashboard') continue; // already on dashboard
      
      await page.evaluate((menuName) => {
        const links = Array.from(document.querySelectorAll('.menu-item span:nth-child(2)'));
        const target = links.find(el => el.textContent.trim() === menuName);
        if (target) target.click();
      }, menu);
      
      await new Promise(res => setTimeout(res, 1000)); // wait for render
      
      if (hasError) {
        console.log(`[${r.role}] CRASHED ON MENU: ${menu}`);
        break;
      }
    }
    
    if (!hasError) {
      console.log(`[${r.role}] ALL MENUS PASSED`);
      await page.screenshot({ path: `final_${r.role}.jpg` });
    }
    
    await page.close();
  }

  await browser.close();
  console.log('\nTEST RUN COMPLETE');
})();
