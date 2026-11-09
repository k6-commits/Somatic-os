// きろく (what got done, and the body record) and わかったこと (patterns in your own data).

import { html } from '../vendor/preact-htm.js';
import { ConsultButton, H1, Icon, ModeIcon, TabBar, TopBar, useDraft } from '../ui.js';
import { addDays, hm, md, relDay, weekStart, weekdayOf } from '../dates.js';
import { bodyThought, checkInKeys, doneCount, fmt1, recentDone, sleepMood, week } from '../stats.js';

const MAX_PEBBLES = 6;
const dayLabel = (k, today) => {
  const r = relDay(k, today);
  return r === 'きょう' || r === 'きのう' ? r : `${md(k)}（${weekdayOf(k)}）`;
};
const MIN_DAYS = 14;

function SettingsButton({ app }) {
  return html`<button type="button" class="icon-btn plain" aria-label="設定とデータ" onClick=${() => app.nav.go('Settings')}><${Icon} name="sliders" /></button>`;
}

function RecentList({ app }) {
  const items = recentDone(app.data, app.today, 8);
  if (!items.length) return null;
  return html`<section class="stack-tight" aria-labelledby="recent-h">
    <h2 id="recent-h" class="h2">最近のできた</h2>
    <ul class="recent">
      ${items.map(
        (e) => html`<li>
          <span class="pebble" aria-hidden="true"></span>
          <span class="grow">${e.label}</span>
          <span class="note">${relDay(e.key, app.today)} ${hm(e.at)}</span>
        </li>`,
      )}
    </ul>
  </section>`;
}

function WeekCard({ app }) {
  const w = week(app.data, app.today);
  const label = w.perDay
    .filter((d) => !d.future)
    .map((d) => `${d.isToday ? 'きょう' : weekdayOf(d.key)}${d.n}`)
    .join('、');
  return html`<section class="card stack">
    <div class="stack-tight">
      <span class="note">今週のできた</span>
      <span class="big-num">${w.total}<span class="unit">個</span></span>
      <span class="body-s">数えるのは、できたことだけ。</span>
    </div>
    <div class="row between"><span class="title-s">この1週間</span><span class="note">丸1つ＝できた1つ</span></div>
    <div class="week" role="img" aria-label=${`この1週間のできた：${label}`}>
      ${w.perDay.map(
        (d) => html`<div class=${`wday ${d.future ? 'future' : ''}`}>
          <div class="pebbles">
            ${Array.from({ length: Math.min(d.n, MAX_PEBBLES) }, () => html`<span class="pebble"></span>`)}
            ${d.n > MAX_PEBBLES && html`<span class="more">+${d.n - MAX_PEBBLES}</span>`}
          </div>
          <span class=${`wmode ${d.mode || ''}`}>${d.mode ? html`<${ModeIcon} mode=${d.mode} size=${18} />` : null}</span>
          <span class=${`wlabel ${d.isToday ? 'today' : ''}`}>${d.isToday ? 'きょう' : weekdayOf(d.key)}</span>
        </div>`,
      )}
    </div>
    <div class="legend" aria-hidden="true">
      <span class="wmode rest"><${ModeIcon} mode="rest" size=${14} />まもる日</span>
      <span class="wmode tune"><${ModeIcon} mode="tune" size=${14} />ととのえる日</span>
      <span class="wmode expand"><${ModeIcon} mode="expand" size=${14} />ひろげる日</span>
    </div>
  </section>`;
}

function BodyTable({ app }) {
  const keys = Array.from({ length: 7 }, (_, i) => addDays(app.today, i - 6)).reverse();
  const rows = keys.map((k) => ({ k, d: app.data.days[k] })).filter((r) => r.d && r.d.checkedInAt);
  if (!rows.length) return html`<section class="card"><p class="body-s">この1週間、からだの記録はまだありません。</p></section>`;
  return html`<section class="card stack">
    <span class="title-s">この1週間のからだ</span>
    <table class="table">
      <thead><tr><th scope="col">日</th><th scope="col">睡眠（時間）</th><th scope="col">気分</th><th scope="col">疲れ</th></tr></thead>
      <tbody>
        ${rows.map(
          ({ k, d }) => html`<tr>
            <th scope="row">${dayLabel(k, app.today)}</th>
            <td>${d.sleep || '—'}</td>
            <td>${d.mood ?? '—'}</td>
            <td>${d.fatigue ?? '—'}</td>
          </tr>`,
        )}
      </tbody>
    </table>
    <span class="note">気分は1（低い）〜5（よい）、疲れは1（元気）〜5（くたくた）</span>
  </section>`;
}

export function Evidence({ app }) {
  const day = app.data.days[app.today];
  const rest = Boolean(day && day.mode === 'rest');
  const [view, setView] = useDraft(app, 'EvidenceView', 'done');
  const anything = Object.values(app.data.days).some((d) => doneCount(d) > 0 || d.checkedInAt);

  let body;
  if (!anything) {
    body = html`<section class="card stack">
      <span class="card-title">まだ記録はありません</span>
      <span class="body-s">きょう1つできたら、ここに残ります。数えるのは、できたことだけです。</span>
    </section>`;
  } else if (rest) {
    body = html`<section class="card stack">
        <span class="card-title">まもる日は、数や表を出しません</span>
        <span class="body-s">できたことだけ、ここに残ります。</span>
      </section>
      <${RecentList} app=${app} />`;
  } else {
    body = html`<div class="segmented" role="group" aria-label="表示の切り替え">
        <button type="button" class="seg" aria-pressed=${view === 'done' ? 'true' : 'false'} onClick=${() => setView('done')}>できた</button>
        <button type="button" class="seg" aria-pressed=${view === 'body' ? 'true' : 'false'} onClick=${() => setView('body')}>からだ</button>
      </div>
      ${day && day.gap ? html`<p class="notice">空いた日は数えません。きょうから、また残ります。</p>` : null}
      ${view === 'done' ? html`<${WeekCard} app=${app} /><${RecentList} app=${app} />` : html`<${BodyTable} app=${app} />`}`;
  }

  return html`<main class="screen has-tabbar">
    <${TopBar} left=${html`<${H1} cls="title">きろく<//>`} right=${html`<${SettingsButton} app=${app} /><${ConsultButton} app=${app} />`} />
    ${body}
    <${TabBar} app=${app} current="Evidence" />
  </main>`;
}

function Bar({ value }) {
  const pct = value === null ? 0 : Math.max(0, Math.min(100, (value / 5) * 100));
  return html`<div class="hbar" aria-hidden="true"><span style=${`width:${pct}%`}></span></div>`;
}

function SleepCard({ app }) {
  const sm = sleepMood(app.data, app.today);
  if (sm.long.n < 3 || sm.short.n < 3) {
    return html`<section class="card stack">
      <span class="eyebrow-s">睡眠 × けさの気分</span>
      <span class="body-s">まだ比べられる日数がありません。7時間以上眠った朝と、6時間未満の朝が、それぞれ3日以上あると出ます。</span>
      <span class="note">いま：7時間以上 ${sm.long.n}日、6時間未満 ${sm.short.n}日</span>
    </section>`;
  }
  const diff = sm.long.avg - sm.short.avg;
  const title = diff >= 0.3 ? 'よく眠れた朝は、気分が高め' : diff <= -0.3 ? '短く眠った朝のほうが、気分が高め' : '睡眠の長さで、気分はあまり変わらない';
  return html`<section class="card stack">
    <span class="eyebrow-s">睡眠 × けさの気分（1〜5）</span>
    <span class="card-title">${title}</span>
    <div class="bars">
      <span class="body-s">7時間以上の朝</span><${Bar} value=${sm.long.avg} /><span class="num">${fmt1(sm.long.avg)}</span>
      <span class="body-s">6時間未満の朝</span><${Bar} value=${sm.short.avg} /><span class="num">${fmt1(sm.short.avg)}</span>
    </div>
    <span class="note">7時間以上が${sm.long.n}日、6時間未満が${sm.short.n}日</span>
  </section>`;
}

function ThoughtCard({ app }) {
  const bt = bodyThought(app.data, app.today);
  if (bt.pauses < 3) {
    return html`<section class="card stack">
      <span class="eyebrow-s">からだ × 考え</span>
      <span class="body-s">「つらいとき」を3回以上開くと、そのときのからだの状態と、ふだんの朝を比べて出します。</span>
      <span class="note">いま：${bt.pauses}回</span>
    </section>`;
  }
  const a = bt.pausesBody / bt.pauses;
  const b = bt.mornings ? bt.morningsBody / bt.mornings : 0;
  const title = a - b >= 0.15 ? '「だめだ」のときは、眠い・疲れが多め' : '「だめだ」のときと、ふだんの朝で、大きな差はありません';
  return html`<section class="card dark stack">
    <span class="eyebrow-s moon">からだ × 考え</span>
    <span class="card-title">${title}</span>
    <div class="pair">
      <div><span class="pair-num moon">${bt.pausesBody} / ${bt.pauses}回</span><span class="pair-sub">「つらいとき」に、眠い・疲れを選んだ</span></div>
      <div><span class="pair-num">${bt.morningsBody} / ${bt.mornings}日</span><span class="pair-sub">ふだんの朝で、疲れ4以上か6時間未満の睡眠</span></div>
    </div>
  </section>`;
}

export function Insights({ app }) {
  const day = app.data.days[app.today];
  const mode = day ? day.mode : null;
  const n = checkInKeys(app.data).length;
  const reviewDone = app.data.reviews[weekStart(app.today)];

  let body;
  if (n < MIN_DAYS) {
    body = html`<section class="card stack">
      <span class="card-title">記録がたまると、ここに出ます</span>
      <span class="body-s">からだと気分の関係は、${MIN_DAYS}日分の記録がたまると表示します。少ない日数で決めつけないためです。</span>
      <span class="title-s accent">いま${n}日分。あと${MIN_DAYS - n}日です。</span>
    </section>`;
  } else if (mode === 'rest') {
    body = html`<section class="card stack">
      <span class="card-title">まもる日は、ふりかえりはお休みです</span>
      <span class="body-s">からだを先に。わかったことは、余裕のある日に見られます。</span>
      <button type="button" class="btn outline small" onClick=${() => app.nav.tab('Evidence')}>きょうのできたを見る</button>
    </section>`;
  } else {
    body = html`<p class="note">直近4週間の記録から</p>
      <${SleepCard} app=${app} />
      <${ThoughtCard} app=${app} />
      <p class="note">どれも相関で、原因とは限りません。記録が増えると変わります。</p>`;
  }

  return html`<main class="screen has-tabbar">
    <${TopBar} left=${html`<${H1} cls="title">わかったこと<//>`} right=${html`<${ConsultButton} app=${app} />`} />
    ${body}
    ${mode === 'expand' &&
    html`<section class="card warm row">
      <span class="grow stack-tight"><span class="eyebrow-s">ひろげる日に開けます</span><span class="title-s">週1のふりかえり（15分）</span></span>
      <button type="button" class="btn small" onClick=${() => app.nav.go('Review', reviewDone ? { view: true } : {})}>${reviewDone ? '見る' : 'はじめる'}</button>
    </section>`}
    ${mode === 'tune' && html`<p class="note">週1のふりかえりは、ひろげる日に開けます。</p>`}
    <${TabBar} app=${app} current="Insights" />
  </main>`;
}

