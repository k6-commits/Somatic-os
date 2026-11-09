// App shell: data, clock, navigation and the night theme.

import { html, render, useCallback, useEffect, useErrorBoundary, useMemo, useRef, useState } from './vendor/preact-htm.js';
import { lastCheckInBefore, load, save } from './store.js';
import { dayKey, diffDays, isNight } from './dates.js';
import { Onboarding, Privacy, WelcomeBack } from './screens/start.js';
import { CheckIn, WeeklyCheck } from './screens/checkin.js';
import { Home, ModeSheet, WalkSheet } from './screens/home.js';
import { Night } from './screens/night.js';
import { Breath, Pause } from './screens/pause.js';
import { Evidence, Insights } from './screens/records.js';
import { Review } from './screens/review.js';
import { Consult, Summary } from './screens/consult.js';
import { Settings } from './screens/settings.js';

const SCREENS = { Onboarding, Privacy, WelcomeBack, CheckIn, WeeklyCheck, Home, Night, Pause, Breath, Evidence, Insights, Review, Consult, Summary, Settings };
const SHEETS = { Mode: ModeSheet, Walk: WalkSheet };
const RESET_AFTER_MS = 30 * 60 * 1000;

/** Which screen "home" means right now. */
export function rootName(data, today, at) {
  if (!data.settings.onboarded) return 'Onboarding';
  if (isNight(at)) return 'Night';
  const day = data.days[today];
  if (day && day.checkedInAt) return 'Home';
  const prev = lastCheckInBefore(data, today);
  if (prev && diffDays(prev, today) >= 3 && data.settings.welcomeSeen !== today) return 'WelcomeBack';
  return 'CheckIn';
}

/** localStorage, or an in-memory stand-in when the browser blocks it. */
function openStorage() {
  try {
    const s = window.localStorage;
    s.getItem('somatic-os:probe');
    return s;
  } catch {
    const m = new Map();
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), blocked: true };
  }
}

const storage = openStorage();
const initial = storage.blocked ? { data: load(storage).data, error: 'unavailable' } : load(storage);
const LOAD_NOTICE = {
  broken: '前の記録を読み込めませんでした。読めなかった記録は、別に残してあります。',
  unavailable: 'このブラウザでは記録を保存できません。プライベートモードを解除してください。',
};
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

function App() {
  const [data, setData] = useState(initial.data);
  const [notice, setNotice] = useState(LOAD_NOTICE[initial.error] || '');
  const [now, setNow] = useState(() => new Date());
  const [rootAt, setRootAt] = useState(() => new Date());
  const [stack, setStack] = useState([]);
  const [sheet, setSheet] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [error, resetError] = useErrorBoundary();
  const stackRef = useRef(stack);
  const sheetRef = useRef(sheet);
  stackRef.current = stack;
  sheetRef.current = sheet;

  // Keep the clock current. After a long break, start again from home.
  useEffect(() => {
    let hiddenAt = null;
    const id = setInterval(() => setNow(new Date()), 30000);
    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
        return;
      }
      const t = new Date();
      setNow(t);
      const away = hiddenAt === null ? 0 : t.getTime() - hiddenAt;
      if (away > RESET_AFTER_MS || dayKey(t) !== dayKey(new Date(hiddenAt || t.getTime()))) {
        setSheet(null);
        setStack([]);
        setRootAt(t);
      } else if (stackRef.current.length === 0) {
        setRootAt(t);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const today = dayKey(now);
  const night = isNight(now);

  // The screen is dark at night, whatever the mode.
  useEffect(() => {
    document.documentElement.classList.toggle('night', night);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', night ? '#1B2140' : '#F1F3F2');
  }, [night]);

  const update = useCallback((fn) => {
    setData((prev) => {
      const next = fn(prev);
      if (next === prev) return prev;
      if (!save(next, storage)) setNotice('保存できませんでした。空き容量やブラウザの設定を確認してください。');
      return next;
    });
  }, []);

  const nav = useMemo(
    () => ({
      go: (name, params = {}) => {
        setSheet(null);
        setStack((s) => [...s, { name, params }]);
      },
      back: () => {
        setSheet(null);
        setStack((s) => s.slice(0, -1));
      },
      replace: (name, params = {}) => {
        setSheet(null);
        setStack((s) => [...s.slice(0, -1), { name, params }]);
      },
      home: () => {
        setSheet(null);
        setStack([]);
        setRootAt(new Date());
      },
      tab: (name) => {
        setSheet(null);
        if (name === 'Home') {
          setStack([]);
          setRootAt(new Date());
        } else {
          setStack([{ name, params: {} }]);
        }
      },
      sheet: (name, params = {}) => setSheet({ name, params }),
      closeSheet: () => setSheet(null),
    }),
    [],
  );

  const draftApi = useMemo(
    () => ({
      setDraft: (name, fn, init) => setDrafts((d) => ({ ...d, [name]: fn(has(d, name) ? d[name] : init()) })),
      clearDraft: (name) =>
        setDrafts((d) => {
          if (!has(d, name)) return d;
          const next = { ...d };
          delete next[name];
          return next;
        }),
      clearAllDrafts: () => setDrafts({}),
    }),
    [],
  );

  // The phone's back gesture steps back inside the app instead of closing it.
  useEffect(() => {
    const onPop = () => {
      if (sheetRef.current) setSheet(null);
      else if (stackRef.current.length) setStack((s) => s.slice(0, -1));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const depth = stack.length + (sheet ? 1 : 0);
  useEffect(() => {
    const guarded = Boolean(history.state && history.state.somatic);
    if (depth > 0 && !guarded) history.pushState({ somatic: true }, '');
    else if (depth === 0 && guarded) history.back();
  }, [depth]);

  useEffect(() => {
    document.body.classList.toggle('sheet-open', Boolean(sheet));
  }, [sheet]);

  const top = stack.length ? stack[stack.length - 1] : { name: rootName(data, today, rootAt), params: {} };
  const screenKey = `${stack.length}:${top.name}`;

  // Each new screen starts at the top, with its heading focused for screen readers.
  useEffect(() => {
    window.scrollTo(0, 0);
    const h = document.querySelector('#app h1');
    if (h) h.focus({ preventScroll: true });
  }, [screenKey]);

  if (error) {
    return html`<main class="screen">
      <h1 class="h1" tabindex="-1">問題が起きました</h1>
      <p class="lead">画面を表示できませんでした。記録はこのスマホに残っています。</p>
      <p class="note">${String((error && error.message) || error)}</p>
      <button type="button" class="btn" onClick=${() => { setSheet(null); setStack([]); resetError(); }}>ホームに戻る</button>
    </main>`;
  }

  const Screen = SCREENS[top.name] || Home;
  const SheetView = sheet ? SHEETS[sheet.name] : null;
  const app = { data, update, nav, now, today, night, drafts, ...draftApi };

  return html`
    ${notice && html`<div class="toast" role="alert"><span>${notice}</span><button type="button" class="text-btn" onClick=${() => setNotice('')}>閉じる</button></div>`}
    <${Screen} key=${screenKey} app=${app} params=${top.params} />
    ${SheetView && html`<${SheetView} app=${app} params=${sheet.params} />`}
  `;
}

render(html`<${App} />`, document.getElementById('app'));

const local = ['localhost', '127.0.0.1'].includes(location.hostname);
if ('serviceWorker' in navigator && (location.protocol === 'https:' || local)) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
