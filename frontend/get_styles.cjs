const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/');
  await new Promise(r => setTimeout(r, 1000));
  await page.type('input[type="email"]', 'emp1@projectmatrix.com');
  await page.type('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 4000));
  const styles = await page.evaluate(() => {
    const card = document.querySelector('.card');
    if (!card) return 'No .card found';
    const st = window.getComputedStyle(card);
    return {
      height: st.height,
      minHeight: st.minHeight,
      maxHeight: st.maxHeight,
      display: st.display,
      flexDirection: st.flexDirection,
      padding: st.padding,
      boxSizing: st.boxSizing,
      overflow: st.overflow,
      htmlHeight: document.documentElement.clientHeight,
      bodyHeight: document.body.clientHeight,
      mainHeight: document.querySelector('.main-content')?.offsetHeight
    };
  });
  console.log(JSON.stringify(styles, null, 2));
  await browser.close();
})();
