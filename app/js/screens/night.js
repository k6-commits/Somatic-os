// 22:00–4:59. The screen goes dark and the app stops asking for records.

import { html } from '../vendor/preact-htm.js';
import { ConsultButton, CrisisLinks, H1, Icon, TabBar, TopBar } from '../ui.js';
import { NIGHT_STAR } from '../content.js';
import { DAY_START_HOUR, hm } from '../dates.js';

export function Night({ app }) {
  const day = app.data.days[app.today];
  return html`<main class="screen has-tabbar">
    <${TopBar}
      left=${html`<span class="time-pill"><${Icon} name="moon" size=${20} />夜 ${hm(app.now.toISOString())}</span>`}
      right=${html`<${ConsultButton} app=${app} />`}
    />
    <${H1}>おやすみ前の時間です<//>
    <p class="lead">夜は記録しなくて大丈夫。きょうのことは、朝に聞きます。</p>
    <div class="card row">
      <span class="round-ic" aria-hidden="true"><${Icon} name="bed" size=${20} /></span>
      <span class="stack-tight"><span class="title-s"><span class="star" aria-hidden="true">★ </span>${NIGHT_STAR.label}</span><span class="check-sub">${NIGHT_STAR.sub}。スマホは置いていく</span></span>
    </div>
    <button type="button" class="card row link-row" onClick=${() => app.nav.go('Breath')}>
      <span class="round-ic" aria-hidden="true"><${Icon} name="wind" size=${20} /></span>
      <span class="grow stack-tight"><span class="title-s">ため息呼吸（5分）</span><span class="check-sub">音声で案内することもできます</span></span>
      <${Icon} name="chevron" size=${18} />
    </button>
    <div class="card row">
      <span class="round-ic" aria-hidden="true"><${Icon} name="lamp" size=${20} /></span>
      <span class="stack-tight"><span class="title-s">明かりを落とす</span><span class="check-sub">この画面も、夜は暗くしています</span></span>
    </div>
    <section class="stack" aria-labelledby="night-crisis">
      <h2 id="night-crisis" class="h2">つらい考えが止まらないとき</h2>
      <p class="note">24時間、話を聞いてくれる窓口があります。</p>
      <${CrisisLinks} tone="night" />
      <a class="link" href="tel:119">命の危険があるときは 119</a>
    </section>
    ${day && day.checkedInAt && html`<button type="button" class="text-btn" onClick=${() => app.nav.go('Home')}>きょうのメニューを見る</button>`}
    <p class="note center">朝${DAY_START_HOUR}時から、チェックインできます</p>
    <${TabBar} app=${app} current="Home" />
  </main>`;
}
