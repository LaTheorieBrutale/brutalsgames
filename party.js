/* Brutal's Games — « Groupe d'amis » : on rejoint le groupe UNE fois avec un code,
   puis quand quelqu'un du groupe lance une partie en ligne (n'importe quel jeu), tout le monde est invité
   et rejoint automatiquement, sans retaper de code.
   Base : /rooms/party_<CODE>/cur = dernière partie lancée { g, c, n, id, t } ; /rooms/party_<CODE>/m/<id> = présence.
   API : Party.announce(jeu, code) · Party.busy = () => bool · Party.onJoinHere = (jeu, code) => bool · Party.mountPanel(el) */
(() => {
const DB = window.BG_DB || 'https://quoridor-7b9d9-default-rtdb.europe-west1.firebasedatabase.app';
const GAMES = { qd: ['quoridor.html', 'Quoridor'], df: ['differences.html', '7 Différences'], uc: ['undercover.html', 'Undercover'], cn: ['codenames.html', 'Codenames'], dr: ['dessin.html', 'Dessine & Devine'], bj: ['blackjack.html', 'Blackjack'], ym: ['yams.html', 'Yam\'s'], bn: ['bataille.html', 'Bataille navale'] };
const STR = {
  fr: { title: 'Groupe d’amis', sub: 'Rejoignez le même groupe une seule fois : quand quelqu’un lance une partie, tout le monde est invité automatiquement.', create: 'Créer un groupe', join: 'Rejoindre', codePh: 'CODE', leave: 'Quitter le groupe',
    code: 'Code du groupe', members: 'Dans le groupe', auto: 'Rejoindre les parties automatiquement', launches: '<b>{n}</b> lance <b>{g}</b> !', go: 'Rejoindre', later: 'Plus tard', inSec: 'dans {s} s…', nobody: 'Personne d’autre pour l’instant',
    denied: 'Le groupe a besoin des règles Firebase « rooms ».', offline: 'Connexion au groupe impossible pour l’instant, nouvelle tentative…', bad: 'Entre un code à 5 caractères.', copy: 'Copier', copied: 'Copié !', you: 'toi', pill: 'Groupe {c} · {n}', rcHost: 'Tout le monde est prêt ?', rcWait: 'On attend que chacun clique sur « Prêt »', rcForce: 'Lancer sans attendre', rcCancel: 'Annuler', rcAsk: '<b>{n}</b> veut lancer la partie !', rcReady: 'Prêt !', rcDone: 'Prêt ✓ — on attend les autres…' },
  en: { title: 'Friends group', sub: 'Join the same group once: whenever someone starts a game, everyone gets invited automatically.', create: 'Create a group', join: 'Join', codePh: 'CODE', leave: 'Leave the group',
    code: 'Group code', members: 'In the group', auto: 'Join games automatically', launches: '<b>{n}</b> is starting <b>{g}</b>!', go: 'Join', later: 'Later', inSec: 'in {s} s…', nobody: 'Nobody else yet',
    denied: 'The group needs the Firebase “rooms” rules.', offline: 'Can’t reach the group right now, retrying…', bad: 'Enter a 5-character code.', copy: 'Copy', copied: 'Copied!', you: 'you', pill: 'Group {c} · {n}', rcHost: 'Is everyone ready?', rcWait: 'Waiting for everyone to tap “Ready”', rcForce: 'Start anyway', rcCancel: 'Cancel', rcAsk: '<b>{n}</b> wants to start the game!', rcReady: 'Ready!', rcDone: 'Ready ✓ — waiting for the others…' },
  cs: { title: 'Skupina přátel', sub: 'Připojte se do stejné skupiny jen jednou: když někdo spustí hru, všichni dostanou pozvánku automaticky.', create: 'Vytvořit skupinu', join: 'Připojit', codePh: 'KÓD', leave: 'Opustit skupinu',
    code: 'Kód skupiny', members: 'Ve skupině', auto: 'Připojovat se ke hrám automaticky', launches: '<b>{n}</b> spouští <b>{g}</b>!', go: 'Připojit', later: 'Později', inSec: 'za {s} s…', nobody: 'Zatím nikdo další',
    denied: 'Skupina potřebuje pravidla Firebase „rooms“.', offline: 'Ke skupině se teď nelze připojit, zkouším znovu…', bad: 'Zadej 5místný kód.', copy: 'Kopírovat', copied: 'Zkopírováno!', you: 'ty', pill: 'Skupina {c} · {n}', rcHost: 'Jsou všichni připraveni?', rcWait: 'Čekáme, až každý klepne na „Připraven“', rcForce: 'Spustit hned', rcCancel: 'Zrušit', rcAsk: '<b>{n}</b> chce spustit hru!', rcReady: 'Připraven!', rcDone: 'Připraven ✓ — čekáme na ostatní…' }
};
const get = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
const set = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
// « déjà vu » par onglet (sessionStorage) : suit l'onglet d'une page à l'autre
const sget = k => { try { return sessionStorage.getItem(k) || ''; } catch (e) { return ''; } };
const sset = (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} };
const L = () => STR[get('qd-lang', 'fr')] || STR.fr;
const tr = (k, v) => String(L()[k] || k).replace(/\{(\w+)\}/g, (m, x) => (v && v[x] !== undefined ? v[x] : m));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const myName = () => (get('qd-name', '') || '').trim().slice(0, 14);
let myId = sessionStorage.getItem('bg-pid'); if (!myId) { myId = 'm' + Math.random().toString(36).slice(2, 10); try { sessionStorage.setItem('bg-pid', myId); } catch (e) {} }
// Heure du serveur Firebase : les horloges des téléphones/PC peuvent être décalées (fuseau mal réglé, heure manuelle…)
const SV = { '.sv': 'timestamp' };
let skew = 0, skewOk = false; // heure serveur - heure locale
const now = () => Date.now() + skew;
// Codes : un clavier tchèque ou français (AZERTY) tape « ř » ou « ( » au lieu de « 5 » sans Maj : on corrige
const KEYMAP_CS = { '+': '1', 'ě': '2', 'š': '3', 'č': '4', 'ř': '5', 'ž': '6', 'ý': '7', 'á': '8', 'í': '9', 'é': '0' };
const KEYMAP_FR = { '&': '1', 'é': '2', '"': '3', "'": '4', '(': '5', '-': '6', 'è': '7', '_': '8', 'ç': '9', 'à': '0' };
window.BGCode = v => { const map = get('qd-lang', 'fr') === 'cs' ? KEYMAP_CS : KEYMAP_FR; return String(v || '').split('').map(ch => map[ch.toLowerCase()] || map[ch] || ch).join('').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5); };
const genCode = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.random() * 31 | 0]).join('');
async function req(path, method, body) {
  const r = await fetch(DB + path + '.json', { method: method || 'GET', cache: 'no-store', body: body === undefined ? undefined : JSON.stringify(body) });
  if (r.status === 401 || r.status === 403) { const e = new Error('denied'); e.denied = true; throw e; }
  if (!r.ok) throw new Error('http ' + r.status);
  return r.json();
}

/* ---------- Styles (s'adaptent au thème de chaque page) ---------- */
const st = document.createElement('style');
st.textContent = `
.pty-dim{position:fixed;inset:0;z-index:59;background:rgba(5,3,12,.62);animation:ptyFade .2s}
@keyframes ptyFade{from{opacity:0}}
.pty-inv{position:fixed;z-index:60;left:50%;top:50%;transform:translate(-50%,-50%);width:min(460px,calc(100% - 28px));display:flex;flex-direction:column;align-items:stretch;text-align:center;gap:14px;padding:22px 20px 18px;font-size:21px!important;line-height:1.3;
  background:#1d1636;color:#f6efe0;border:4px solid #0b0816;border-radius:18px;box-shadow:0 6px 0 #0b0816,0 10px 30px rgba(0,0,0,.4);font-family:inherit;font-size:16px;animation:ptyIn .35s cubic-bezier(.2,1.5,.4,1)}
@keyframes ptyIn{from{transform:translate(-50%,-50%) scale(.7);opacity:0}}
.pty-inv .big{font-size:44px;line-height:1}
.pty-inv .lst{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;font-size:15px}
.pty-inv .lst span{padding:4px 10px;border-radius:999px;background:rgba(0,0,0,.35)}
.pty-inv .lst span.ok{background:#3f8f3a}
.pty-inv .sub{font-size:14px;opacity:.75}
.pty-inv b{color:#ffcf3f}
.pty-inv .row{display:flex;gap:8px;align-items:center}
.pty-inv button{font:inherit;font-weight:800;font-size:18px;border:3px solid #0b0816;border-radius:14px;padding:12px 14px;cursor:pointer;box-shadow:0 4px 0 #0b0816}
.pty-inv .go{flex:1;background:linear-gradient(180deg,#fff0b0,#ffcf3f 55%,#f0a92a);color:#1a1020}
.pty-inv .no{background:#3a3160;color:#f6efe0}
.pty-inv small{opacity:.75;font-size:15px;display:block;margin-top:4px}
.pty-panel{display:flex;flex-direction:column;gap:10px}
.pty-panel .pty-sub{margin:0;font-size:13.5px;opacity:.75;line-height:1.4}
.pty-panel .pty-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.pty-panel .pty-code{font-size:34px;font-weight:800;letter-spacing:.22em;color:#ffcf3f;text-shadow:0 3px 0 #0b0816}
.pty-panel .pty-mem{display:flex;flex-wrap:wrap;gap:6px}
.pty-panel .pty-mem>span{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;background:rgba(0,0,0,.28);font-size:14px}
.pty-panel .pty-mem>span>i{width:8px;height:8px;border-radius:50%;background:#7ee36a;box-shadow:0 0 6px #7ee36a}
.pty-panel .pty-err{color:#ff8a8a;font-size:13px;margin:0}
.pty-panel .pty-err:empty{display:none}
.pty-panel label.pty-auto{display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer;text-transform:none;letter-spacing:0}
.pty-panel input[type=checkbox]{width:20px;height:20px;accent-color:#ffcf3f}`;
document.head.appendChild(st);

/* ---------- État ---------- */
const Party = window.Party = {
  code: get('bg-party', '') || '', members: [], err: '',
  busy: () => false,          // la page dit si le joueur est en pleine partie (pas d'arrivée automatique)
  onJoinHere: null,           // la page peut rejoindre sans recharger : (jeu, code) => true si géré
  game: (document.currentScript && document.currentScript.dataset.game) || null, // jeu de la page ('qd' | 'df' | 'uc' | null = accueil)
  panels: []
};
const auto = () => get('bg-party-auto', '1') !== '0';
const seenKey = () => 'bg-party-seen-' + Party.code;
let es = null, poll = 0, beat = 0, memT = 0, inviteEl = null, countT = 0;

function stopNet() { if (es) { es.close(); es = null; } clearInterval(poll); clearInterval(beat); clearInterval(memT); poll = beat = memT = 0; }
function startNet() {
  stopNet(); if (!Party.code) return;
  const base = '/rooms/party_' + Party.code;
  const heartbeat = () => { const t0 = Date.now(); return req(`${base}/m/${myId}`, 'PUT', { n: myName() || '?', t: SV, g: Party.game || 'hub' }).then(r => { if (r && typeof r.t === 'number') { skew = r.t - (t0 + Date.now()) / 2; skewOk = true; } Party.ok = true; if (Party.err) Party.err = ''; renderPanels(); }).catch(e => { if (e.denied) { Party.err = tr('denied'); renderPanels(); } else { Party.ok = false; renderPanels(); } }); };
  const members = () => req(`${base}/m`).then(d => {
    const n0 = now();
    Party.members = Object.entries(d || {}).filter(([, v]) => v && typeof v.t === 'number' && n0 - v.t < 70000).map(([k, v]) => ({ id: k, n: String(v.n || '?').slice(0, 14), g: v.g }));
    renderPanels();
  }).catch(() => {});
  memT = setInterval(members, 10000);
  const onCur = cur => { if (cur && typeof cur === 'object') handleCur(cur); };
  const doPoll = () => { poll = setInterval(() => { if (!document.hidden) req(base + '/cur').then(onCur).catch(() => {}); }, 2000); req(base + '/cur').then(onCur).catch(() => {}); };
  const listen = () => {
  if (typeof EventSource === 'undefined') { doPoll(); return; }
  let opened = false;
  es = new EventSource(DB + base + '/cur.json');
  const ev = e => { opened = true; let p; try { p = JSON.parse(e.data); } catch (x) { return; } if (!p) return; if (p.path === '/') onCur(p.data); else req(base + '/cur').then(onCur).catch(() => {}); };
  es.addEventListener('put', ev); es.addEventListener('patch', ev);
  es.onerror = () => { if (!opened) { es.close(); es = null; doPoll(); } };
  };
  const myCode = Party.code;
  // relecture toutes les 3 s plutôt qu'une connexion permanente (le navigateur en limite le nombre : ça bloquait les jeux)
  heartbeat().finally(() => { if (Party.code !== myCode) return; members(); doPoll(); });
  beat = setInterval(heartbeat, 20000);
}
// Retour arrière du navigateur : la page revient « gelée » depuis le cache (connexions et minuteurs coupés) → on la recharge
window.addEventListener('pageshow', e => { if (e.persisted) location.reload(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && Party.code && !beat) startNet(); });
window.addEventListener('pagehide', () => { if (Party.code) { try { fetch(`${DB}/rooms/party_${Party.code}/m/${myId}.json`, { method: 'DELETE', keepalive: true }); } catch (e) {} } });

/* ---------- Invitations ---------- */
function handleCur(cur) {
  if (!GAMES[cur.g] || !/^[A-Z0-9]{5}$/.test(cur.c || '')) return;
  const key = cur.g + cur.c;
  if (cur.id === myId || sget(seenKey()) === key) return;
  if (typeof cur.t === 'number' && skewOk && now() - cur.t > 5 * 60000) { sset(seenKey(), key); return; } // trop vieux (heure du serveur)
  if (Party.current === key) { sset(seenKey(), key); return; }               // on y est déjà
  if (inviteEl && inviteEl.dataset.key === key) return;                      // invitation déjà affichée (relecture régulière)
  showInvite(cur, key);
}
function hideInvite() { clearInterval(countT); if (inviteEl) { if (inviteEl._dim) inviteEl._dim.remove(); inviteEl.remove(); inviteEl = null; } }
function showInvite(cur, key) {
  hideInvite();
  const el = inviteEl = document.createElement('div'); el.className = 'pty-inv'; el.dataset.key = key; el.setAttribute('role', 'alert');
  el.innerHTML = `<div class="big">👥</div><div>${tr('launches', { n: esc(cur.n || '?'), g: esc(window.P && P.t && P.t('gn_' + cur.g) !== 'gn_' + cur.g ? P.t('gn_' + cur.g) : GAMES[cur.g][1]) })} <small class="cd"></small></div><div class="row"><button class="go">${tr('go')}</button><button class="no">${tr('later')}</button></div>`;
  const dim = document.createElement('div'); dim.className = 'pty-dim'; el._dim = dim; document.body.appendChild(dim);
  document.body.appendChild(el);
  try { window.P && P.sfx && P.sfx('chat'); navigator.vibrate && navigator.vibrate([30, 60, 30]); } catch (e) {}
  const go = () => { hideInvite(); sset(seenKey(), key); joinGame(cur.g, cur.c); };
  el.querySelector('.go').onclick = go;
  el.querySelector('.no').onclick = () => { hideInvite(); sset(seenKey(), key); };
  if (auto() && !Party.busy()) {
    let s = 2; const cd = el.querySelector('.cd'); cd.textContent = tr('inSec', { s });
    countT = setInterval(() => { s--; if (s <= 0) { go(); return; } cd.textContent = tr('inSec', { s }); }, 1000);
  }
}
function joinGame(g, c) {
  Party.current = g + c;
  if (Party.game === g && Party.onJoinHere && Party.onJoinHere(g, c)) return;
  location.href = GAMES[g][0] + '?join=' + c;
}
// Appelé par un jeu quand on crée une partie en ligne : le groupe est prévenu
Party.announce = (g, c) => {
  Party.current = g + c;
  if (!Party.code) return;
  sset(seenKey(), g + c);
  req(`/rooms/party_${Party.code}/cur`, 'PUT', { g, c, n: myName() || '?', id: myId, t: SV }).catch(() => {});
};
/* ---------- « Prêt ? » avant de lancer une partie (seulement dans un groupe) ----------
   Le bouton « Lancer » d'un jeu porte data-pstart : on intercepte le clic, chaque membre du groupe présent
   dans ce jeu doit cliquer « Prêt », puis le vrai lancement a lieu. /rooms/party_X/rc = { g, id, n, k, r: { id: true } } */
let rcHostEl = null, rcGuestEl = null, rcPoll = 0, rcBypass = false;
const rcBase = () => '/rooms/party_' + Party.code + '/rc';
function overlay(html) { const dim = document.createElement('div'); dim.className = 'pty-dim'; const el = document.createElement('div'); el.className = 'pty-inv'; el.innerHTML = html; el._dim = dim; document.body.appendChild(dim); document.body.appendChild(el); return el; }
const dropOv = el => { if (el) { el._dim && el._dim.remove(); el.remove(); } };
function rcStop() { clearInterval(rcPoll); rcPoll = 0; dropOv(rcHostEl); rcHostEl = null; }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-pstart]'); if (!b || b.disabled || rcBypass || !Party.code) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const go = () => { rcStop(); req(rcBase(), 'DELETE').catch(() => {}); rcBypass = true; try { b.click(); } finally { rcBypass = false; } };
  req(`/rooms/party_${Party.code}/m`).then(d => {
    const n0 = now(), who = Object.entries(d || {}).filter(([k, v]) => k !== myId && v && typeof v.t === 'number' && n0 - v.t < 70000 && v.g === Party.game).map(([k, v]) => ({ id: k, n: String(v.n || '?').slice(0, 14) }));
    if (!who.length) return go();
    const k = Math.random().toString(36).slice(2, 8);
    req(rcBase(), 'PUT', { g: Party.game, id: myId, n: myName() || '?', k, t: SV, r: { [myId]: true } }).catch(() => {});
    rcStop();
    rcHostEl = overlay(`<div class="big">✋</div><div><b>${tr('rcHost')}</b><small>${tr('rcWait')}</small></div><div class="lst"></div><div class="row"><button class="go">${tr('rcForce')}</button><button class="no">${tr('rcCancel')}</button></div>`);
    const lst = rcHostEl.querySelector('.lst');
    const draw = r => { lst.innerHTML = who.map(m => `<span class="${r[m.id] ? 'ok' : ''}">${r[m.id] ? '✓' : '…'} ${esc(m.n)}</span>`).join(''); };
    draw({});
    rcHostEl.querySelector('.go').onclick = go;
    rcHostEl.querySelector('.no').onclick = () => { rcStop(); req(rcBase(), 'DELETE').catch(() => {}); };
    rcPoll = setInterval(() => { req(rcBase() + '/r').then(r => { r = r || {}; draw(r); if (who.every(m => r[m.id])) go(); }).catch(() => {}); }, 1000);
  }).catch(go);
}, true);
// côté des autres membres : la demande « Prêt ? » apparaît en grand
function rcCheck() {
  if (!Party.code || !Party.game) return;
  req(rcBase()).then(rc => {
    const live = rc && rc.g === Party.game && rc.id !== myId && (!skewOk || typeof rc.t !== 'number' || now() - rc.t < 120000);
    if (!live) { dropOv(rcGuestEl); rcGuestEl = null; return; }
    if (rcGuestEl && rcGuestEl.dataset.k === rc.k) { if (rc.r && rc.r[myId]) rcGuestEl.querySelector('.row').innerHTML = `<p class="sub">${tr('rcDone')}</p>`; return; }
    dropOv(rcGuestEl);
    rcGuestEl = overlay(`<div class="big">✋</div><div>${tr('rcAsk', { n: esc(rc.n || '?') })}</div><div class="row"><button class="go">${tr('rcReady')}</button></div>`);
    rcGuestEl.dataset.k = rc.k;
    try { window.P && P.sfx && P.sfx('hint'); navigator.vibrate && navigator.vibrate([40, 60, 40]); } catch (e) {}
    rcGuestEl.querySelector('.go').onclick = () => { req(rcBase() + '/r/' + myId, 'PUT', true).catch(() => {}); rcGuestEl.querySelector('.row').innerHTML = `<p class="sub">${tr('rcDone')}</p>`; try { window.P && P.sfx && P.sfx('click'); } catch (e) {} };
  }).catch(() => {});
}
setInterval(() => { if (!document.hidden) rcCheck(); }, 1500);
// Code de partie passé dans l'adresse (?join=ABCDE) : la page le récupère une fois
Party.takeJoin = () => {
  const m = location.search.match(/[?&]join=([A-Z0-9]{5})/i);
  if (!m) return null;
  try { history.replaceState(null, '', location.pathname); } catch (e) {}
  const c = m[1].toUpperCase(); if (Party.game) Party.current = Party.game + c; return c;
};

/* ---------- Panneau (accueil) ---------- */
Party.create = () => { Party.setCode(genCode()); };
Party.setCode = c => { Party.code = c || ''; set('bg-party', c || null); Party.members = []; Party.err = ''; hideInvite(); startNet(); renderPanels(); };
Party.leave = () => { if (Party.code) req(`/rooms/party_${Party.code}/m/${myId}`, 'DELETE').catch(() => {}); Party.setCode(''); };
function renderPanel(el) {
  const btn = el.dataset.btn || 'btn';
  if (!Party.code) {
    el.innerHTML = `<p class="pty-sub">${tr('sub')}</p><button class="${btn} orange pty-create">${tr('create')}</button>
      <div class="pty-row"><input class="field code pty-in" maxlength="5" placeholder="${tr('codePh')}" autocomplete="off" autocapitalize="characters" spellcheck="false" style="flex:1;min-width:0"><button class="${btn} pty-join">${tr('join')}</button></div><p class="pty-err">${esc(Party.err)}</p>`;
    const inp = el.querySelector('.pty-in');
    inp.addEventListener('input', () => { inp.value = window.BGCode(inp.value); });
    const join = () => { const v = inp.value.trim().toUpperCase(); if (v.length !== 5) { Party.err = tr('bad'); renderPanels(); return; } Party.setCode(v); };
    el.querySelector('.pty-join').onclick = join; inp.addEventListener('keydown', e => { if (e.key === 'Enter') join(); });
    el.querySelector('.pty-create').onclick = () => Party.create();
    return;
  }
  const others = Party.members.filter(m => m.id !== myId);
  el.innerHTML = `<div class="pty-row" style="justify-content:space-between"><div><div style="font-size:12.5px;opacity:.7;text-transform:uppercase;letter-spacing:.08em">${tr('code')}</div><div class="pty-code">${Party.code}</div></div><button class="${btn} pty-copy">${tr('copy')}</button></div>
    <div style="font-size:12.5px;opacity:.7;text-transform:uppercase;letter-spacing:.08em">${tr('members')}</div>
    <div class="pty-mem"><span><i></i>${esc(myName() || '?')} (${tr('you')})</span>${others.length ? others.map(m => `<span><i></i>${esc(m.n)}</span>`).join('') : `<span style="opacity:.6">${tr('nobody')}</span>`}</div>
    <label class="pty-auto"><input type="checkbox" class="pty-a" ${auto() ? 'checked' : ''}>${tr('auto')}</label>
    <p class="pty-err">${esc(Party.err)}</p>${!Party.err && Party.ok === false ? `<p class="pty-err">${tr('offline')}</p>` : ''}
    <button class="${btn} pty-leave">${tr('leave')}</button>`;
  el.querySelector('.pty-leave').onclick = () => Party.leave();
  el.querySelector('.pty-a').onchange = e => set('bg-party-auto', e.target.checked ? '1' : '0');
  el.querySelector('.pty-copy').onclick = e => { const b = e.currentTarget; if (navigator.clipboard) navigator.clipboard.writeText(Party.code).then(() => { b.textContent = tr('copied'); setTimeout(() => { b.textContent = tr('copy'); }, 1400); }, () => {}); };
}
function renderPanels() { Party.panels.forEach(renderPanel); }
Party.mountPanel = el => { el.classList.add('pty-panel'); Party.panels.push(el); renderPanel(el); };
Party.refresh = renderPanels;

startNet();
})();

/* ---------- Volume (partout) : bouton en bas à gauche, jauges musique + bruitages ----------
   BGDock.mount({ music: { on(), set(bool), vol() } | null, sfx: { get() -> 0..1, set(0..1) } })
   BGDock.slot(el | null) : en partie, le bouton se range dans la barre du haut (el) pour ne rien cacher */
(() => {
  const STRS = { fr: ['Musique', 'Bruitages', 'Volume'], en: ['Music', 'Sounds', 'Volume'], cs: ['Hudba', 'Zvuky', 'Hlasitost'] };
  const gv = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
  const sv = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const st = document.createElement('style');
  st.textContent = `.bg-dock{position:fixed;z-index:26;left:14px;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);font-family:inherit}
.bg-dock.in-slot{position:relative;left:auto;bottom:auto;z-index:30;flex:none}
.bg-dock-btn{width:48px;height:48px;border-radius:50%;border:3.5px solid #0b0816;background:linear-gradient(180deg,#3d3470,#251e48);color:#ffe3a0;display:grid;place-items:center;cursor:pointer;box-shadow:0 4px 0 #0b0816,0 6px 16px rgba(0,0,0,.35);padding:0}
.bg-dock.in-slot .bg-dock-btn{width:40px;height:40px;border-width:3px;box-shadow:0 3px 0 #0b0816}
.bg-dock-btn svg{width:24px;height:24px}.bg-dock-btn .slash{display:none}.bg-dock-btn.off .slash{display:block}
.bg-dock-btn:active{transform:translateY(3px);box-shadow:0 1px 0 #0b0816}
.bg-dock-pop{position:absolute;left:0;bottom:calc(100% + 10px);background:#1d1636;color:#f6efe0;border:3.5px solid #0b0816;border-radius:16px;box-shadow:0 5px 0 #0b0816,0 10px 26px rgba(0,0,0,.45);padding:12px 14px;display:flex;flex-direction:column;gap:10px;width:min(250px,calc(100vw - 30px));animation:bgDockIn .18s ease-out}
.bg-dock.in-slot .bg-dock-pop{bottom:auto;top:calc(100% + 10px)}
.bg-dock.in-slot.right .bg-dock-pop{left:auto;right:0}
@keyframes bgDockIn{from{opacity:0;transform:translateY(6px)}}
.bg-dock-pop b{font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.7}
.bg-dock-pop label{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:700;text-transform:none;letter-spacing:0;color:#f6efe0;margin:0}
.bg-dock-pop label span{width:22px;text-align:center;font-size:18px}
.bg-dock-pop input[type=range]{flex:1;accent-color:#ffcf3f;height:22px;cursor:pointer;min-width:0}
.bg-dock-pop output{width:38px;text-align:right;font-variant-numeric:tabular-nums;font-size:13px;opacity:.8}
@media (max-width:520px){.bg-dock:not(.in-slot) .bg-dock-btn{width:42px;height:42px}.bg-dock:not(.in-slot){left:10px;bottom:calc(env(safe-area-inset-bottom,0px) + 10px)}}`;
  document.head.appendChild(st);
  let el = null, cfg = null;
  const refresh = () => {
    if (!el) return;
    const L = STRS[gv('qd-lang', 'fr')] || STRS.fr;
    el.querySelector('.dk-t').textContent = L[2];
    const m = el.querySelector('.dk-m'), sx = el.querySelector('.dk-s');
    m.title = L[0]; sx.title = L[1]; m.setAttribute('aria-label', L[0]); sx.setAttribute('aria-label', L[1]);
    const musOn = cfg.music ? cfg.music.on() : true;
    const mv = musOn ? Math.round(Math.max(0, Math.min(1, +gv('bg-vol-music', '0.7'))) * 100) : 0, svv = Math.round((cfg.sfx ? cfg.sfx.get() : 0.8) * 100);
    m.value = mv; sx.value = svv; el.querySelector('.dk-mo').textContent = mv + '%'; el.querySelector('.dk-so').textContent = svv + '%';
    el.querySelector('.bg-dock-btn').classList.toggle('off', !mv && !svv);
  };
  window.BGDock = {
    mount(o) {
      cfg = o || {};
      if (el) { refresh(); return window.BGDock; }
      el = document.createElement('div'); el.className = 'bg-dock';
      el.innerHTML = `<button class="bg-dock-btn" aria-label="Volume"><svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" stroke="#0b0816" stroke-width="1.6" stroke-linejoin="round"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path class="slash" d="M3 3l18 18" stroke="#e8394d" stroke-width="3" stroke-linecap="round"/></svg></button>
        <div class="bg-dock-pop" hidden><b class="dk-t"></b><label><span>🎵</span><input type="range" class="dk-m" min="0" max="100" step="1"><output class="dk-mo"></output></label><label><span>🔊</span><input type="range" class="dk-s" min="0" max="100" step="1"><output class="dk-so"></output></label></div>`;
      document.body.appendChild(el);
      const btn = el.querySelector('.bg-dock-btn'), pop = el.querySelector('.bg-dock-pop'), m = el.querySelector('.dk-m'), sx = el.querySelector('.dk-s');
      btn.onclick = e => { e.stopPropagation(); if (cfg.unlock) cfg.unlock(); pop.hidden = !pop.hidden; refresh(); };
      document.addEventListener('pointerdown', e => { if (!pop.hidden && !el.contains(e.target)) pop.hidden = true; });
      m.addEventListener('input', () => { const v = m.value / 100; sv('bg-vol-music', v.toFixed(2)); if (cfg.music) { cfg.music.vol(v); if ((v > 0.01) !== cfg.music.on()) cfg.music.set(v > 0.01); } refresh(); });
      sx.addEventListener('input', () => { if (cfg.sfx) cfg.sfx.set(sx.value / 100); refresh(); });
      sx.addEventListener('change', () => { if (cfg.ping) cfg.ping(); });
      refresh();
      return window.BGDock;
    },
    refresh,
    slot(target, right) {
      if (!el) return;
      target = null; // le bouton du volume reste toujours en bas à gauche de l'écran, même en partie
      if (target) { el.classList.add('in-slot'); el.classList.toggle('right', !!right); target.appendChild(el); }
      else { el.classList.remove('in-slot', 'right'); document.body.appendChild(el); }
      el.querySelector('.bg-dock-pop').hidden = true;
    }
  };
})();
