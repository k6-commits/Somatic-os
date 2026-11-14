// Shared pieces of the interface.

import { html, useEffect, useRef } from './vendor/preact-htm.js';
import { CONTACTS } from './content.js';

const PATHS = {
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  tune: '<path d="M5 8h10M8 12h11M4 16h9M10 20h6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
  lifebuoy: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  home: '<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/>',
  pebbles: '<circle cx="7" cy="16" r="3"/><circle cx="15" cy="17" r="3.5"/><circle cx="12" cy="9" r="3"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  walk: '<circle cx="13.5" cy="4.5" r="1.8"/><path d="M12.5 8L11 14l-2.5 6.5M11 14l3 3 .5 4M8 11.5L10 9l2.5-1 2.5 2.5 2.5.5"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  bed: '<path d="M3 18V8M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="2"/>',
  wind: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h8"/>',
  lamp: '<path d="M9 3h6l3 8H6zM12 11v7M8 21h8"/>',
  leaf: '<path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14zM5 19l7-7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>',
  print: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  upload: '<path d="M12 21V9M7 14l5-5 5 5M4 4h16"/>',
  device: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18h2"/>',
  shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
};

export function Icon({ name, size = 22, cls = '' }) {
  return html`<svg class=${`ic ${cls}`} viewBox="0 0 24 24" width=${size} height=${size} aria-hidden="true" focusable="false" dangerouslySetInnerHTML=${{ __html: PATHS[name] || '' }}></svg>`;
}

export function ModeIcon({ mode, size = 22 }) {
  const name = mode === 'rest' ? 'moon' : mode === 'expand' ? 'sun' : 'tune';
  return html`<${Icon} name=${name} size=${size} />`;
}

/** Page heading. It receives focus when a screen opens, for screen readers. */
export function H1({ children, cls = '' }) {
  return html`<h1 class=${`h1 ${cls}`} tabindex="-1">${children}</h1>`;
}

export function TopBar({ left = null, title = null, right = null }) {
  return html`<header class="topbar">
    <div class="tb-left">${left}</div>
    <span class="tb-title">${title}</span>
    <div class="tb-right">${right}</div>
  </header>`;
}

export function Brand() {
  return html`<span class="brand"><span class="brand-mark" aria-hidden="true"><span></span></span><span class="brand-name">Somatic OS</span></span>`;
}

export function ConsultButton({ app }) {
  return html`<button type="button" class="icon-btn" aria-label="相談する" onClick=${() => app.nav.go('Consult')}><${Icon} name="lifebuoy" /></button>`;
}

export function BackButton({ app, label = '戻る', icon = 'back', onClick = null }) {
  return html`<button type="button" class="icon-btn plain" aria-label=${label} onClick=${onClick || (() => app.nav.back())}><${Icon} name=${icon} size=${20} /></button>`;
}

export function TabBar({ app, current }) {
  const tab = (id, label, icon) => html`<button type="button" class="tab" aria-current=${current === id ? 'page' : undefined} onClick=${() => app.nav.tab(id)}>
    <${Icon} name=${icon} />${label}
  </button>`;
  return html`<nav class="tabbar" aria-label="メインメニュー">
    ${tab('Home', 'きょう', 'home')}
    ${tab('Evidence', 'きろく', 'pebbles')}
    <button type="button" class="tab sos" onClick=${() => app.nav.go('Pause')}>
      <span class="tab-center" aria-hidden="true"><${Icon} name="heart" size=${18} /></span>つらいとき
    </button>
    ${tab('Insights', 'わかったこと', 'bulb')}
  </nav>`;
}

/** A row of toggle buttons; tapping the selected one clears it. */
export function Pills({ options, value, onChange, labelledby, shape = '' }) {
  return html`<div class="pills" role="group" aria-labelledby=${labelledby}>
    ${options.map((o) => {
      const on = value === o.value;
      return html`<button type="button" class=${`pill ${shape}`} aria-pressed=${on ? 'true' : 'false'} onClick=${() => onChange(on ? null : o.value)}>${o.label}</button>`;
    })}
  </div>`;
}

export function CheckRow({ checked, onToggle, label, sub = '', star = false, disabled = false }) {
  return html`<button type="button" class="check" role="checkbox" aria-checked=${checked ? 'true' : 'false'} aria-disabled=${disabled ? 'true' : undefined} onClick=${disabled ? undefined : onToggle}>
    <span class="box" aria-hidden="true">${checked ? html`<${Icon} name="check" size=${17} />` : null}</span>
    <span class="check-text">
      <span class="check-label">${star ? html`<span class="star" aria-hidden="true">★ </span>` : null}${label}</span>
      ${sub ? html`<span class="check-sub">${sub}</span>` : null}
    </span>
  </button>`;
}

/** The large round checks used on まもる日. */
export function BigCheck({ checked, onToggle, label, sub }) {
  return html`<button type="button" class="big-check" role="checkbox" aria-checked=${checked ? 'true' : 'false'} onClick=${onToggle}>
    <span class="round" aria-hidden="true">${checked ? html`<${Icon} name="check" size=${18} />` : null}</span>
    <span class="check-text">
      <span class="big-label"><span class="star" aria-hidden="true">★ </span>${label}</span>
      <span class="check-sub">${sub}</span>
    </span>
  </button>`;
}

export function Switch({ checked, onChange, label }) {
  return html`<button type="button" class="switch" role="switch" aria-checked=${checked ? 'true' : 'false'} aria-label=${label} onClick=${() => onChange(!checked)}>
    <span class="track"><span class="knob"></span></span>
  </button>`;
}

/** Bottom sheet. Escape or the scrim closes it; focus moves into it when it opens. */
export function Sheet({ title, onClose, children, id = 'sheet-title' }) {
  const ref = useRef(null);
  useEffect(() => {
    const opener = document.activeElement;
    const el = ref.current;
    const first = el && el.querySelector('button, a[href], input, textarea');
    if (first) first.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      // Give focus back to whatever opened the sheet, if it is still on screen.
      if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus({ preventScroll: true });
    };
  }, []);
  return html`<div class="scrim" onClick=${onClose}></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby=${id} ref=${ref}>
      <span class="grabber" aria-hidden="true"></span>
      <h2 id=${id} class="sheet-title">${title}</h2>
      ${children}
    </div>`;
}

/** 24-hour phone lines. `tone` is 'alert' (on the indigo card) or 'night'. */
export function CrisisLinks({ tone = 'alert' }) {
  return html`<div class="tel-list">
    ${CONTACTS.map((c, i) => html`<a class=${`tel ${tone} ${i === 0 ? 'first' : ''}`} href=${`tel:${c.tel}`}>
      <${Icon} name="phone" />
      <span class="tel-text"><span class="tel-name">${c.name}</span><span class="tel-sub">${c.display} · ${c.hours}</span></span>
    </a>`)}
  </div>`;
}

/**
 * Screen state that should survive a trip to another screen and back
 * (only in memory; it is not saved to the phone).
 */
export function useDraft(app, name, init) {
  const initial = () => (typeof init === 'function' ? init() : init);
  const has = Object.prototype.hasOwnProperty.call(app.drafts, name);
  const value = has ? app.drafts[name] : initial();
  const set = (next) => app.setDraft(name, (prev) => (typeof next === 'function' ? next(prev) : next), initial);
  return [value, set];
}
