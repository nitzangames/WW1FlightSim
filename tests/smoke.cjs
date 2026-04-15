const puppeteer = require('/usr/local/lib/node_modules/puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

  await page.goto('http://localhost:8765', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: '/tmp/ww1-menu.png' });

  await page.mouse.click(270, 480);
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: '/tmp/ww1-playing.png' });

  await browser.close();
  const real = errors.filter(e => !/favicon|Failed to load resource/i.test(e));
  if (real.length) {
    console.error('Errors detected:', real);
    process.exit(1);
  }
  console.log('Smoke OK. Screenshots at /tmp/ww1-menu.png and /tmp/ww1-playing.png');
})();
