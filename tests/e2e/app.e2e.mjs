// End-to-end check of the app in a phone-sized browser.
// usage: node tests/e2e/app.e2e.mjs [baseUrl]   (needs Playwright: npm i -D playwright)
// Serve the app first, e.g.  python3 -m http.server 8790 --directory app

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// Loaded through require so a globally installed Playwright is found too.
const { chromium } = createRequire(import.meta.url)('playwright');

const BASE = (process.argv[2] || 'http://127.0.0.1:8790').replace(/\/$/, '');
const SHOTS = process.argv[3] || null;
const results = [];
const consoleErrors = [];

function check(name, ok, detail = '') {
  results.push({ name, ok: Boolean(ok), detail });
}

async function newPage(browser, time, seed = null) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tokyo', locale: 'ja-JP' });
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  await page.clock.install({ time: new Date(time) });
  if (seed) {
    await context.addInitScript((data) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem('somatic-os:data:v1', JSON.stringify(data));
        sessionStorage.setItem('seeded', '1');
      }
    }, seed);
  }
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  return { context, page };
}

const h1 = (page) => page.locator('h1').first().innerText();
const visibleText = async (page, text) => {
  for (const l of await page.getByText(text, { exact: false }).all()) if (await l.isVisible()) return true;
  return false;
};
const click = (page, selector, text) => page.locator(`${selector}:visible`, { hasText: text }).first().click();
const shot = async (page, name) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
};

/** Every visible control must be at least 44×44 px. */
async function smallTargets(page) {
  return page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('button, a[href], input, textarea, [role="checkbox"], [role="switch"]')) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (!r.width || !r.height || cs.visibility === 'hidden' || el.closest('.sr-only')) continue;
      if (r.width < 44 || r.height < 44) out.push(`${el.tagName} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 16)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    return out;
  });
}

/** 20 days of records ending yesterday (Sunday 2026-11-08), for the insight and review screens. */
function seedData() {
  const days = {};
  const start = new Date(2026, 9, 20);
  for (let i = 0; i < 20; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const long = i % 2 === 0;
    const at = `${key}T08:00:00+09:00`;
    days[key] = {
      mode: i % 5 === 0 ? 'rest' : 'tune',
      sleep: long ? '7〜9' : '5〜6',
      mood: long ? 4 : 2,
      fatigue: long ? 2 : 4,
      checkedInAt: at,
      done: { m4: at, m2: `${key}T08:30:00+09:00`, ...(i % 3 === 0 ? { d4: `${key}T12:00:00+09:00` } : {}) },
      extra: [],
      line: i === 18 ? '洗濯物をたためた' : '',
      walks: [{ at: `${key}T12:30:00+09:00`, min: 15 }],
      pauses: i % 4 === 1 ? [{ at: `${key}T15:00:00+09:00`, body: ['tired', 'sleepy'], acts: [] }] : [],
    };
    if (i === 18) days[key].done.n1 = `${key}T21:00:00+09:00`;
  }
  return {
    v: 1,
    settings: { onboarded: true, consentedAt: '2026-10-20T08:00:00+09:00', startDay: '2026-10-20', walkPlanStart: '2026-10-19', voice: false, vibrate: true, trusted: { name: '', tel: '' }, welcomeSeen: null },
    days,
    weekly: { '2026-11-02': { q1: 1, q2: 1, score: 2, at: '2026-11-08T09:00:00+09:00' } },
    reviews: {},
  };
}

const run = async () => {
  const browser = await chromium.launch();

  // 1. First run on a Monday morning.
  {
    const { context, page } = await newPage(browser, '2026-11-09T07:42:00+09:00');
    check('first run opens はじめに', (await h1(page)).includes('考えを変える前に'));
    check('はじめに: targets ≥ 44px', (await smallTargets(page)).length === 0, (await smallTargets(page)).join('; '));
    await click(page, 'button', '次へ');
    await click(page, 'button', '次へ');
    check('はじめに step 3', (await h1(page)).includes('★は、つらい日でも'));
    await click(page, 'button', 'はじめる');
    check('はじめる前に', (await h1(page)).includes('あなたの記録は'));
    await click(page, 'button', '同意してはじめる');
    check('check-in after consent', (await h1(page)).includes('おはようございます'));
    await shot(page, '01-checkin');
    check('チェックイン: targets ≥ 44px', (await smallTargets(page)).length === 0, (await smallTargets(page)).join('; '));
    await page.locator('[aria-labelledby="ci-sleep"] button', { hasText: '6〜7' }).click();
    await page.locator('[aria-labelledby="ci-mood"] button', { hasText: '3' }).click();
    await page.locator('[aria-labelledby="ci-fatigue"] button', { hasText: '2' }).click();
    check('check-in pill is pressed', (await page.locator('[aria-labelledby="ci-mood"] button[aria-pressed="true"]').innerText()) === '3');
    await click(page, 'button.mode-card', 'ととのえる日');
    check('home: ととのえる日', (await h1(page)).includes('ととのえる日'));
    check('reminder tip on the first home', await visibleText(page, '毎朝のチェックインを、カレンダーの通知で思い出せます'));
    await click(page, 'button', '今はしない');
    check('reminder tip can be dismissed', !(await visibleText(page, '毎朝のチェックインを、カレンダーの通知で思い出せます')));
    check('morning tab open at 7:42', (await page.locator('.part[aria-pressed="true"]').innerText()).startsWith('朝'));
    const m4 = page.locator('[role="checkbox"]', { hasText: '睡眠・気分・疲れを記録する' });
    check('m4 done by check-in', (await m4.getAttribute('aria-checked')) === 'true');
    await page.locator('[role="checkbox"]', { hasText: '1時間以内に外の光をあびる' }).click();
    check('check an item', (await page.locator('[role="checkbox"]', { hasText: '1時間以内に外の光をあびる' }).getAttribute('aria-checked')) === 'true');
    check('fresh walking plan', await visibleText(page, '1週目の目安は週50分'));
    await click(page, 'button', '＋ 記録');
    await click(page, '.sheet button', '＋10分');
    check('walk sheet total', await visibleText(page, '今週の合計 10分'));
    await click(page, '.sheet button', '閉じる');
    check('walk card shows 10分', (await page.locator('.walk-min').innerText()) === '10分');
    await shot(page, '02-home-tune');
    check('ホーム: targets ≥ 44px', (await smallTargets(page)).length === 0, (await smallTargets(page)).join('; '));

    // Closing the sheet steps the browser history back; let that finish before reloading.
    await page.waitForFunction(() => !(history.state && history.state.somatic));
    await page.reload({ waitUntil: 'networkidle' });
    check('records survive a reload', (await page.locator('[role="checkbox"]', { hasText: '1時間以内に外の光をあびる' }).getAttribute('aria-checked')) === 'true' && (await page.locator('.walk-min').innerText()) === '10分');

    // 2. きろく
    await click(page, '.tabbar button', 'きろく');
    check('きろく: week total', (await page.locator('.big-num').innerText()).startsWith('2'));
    check('きろく: recent list', await visibleText(page, '外の光をあびた'));
    await click(page, 'button.seg', 'からだ');
    check('きろく: body table', (await page.locator('.table tbody tr').first().innerText()).replace(/\s+/g, ' ').includes('きょう 6〜7 3 2'));
    await shot(page, '03-evidence-body');

    // 3. Change mode to まもる日
    await click(page, '.tabbar button', 'きょう');
    await page.locator('.mode-pill').click();
    check('mode sheet opens', await visibleText(page, 'きょうの状態を変える'));
    await shot(page, '04-mode-sheet');
    await click(page, '.sheet button.mode-card', 'まもる日');
    check('home: まもる日', (await h1(page)).includes('まもる日'));
    check('rest stars keep the check', (await page.locator('.big-check', { hasText: '外の光を数分あびる' }).getAttribute('aria-checked')) === 'true');
    await shot(page, '05-home-rest');
    await click(page, '.tabbar button', 'きろく');
    check('rest: no numbers in きろく', (await visibleText(page, 'まもる日は、数や表を出しません')) && (await page.locator('.big-num').count()) === 0);
    await click(page, '.tabbar button', 'わかったこと');
    check('insights empty state (1 day)', await visibleText(page, 'いま1日分。あと13日です。'));

    // 4. つらいとき → breath → back keeps the selection
    await click(page, '.tabbar button', 'つらいとき');
    check('つらいとき opens', (await h1(page)).includes('つらい考えが'));
    await click(page, 'button.chip', '眠い');
    check('suggestion appears', await visibleText(page, '5分、目を閉じて座る'));
    await page.locator('[role="checkbox"]', { hasText: '5分、目を閉じて座る' }).click();
    await shot(page, '06-pause');
    check('つらいとき: targets ≥ 44px', (await smallTargets(page)).length === 0, (await smallTargets(page)).join('; '));
    await click(page, 'button', 'ため息呼吸（5分）');
    check('breath opens', await visibleText(page, '鼻から3秒吸って'));
    await shot(page, '07-breath');
    await click(page, 'button', 'はじめる');
    await page.clock.runFor(3500);
    check('breath guides the top-up after 3 s', (await page.locator('.phase').innerText()) === 'もう少し吸い足して');
    check('breath timer counts down', (await page.locator('.timer .left').innerText()) === '残り 4:57');
    await page.clock.runFor(1000);
    check('breath guides the exhale', (await page.locator('.phase').innerText()) === '口からゆっくり吐く');
    await page.clock.fastForward(60000);
    await page.locator('[aria-label="閉じる"]').click();
    check('back keeps つらいとき state', (await page.locator('button.chip', { hasText: '眠い' }).getAttribute('aria-pressed')) === 'true');
    await click(page, 'button', '記録して戻る');
    check('returns to the previous tab', (await h1(page)).includes('わかったこと'));
    await click(page, '.tabbar button', 'きろく');
    check('care action recorded as done', await visibleText(page, '目を閉じて休んだ'));
    check('a minute of breathing counts as done', await visibleText(page, 'ため息呼吸をした'));

    // 5. 相談 → まとめ
    await page.locator('[aria-label="相談する"]').click();
    check('consult opens', (await h1(page)).includes('ひとりで抱えなくて大丈夫'));
    check('three phone links', (await page.locator('a[href^="tel:"]').count()) === 3);
    check('相談: targets ≥ 44px', (await smallTargets(page)).length === 0, (await smallTargets(page)).join('; '));
    await shot(page, '08-consult');
    await click(page, 'button', '記録を1枚にまとめる');
    check('summary opens', (await h1(page)).includes('送る前に'));
    check('share disabled until confirmed', (await page.locator('button', { hasText: '共有する' }).getAttribute('aria-disabled')) === 'true');
    await page.locator('[role="checkbox"]', { hasText: '中身を確認しました' }).click();
    check('share enabled after confirming', (await page.locator('button', { hasText: '共有する' }).getAttribute('aria-disabled')) === null);
    await shot(page, '09-summary');
    await page.goBack();
    check('phone back gesture steps back inside the app', (await h1(page)).includes('ひとりで抱えなくて大丈夫'));

    // 6. Two weekly questions → high score → banner on まもる日
    await click(page, 'button', '2つの質問に答える');
    await page.locator('[aria-labelledby="wq-q1"] button', { hasText: '半分以上' }).click();
    await page.locator('[aria-labelledby="wq-q2"] button', { hasText: '数日' }).click();
    check('score 3 suggests consulting', await visibleText(page, 'この2週間、つらい日が多かったようです'));
    await shot(page, '10-weekly');
    await page.locator('[aria-label="閉じる"]').click();
    await page.locator('[aria-label="戻る"]').click();
    await click(page, '.tabbar button', 'きょう');
    check('banner on まもる日 after a high score', await visibleText(page, 'この2週間、気分の低い日が多めです'));

    // 7. Night: 22:30 → dark night screen; records are not asked for
    await page.clock.fastForward('14:48:00');
    await page.waitForTimeout(100);
    await click(page, '.tabbar button', 'きょう');
    check('night screen at 22:30', (await h1(page)).includes('おやすみ前の時間です'));
    check('dark theme at night', await page.evaluate(() => document.documentElement.classList.contains('night')));
    check('夜: targets ≥ 44px', (await smallTargets(page)).length === 0, (await smallTargets(page)).join('; '));
    await shot(page, '11-night');
    await click(page, 'button', 'きょうのメニューを見る');
    check('menu still reachable at night', (await h1(page)).includes('まもる日'));
    await shot(page, '12-home-rest-night');

    // 8. Next morning starts a new day
    await page.clock.fastForward('09:00:00');
    await page.reload({ waitUntil: 'networkidle' });
    check('next morning asks for a new check-in', (await h1(page)).includes('おはようございます'));
    check('light theme in the morning', !(await page.evaluate(() => document.documentElement.classList.contains('night'))));

    // 9. Settings: export and delete
    await click(page, 'button.mode-card', 'ととのえる日');
    await click(page, '.tabbar button', 'きろく');
    await page.locator('[aria-label="設定とデータ"]').click();
    await page.locator('.time-grid button', { hasText: '6:30' }).click();
    const icsLink = page.locator('a', { hasText: 'カレンダーに追加（iPhoneなど）' });
    const icsHref = await icsLink.getAttribute('href');
    check('reminder: file for the picked time', icsHref.endsWith('reminders/checkin-0630.ics'), icsHref);
    const icsRes = await page.request.get(new URL(icsHref, page.url()).href);
    const icsText = await icsRes.text();
    check('reminder: served as a calendar file', icsRes.ok() && (icsRes.headers()['content-type'] || '').includes('text/calendar'), icsRes.headers()['content-type']);
    check('reminder: daily at 6:30', icsText.includes('DTSTART:20261115T063000') && icsText.includes('RRULE:FREQ=DAILY'));
    const gHref = await page.locator('a', { hasText: 'Googleカレンダーに追加' }).getAttribute('href');
    check('reminder: Google link starts tomorrow at 6:30', gHref.startsWith('https://calendar.google.com/') && gHref.includes('dates=20261111T063000%2F20261111T063500'), gHref);
    await Promise.all([page.waitForEvent('download'), icsLink.click()]);
    check('reminder: adding is remembered', (await visibleText(page, 'カレンダーの画面を開きました（6:30）')) && (await page.evaluate(() => Boolean(JSON.parse(localStorage.getItem('somatic-os:data:v1')).settings.reminderAddedAt))));
    const [download] = await Promise.all([page.waitForEvent('download'), click(page, 'button', '書き出す')]);
    const exported = JSON.parse(readFileSync(await download.path(), 'utf8'));
    check('export file has the records', exported.app === 'somatic-os' && Object.keys(exported.data.days).length === 2, download.suggestedFilename());
    check('設定: targets ≥ 44px', (await smallTargets(page)).length === 0, (await smallTargets(page)).join('; '));
    await shot(page, '13-settings');
    await click(page, 'button', 'すべて消す');
    await click(page, '.sheet button', '消す');
    check('delete all returns to はじめに', (await h1(page)).includes('考えを変える前に'));
    check('storage is empty after delete', await page.evaluate(() => JSON.parse(localStorage.getItem('somatic-os:data:v1')).settings.onboarded === false));
    await context.close();
  }

  // 10. Twenty days of records: insights, ひろげる日 and the weekly review.
  {
    const { context, page } = await newPage(browser, '2026-11-09T07:42:00+09:00', seedData());
    check('seeded: check-in first', (await h1(page)).includes('おはようございます'));
    await click(page, 'button.mode-card', 'ひろげる日');
    check('home: ひろげる日', (await h1(page)).includes('ひろげる日'));
    check('review card on ひろげる日', await visibleText(page, '週1のふりかえり'));
    check('walking plan week 4 (started 10/19)', await visibleText(page, '4週目の目安は週150分'));
    await shot(page, '14-home-expand');
    await click(page, 'button', '設定する');
    check('reminder tip opens settings', (await h1(page)).includes('設定とデータ') && (await visibleText(page, '朝のチェックインを思い出す')));
    await shot(page, '14b-settings-reminder');
    await page.locator('[aria-label="戻る"]').click();
    await click(page, '.tabbar button', 'わかったこと');
    check('insight: sleep and mood', await visibleText(page, 'よく眠れた朝は、気分が高め'));
    check('insight: body and thought', await visibleText(page, '「だめだ」のときは、眠い・疲れが多め'));
    await shot(page, '15-insights');
    await click(page, '.card.warm button', 'はじめる');
    check('review step 1 uses the last 7 days', (await h1(page)).includes('この1週間でできたことを') && (await page.locator('.option').count()) >= 2);
    await page.locator('.option').nth(0).click();
    await page.locator('.option').nth(1).click();
    await click(page, 'button', '次へ');
    check('review step 2 compares days', (await visibleText(page, '気分4以上')) && (await visibleText(page, '気分2以下')));
    await shot(page, '16-review-compare');
    await click(page, 'button', '次へ');
    check('review step 3 prefilled from つらいとき', (await page.locator('button.chip[aria-pressed="true"]').count()) >= 1);
    await click(page, 'button', '次へ');
    await click(page, 'button.pill', 'とても');
    check('high answer offers consulting', await visibleText(page, '相談先を見る'));
    await click(page, 'button', '次へ');
    await click(page, 'button.option', '歩く日を1日増やす');
    await click(page, 'button', '保存する');
    check('review saved', (await visibleText(page, '来週増やすこと')) && (await visibleText(page, '歩く日を1日増やす')));
    check('saved review shows its 7 days', await visibleText(page, '11月3日〜11月9日の記録から'));
    await shot(page, '17-review-saved');
    await page.locator('[aria-label="戻る"]').click();
    check('review card says done', await visibleText(page, '見る'));
    await context.close();
  }

  // 11. Coming back after five days.
  {
    const seed = seedData();
    for (const k of Object.keys(seed.days)) if (k > '2026-11-03') delete seed.days[k];
    const { context, page } = await newPage(browser, '2026-11-09T07:42:00+09:00', seed);
    check('welcome back after a gap', (await h1(page)).includes('おかえりなさい') && (await visibleText(page, '6日ぶりですね')));
    await shot(page, '18-welcome-back');
    await click(page, 'button', 'きょうの状態を選ぶ');
    check('then the check-in', (await h1(page)).includes('おはようございます'));
    await click(page, 'button.mode-card', 'ととのえる日');
    check('walking plan continues after a 6-day gap', await visibleText(page, '4週目の目安は週150分'));
    await context.close();
  }

  // 12. Works offline once installed.
  {
    const { context, page } = await newPage(browser, '2026-11-09T07:42:00+09:00');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload({ waitUntil: 'networkidle' });
    await Promise.all([
      page.waitForEvent('download'),
      page.evaluate(() => {
        const a = document.createElement('a');
        a.href = './reminders/checkin-0730.ics';
        document.body.appendChild(a);
        a.click();
      }),
    ]);
    await context.setOffline(true);
    await page.reload({ waitUntil: 'load' });
    check('opens offline, even after opening a reminder file', (await h1(page)).includes('考えを変える前に'));
    await context.close();
  }

  await browser.close();

  check('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 5).join(' | '));
  const failed = results.filter((r) => !r.ok);
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name}${r.ok || !r.detail ? '' : ` — ${r.detail}`}`);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
