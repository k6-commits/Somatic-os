// Morning check-in and the two weekly questions.

import { html } from '../vendor/preact-htm.js';
import { BackButton, ConsultButton, H1, Icon, ModeIcon, Pills, TopBar, useDraft } from '../ui.js';
import { MODES, MODE_ORDER, SLEEP_OPTIONS, WEEKLY_OPTIONS, WEEKLY_QUESTIONS, WEEKLY_THRESHOLD } from '../content.js';
import { checkIn, saveWeekly } from '../store.js';
import { hm, isSunday, mdw, weekStart } from '../dates.js';

const SCALE = [1, 2, 3, 4, 5].map((v) => ({ value: v, label: String(v) }));

export function CheckIn({ app, params = {} }) {
  const day = app.data.days[app.today];
  const editing = Boolean(params.edit && day && day.checkedInAt);
  const [draft, setDraft] = useDraft(app, `CheckIn:${app.today}`, () => ({
    sleep: editing ? day.sleep : null,
    mood: editing ? day.mood : null,
    fatigue: editing ? day.fatigue : null,
  }));
  const set = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));
  const weekKey = weekStart(app.today);
  const answered = Boolean(app.data.weekly[weekKey]);
  const sunday = isSunday(app.today);

  const finish = (mode) => {
    const entry = { ...draft, mode };
    app.update((d) => checkIn(d, app.today, entry, new Date().toISOString()));
    app.clearDraft(`CheckIn:${app.today}`);
    if (editing) app.nav.back();
    else app.nav.home();
  };

  const hour = app.now.getHours();
  const greeting = hour < 11 ? 'おはようございます。' : hour < 18 ? 'こんにちは。' : 'こんばんは。';

  return html`<main class="screen">
    <${TopBar}
      left=${editing ? html`<${BackButton} app=${app} />` : html`<span class="date">${mdw(app.today)} ${hm(app.now.toISOString())}</span>`}
      right=${html`<${ConsultButton} app=${app} />`}
    />
    <${H1}>${editing ? 'けさの記録をなおす' : html`${greeting}<br />まず、からだから。`}<//>
    <section class="card stack" aria-label="けさの記録">
      <div class="row between"><span class="card-title">けさの記録</span><span class="note">どれも任意です</span></div>
      <div class="field">
        <div class="row between"><span id="ci-sleep" class="field-label">ゆうべの睡眠</span><span class="note">時間</span></div>
        <${Pills} labelledby="ci-sleep" options=${SLEEP_OPTIONS.map((o) => ({ value: o.value, label: o.value }))} value=${draft.sleep} onChange=${set('sleep')} />
      </div>
      <div class="field">
        <div class="row between"><span id="ci-mood" class="field-label">いまの気分</span><span class="note">1 低い ・ 5 よい</span></div>
        <${Pills} labelledby="ci-mood" options=${SCALE} value=${draft.mood} onChange=${set('mood')} />
      </div>
      <div class="field">
        <div class="row between"><span id="ci-fatigue" class="field-label">からだの疲れ</span><span class="note">1 元気 ・ 5 くたくた</span></div>
        <${Pills} labelledby="ci-fatigue" options=${SCALE} value=${draft.fatigue} onChange=${set('fatigue')} />
      </div>
    </section>
    ${!editing &&
    html`<button type="button" class=${`link-card ${sunday && !answered ? 'emph' : ''}`} onClick=${() => app.nav.go('WeeklyCheck')}>
      <span>日曜日の2つの質問${answered ? '（今週は回答済み）' : '（30秒）'}</span>
      <${Icon} name="chevron" size=${18} />
    </button>`}
    ${editing
      ? html`<button type="button" class="btn bottom" onClick=${() => finish(day.mode)}>保存する</button>`
      : html`<div class="stack-tight">
            <h2 class="h2">きょうは、どの日にしますか</h2>
            <p class="note">迷ったら「まもる日」で大丈夫。あとで変えられます。</p>
          </div>
          <div class="stack">
            ${MODE_ORDER.map(
              (m) => html`<button type="button" class=${`mode-card ${m}`} onClick=${() => finish(m)}>
                <span class="mode-ic" aria-hidden="true"><${ModeIcon} mode=${m} /></span>
                <span class="mode-text"><span class="mode-name">${MODES[m].name}</span><span class="mode-desc">${MODES[m].desc}</span></span>
                <${Icon} name="chevron" size=${20} />
              </button>`,
            )}
          </div>`}
  </main>`;
}

export function WeeklyCheck({ app }) {
  const weekKey = weekStart(app.today);
  const saved = app.data.weekly[weekKey];
  const [answers, setAnswers] = useDraft(app, `Weekly:${weekKey}`, () => ({ q1: saved ? saved.q1 : null, q2: saved ? saved.q2 : null }));
  const pick = (id) => (value) => {
    const next = { ...answers, [id]: value };
    setAnswers(next);
    if (next.q1 !== null && next.q2 !== null) app.update((d) => saveWeekly(d, weekKey, next.q1, next.q2, new Date().toISOString()));
  };
  const complete = answers.q1 !== null && answers.q2 !== null;
  const score = complete ? answers.q1 + answers.q2 : 0;
  const close = () => {
    app.clearDraft(`Weekly:${weekKey}`);
    app.nav.back();
  };

  return html`<main class="screen">
    <${TopBar} left=${html`<${BackButton} app=${app} label="閉じる" icon="close" onClick=${close} />`} title="週1回の2つの質問" right=${html`<${ConsultButton} app=${app} />`} />
    <${H1}>この2週間を、<br />ふりかえります。<//>
    <p class="lead">30秒で終わります。答えは、受診を考える目安にだけ使います。</p>
    ${WEEKLY_QUESTIONS.map(
      (q) => html`<section class="card stack">
        <span id=${`wq-${q.id}`} class="q-text">${q.text}</span>
        <${Pills} labelledby=${`wq-${q.id}`} shape="square" options=${WEEKLY_OPTIONS.map((label, i) => ({ value: i, label }))} value=${answers[q.id]} onChange=${pick(q.id)} />
      </section>`,
    )}
    ${!complete && html`<p class="note">2つ答えると、結果が出ます。</p>`}
    ${complete &&
    (score >= WEEKLY_THRESHOLD
      ? html`<section class="card soft stack" aria-live="polite">
          <span class="card-title">この2週間、つらい日が多かったようです</span>
          <span class="body-s">受診を考えてみませんか。相談先と、受診の目安をまとめています。</span>
          <button type="button" class="btn small" onClick=${() => app.nav.go('Consult')}>相談先を見る</button>
        </section>`
      : html`<section class="card stack" aria-live="polite">
          <span class="card-title">記録しました</span>
          <span class="body-s">来週の日曜日に、また聞きます。</span>
          <button type="button" class="btn small" onClick=${close}>戻る</button>
        </section>`)}
  </main>`;
}
