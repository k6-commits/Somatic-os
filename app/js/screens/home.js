// The home screen for each mode, plus the mode and walking sheets.

import { html, useState } from '../vendor/preact-htm.js';
import { BigCheck, CheckRow, ConsultButton, H1, Icon, ModeIcon, Sheet, TabBar, TopBar } from '../ui.js';
import { MENU, MENU_PARTS, MODES, MODE_ORDER, NIGHT_STAR, REST_STARS, WEEKLY_THRESHOLD } from '../content.js';
import { addWalk, removeWalk, saveLine, setDone, setMode } from '../store.js';
import { hm, partOfDay, weekStart } from '../dates.js';
import { doneCount, lastWeekDone, latestWeekly, walkGoalText, walkWeek } from '../stats.js';
import { CheckIn } from './checkin.js';

const nowIso = () => new Date().toISOString();

function ModePill({ app, mode }) {
  return html`<button type="button" class=${`mode-pill ${mode}`} aria-label=${`きょうは${MODES[mode].name}。変える`} onClick=${() => app.nav.sheet('Mode')}>
    <${ModeIcon} mode=${mode} />
    <span>${MODES[mode].name}</span>
    <span class="change" aria-hidden="true">変更</span>
  </button>`;
}

export function Home({ app }) {
  const day = app.data.days[app.today];
  if (!day || !day.checkedInAt) return html`<${CheckIn} app=${app} />`;
  return day.mode === 'rest' ? html`<${RestHome} app=${app} day=${day} />` : html`<${MenuHome} app=${app} day=${day} />`;
}

function toggle(app, id) {
  app.update((d) => {
    const cur = d.days[app.today];
    return setDone(d, app.today, id, !(cur && cur.done[id]), nowIso());
  });
}

function RestHome({ app, day }) {
  const weekly = latestWeekly(app.data, app.today);
  return html`<main class="screen has-tabbar home-rest">
    <${TopBar} left=${html`<${ModePill} app=${app} mode="rest" />`} right=${html`<${ConsultButton} app=${app} />`} />
    <${H1} cls="lg">きょうは、まもる日です。<//>
    <p class="lead"><span aria-hidden="true">★</span>だけで十分。考えるのは、お休みしましょう。</p>
    <p class="progress" aria-live="polite">きょうのできた ${doneCount(day)}。それで十分です。</p>
    <div class="auto-done"><span class="mini-check" aria-hidden="true"><${Icon} name="check" size=${14} /></span>起きて、チェックインできた</div>
    <div class="stack" role="group" aria-label="きょうの★">
      ${REST_STARS.map((s) => html`<${BigCheck} checked=${Boolean(day.done[s.id])} onToggle=${() => toggle(app, s.id)} label=${s.label} sub=${s.sub} />`)}
    </div>
    ${weekly &&
    weekly.score >= WEEKLY_THRESHOLD &&
    html`<section class="banner">
      <span class="card-title">この2週間、気分の低い日が多めです</span>
      <span class="body-s">日曜の2つの質問から。だれかに話してみませんか。</span>
      <button type="button" class="btn outline small" onClick=${() => app.nav.go('Consult')}>相談先を見る</button>
    </section>`}
    <${TabBar} app=${app} current="Home" />
  </main>`;
}

function MenuHome({ app, day }) {
  const mode = day.mode;
  const [part, setPart] = useState(() => partOfDay(app.now));
  const walk = walkWeek(app.data, app.today);
  const counts = {};
  for (const p of MENU_PARTS) {
    counts[p.key] = MENU[p.key].filter((i) => day.done[i.id]).length + (p.key === 'night' && day.done.n1 ? 1 : 0);
  }
  return html`<main class="screen has-tabbar">
    <${TopBar} left=${html`<${ModePill} app=${app} mode=${mode} />`} right=${html`<${ConsultButton} app=${app} />`} />
    <${H1} cls="lg">${mode === 'expand' ? 'きょうは、ひろげる日。' : 'きょうは、ととのえる日。'}<//>
    <p class="lead">${mode === 'expand' ? '余裕があれば、今週をふりかえってみましょう。' : '全部できなくても大丈夫。いまの時間の分だけ。'}</p>
    ${mode === 'expand' && html`<${ReviewCard} app=${app} />`}
    <section class="card walk">
      <div class="row">
        <span class="round-ic lg" aria-hidden="true"><${Icon} name="walk" size=${24} /></span>
        <span class="grow walk-text">
          <span class="note">今週の歩き</span>
          <span class="walk-min">${walk.minutes}分</span>
          <span class="note">${walkGoalText(walk)}</span>
        </span>
        <button type="button" class="btn outline small" aria-label="歩いた時間を記録する" onClick=${() => app.nav.sheet('Walk')}>＋ 記録</button>
      </div>
    </section>
    <section class="card menu">
      <div class="parts" role="group" aria-label="時間帯">
        ${MENU_PARTS.map(
          (p) => html`<button type="button" class="part" aria-pressed=${part === p.key ? 'true' : 'false'} onClick=${() => setPart(p.key)}>
            ${p.name}${counts[p.key] > 0 && html`<span class="badge"><span class="sr-only">できた</span>${counts[p.key]}</span>`}
          </button>`,
        )}
      </div>
      <div role="group" aria-label="きょうのメニュー">
        ${MENU[part].map((it) =>
          it.breath
            ? html`<div class="check-with-action">
                <${CheckRow} checked=${Boolean(day.done[it.id])} onToggle=${() => toggle(app, it.id)} label=${it.label} sub=${it.sub} star=${it.star} />
                <button type="button" class="btn outline small" onClick=${() => app.nav.go('Breath')}>ガイド</button>
              </div>`
            : html`<${CheckRow}
                checked=${Boolean(day.done[it.id])}
                onToggle=${() => toggle(app, it.id)}
                label=${it.label}
                sub=${it.sub}
                star=${it.star}
                disabled=${Boolean(it.auto)}
              />`,
        )}
      </div>
      ${part === 'night' && html`<${LineForm} app=${app} day=${day} /><div class="night-star"><span class="star" aria-hidden="true">★</span><span><b>${NIGHT_STAR.label}</b><span class="check-sub">${NIGHT_STAR.sub}</span></span></div>`}
    </section>
    <${TabBar} app=${app} current="Home" />
  </main>`;
}

function LineForm({ app, day }) {
  const [text, setText] = useState(day.line || '');
  const submit = (e) => {
    e.preventDefault();
    app.update((d) => saveLine(d, app.today, text, nowIso()));
  };
  return html`<form class="line-form" onSubmit=${submit}>
    <label for="line-input" class="field-label">できたことを1行</label>
    <div class="row">
      <input id="line-input" class="input grow" maxlength="120" value=${text} onInput=${(e) => setText(e.currentTarget.value)} placeholder="例：洗濯物をたためた" autocomplete="off" />
      <button type="submit" class="btn small">${day.line ? 'なおす' : '記録'}</button>
    </div>
    ${day.line ? html`<p class="note" aria-live="polite">記録しました：「${day.line}」</p>` : html`<p class="note">小さなことほどいい。布団に入ってからは書かなくて大丈夫です。</p>`}
  </form>`;
}

function ReviewCard({ app }) {
  const done = app.data.reviews[weekStart(app.today)];
  const total = lastWeekDone(app.data, app.today);
  return html`<section class="card warm row">
    <span class="grow stack-tight">
      <span class="eyebrow-s">週1のふりかえり · 15分</span>
      <span class="title-s">${done ? '今週のふりかえりは済んでいます' : `この1週間のできたは${total}個`}</span>
    </span>
    <button type="button" class="btn small" onClick=${() => app.nav.go('Review', done ? { view: true } : {})}>${done ? '見る' : 'はじめる'}</button>
  </section>`;
}

export function ModeSheet({ app }) {
  const day = app.data.days[app.today];
  const current = day ? day.mode : null;
  const pick = (m) => {
    app.update((d) => setMode(d, app.today, m));
    app.nav.closeSheet();
  };
  return html`<${Sheet} title="きょうの状態を変える" onClose=${app.nav.closeSheet}>
    <p class="note">変えても、きょうの記録はそのままです。</p>
    ${MODE_ORDER.map(
      (m) => html`<button type="button" class=${`mode-card ${m}`} aria-current=${current === m ? 'true' : undefined} onClick=${() => pick(m)}>
        <span class="mode-ic" aria-hidden="true"><${ModeIcon} mode=${m} /></span>
        <span class="mode-text"><span class="mode-name">${MODES[m].name}</span><span class="mode-desc">${MODES[m].sheet}</span></span>
        ${current === m && html`<span class="now-badge">いま</span>`}
      </button>`,
    )}
    <button type="button" class="text-btn" onClick=${() => app.nav.go('CheckIn', { edit: true })}>けさの記録（睡眠・気分・疲れ）をなおす</button>
    <button type="button" class="btn outline" onClick=${app.nav.closeSheet}>閉じる</button>
  <//>`;
}

export function WalkSheet({ app }) {
  const day = app.data.days[app.today];
  const walk = walkWeek(app.data, app.today);
  const [custom, setCustom] = useState('');
  const add = (min) => app.update((d) => addWalk(d, app.today, min, nowIso()));
  const submit = (e) => {
    e.preventDefault();
    if (Number(custom) > 0) {
      add(custom);
      setCustom('');
    }
  };
  const walks = day ? day.walks : [];
  return html`<${Sheet} title="歩いた時間を記録" onClose=${app.nav.closeSheet}>
    <p class="note" aria-live="polite">今週の合計 ${walk.minutes}分 · ${walkGoalText(walk)}</p>
    <div class="quick" role="group" aria-label="すばやく足す">
      ${[5, 10, 15, 20, 30].map((m) => html`<button type="button" class="pill square" onClick=${() => add(m)}>＋${m}分</button>`)}
    </div>
    <form class="row" onSubmit=${submit}>
      <label for="walk-min" class="sr-only">歩いた分数</label>
      <input id="walk-min" class="input grow" type="number" inputmode="numeric" min="1" max="600" value=${custom} onInput=${(e) => setCustom(e.currentTarget.value)} placeholder="分数を入れる" />
      <button type="submit" class="btn small">追加</button>
    </form>
    ${walks.length > 0 &&
    html`<ul class="walk-list" aria-label="きょうの記録">
      ${walks.map(
        (w, i) => html`<li class="row between">
          <span>${hm(w.at)}　${w.min}分</span>
          <button type="button" class="icon-btn plain" aria-label=${`${hm(w.at)}の${w.min}分を消す`} onClick=${() => app.update((d) => removeWalk(d, app.today, i))}><${Icon} name="trash" size=${18} /></button>
        </li>`,
      )}
    </ul>`}
    <button type="button" class="btn outline" onClick=${app.nav.closeSheet}>閉じる</button>
  <//>`;
}
