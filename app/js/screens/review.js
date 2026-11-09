// 週1のふりかえり: five questions that use this week's own records as evidence.

import { html } from '../vendor/preact-htm.js';
import { BackButton, ConsultButton, H1, TopBar, useDraft } from '../ui.js';
import { BODY, BODY_LABEL, REVIEW_PLANS, REVIEW_SCALE } from '../content.js';
import { saveReview } from '../store.js';
import { addDays, dayKey, md, weekStart } from '../dates.js';
import { fmt1, weekCompare, weekPauseBodies, weekWins } from '../stats.js';

const STEPS = 5;

function messageFor(answer) {
  if (answer === null) return '';
  if (answer <= 1) return '事実は、予測ほど悪くなかったようです。この気づきを、来週の自分に残しておきましょう。';
  if (answer === 2) return '半分くらい、ですね。どんなときに当たっていたかは、きろくで見返せます。';
  return 'そう感じる1週間だったんですね。ひとりで抱えず、話せる人や相談先も使ってください。';
}

function planText(r) {
  if (r.plan === 'p4') return r.custom.trim() || '自分で決める';
  const p = REVIEW_PLANS.find((x) => x.id === r.plan);
  return p ? p.label : 'まだ決めていません';
}

function Group({ title, g, tone }) {
  return html`<div class=${`cmp ${tone}`}>
    <span class="eyebrow-s">${title}（${g.n}日）</span>
    ${g.n
      ? html`<span>睡眠 ${g.sleep === null ? '—' : `${fmt1(g.sleep)}時間`}</span><span>歩き 1日${g.walk}分</span><span>人とやりとり ${g.social}日</span>`
      : html`<span class="note">該当する日がありません</span>`}
  </div>`;
}

export function Review({ app, params = {} }) {
  const weekKey = weekStart(app.today);
  const saved = app.data.reviews[weekKey];
  const draftName = `Review:${weekKey}`;
  const [r, setR] = useDraft(app, draftName, () => {
    if (saved && !params.view) return { step: 0, wins: saved.wins || [], note: saved.note || '', bodies: saved.bodies || [], answer: saved.answer ?? null, plan: saved.plan || null, custom: saved.custom || '' };
    return { step: 0, wins: [], note: '', bodies: Object.keys(weekPauseBodies(app.data, app.today)), answer: null, plan: null, custom: '' };
  });
  const set = (patch) => setR((prev) => ({ ...prev, ...patch }));
  const close = () => {
    app.clearDraft(draftName);
    app.nav.back();
  };

  if (params.view && saved) {
    return html`<main class="screen">
      <${TopBar} left=${html`<${BackButton} app=${app} />`} title="週1のふりかえり" right=${html`<${ConsultButton} app=${app} />`} />
      <${H1}>1週間のふりかえり<//>
      <p class="note">${periodOf(saved, weekKey)}の記録から</p>
      <${Saved} review=${saved} />
      <button type="button" class="btn outline bottom" onClick=${() => app.nav.replace('Review', {})}>答えなおす</button>
    </main>`;
  }

  const wins = weekWins(app.data, app.today);
  const cmp = weekCompare(app.data, app.today);
  const counts = weekPauseBodies(app.data, app.today);
  const toggleIn = (key, id, max = Infinity) => {
    const has = r[key].includes(id);
    if (!has && r[key].length >= max) return;
    set({ [key]: has ? r[key].filter((x) => x !== id) : [...r[key], id] });
  };
  const save = () => {
    const review = { wins: r.wins, note: r.note.trim(), bodies: r.bodies, answer: r.answer, plan: r.plan, custom: r.custom.trim(), planText: planText(r) };
    app.update((d) => saveReview(d, weekKey, app.today, review, new Date().toISOString()));
    app.clearDraft(draftName);
    app.nav.replace('Review', { view: true });
  };

  return html`<main class="screen">
    <${TopBar} left=${html`<${BackButton} app=${app} label="閉じる" icon="close" onClick=${close} />`} title="週1のふりかえり" right=${html`<${ConsultButton} app=${app} />`} />
    <div class="progress-steps" aria-hidden="true">${Array.from({ length: STEPS }, (_, i) => html`<span class=${i <= r.step ? 'on' : ''}></span>`)}</div>
    <p class="note">${r.step + 1} / ${STEPS}</p>

    ${r.step === 0 &&
    html`<${H1}>この1週間でできたことを、<br />3つ選んでください<//>
      ${wins.length
        ? html`<p class="note">記録から選びます。3つまで選べます。</p>
            <div class="stack" role="group" aria-label="この1週間でできたこと">
              ${wins.map((w) => {
                const on = r.wins.includes(w);
                const off = !on && r.wins.length >= 3;
                return html`<button type="button" class="option" role="checkbox" aria-checked=${on ? 'true' : 'false'} aria-disabled=${off ? 'true' : undefined} onClick=${() => toggleIn('wins', w, 3)}>${w}</button>`;
              })}
            </div>`
        : html`<p class="lead">この1週間のできたは、まだありません。次へ進んで大丈夫です。</p>`}`}

    ${r.step === 1 &&
    html`<${H1}>気分が高めの日と、<br />低めの日の違いは？<//>
      <div class="cmp-grid">
        <${Group} title="気分4以上" g=${cmp.high} tone="hi" />
        <${Group} title="気分2以下" g=${cmp.low} tone="lo" />
      </div>
      <label for="rv-note" class="field-label">気づいたこと（任意）</label>
      <textarea id="rv-note" class="input" rows="3" value=${r.note} onInput=${(e) => set({ note: e.currentTarget.value })} placeholder="例：眠れた日は、外に出やすかった"></textarea>`}

    ${r.step === 2 &&
    html`<${H1}>「自分はだめだ」と<br />感じたとき、からだは？<//>
      ${Object.keys(counts).length
        ? html`<p class="note">この1週間の「つらいとき」の記録から：${Object.entries(counts).map(([id, c]) => `${BODY_LABEL[id]} ${c}回`).join('、')}</p>`
        : html`<p class="note">この1週間は「つらいとき」の記録がありません。思い当たるものを選んでください。</p>`}
      <div class="chip-grid" role="group" aria-label="そのときのからだ">
        ${BODY.map((b) => html`<button type="button" class="chip" aria-pressed=${r.bodies.includes(b.id) ? 'true' : 'false'} onClick=${() => toggleIn('bodies', b.id)}>${b.label}</button>`)}
      </div>`}

    ${r.step === 3 &&
    html`<${H1} cls="md">この1週間の事実から見て、<br />「自分はだめだ」は<br />どのくらい当たっていた？<//>
      <div class="pills" role="group" aria-label="どのくらい当たっていたか">
        ${REVIEW_SCALE.map((label, i) => html`<button type="button" class="pill square" aria-pressed=${r.answer === i ? 'true' : 'false'} onClick=${() => set({ answer: i })}>${label}</button>`)}
      </div>
      ${r.answer !== null && html`<p class="card warm-note" aria-live="polite">${messageFor(r.answer)}</p>`}
      ${r.answer !== null && r.answer >= 3 && html`<button type="button" class="btn outline small" onClick=${() => app.nav.go('Consult')}>相談先を見る</button>`}`}

    ${r.step === 4 &&
    html`<${H1}>来週、1つだけ<br />増やすことは？<//>
      <div class="stack" role="group" aria-label="来週増やすこと">
        ${REVIEW_PLANS.map((p) => html`<button type="button" class="option" aria-pressed=${r.plan === p.id ? 'true' : 'false'} onClick=${() => set({ plan: p.id })}>${p.label}</button>`)}
      </div>
      ${r.plan === 'p4' &&
      html`<label for="rv-custom" class="field-label">増やすこと</label>
        <input id="rv-custom" class="input" value=${r.custom} onInput=${(e) => set({ custom: e.currentTarget.value })} placeholder="例：昼休みに外へ出る" />`}`}

    <div class="btn-row bottom">
      ${r.step > 0 && html`<button type="button" class="btn outline auto" onClick=${() => set({ step: r.step - 1 })}>戻る</button>`}
      ${r.step < STEPS - 1
        ? html`<button type="button" class="btn" onClick=${() => set({ step: r.step + 1 })}>次へ</button>`
        : html`<button type="button" class="btn" onClick=${save}>保存する</button>`}
    </div>
  </main>`;
}

/** The 7 days a saved review looked at. */
function periodOf(review, weekKey) {
  const end = review.at ? dayKey(new Date(review.at)) : weekKey;
  return `${md(addDays(end, -6))}〜${md(end)}`;
}

function Saved({ review }) {
  return html`<section class="stack">
    <div class="card stack-tight"><span class="eyebrow-s">来週増やすこと</span><span class="title-s">${review.planText || 'まだ決めていません'}</span></div>
    <div class="card stack-tight"><span class="eyebrow-s">選んだ、この1週間のできた</span><span class="body-s">${review.wins && review.wins.length ? review.wins.join('、') : 'なし'}</span></div>
    ${review.note && html`<div class="card stack-tight"><span class="eyebrow-s">気づいたこと</span><span class="body-s">${review.note}</span></div>`}
    ${review.answer !== null && review.answer !== undefined && html`<div class="card stack-tight"><span class="eyebrow-s">「自分はだめだ」の当たり具合</span><span class="body-s">${REVIEW_SCALE[review.answer]}</span></div>`}
  </section>`;
}
