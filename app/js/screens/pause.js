// つらいとき (check the body before the thought) and the guided sigh breathing.

import { html, useEffect, useRef, useState } from '../vendor/preact-htm.js';
import { BackButton, ConsultButton, H1, Icon, Switch, TopBar, useDraft } from '../ui.js';
import { ACTS, BODY } from '../content.js';
import { addPause, setDone, setMode, updateSettings } from '../store.js';

const nowIso = () => new Date().toISOString();

export function Pause({ app }) {
  const day = app.data.days[app.today];
  const mode = day ? day.mode : null;
  const night = app.night;
  const [st, setSt] = useDraft(app, 'Pause', () => ({ body: [], acts: [] }));
  const flip = (key, id) => setSt((s) => ({ ...s, [key]: s[key].includes(id) ? s[key].filter((x) => x !== id) : [...s[key], id] }));

  const suggestions = [];
  if (st.body.includes('sleepy') || st.body.includes('tired')) suggestions.push(night ? 'lie' : 'eyes');
  if (st.body.includes('hungry')) suggestions.push('eat');
  if (st.body.includes('lonely') && !night) suggestions.push('msg');
  if (st.body.includes('temp')) suggestions.push('temp');
  if (!night) suggestions.push('small');
  const acts = st.acts.filter((a) => suggestions.includes(a));
  const offerRest = st.body.includes('unwell') && !night && day && day.checkedInAt && mode !== 'rest';

  const record = () => {
    if (st.body.length || acts.length) app.update((d) => addPause(d, app.today, st.body, acts, nowIso()));
    app.clearDraft('Pause');
  };
  const leave = () => {
    record();
    app.nav.back();
  };
  const toRest = () => {
    record();
    app.update((d) => setMode(d, app.today, 'rest'));
    app.nav.home();
  };

  return html`<main class="screen">
    <${TopBar} left=${html`<${BackButton} app=${app} label="閉じる" icon="close" onClick=${leave} />`} title="つらいとき" right=${html`<${ConsultButton} app=${app} />`} />
    <${H1}>つらい考えが、<br />浮かんだんですね。<//>
    <p class="lead">その考えは、いまのからだの状態に左右されているかもしれません。先にからだを確かめましょう。</p>
    <button type="button" class="crisis-row" onClick=${() => app.nav.go('Consult')}>
      <${Icon} name="lifebuoy" />
      <span class="grow">消えたい・死にたい考えがある</span>
      <${Icon} name="chevron" size=${18} />
    </button>
    <section class="stack" aria-labelledby="pause-body">
      <div class="row between"><h2 id="pause-body" class="h2">いまのからだは？</h2><span class="note">当てはまるものを選ぶ</span></div>
      <div class="chip-grid" role="group" aria-labelledby="pause-body">
        ${BODY.map((b) => html`<button type="button" class="chip" aria-pressed=${st.body.includes(b.id) ? 'true' : 'false'} onClick=${() => flip('body', b.id)}>${b.label}</button>`)}
      </div>
    </section>
    <section class="stack" aria-labelledby="pause-care">
      <h2 id="pause-care" class="h2">からだに先に手当てを</h2>
      ${st.body.length === 0 && html`<p class="note">当てはまるものを選ぶと、手当ての案が出ます。</p>`}
      ${suggestions.map((id) => {
        const on = acts.includes(id);
        return html`<button type="button" class="care" role="checkbox" aria-checked=${on ? 'true' : 'false'} onClick=${() => flip('acts', id)}>
          <span class="box" aria-hidden="true">${on ? html`<${Icon} name="check" size=${17} />` : null}</span>
          <span class="check-text"><span class="check-label">${ACTS[id].label}</span><span class="check-sub">${ACTS[id].sub}</span></span>
        </button>`;
      })}
      ${offerRest &&
      html`<button type="button" class="care link" onClick=${toRest}>
        <span class="round-ic sm" aria-hidden="true"><${Icon} name="moon" size=${18} /></span>
        <span class="check-text grow"><span class="check-label">きょうはまもる日に切り替える</span><span class="check-sub">メニューが★だけになります</span></span>
        <${Icon} name="chevron" size=${18} />
      </button>`}
      <button type="button" class="care link" onClick=${() => app.nav.go('Breath')}>
        <span class="round-ic sm" aria-hidden="true"><${Icon} name="wind" size=${18} /></span>
        <span class="check-text grow"><span class="check-label">ため息呼吸（5分）</span><span class="check-sub">途中でやめてもいい</span></span>
        <${Icon} name="chevron" size=${18} />
      </button>
    </section>
    ${mode === 'expand' &&
    !night &&
    html`<section class="card soft stack">
      <span class="card-title">余裕があれば：言葉で見直す</span>
      <span class="body-s">「そう言える証拠と、そうでない証拠は何か」</span>
      <span class="body-s">「友人が同じことを言ったら、何と返すか」</span>
    </section>`}
    <button type="button" class="btn bottom" onClick=${leave}>${acts.length ? '記録して戻る' : '戻る'}</button>
  </main>`;
}

const TOTAL = 5 * 60 * 1000;
const CYCLE = 10000;
const LABELS = ['鼻から吸って', 'もう少し吸い足して', '口からゆっくり吐く'];
const SPOKEN = ['吸って', 'もう少し', 'ゆっくり吐いて'];

function scaleAt(c) {
  if (c < 3000) return 0.55 + 0.35 * (c / 3000);
  if (c < 4000) return 0.9 + 0.1 * ((c - 3000) / 1000);
  return 1 - 0.45 * ((c - 4000) / 6000);
}

export function Breath({ app }) {
  const settings = app.data.settings;
  const [state, setState] = useState('ready');
  const [phase, setPhase] = useState(0);
  const [left, setLeft] = useState(TOTAL / 1000);
  const disc = useRef(null);
  const start = useRef(0);
  const raf = useRef(0);
  const lastPhase = useRef(-1);
  const lastLeft = useRef(-1);
  const wake = useRef(null);
  const running = useRef(false);
  const credited = useRef(false);
  const opts = useRef(settings);
  opts.current = settings;

  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

  const cue = (ph) => {
    if (opts.current.voice && canSpeak) {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(SPOKEN[ph]);
        u.lang = 'ja-JP';
        u.rate = 0.9;
        window.speechSynthesis.speak(u);
      } catch {
        /* speech is optional */
      }
    }
    if (opts.current.vibrate && canVibrate) {
      try {
        navigator.vibrate(ph === 2 ? 120 : 50);
      } catch {
        /* vibration is optional */
      }
    }
  };
  const credit = () => {
    if (credited.current) return;
    credited.current = true;
    app.update((d) => setDone(d, app.today, 'n2', true, nowIso()));
  };
  const release = () => {
    running.current = false;
    cancelAnimationFrame(raf.current);
    if (wake.current) {
      wake.current.release().catch(() => {});
      wake.current = null;
    }
    if (canSpeak) window.speechSynthesis.cancel();
  };
  const frame = () => {
    const t = performance.now() - start.current;
    if (t >= TOTAL) {
      release();
      credit();
      setState('done');
      return;
    }
    const c = t % CYCLE;
    const ph = c < 3000 ? 0 : c < 4000 ? 1 : 2;
    if (disc.current && !reduced) disc.current.style.transform = `scale(${scaleAt(c).toFixed(3)})`;
    if (ph !== lastPhase.current) {
      lastPhase.current = ph;
      setPhase(ph);
      cue(ph);
    }
    const l = Math.ceil((TOTAL - t) / 1000);
    if (l !== lastLeft.current) {
      lastLeft.current = l;
      setLeft(l);
    }
    raf.current = requestAnimationFrame(frame);
  };
  const begin = () => {
    start.current = performance.now();
    lastPhase.current = 0;
    lastLeft.current = -1;
    credited.current = false;
    running.current = true;
    setPhase(0);
    setState('running');
    cue(0);
    raf.current = requestAnimationFrame(frame);
    if (navigator.wakeLock) {
      navigator.wakeLock
        .request('screen')
        .then((l) => {
          if (running.current) wake.current = l;
          else l.release().catch(() => {});
        })
        .catch(() => {});
    }
  };
  const stopEarly = () => {
    if (running.current && performance.now() - start.current >= 60000) credit();
    release();
  };
  const end = () => {
    stopEarly();
    app.nav.back();
  };
  useEffect(() => () => stopEarly(), []);

  const elapsed = TOTAL / 1000 - left;
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, '0');
  const setOpt = (k) => (v) => app.update((d) => updateSettings(d, { [k]: v }));

  return html`<main class="screen theme-night breath">
    <${TopBar} left=${html`<${BackButton} app=${app} label="閉じる" icon="close" onClick=${end} />`} title="ため息呼吸" right=${html`<${ConsultButton} app=${app} />`} />
    <${H1} cls="sr-only">ため息呼吸<//>
    <div class="breath-stage" aria-hidden="true">
      <div class="ring"></div>
      <div class="ring inner"></div>
      <div class="disc" ref=${disc}></div>
      <div class="core"></div>
    </div>
    <p class="phase">${state === 'running' ? LABELS[phase] : state === 'done' ? 'おつかれさまでした' : '準備ができたら、はじめる'}</p>
    <p class="lead center">鼻から3秒吸って、1秒吸い足し、口から6秒かけて吐きます。</p>
    ${state === 'running' &&
    html`<div class="timer">
      <span class="left">残り ${mm}:${ss}</span>
      <div class="bar" role="progressbar" aria-label="経過" aria-valuemin="0" aria-valuemax="300" aria-valuenow=${elapsed}><span style=${`width:${(elapsed / 300) * 100}%`}></span></div>
    </div>`}
    <div class="stack">
      ${canSpeak &&
      html`<div class="row between">
        <span class="stack-tight"><span class="title-s">音声で案内</span><span class="check-sub">画面を見なくても続けられます</span></span>
        <${Switch} checked=${settings.voice} onChange=${setOpt('voice')} label="音声で案内" />
      </div>`}
      ${canVibrate &&
      html`<div class="row between">
        <span class="title-s">振動で案内</span>
        <${Switch} checked=${settings.vibrate} onChange=${setOpt('vibrate')} label="振動で案内" />
      </div>`}
    </div>
    <p class="note center bottom">研究では、1日5分を1か月続けた健康な学生で、気分が改善しました（予備的な研究）。</p>
    ${state === 'ready' && html`<button type="button" class="btn" onClick=${begin}>はじめる</button>`}
    ${state === 'running' && html`<button type="button" class="btn outline" onClick=${end}>終わる</button>`}
    ${state === 'done' && html`<button type="button" class="btn" onClick=${() => app.nav.back()}>戻る</button>`}
  </main>`;
}
