import { test, expect } from '@playwright/test';

// ============ HELPERS ============

// Random wait bin min w max (ms)
function randomWait(min = 400, max = 1200) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function humanPause(min = 400, max = 1200) {
  await new Promise(r => setTimeout(r, randomWait(min, max)));
}

// Mouse move visible — kaydir path 3la element qbel click
async function humanMove(page, locator) {
  try {
    
  const box = await locator.boundingBox();
  if (!box) return;
  const targetX = box.x + box.width / 2;
  const targetY = box.y + box.height / 2;

  // Start from random point
  const startX = Math.random() * 200 + 50;
  const startY = Math.random() * 200 + 50;
  await page.mouse.move(startX, startY, { steps: 5 });

  // Move in small steps (visible)
  const steps = 15;
  for (let i = 0; i <= steps; i++) {
    const x = startX + (targetX - startX) * (i / steps);
    const y = startY + (targetY - startY) * (i / steps);
    // slight jitter
    const jx = x + (Math.random() - 0.5) * 4;
    const jy = y + (Math.random() - 0.5) * 4;
    await page.mouse.move(jx, jy, { steps: 1 });
    await page.waitForTimeout(randomWait(10, 30));
  }

  await page.waitForTimeout(randomWait(150, 400));

  }catch (error) {
    console.error("Error in humanMove:", error);
  }
}

// Move + click
async function humanClick(page, locator, label = '') {
  await locator.waitFor({ state: 'visible' });
  await humanMove(page, locator);
  await locator.click();
  if (label) console.log(`🖱️  clicked: ${label}`);
  await humanPause();
}

// Move + fill
async function humanFill(page, locator, text, label = '') {
  await locator.waitFor({ state: 'visible' });
  await humanMove(page, locator);
  await locator.click();
  await humanPause(150, 400);
  await locator.fill(text);
  if (label) console.log(`⌨️  filled: ${label} = "${text}"`);
  await humanPause();
}

// Move + check
async function humanCheck(page, locator, label = '') {
  await locator.waitFor({ state: 'visible' });
  await humanMove(page, locator);
  await locator.check();
  if (label) console.log(`☑️  checked: ${label}`);
  await humanPause();
}

// Random mouse wander
async function mouseWander(page, times = 3) {
  for (let i = 0; i < times; i++) {
    const x = Math.random() * 800 + 100;
    const y = Math.random() * 500 + 100;
    await page.mouse.move(x, y, { steps: 10 });
    await page.waitForTimeout(randomWait(200, 600));
  }
}

// ============ TEST ============

test('test', async ({ page }) => {
  await page.goto('https://app.simplelogin.io/auth/login', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForLoadState('networkidle');
  await mouseWander(page, 2);

  const email = page.locator('#email');
  const password = page.locator('#password');

  await humanClick(page, email, 'email (1st)');
  await humanClick(page, email, 'email (2nd)');
  await humanFill(page, email, '', 'email empty');

  await humanClick(page, page.getByText('Password I forgot my password'), 'forgot password text');

  await humanFill(page, password, 'sasasas', 'password');
  await humanFill(page, email, 'sasasassaasassa', 'email wrong');

  const loginBtn = page.getByRole('button', { name: 'Log in' });
  await humanClick(page, loginBtn, 'Log in (1st)');

  const welcome = page.getByText('Welcome back! Email address');
  await welcome.waitFor({ state: 'visible' });
  await humanClick(page, welcome, 'welcome text');

  await humanFill(page, email, 'saber@gmail.com', 'email saber');

  await humanClick(page, page.locator('div').nth(4), 'div nth(4)');

  await humanFill(page, password, '', 'password empty');
  await humanClick(page, loginBtn, 'Log in (2nd)');

  await humanFill(page, password, 'zfdfazeffzeaf', 'password wrong');
  // await humanClick(page, loginBtn, 'Log in (3rd)');

  // await humanClick(page, page.getByRole('link', { name: 'Log in with Proton' }), 'Proton link');

  // await page.waitForLoadState('networkidle');
  // await mouseWander(page, 2);

  // const protonUsername = page.getByRole('textbox', { name: 'Email or username' });
  // await protonUsername.waitFor({ state: 'visible' });

  // const challengeFrame = page.locator('iframe[title="Challenge"]');
  // await challengeFrame.waitFor({ state: 'attached' });
  // await page.waitForTimeout(randomWait(500, 900));

  // const challengeUsername = challengeFrame.contentFrame().locator('#username');
  // await challengeUsername.waitFor({ state: 'visible' });

  // // series of fills — with visible mouse moves
  // const userValues = ['sa', 'saf', 'safe', 'safeef', 'safeeffe', 'safeeffeef', 'safeeffeefef'];
  // for (const v of userValues) {
  //   await humanFill(page, protonUsername, v, 'proton username');
  //   await humanFill(page, challengeUsername, v, 'challenge username');
  // }

  // const protonPassword = page.getByRole('textbox', { name: 'Password' });
  // await humanFill(page, protonPassword, 'sasasasasaa', 'proton password');
  // await humanClick(page, protonUsername, 'proton username focus');

  // const keepSignedIn = page.getByRole('checkbox', { name: 'Keep me signed in' });
  // await humanCheck(page, keepSignedIn, 'keep signed in');

  // await humanClick(page, page.getByRole('button', { name: 'Continue to SimpleLogin' }), 'continue');

  // await page.waitForLoadState('networkidle');
  // await mouseWander(page, 2);

  // await humanClick(page, page.getByTestId('language-dropdown'), 'language dropdown');
  // await humanClick(page, page.getByRole('button', { name: 'عربي' }), 'arabi');

  // await page.waitForLoadState('networkidle');

  // await humanClick(page, page.getByRole('button', { name: 'إظهار كلمة السر' }), 'show password');

  // const arabicPassword = page.getByRole('textbox', { name: 'كلمة السر' });
  // await humanFill(page, arabicPassword, '', 'arabic password empty');

  // const continueArabic = page.getByRole('button', { name: 'المتابعة إلى SimpleLogin' });
  // await humanClick(page, continueArabic, 'continue arabic (1)');
  // await humanClick(page, continueArabic, 'continue arabic (2)');

  // await page.waitForLoadState('networkidle');

  // await humanClick(page, page.getByTestId('dropdown-button'), 'dropdown button');
  // await humanClick(page, page.getByRole('button', { name: 'داكن' }), 'dark mode');

  // await humanPause(1000, 2000);
  await page.screenshot({ path: 'screenshot.png', fullPage: true });
  
});