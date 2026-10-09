/* Brutal's Games — chat général (Firebase Realtime Database, API REST)
   Utilisation : GChat.mount(élément, { db: URL, name: () => pseudo ou '', lang: () => 'fr'|'en'|'cs', needName: () => {} })
   Chemin /chat : lecture libre ; chaque message est écrit une seule fois (POST) : { n: pseudo, m: texte, t: horodatage serveur } */
(() => {
const STR = {
  fr: { title: 'Chat général', ph: 'Écris un message…', send: 'Envoyer', empty: 'Aucun message. Dis bonjour !', denied: 'Chat indisponible : mets à jour les règles Firebase (section « chat »).', down: 'Chat hors ligne, nouvelle tentative…', needName: 'Entre ton pseudo pour écrire.', slow: 'Doucement ! Attends 2 secondes.', today: '', locale: 'fr-FR' },
  en: { title: 'Global chat', ph: 'Type a message…', send: 'Send', empty: 'No messages yet. Say hi!', denied: 'Chat unavailable: update the Firebase rules ("chat" section).', down: 'Chat offline, retrying…', needName: 'Enter your nickname to chat.', slow: 'Easy! Wait 2 seconds.', today: '', locale: 'en-GB' },
  cs: { title: 'Společný chat', ph: 'Napiš zprávu…', send: 'Odeslat', empty: 'Zatím žádné zprávy. Pozdrav!', denied: 'Chat není dostupný: uprav pravidla Firebase (sekce „chat“).', down: 'Chat je offline, zkouším znovu…', needName: 'Pro psaní zadej přezdívku.', slow: 'Pomalu! Počkej 2 sekundy.', today: '', locale: 'cs-CZ' }
};
const KEEP = 60, MAXLEN = 200;
/* ---------- Traduction automatique (Google Translate public, repli MyMemory) ----------
   BGT.translate(texte, langueCible, langueSource|'auto') -> Promise<string|null> (null = même langue ou échec) */
const BGT = window.BGT = (() => {
  const cache = new Map(), pending = new Map();
  // les traductions déjà faites suivent l'onglet d'une page à l'autre (évite de tout retraduire à chaque retour au menu)
  try { const saved = JSON.parse(sessionStorage.getItem('bg-tr') || '[]'); saved.forEach(([k, v]) => cache.set(k, v)); } catch (e) {}
  let saveT = 0; const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { sessionStorage.setItem('bg-tr', JSON.stringify([...cache].slice(-400))); } catch (e) {} }, 500); };
  const same = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  async function gtx(text, tl, sl) {
    const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`);
    if (!r.ok) throw new Error(r.status);
    const j = await r.json(), out = (j[0] || []).map(x => x && x[0] || '').join('');
    return { out, src: j[2] || sl };
  }
  async function mym(text, tl, sl) {
    const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sl === 'auto' ? 'Autodetect' : sl}|${tl}`);
    if (!r.ok) throw new Error(r.status);
    const j = await r.json(); return { out: (j.responseData && j.responseData.translatedText) || '', src: sl };
  }
  function translate(text, tl, sl = 'auto') {
    text = String(text || '').trim();
    if (!text || !tl || (sl !== 'auto' && sl === tl) || /^[\p{P}\p{S}\s\d…]+$/u.test(text)) return Promise.resolve(null);
    const key = tl + '|' + sl + '|' + text;
    if (cache.has(key)) return Promise.resolve(cache.get(key));
    if (pending.has(key)) return pending.get(key);
    const job = (async () => {
      let res = null;
      try { res = await gtx(text, tl, sl); } catch (e) { try { res = await mym(text, tl, sl); } catch (e2) { res = null; } }
      const v = res && res.out && res.src !== tl && !same(res.out, text) ? res.out : null;
      cache.set(key, v); pending.delete(key); if (res) save(); return v;
    })();
    pending.set(key, job); return job;
  }
  const peek = (text, tl, sl = 'auto') => cache.get(tl + '|' + sl + '|' + String(text || '').trim());
  return { translate, peek };
})();
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hue = n => { let h = 0; for (const c of String(n).toLowerCase()) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const css = `
.gc{display:flex;flex-direction:column;min-height:0;gap:6px;font-family:inherit}
.gc-head{display:flex;align-items:center;gap:7px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;opacity:.75}
.gc-head i{width:8px;height:8px;border-radius:50%;background:#888;flex:none}
.gc-head i.on{background:#7ee36a;box-shadow:0 0 7px #7ee36a}
.gc-list{flex:1;min-height:90px;overflow-y:auto;display:flex;flex-direction:column;gap:3px;padding:6px;border-radius:12px;background:rgba(0,0,0,.28);font-size:14px;line-height:1.35;overscroll-behavior:contain}
.gc-msg{padding:3px 7px;border-radius:8px;word-wrap:break-word;overflow-wrap:anywhere}
.gc-msg.me{background:rgba(255,207,63,.12)}
.gc-msg b{font-weight:700;margin-right:5px}
.gc-msg time{float:right;margin-left:8px;font-size:11px;opacity:.5}
.gc-day{align-self:center;font-size:11px;opacity:.55;padding:2px 8px}
.gc-info{font-size:13px;opacity:.7;text-align:center;padding:10px 6px}
.gc-info.err{color:#ff8a8a;opacity:1}
.gc-form{display:flex;gap:6px}
.gc-form input{flex:1;min-width:0;font:inherit;font-size:16px;padding:8px 10px;border-radius:10px;border:2px solid rgba(255,255,255,.18);background:rgba(0,0,0,.3);color:inherit;outline:none}
.gc-form input:focus{border-color:rgba(255,207,63,.7)}
.gc-form button{font:inherit;font-size:14px;font-weight:700;padding:8px 12px;border-radius:10px;border:2px solid #0c0816;background:#ffcf3f;color:#1a1020;cursor:pointer;flex:none}
.gc-form button:disabled{opacity:.5;cursor:default}
.gc-tr::after{content:" 🌐";font-size:11px;opacity:.6}
.gc-tr{cursor:help}
.gc-note{font-size:12px;min-height:0;color:#ff9a8a}
.gc-note:empty{display:none}`;
let styled = false;

function mount(el, o) {
  if (!styled) { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); styled = true; }
  const L = () => STR[o.lang && o.lang()] || STR.fr;
  el.classList.add('gc');
  el.innerHTML = `<div class="gc-head"><i></i><span class="gc-title"></span></div>
    <div class="gc-list" aria-live="polite"></div>
    <form class="gc-form" autocomplete="off"><input maxlength="${MAXLEN}" enterkeyhint="send"><button type="submit"></button></form>
    <div class="gc-note" role="alert"></div>`;
  const list = el.querySelector('.gc-list'), form = el.querySelector('.gc-form'), input = form.querySelector('input'), btn = form.querySelector('button');
  const dot = el.querySelector('.gc-head i'), note = el.querySelector('.gc-note');
  setTimeout(() => window.BGEmoji && BGEmoji.attach(form));
  const msgs = new Map(); // clé Firebase -> message
  let state = 'load', es = null, poll = 0, lastSend = 0, noteT = 0, alive = true;

  const say = (txt) => { note.textContent = txt || ''; clearTimeout(noteT); if (txt) noteT = setTimeout(() => { note.textContent = ''; }, 3500); };
  function texts() { const s = L(); el.querySelector('.gc-title').textContent = s.title; input.placeholder = s.ph; btn.textContent = s.send; render(); }
  function render() {
    const s = L(); dot.classList.toggle('on', state === 'on');
    if (state === 'denied') { list.innerHTML = `<div class="gc-info err">${esc(s.denied)}</div>`; return; }
    const keys = [...msgs.keys()].sort().slice(-KEEP);
    if (!keys.length) { list.innerHTML = `<div class="gc-info">${esc(state === 'down' ? s.down : s.empty)}</div>`; return; }
    const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
    const me = (o.name() || '').toLowerCase(), today = new Date().toDateString();
    let html = '', lastDay = '';
    for (const k of keys) {
      const m = msgs.get(k), d = new Date(m.t), day = d.toDateString();
      if (day !== lastDay) { if (day !== today || lastDay) html += `<div class="gc-day">${day === today ? '—' : esc(d.toLocaleDateString(s.locale, { day: 'numeric', month: 'short' }))}</div>`; lastDay = day; }
      const tl = o.lang ? o.lang() : 'fr', mine = m.n.toLowerCase() === me;
      let txt = esc(m.m);
      if (!mine && m.l !== tl) { const tr = BGT.peek(m.m, tl, m.l); if (tr === undefined) BGT.translate(m.m, tl, m.l).then(v => { if (v) render(); }); else if (tr) txt = `<span class="gc-tr" title="${esc(m.m)}">${esc(tr)}</span>`; }
      html += `<div class="gc-msg${mine ? ' me' : ''}"><time>${d.toLocaleTimeString(s.locale, { hour: '2-digit', minute: '2-digit' })}</time><b style="color:hsl(${hue(m.n)},85%,70%)">${esc(m.n)}</b>${txt}</div>`;
    }
    list.innerHTML = html;
    if (atBottom || list.dataset.first !== '1') { list.scrollTop = list.scrollHeight; list.dataset.first = '1'; }
  }
  function add(k, m) {
    if (!m || typeof m !== 'object' || typeof m.n !== 'string' || typeof m.m !== 'string' || typeof m.t !== 'number') return;
    msgs.set(k, { n: m.n.slice(0, 14), m: m.m.slice(0, MAXLEN), t: m.t, l: typeof m.l === 'string' ? m.l.slice(0, 5) : 'auto' });
  }
  function trim() { const keys = [...msgs.keys()].sort(); while (keys.length > KEEP) msgs.delete(keys.shift()); }
  const q = `?orderBy=%22%24key%22&limitToLast=${KEEP}`;
  async function load() {
    try {
      const r = await fetch(o.db + '/chat.json' + q, { cache: 'no-store' });
      if (r.status === 401 || r.status === 403) { state = 'denied'; render(); return false; }
      if (!r.ok) throw new Error(r.status);
      const data = await r.json();
      if (data && typeof data === 'object') Object.entries(data).forEach(([k, m]) => add(k, m));
      trim(); const sig = [...msgs.keys()].sort().slice(-1)[0] + ':' + msgs.size;
      if (sig !== lastSig || state !== 'on') { lastSig = sig; state = 'on'; render(); } return true;
    } catch (e) { state = 'down'; render(); return false; }
  }
  let lastSig = '';
  // Pas de connexion permanente (les navigateurs en limitent le nombre par site) : on relit toutes les 4 s, seulement si le chat est visible
  function startPoll() { if (!poll) poll = setInterval(() => { if (alive && !document.hidden && el.offsetParent !== null) load(); }, 4000); }
  function stream() {
    if (typeof EventSource === 'undefined') { startPoll(); return; }
    let opened = false;
    es = new EventSource(o.db + '/chat.json' + q);
    const onEvt = ev => {
      opened = true; let p; try { p = JSON.parse(ev.data); } catch (e) { return; } if (!p) return;
      if (p.path === '/') { if (p.data && typeof p.data === 'object') Object.entries(p.data).forEach(([k, m]) => add(k, m)); }
      else { const k = p.path.slice(1); if (!k.includes('/')) add(k, p.data); }
      trim(); state = 'on'; render();
    };
    es.addEventListener('put', onEvt); es.addEventListener('patch', onEvt);
    es.addEventListener('auth_revoked', () => { es.close(); startPoll(); });
    es.addEventListener('cancel', () => { es.close(); state = 'denied'; render(); });
    es.onerror = () => { if (!opened) { es.close(); es = null; startPoll(); } };
  }
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const s = L(), txt = input.value.replace(/\s+/g, ' ').trim().slice(0, MAXLEN), name = (o.name() || '').trim();
    if (!txt) return;
    if (!name) { say(s.needName); if (o.needName) o.needName(); return; }
    if (state === 'denied') { say(s.denied); return; }
    if (Date.now() - lastSend < 2000) { say(s.slow); return; }
    lastSend = Date.now(); btn.disabled = true;
    try {
      const r = await fetch(o.db + '/chat.json', { method: 'POST', body: JSON.stringify({ n: name.slice(0, 14), m: txt, l: o.lang ? o.lang() : 'fr', t: { '.sv': 'timestamp' } }) });
      if (r.status === 401 || r.status === 403) { state = 'denied'; render(); say(s.denied); }
      else if (!r.ok) throw new Error(r.status);
      else { input.value = ''; const { name: key } = await r.json(); if (!es) load(); else if (key && !msgs.has(key)) { add(key, { n: name, m: txt, t: Date.now() }); render(); } list.scrollTop = list.scrollHeight; }
    } catch (err) { say(s.down); }
    btn.disabled = false; input.focus();
  });
  texts();
  load().then(ok => { if (state !== 'denied') startPoll(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && alive && el.offsetParent !== null) load(); });
  return { refresh: texts, destroy() { alive = false; if (es) es.close(); clearInterval(poll); } };
}
window.GChat = { mount };

/* ---------- Émojis rapides (comme dans le chat du Quoridor), ajoutés à tous les chats ----------
   BGEmoji.attach(form) : une rangée d'émojis au-dessus du champ ; un appui envoie l'émoji tout de suite. */
const EMOS = ['👋', '😂', '😱', '💀', '👏', '😈', '🖕'];
let emoStyled = false;
function attach(form) {
  if (!form || form.dataset.emo) return; form.dataset.emo = '1';
  if (!emoStyled) { emoStyled = true; const st = document.createElement('style'); st.textContent = `.bg-emo{display:flex;gap:4px}.bg-emo button{flex:1;min-width:0;font-size:17px;line-height:1;padding:5px 0;background:rgba(0,0,0,.32);border:2px solid rgba(0,0,0,.55);border-radius:10px;cursor:pointer;transition:transform .08s;font-family:inherit}.bg-emo button:active{transform:scale(.86)}@media (hover:hover){.bg-emo button:hover{background:rgba(255,255,255,.1)}}`; document.head.appendChild(st); }
  const row = document.createElement('div'); row.className = 'bg-emo';
  row.innerHTML = EMOS.map(e => `<button type="button" data-bgemo="${e}">${e}</button>`).join('');
  form.parentNode.insertBefore(row, form);
  row.addEventListener('click', e => {
    const b = e.target.closest('[data-bgemo]'); if (!b) return;
    const input = form.querySelector('input'); if (!input) return;
    const keep = input.value; input.value = b.dataset.bgemo;
    if (form.requestSubmit) form.requestSubmit(); else form.dispatchEvent(new Event('submit', { cancelable: true }));
    if (input.value === '' || input.value === b.dataset.bgemo) input.value = keep;
  });
}
window.BGEmoji = { attach, list: EMOS };
const auto = () => document.querySelectorAll('#rcForm, .gc-form').forEach(attach);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
})();
