// 設定とデータ: install hint, trusted person, export / import / delete, about.

import { html, useState } from '../vendor/preact-htm.js';
import { BackButton, H1, Icon, Sheet, TopBar } from '../ui.js';
import { APP_VERSION, CONTACTS_CHECKED } from '../content.js';
import { emptyData, exportText, parseImport, updateSettings } from '../store.js';
import { compact } from '../dates.js';

function isStandalone() {
  return (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
}

export function Settings({ app }) {
  const s = app.data.settings;
  const [name, setName] = useState(s.trusted.name);
  const [tel, setTel] = useState(s.trusted.tel);
  const [saved, setSaved] = useState('');
  const [pending, setPending] = useState(null);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saveTrusted = (e) => {
    e.preventDefault();
    const clean = tel.replace(/[^\d+]/g, '');
    app.update((d) => updateSettings(d, { trusted: { name: name.trim(), tel: clean } }));
    setTel(clean);
    setSaved(clean ? '保存しました。「相談する」からすぐ電話できます。' : '消しました。');
  };

  const exportData = async () => {
    const text = exportText(app.data, new Date().toISOString());
    const fileName = `somatic-os-${compact(app.today)}.json`;
    const file = new File([text], fileName, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: fileName });
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const onFile = async (e) => {
    setError('');
    const f = e.currentTarget.files && e.currentTarget.files[0];
    e.currentTarget.value = '';
    if (!f) return;
    try {
      setPending(parseImport(await f.text()));
    } catch {
      setError('このファイルは読み込めませんでした。このアプリで書き出したファイルを選んでください。');
    }
  };

  const days = Object.keys(app.data.days).length;

  return html`<main class="screen">
    <${TopBar} left=${html`<${BackButton} app=${app} />`} />
    <${H1} cls="md">設定とデータ<//>

    ${!isStandalone() &&
    html`<section class="card stack" aria-labelledby="install-h">
      <h2 id="install-h" class="card-title">ホーム画面に追加する</h2>
      <p class="body-s">アプリのように開けて、通信がなくても使えます。iPhoneでは、追加しておくと記録が消えにくくなります。</p>
      <ul class="bullets">
        <li>iPhone（Safari）：共有ボタン →「ホーム画面に追加」</li>
        <li>Android（Chrome）：右上のメニュー →「ホーム画面に追加」</li>
      </ul>
    </section>`}

    <section class="card stack" aria-labelledby="trusted-h">
      <h2 id="trusted-h" class="card-title">信頼できる人</h2>
      <p class="body-s">登録すると、「相談する」の画面からすぐ電話できます。</p>
      <form class="stack" onSubmit=${saveTrusted}>
        <label for="tr-name" class="field-label">名前</label>
        <input id="tr-name" class="input" value=${name} onInput=${(e) => setName(e.currentTarget.value)} autocomplete="off" placeholder="例：姉" />
        <label for="tr-tel" class="field-label">電話番号</label>
        <input id="tr-tel" class="input" type="tel" inputmode="tel" value=${tel} onInput=${(e) => setTel(e.currentTarget.value)} autocomplete="off" placeholder="例：09012345678" />
        <button type="submit" class="btn small">保存する</button>
        ${saved && html`<p class="note" role="status">${saved}</p>`}
      </form>
    </section>

    <section class="card stack" aria-labelledby="data-h">
      <h2 id="data-h" class="card-title">記録の書き出しと読み込み</h2>
      <p class="body-s">記録はこのスマホの中だけにあります（いま${days}日分）。機種変更やもしものために、ときどき書き出してください。</p>
      <button type="button" class="btn outline" onClick=${exportData}><${Icon} name="download" size=${18} />書き出す（JSONファイル）</button>
      <label class="btn outline file">
        <${Icon} name="upload" size=${18} />書き出したファイルを読み込む
        <input type="file" accept="application/json,.json" class="sr-only" onChange=${onFile} />
      </label>
      ${error && html`<p class="error" role="alert">${error}</p>`}
    </section>

    <section class="card stack" aria-labelledby="del-h">
      <h2 id="del-h" class="card-title">すべての記録を消す</h2>
      <p class="body-s">このスマホから、記録と設定をすべて消します。元に戻せません。</p>
      <button type="button" class="btn danger" onClick=${() => setConfirmDelete(true)}><${Icon} name="trash" size=${18} />すべて消す</button>
    </section>

    <section class="card stack" aria-labelledby="about-h">
      <h2 id="about-h" class="card-title">このアプリについて</h2>
      <p class="body-s">Somatic OS ${APP_VERSION}。研究レポートと実践ガイドをもとにしたセルフケアの道具です。診断や治療の代わりではありません。</p>
      <p class="body-s">相談窓口の番号は${CONTACTS_CHECKED}に、厚生労働省の「まもろうよ こころ」で確認しました。</p>
      <a class="link" href="https://github.com/k6-commits/Somatic-os" target="_blank" rel="noopener">ソースと資料（GitHub）<${Icon} name="external" size=${16} /></a>
    </section>

    ${pending &&
    html`<${Sheet} title="記録を読み込みますか" onClose=${() => setPending(null)} id="import-title">
      <p class="body-s">いまの記録（${days}日分）を、ファイルの記録（${Object.keys(pending.days).length}日分）で置き換えます。</p>
      <button type="button" class="btn" onClick=${() => { const next = pending; app.update(() => next); setPending(null); app.nav.home(); }}>置き換える</button>
      <button type="button" class="btn outline" onClick=${() => setPending(null)}>やめる</button>
    <//>`}

    ${confirmDelete &&
    html`<${Sheet} title="すべての記録を消しますか" onClose=${() => setConfirmDelete(false)} id="delete-title">
      <p class="body-s">${days}日分の記録と設定を消します。元に戻せません。必要なら、先に書き出してください。</p>
      <button type="button" class="btn danger" onClick=${() => { app.update(() => emptyData()); app.clearAllDrafts(); setConfirmDelete(false); app.nav.home(); }}>消す</button>
      <button type="button" class="btn outline" onClick=${() => setConfirmDelete(false)}>やめる</button>
    <//>`}
  </main>`;
}
