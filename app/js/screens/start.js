// First run (はじめに, はじめる前に) and coming back after a break (おかえりなさい).

import { html, useEffect, useState } from '../vendor/preact-htm.js';
import { BackButton, Brand, ConsultButton, H1, Icon, ModeIcon, TopBar } from '../ui.js';
import { MODES, MODE_ORDER } from '../content.js';
import { lastCheckInBefore, updateSettings } from '../store.js';
import { diffDays } from '../dates.js';

const STARS = ['同じ時刻に起きる', '朝の光をあびる', '水を飲んで、何か食べる', '5分だけ外に出る', '眠れなければ、一度布団を出る'];

export function Onboarding({ app }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (step > 0) {
      const h = document.querySelector('#app h1');
      if (h) h.focus();
    }
  }, [step]);
  const next = () => (step < 2 ? setStep(step + 1) : app.nav.go('Privacy'));

  return html`<main class="screen">
    <${TopBar}
      left=${html`<${Brand} />`}
      right=${html`<button type="button" class="text-btn" onClick=${() => app.nav.go('Privacy')}>スキップ</button><${ConsultButton} app=${app} />`}
    />
    ${step === 0 &&
    html`<div class="layers" aria-hidden="true">
        <span class="layer meaning">意味</span>
        <span class="layer action">行動</span>
        <span class="layer body">からだ</span>
      </div>
      <${H1}>考えを変える前に、<br />からだから。<//>
      <p class="lead">睡眠・光・食事・歩くといった「からだ」を先に整え、気分を待たずに小さく動く。意味づけは、そのあとで十分です。</p>`}
    ${step === 1 &&
    html`<${H1}>毎朝、3つから<br />選ぶだけ<//>
      <div class="stack">
        ${MODE_ORDER.map(
          (m) => html`<div class=${`mode-card static ${m}`}>
            <span class="mode-ic" aria-hidden="true"><${ModeIcon} mode=${m} /></span>
            <span class="mode-text"><span class="mode-name">${MODES[m].name}</span><span class="mode-desc">${MODES[m].desc}日</span></span>
          </div>`,
        )}
      </div>
      <p class="lead">迷ったら、まもる日で大丈夫。あとで変えられます。</p>`}
    ${step === 2 &&
    html`<${H1}>★は、つらい日でも<br />やる小さなこと<//>
      <ul class="card star-list" aria-label="★の項目">
        ${STARS.map((s) => html`<li><span class="star" aria-hidden="true">★</span>${s}</li>`)}
      </ul>
      <p class="lead">全部できなくて大丈夫。数えるのは、できたことだけです。</p>`}
    <div class="bottom">
      <div class="steps">
        <span class="dots" aria-hidden="true">${[0, 1, 2].map((i) => html`<span class=${`dot ${i === step ? 'on' : ''}`}></span>`)}</span>
        <span class="step-text">${step + 1} / 3</span>
      </div>
      <div class="btn-row">
        ${step > 0 && html`<button type="button" class="btn outline auto" onClick=${() => setStep(step - 1)}>戻る</button>`}
        <button type="button" class="btn" onClick=${next}>${step < 2 ? '次へ' : 'はじめる'}</button>
      </div>
    </div>
  </main>`;
}

export function Privacy({ app }) {
  const agree = () => {
    app.update((d) => updateSettings(d, { onboarded: true, consentedAt: new Date().toISOString() }));
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    app.nav.home();
  };
  const rows = [
    ['device', '保存先', 'このスマホの中だけ', '外には送りません。アカウントもありません'],
    ['shield', '外との通信', 'ありません', '分析ツールや広告も入っていません'],
    ['lock', 'ロック', 'スマホの画面ロックで守ります', 'アプリ自体には、ロックの機能がありません'],
    ['download', '書き出し・削除', 'いつでもできます', '「きろく」の右上の設定から'],
  ];
  return html`<main class="screen">
    <${TopBar} left=${html`<${BackButton} app=${app} />`} right=${html`<${ConsultButton} app=${app} />`} />
    <p class="eyebrow">はじめる前に</p>
    <${H1}>あなたの記録は、<br />あなたのもの。<//>
    <p class="lead">からだと気分の記録は、とても個人的な情報です。このアプリでの扱いを確認してください。</p>
    <ul class="card rows">
      ${rows.map(
        ([icon, k, v, s]) => html`<li class="info-row">
          <span class="round-ic" aria-hidden="true"><${Icon} name=${icon} size=${20} /></span>
          <span class="info-text"><span class="k">${k}</span><span class="v">${v}</span><span class="s">${s}</span></span>
        </li>`,
      )}
    </ul>
    <p class="notice">ブラウザのデータを消すと、記録も消えます。ときどき書き出しておくと安心です。</p>
    <p class="notice">このアプリは、診断や治療の代わりではありません。持病がある人や治療中の人は、運動の量を主治医と相談してください。</p>
    <button type="button" class="btn bottom" onClick=${agree}>同意してはじめる</button>
  </main>`;
}

export function WelcomeBack({ app }) {
  const prev = lastCheckInBefore(app.data, app.today);
  const gap = prev ? diffDays(prev, app.today) : null;
  const seen = (d) => updateSettings(d, { welcomeSeen: app.today });
  return html`<main class="screen">
    <${TopBar} left=${html`<${Brand} />`} right=${html`<${ConsultButton} app=${app} />`} />
    <div class="trio" aria-hidden="true"><span class="rest"></span><span class="tune"></span><span class="expand"></span></div>
    <${H1} cls="xl">おかえりなさい<//>
    <p class="lead">${gap ? `${gap}日ぶりですね。` : ''}空いた日のことは、記録しなくて大丈夫です。</p>
    <p class="lead">きょうの、いまのからだから始めましょう。</p>
    <div class="bottom stack">
      <button type="button" class="btn" onClick=${() => { app.update(seen); app.nav.home(); }}>きょうの状態を選ぶ</button>
      <button type="button" class="btn outline" onClick=${() => app.nav.go('Pause')}>いま、つらい</button>
      <button type="button" class="text-btn center" onClick=${() => app.nav.go('Consult')}>話せる窓口を見る</button>
    </div>
  </main>`;
}
