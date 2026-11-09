// 相談する (always one tap away) and 受診用のまとめ (a summary to show a doctor).

import { html, useState } from '../vendor/preact-htm.js';
import { BackButton, CrisisLinks, H1, Icon, TopBar } from '../ui.js';
import { CONSULT_SIGNS, CONTACTS_CHECKED, MHLW_URL, WEEKLY_THRESHOLD } from '../content.js';
import { md } from '../dates.js';
import { latestWeekly, summary, summaryRows, summaryText } from '../stats.js';

export function Consult({ app }) {
  const weekly = latestWeekly(app.data, app.today);
  const trusted = app.data.settings.trusted;
  return html`<main class="screen">
    <${TopBar} left=${html`<${BackButton} app=${app} />`} title="相談する" />
    <${H1}>ひとりで抱えなくて大丈夫<//>
    <section class="card alert stack" aria-labelledby="crisis-h">
      <h2 id="crisis-h" class="card-title">死にたい・消えたい気持ちがあるとき</h2>
      <p class="body-s">すぐにだれかに話してください。</p>
      <a class="tel emergency" href="tel:119">
        <${Icon} name="phone" />
        <span class="tel-text"><span class="tel-name">119に電話する</span><span class="tel-sub">命の危険が迫っているとき</span></span>
      </a>
      <${CrisisLinks} tone="alert" />
      ${trusted.tel
        ? html`<a class="btn outline on-alert" href=${`tel:${trusted.tel}`}>${trusted.name || '信頼できる人'}に電話する</a>`
        : html`<button type="button" class="btn outline on-alert" onClick=${() => app.nav.go('Settings')}>信頼できる人を登録しておく</button>`}
      <a class="link on-alert" href=${MHLW_URL} target="_blank" rel="noopener">ほかの窓口・SNS相談（厚生労働省）<${Icon} name="external" size=${16} /></a>
    </section>
    <section class="card stack" aria-labelledby="signs-h">
      <h2 id="signs-h" class="card-title">受診を考える目安</h2>
      ${weekly && weekly.score >= WEEKLY_THRESHOLD && html`<p class="chip-note">日曜の2つの質問で、目安（3点以上）を超えていました</p>`}
      ${!weekly && html`<button type="button" class="text-btn" onClick=${() => app.nav.go('WeeklyCheck')}>2つの質問に答える（30秒）</button>`}
      <ul class="bullets">${CONSULT_SIGNS.map((s) => html`<li>${s}</li>`)}</ul>
      <p class="body-s">精神科や心療内科、かかりつけ医に相談できます。</p>
      <button type="button" class="btn outline" onClick=${() => app.nav.go('Summary')}>記録を1枚にまとめる（送る前に確認）</button>
    </section>
    <p class="note center">このアプリは診断や治療を行いません。窓口の番号は${CONTACTS_CHECKED}に確認しました。</p>
  </main>`;
}

export function Summary({ app }) {
  const s = summary(app.data, app.today);
  const [ok, setOk] = useState(false);
  const [message, setMessage] = useState('');
  const text = summaryText(s);
  const share = async () => {
    if (!ok) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Somatic OS 記録のまとめ', text });
      } else {
        await navigator.clipboard.writeText(text);
        setMessage('コピーしました。送り先に貼り付けてください。');
      }
    } catch (e) {
      if (!e || e.name !== 'AbortError') setMessage('共有できませんでした。印刷・PDFを使ってください。');
    }
  };
  const print = () => {
    if (ok) window.print();
  };

  return html`<main class="screen">
    <${TopBar} left=${html`<${BackButton} app=${app} />`} title="受診用のまとめ" />
    <${H1} cls="md">送る前に、中身を<br />確認してください<//>
    <p class="body-s">主治医との話のきっかけに使うまとめです。</p>
    <section class="card print-area" aria-labelledby="sum-h">
      <h2 id="sum-h" class="title-s">${md(s.from)}〜${md(s.to)}（2週間）</h2>
      ${s.checkIns === 0
        ? html`<p class="body-s">この2週間の記録がありません。</p>`
        : html`<dl class="sum">${summaryRows(s).map(([k, v]) => html`<div class="sum-row"><dt>${k}</dt><dd>${v}</dd></div>`)}</dl>`}
      <p class="note">自分で記録した値です。気分は1が低い・5がよい、疲れは1が元気・5がくたくた。診断ではありません。</p>
    </section>
    <button type="button" class="check plain-check" role="checkbox" aria-checked=${ok ? 'true' : 'false'} onClick=${() => setOk(!ok)}>
      <span class="box" aria-hidden="true">${ok ? html`<${Icon} name="check" size=${17} />` : null}</span>
      <span class="check-label">中身を確認しました</span>
    </button>
    <div class="btn-row">
      <button type="button" class="btn" aria-disabled=${ok ? undefined : 'true'} onClick=${share}><${Icon} name="share" size=${18} />共有する</button>
      <button type="button" class="btn outline" aria-disabled=${ok ? undefined : 'true'} onClick=${print}><${Icon} name="print" size=${18} />印刷・PDF</button>
    </div>
    ${message && html`<p class="note" role="status">${message}</p>`}
    <p class="note center bottom">送り先はあなたが選びます。アプリから自動では送りません。</p>
  </main>`;
}
