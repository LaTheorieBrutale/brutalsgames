/* =========================================================
   LA CRYPTE — base commune des jeux de la plateforme
   (pseudo, langue, sons, classement Firebase, relais en ligne, confettis)
   Les clés de stockage sont les mêmes que Quoridor : réglages partagés.
   ========================================================= */
(function () {
'use strict';
const P = window.P = {};
const $ = P.$ = s => document.querySelector(s);
P.esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
P.get = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
P.set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

/* ---------- Langues ---------- */
const STR = { fr: {}, en: {}, cs: {} };
P.LANGS = [['fr', 'Français'], ['en', 'English'], ['cs', 'Čeština']];
P.addStrings = d => { for (const l in d) Object.assign(STR[l], d[l]); };
let lang = P.get('qd-lang', '');
if (!STR[lang]) { const nl = (navigator.language || 'fr').slice(0, 2).toLowerCase(); lang = STR[nl] ? nl : 'en'; }
P.lang = () => lang;
P.t = (key, vars) => {
  let s = STR[lang][key] ?? STR.fr[key] ?? key;
  if (vars && typeof s === 'string') s = s.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
  return s;
};
const langHooks = [];
P.onLang = f => langHooks.push(f);
P.setLang = l => { if (!STR[l]) return; lang = l; P.set('qd-lang', l); P.applyStatic(); langHooks.forEach(f => f()); };
P.applyStatic = () => {
  document.documentElement.lang = lang;
  const tk = document.documentElement.dataset.title; if (tk) document.title = P.t(tk).replace(/<[^>]+>/g, '');
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = P.t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = P.t(el.dataset.i18nHtml); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = P.t(el.dataset.i18nPh); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', P.t(el.dataset.i18nAria)); el.title = P.t(el.dataset.i18nAria); });
  document.querySelectorAll('.langseg').forEach(box => {
    box.innerHTML = P.LANGS.map(([k, n]) => `<button class="btn" data-lang="${k}" aria-pressed="${k === lang}">${n}</button>`).join('');
  });
};
document.addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (b) { P.sfx('click'); P.setLang(b.dataset.lang); } });
P.gamesWord = n => lang === 'en' ? (n === 1 ? 'game' : 'games') : lang === 'cs' ? (n === 1 ? 'hra' : n >= 2 && n <= 4 ? 'hry' : 'her') : (n > 1 ? 'parties' : 'partie');

/* ---------- Pseudo ---------- */
// Pseudos proposés par défaut (FR/EN/CS) : jamais acceptés comme vrai pseudo, jamais affichés au classement
const DEF_NAMES = ['crâneur', 'craneur', 'skully', 'lebkoun'];
P.isDefaultName = n => DEF_NAMES.includes(String(n || '').trim().toLowerCase());
P.okMatch = m => !(m.p || []).some((n, i) => !(m.b && m.b[i]) && P.isDefaultName(n));
P.name = () => (P.get('qd-name', '').trim() || P.t('defName')).slice(0, 14);
P.saveName = v => P.set('qd-name', String(v || '').trim().slice(0, 14));
P.hasName = () => { const n = P.get('qd-name', '').trim(); return !!n && !P.isDefaultName(n); };
// Vérifie qu'un pseudo est saisi ; sinon message sous le champ, secousse et focus. Renvoie true si on peut jouer.
P.needName = input => {
  const v = (input.value || '').trim();
  let err = input.parentNode.querySelector('.name-err');
  if (!err) { err = document.createElement('p'); err.className = 'name-err'; err.setAttribute('role', 'alert'); input.insertAdjacentElement('afterend', err); }
  if (v && !P.isDefaultName(v)) { P.saveName(v); err.textContent = ''; input.classList.remove('need'); return true; }
  err.textContent = P.t(v ? 'nameTaken' : 'nameReq');
  input.classList.remove('need'); void input.offsetWidth; input.classList.add('need'); input.focus();
  try { navigator.vibrate && navigator.vibrate([20, 40, 20]); } catch (e) {}
  return false;
};
// Enregistre le pseudo à chaque frappe (il reste mémorisé même après fermeture du site)
P.bindName = input => {
  input.value = P.get('qd-name', '');
  input.addEventListener('input', () => { P.saveName(input.value); input.classList.remove('need'); const e = input.parentNode.querySelector('.name-err'); if (e) e.textContent = ''; });
};
(() => { const st = document.createElement('style'); st.textContent = '.name-err{color:#e8394d;font-weight:700;font-size:14px;margin:6px 2px 0;min-height:0}.name-err:empty{display:none}.field.need{border-color:#e8394d!important;box-shadow:0 0 0 4px rgba(232,57,77,.35)!important;animation:needShake .4s}@keyframes needShake{0%,100%{transform:none}20%,60%{transform:translateX(-7px)}40%,80%{transform:translateX(7px)}}'; document.head.appendChild(st); })();

/* ---------- Sons (synthétisés) ---------- */
const clamp01 = v => Math.max(0, Math.min(1, isFinite(v) ? v : 0.8));
const A = { on: P.get('qd-sound', '1') !== '0', vol: clamp01(+P.get('bg-vol-sfx', '0.8')) };
P.soundOn = () => A.on;
P.setSound = on => { A.on = on; P.set('qd-sound', on ? '1' : '0'); if (on && A.vol < 0.05) { A.vol = 0.8; P.set('bg-vol-sfx', '0.8'); } if (A.g) A.g.gain.value = on ? A.vol : 0; if (P.dock) P.dock.refresh(); };
P.sfxVol = () => A.vol;
P.setSfxVol = v => { A.vol = clamp01(v); P.set('bg-vol-sfx', A.vol.toFixed(2)); A.on = A.vol > 0.01; P.set('qd-sound', A.on ? '1' : '0'); if (A.g) A.g.gain.value = A.on ? A.vol : 0; };
P.musicVol = () => clamp01(+P.get('bg-vol-music', '0.7'));
P.unlockAudio = () => {
  if (A.ctx) { A.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  A.ctx = new AC(); A.g = A.ctx.createGain(); A.g.gain.value = A.on ? A.vol : 0; A.g.connect(A.ctx.destination);
};
P.audio = () => A.ctx || null;
function tone(type, f, t, dur, vol, f2) {
  const o = A.ctx.createOscillator(), g = A.ctx.createGain(); g.gain.value = 0;
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(A.g); o.start(t); o.stop(t + dur + 0.05);
}
const mf = m => 440 * Math.pow(2, (m - 69) / 12);
P.sfx = kind => {
  if (!A.ctx || !A.on) return;
  const t = A.ctx.currentTime;
  if (kind === 'click') { tone('sine', 860, t, 0.07, 0.25, 620); tone('triangle', 1720, t, 0.04, 0.08); }
  else if (kind === 'good') { [76, 83, 88].forEach((m, i) => { tone('sine', mf(m), t + i * 0.07, 0.25, 0.3); tone('sine', mf(m) * 2, t + i * 0.07, 0.12, 0.08); }); }
  else if (kind === 'other') { tone('triangle', mf(69), t, 0.18, 0.22); tone('triangle', mf(64), t + 0.09, 0.22, 0.2); }
  else if (kind === 'bad') { tone('sawtooth', 110, t, 0.28, 0.18, 70); tone('sine', 90, t, 0.25, 0.3, 45); }
  else if (kind === 'hint') { [84, 88, 91, 96].forEach((m, i) => tone('sine', mf(m), t + i * 0.05, 0.3, 0.14)); }
  else if (kind === 'chat') { [[79, 0], [86, 0.085]].forEach(([m, dt]) => { tone('sine', mf(m), t + dt, 0.3, 0.3); tone('sine', mf(m) * 2, t + dt, 0.1, 0.07); }); }
  else if (kind === 'win' || kind === 'lose') {
    const seq = kind === 'win' ? [[67], [72], [76], [72, 76, 79]] : [[64], [63], [62], [50, 53, 57]];
    seq.forEach((ns, i) => ns.forEach(m => [1, 2, 3].forEach((h, k) => tone('sine', mf(m) * h, t + i * 0.17, i === 3 ? 0.7 : 0.14, [0.18, 0.08, 0.04][k]))));
  }
};

/* ---------- Volume : composant commun (party.js) branché sur les sons de la plateforme ---------- */
P.audioDock = music => {
  if (!window.BGDock) return null;
  P.dock = BGDock.mount({ music, sfx: { get: () => (A.on ? A.vol : 0), set: v => P.setSfxVol(v) }, unlock: () => P.unlockAudio(), ping: () => P.sfx('click') });
  P.onLang(() => BGDock.refresh());
  return P.dock;
};

/* ---------- Classement (Firebase Realtime Database, API REST) ---------- */
P.DB_URL = 'https://quoridor-7b9d9-default-rtdb.europe-west1.firebasedatabase.app';
P.fbReq = async (path, method, body) => {
  const r = await fetch(P.DB_URL + path + '.json', { method: method || 'GET', cache: 'no-store', body: body === undefined ? undefined : JSON.stringify(body) });
  if (r.status === 401 || r.status === 403) { const e = new Error('denied'); e.denied = true; throw e; }
  if (!r.ok) throw new Error('http ' + r.status);
  return r.json();
};
// Victoires d'équipe (Undercover) : wa = liste des gagnants ; sinon le seul gagnant w
const winnersArr = m => Array.isArray(m.wa) && m.wa.length ? [...new Set(m.wa.filter(i => Number.isInteger(i) && i >= 0 && i < m.p.length))] : [m.w];
P.winnersOf = winnersArr;
const validMatch = m => m && Array.isArray(m.p) && P.okMatch(m) && m.p.length >= 2 && m.p.length <= 10 && Number.isInteger(m.w) && m.w >= 0 && m.w < m.p.length && typeof m.t === 'number';
P.fetchMatches = async () => {
  let data;
  try { data = await P.fbReq('/matches', 'GET'); } catch (e) { throw e; }
  return Object.entries(data || {}).map(([id, m]) => Object.assign({}, m, { id }))
    .filter(validMatch).map(m => ({ id: m.id, t: m.t, p: m.p.map(x => String(x).slice(0, 14)), w: m.w, wa: winnersArr(m), b: Array.isArray(m.b) ? m.b.map(Boolean) : m.p.map(() => false), g: ['diff', 'uc', 'cn', 'dr', 'bj', 'ym', 'bn'].includes(m.g) ? m.g : 'quoridor' }))
    .sort((a, b) => a.t - b.t);
};
P.pushMatch = async m => {
  if (!/^[A-Za-z0-9_-]{1,48}$/.test(m.id)) return;
  const rec = { t: m.t, p: m.p, w: m.w, b: m.b, g: m.g }; if (Array.isArray(m.wa) && m.wa.length > 1) rec.wa = m.wa;
  try { await P.fbReq(`/matches/${m.id}`, 'PUT', rec); } catch (e) {}
};
// Pseudos regroupés (même joueur sous plusieurs noms) : clé simplifiée -> nom affiché
const NAME_ALIAS = { ihatekiki: 'Eli', eli: 'Eli', eliihatekiki: 'Eli' };
const aliasOf = n => { const k = String(n || '').toLowerCase().replace(/[^a-z0-9à-ÿ]/g, ''); return NAME_ALIAS[k] || n; };
P.aliasOf = aliasOf;
// Classement : victoires, parties, pourcentage
P.ranking = (matches, game) => {
  const tab = new Map();
  for (const m of matches) {
    if (game && m.g !== game) continue;
    const inMatch = new Set();
    m.p.forEach((n0, i) => {
      const n = aliasOf(n0), k = n.toLowerCase(); if (inMatch.has(k)) return; inMatch.add(k);
      const r = tab.get(k) || { name: n, w: 0, g: 0, ai: false, hu: 0 };
      r.name = n; r.g++; if (winnersArr(m).includes(i)) r.w++; if (m.b && m.b[i]) r.ai = !r.hu; else { r.hu++; r.ai = false; } tab.set(k, r); // « IA » seulement si ce nom n'a jamais joué en humain
    });
  }
  return [...tab.values()].sort((a, b) => b.w - a.w || (b.w / b.g) - (a.w / a.g) || b.g - a.g || a.name.localeCompare(b.name));
};

/* ---------- Relais en ligne par la base (même principe que Quoridor) ---------- */
const SV = { '.sv': 'timestamp' };
const JOIN_MS = 10 * 60 * 1000, GONE_MS = 90 * 1000;
class Emitter {
  constructor() { this.h = {}; }
  on(e, f) { (this.h[e] = this.h[e] || []).push(f); }
  emit(e, a) { (this.h[e] || []).slice().forEach(f => { try { f(a); } catch (err) { console.error(err); } }); }
}
class Conn extends Emitter {
  constructor(peer, remote) { super(); this.peer = peer; this.remote = remote; this.open = false; this.closed = false; }
  send(m) { if (this.open && !this.closed) this.peer._send(this.remote, m); }
  close() { this._end(true); }
  _end(local) { if (this.closed) return; this.closed = true; this.open = false; this.peer._drop(this, local); this.emit('close'); }
}
// role 'host' ou 'guest' ; room = préfixe du jeu + code (ex. « df_ABCDE »)
class Relay extends Emitter {
  constructor(room, role) {
    super();
    this.base = '/rooms/' + room; this.role = role;
    this.id = role === 'host' ? 'host' : 'g' + Math.random().toString(36).slice(2, 10);
    this.conns = {}; this.seen = new Set(); this.timers = []; this.streams = []; this.queue = Promise.resolve(); this.out = {}; this.done = {}; this.destroyed = false; this.now = 0;
    setTimeout(() => this._init(), 0);
  }
  async _init() {
    try {
      if (this.role === 'host') {
        await P.fbReq(this.base, 'DELETE');
        this.now = (await P.fbReq(this.base + '/host', 'PUT', { t: SV })).t;
        this._listen(this.base + '/up');
        this.timers.push(setInterval(() => this._beat(), 5000));
        this.emit('open');
      } else {
        const me = await P.fbReq(`${this.base}/hb/${this.id}`, 'PUT', { t: SV });
        const h = await P.fbReq(this.base + '/host');
        if (!h || me.t - h.t > JOIN_MS) { this.emit('error', { type: 'nogame' }); return; }
        const c = new Conn(this, 'host'); this.conns.host = c; this.hostConn = c;
        this._listen(`${this.base}/down/${this.id}`);
        this._post(this.base + '/up', { f: this.id, k: 'c' });
        // si la demande se perd, on la renvoie jusqu'à la réponse de l'hôte
        { let n = 0; const rt = setInterval(() => { if (this.destroyed || (this.conns.host && this.conns.host.open) || ++n > 6) { clearInterval(rt); return; } this._post(this.base + '/up', { f: this.id, k: 'c' }); }, 2500); this.timers.push(rt); }
        this.timers.push(setInterval(async () => {
          if (this.destroyed) return;
          try {
            const t = (await P.fbReq(`${this.base}/hb/${this.id}`, 'PUT', { t: SV })).t;
            const hh = await P.fbReq(this.base + '/host');
            if (c.open && (!hh || t - hh.t > GONE_MS)) c._end(false);
          } catch (e) {}
        }, 5000));
        this.emit('open', c);
      }
    } catch (e) { this.emit('error', { type: e.denied ? 'denied' : 'network' }); }
  }
  async _beat() {
    if (this.destroyed) return;
    try {
      this.now = (await P.fbReq(this.base + '/host', 'PUT', { t: SV })).t;
      const hb = (await P.fbReq(this.base + '/hb')) || {};
      for (const [id, c] of Object.entries(this.conns)) { const b = hb[id]; if (!b || this.now - b.t > GONE_MS) c._end(false); }
    } catch (e) {}
  }
  wake() { if (this.destroyed) return; if (this.role === 'host') this._beat(); else P.fbReq(`${this.base}/hb/${this.id}`, 'PUT', { t: SV }).catch(() => {}); }
  _send(to, m) {
    const d = JSON.stringify(m);
    if (this.role === 'host') this._post(`${this.base}/down/${to}`, { k: 'm', d }); else this._post(this.base + '/up', { f: this.id, k: 'm', d });
  }
  // Envoi groupé : une file par destination (les joueurs reçoivent en parallèle) ;
  // les messages qui s'accumulent pendant une requête partent ensemble dans la suivante.
  _post(path, body) {
    const q = this.out[path] || (this.out[path] = { list: [], busy: false });
    q.list.push(body);
    if (!q.busy) this.queue = this._flush(path);
    return this.queue;
  }
  async _flush(path) {
    const q = this.out[path]; if (!q || q.busy) return; q.busy = true;
    try {
      while (q.list.length) {
        const batch = q.list.splice(0, 80);
        const body = batch.length === 1 ? batch[0] : { k: 'n', f: batch[0].f, l: batch };
        try { await P.fbReq(path, 'POST', body); } catch (e) { try { await P.fbReq(path, 'POST', body); } catch (e2) {} }
      }
    } finally { q.busy = false; }
  }
  // Ménage : on efface de la base les messages déjà lus (sinon la salle grossit et tout ralentit)
  _clean() {
    for (const [path, keys] of Object.entries(this.done)) {
      if (!keys.length) continue;
      const patch = {}; keys.splice(0, 200).forEach(k => { patch[k] = null; });
      P.fbReq(path, 'PATCH', patch).catch(() => {});
    }
  }
  _drop(c, local) {
    if (this.conns[c.remote] === c) delete this.conns[c.remote];
    if (!local || this.destroyed) return;
    if (this.role === 'host') this._post(`${this.base}/down/${c.remote}`, { k: 'b' }); else this._post(this.base + '/up', { f: this.id, k: 'b' });
  }
  _listen(path) {
    let opened = false, lastKey = '';
    const done = this.done[path] = []; if (!this._cleanT) { this._cleanT = setInterval(() => this._clean(), 4000); this.timers.push(this._cleanT); }
    const handle = (k, m) => { if (k > lastKey) lastKey = k; if (m && !this.seen.has(k)) done.push(k); this._msg(k, m); };
    const onEvt = ev => {
      opened = true; let p; try { p = JSON.parse(ev.data); } catch (e) { return; } if (!p) return;
      if (p.path === '/') { if (p.data && typeof p.data === 'object') Object.keys(p.data).sort().forEach(k => handle(k, p.data[k])); }
      else { const k = p.path.slice(1); if (!k.includes('/') && p.data) handle(k, p.data); }
    };
    const poll = () => {
      const tick = async () => {
        if (this.destroyed) return;
        try {
          const q = lastKey ? `?orderBy="$key"&startAt="${lastKey}"` : '';
          const r = await fetch(P.DB_URL + path + '.json' + q, { cache: 'no-store' });
          const data = r.ok ? await r.json() : null;
          if (data && typeof data === 'object') Object.keys(data).sort().forEach(k => handle(k, data[k]));
        } catch (e) {}
      };
      tick(); this.timers.push(setInterval(tick, 1000));
    };
    if (typeof EventSource === 'undefined') { poll(); return; }
    const es = new EventSource(P.DB_URL + path + '.json'); this.streams.push(es);
    es.addEventListener('put', onEvt); es.addEventListener('patch', onEvt);
    es.onerror = () => { if (!opened || es.readyState === 2) { es.close(); poll(); } }; // flux coupé pour de bon : on passe en relecture
  }
  _msg(key, m) {
    if (this.seen.has(key) || !m || typeof m !== 'object') return; this.seen.add(key);
    if (m.k === 'n' && Array.isArray(m.l)) { m.l.forEach(x => { if (x && typeof x === 'object') this._one(Object.assign({ f: m.f }, x)); }); return; }
    this._one(m);
  }
  _one(m) {
    let d; if (typeof m.d === 'string') { try { d = JSON.parse(m.d); } catch (e) { return; } }
    if (this.role === 'host') {
      const f = String(m.f || ''); if (!/^g[a-z0-9]{1,12}$/.test(f)) return;
      if (m.k === 'c') {
        if (this.conns[f]) { if (this.conns[f].open) this._post(`${this.base}/down/${f}`, { k: 'o' }); return; } // demande répétée : on redit « ok »
        const c = new Conn(this, f); c.open = true; this.conns[f] = c;
        this.emit('connection', c); this._post(`${this.base}/down/${f}`, { k: 'o' });
      } else if (m.k === 'm' && this.conns[f]) this.conns[f].emit('data', d);
      else if (m.k === 'b' && this.conns[f]) this.conns[f]._end(false);
    } else {
      const c = this.hostConn; if (!c) return;
      if (m.k === 'o' && !c.open) { c.open = true; c.emit('open'); }
      else if (m.k === 'm' && c.open) c.emit('data', d);
      else if (m.k === 'b') c._end(false);
    }
  }
  destroy() {
    if (this.destroyed) return;
    Object.values(this.conns).forEach(c => c.close());
    this.destroyed = true; this.timers.forEach(clearInterval); this.streams.forEach(s => s.close());
    const base = this.base, id = this.id, role = this.role;
    this.queue.then(() => role === 'host' ? P.fbReq(base, 'DELETE') : P.fbReq(`${base}/hb/${id}`, 'DELETE')).catch(() => {});
  }
}
P.Relay = Relay;

// Connexion en ligne : relais par la base si les règles l'autorisent (« rooms »), sinon connexion directe PeerJS.
// Mêmes événements que Relay : 'open' (invité : avec la connexion), 'connection' (hôte), 'error' {type}
class Online extends Emitter {
  constructor(game, code, role) {
    super();
    this.room = game + '_' + code; this.peerId = 'brutals-games-' + game + '-' + code; this.role = role;
    this.impl = null; this.destroyed = false;
    setTimeout(() => this._start(), 0);
  }
  _wire(impl) {
    this.impl = impl;
    impl.on('open', c => { if (!this.destroyed) this.emit('open', c); });
    impl.on('connection', c => { if (!this.destroyed) this.emit('connection', c); });
  }
  async _start() {
    if (this.role === 'host') {
      const r = new Relay(this.room, 'host');
      r.on('error', e => { if (this.destroyed) return; if (e.type === 'denied') { r.destroy(); this._peer(); } else this.emit('error', e); });
      this._wire(r);
      return;
    }
    // Invité : la partie est-elle hébergée sur la base ?
    let st = 'peer';
    try {
      const h = await P.fbReq('/rooms/' + this.room + '/host');
      st = h && typeof h.t === 'number' ? 'live' : 'none';
    } catch (e) { st = 'peer'; }
    if (this.destroyed) return;
    if (st === 'live') { const r = new Relay(this.room, 'guest'); r.on('error', e => { if (!this.destroyed) this.emit('error', e); }); this._wire(r); }
    else if (st === 'none') this.emit('error', { type: 'nogame' });
    else this._peer();
  }
  _peer() {
    if (this.destroyed) return;
    if (typeof Peer === 'undefined') { this.emit('error', { type: 'network' }); return; }
    const host = this.role === 'host';
    const peer = host ? new Peer(this.peerId) : new Peer();
    this.peer = peer;
    let linked = false;
    peer.on('open', () => {
      if (this.destroyed) return;
      if (host) { this.emit('open'); return; }
      const c = peer.connect(this.peerId, { reliable: true });
      c.on('open', () => { linked = true; });
      this.emit('open', c);
    });
    peer.on('connection', c => { if (!this.destroyed) this.emit('connection', c); });
    peer.on('disconnected', () => { try { if (!peer.destroyed && !this.destroyed) peer.reconnect(); } catch (e) {} });
    peer.on('error', err => {
      if (this.destroyed) return;
      const t = err && err.type;
      if (host && t === 'peer-unavailable') return;
      if (host && t === 'unavailable-id') { this.emit('error', { type: 'taken' }); return; }
      if (!host && linked) return; // la fermeture de la connexion est gérée par le jeu
      this.emit('error', { type: t === 'peer-unavailable' ? 'nogame' : 'network' });
    });
  }
  wake() { if (this.impl && this.impl.wake) this.impl.wake(); }
  destroy() {
    if (this.destroyed) return; this.destroyed = true;
    try { this.impl && this.impl.destroy(); } catch (e) {}
    try { this.peer && this.peer.destroy(); } catch (e) {}
  }
}
P.Online = Online;
P.genCode = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.random() * 31 | 0]).join('');

/* ---------- Confettis ---------- */
const CF = { parts: [], raf: 0, last: 0, c: null };
const CF_COLORS = ['#ffcf3f', '#ff9a3c', '#86f2a0', '#ff7aa0', '#9fe6ff', '#f3e7c9', '#c58bff'];
P.confetti = canvas => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = CF.c = canvas, W = c.clientWidth, H = c.clientHeight, d = Math.min(2, devicePixelRatio || 1);
  c.width = W * d; c.height = H * d; c.getContext('2d').setTransform(d, 0, 0, d, 0, 0);
  for (let k = 0; k < 170; k++) {
    const side = k % 3;
    const p = side === 2 ? { x: Math.random() * W, y: -20 - Math.random() * H * 0.5, vx: (Math.random() - .5) * 60, vy: 60 + Math.random() * 90 }
      : { x: side ? W + 10 : -10, y: H * 0.75, vx: (side ? -1 : 1) * (240 + Math.random() * 380), vy: -(520 + Math.random() * 420) };
    Object.assign(p, { r: Math.random() * 6.28, vr: (Math.random() - .5) * 14, w: 7 + Math.random() * 7, h: 4 + Math.random() * 5, col: CF_COLORS[k % 7], t: 0, s: Math.random() * 6.28 });
    CF.parts.push(p);
  }
  if (!CF.raf) { CF.last = performance.now(); CF.raf = requestAnimationFrame(step); }
};
function step(now) {
  const c = CF.c, g = c.getContext('2d'), W = c.clientWidth, H = c.clientHeight, dt = Math.min(0.05, (now - CF.last) / 1000); CF.last = now;
  g.clearRect(0, 0, W, H); CF.parts = CF.parts.filter(p => p.y < H + 30);
  for (const p of CF.parts) {
    p.t += dt; p.vy += 520 * dt; p.vx *= 0.985; p.vy = Math.min(p.vy, 170 + Math.sin(p.t * 3 + p.s) * 30);
    p.x += (p.vx + Math.sin(p.t * 4 + p.s) * 40) * dt; p.y += p.vy * dt; p.r += p.vr * dt;
    g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.scale(1, Math.cos(p.t * 8 + p.s)); g.fillStyle = p.col; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore();
  }
  CF.raf = CF.parts.length ? requestAnimationFrame(step) : 0;
}
P.stopConfetti = () => { CF.parts = []; if (CF.raf) cancelAnimationFrame(CF.raf); CF.raf = 0; if (CF.c) CF.c.getContext('2d').clearRect(0, 0, CF.c.width, CF.c.height); };

/* ---------- Menu « Quitter la partie » (croix des jeux) : menu déroulant puis confirmation ---------- */
P.quitMenu = (btn, onQuit) => {
  const old = document.getElementById('bgQuitMenu'); if (old) { old.remove(); return; }
  if (!document.getElementById('bgQuitCss')) {
    const st = document.createElement('style'); st.id = 'bgQuitCss';
    st.textContent = '#bgQuitMenu{position:fixed;z-index:60;min-width:240px;padding:8px;border-radius:16px;background:rgba(14,12,22,.97);border:3px solid #000;box-shadow:0 10px 26px rgba(0,0,0,.55),inset 0 0 0 1.5px rgba(255,255,255,.12);font-family:inherit;color:#fff;animation:bgqm .16s ease-out;transform-origin:top left}'
      + '@keyframes bgqm{from{opacity:0;transform:translateY(-6px) scale(.96)}}'
      + '#bgQuitMenu button{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:9px;width:100%;padding:11px 13px;border-radius:11px;font-weight:900;font-size:15.5px;cursor:pointer;color:#fff}'
      + '#bgQuitMenu button:hover{background:rgba(255,255,255,.09)}'
      + '#bgQuitMenu .q{color:#ff8a7a}#bgQuitMenu .sure{padding:6px 12px 8px;font-size:14.5px;font-weight:800;opacity:.9}'
      + '#bgQuitMenu .row{display:flex;gap:6px}#bgQuitMenu .row button{justify-content:center;flex:1;padding:10px 8px;white-space:nowrap}'
      + '#bgQuitMenu .yes{background:linear-gradient(180deg,#ff6a5a,#c0281e);box-shadow:inset 0 0 0 2px rgba(0,0,0,.35)}#bgQuitMenu .yes:hover{filter:brightness(1.1);background:linear-gradient(180deg,#ff6a5a,#c0281e)}'
      + '#bgQuitMenu .no{background:rgba(255,255,255,.1)}';
    document.head.appendChild(st);
  }
  const m = document.createElement('div'); m.id = 'bgQuitMenu'; m.setAttribute('role', 'menu');
  const r = btn.getBoundingClientRect();
  m.style.left = Math.max(8, Math.min(r.left, innerWidth - 252)) + 'px'; m.style.top = (r.bottom + 8) + 'px';
  const close = () => { m.remove(); document.removeEventListener('pointerdown', outside, true); };
  const outside = e => { if (!m.contains(e.target) && !btn.contains(e.target)) close(); };
  const step1 = () => { m.innerHTML = `<button class="q" data-q="1"><span style="font-size:17px">🚪</span>${P.t('quitGame')}</button>`; };
  const step2 = () => { m.innerHTML = `<div class="sure">${P.t('quitSure')}</div><div class="row"><button class="no" data-q="no">${P.t('quitNo')}</button><button class="yes" data-q="yes">${P.t('quitYes')}</button></div>`; };
  m.addEventListener('click', e => {
    const b = e.target.closest('[data-q]'); if (!b) return; e.stopPropagation(); P.sfx('click');
    if (b.dataset.q === '1') step2(); else if (b.dataset.q === 'no') close(); else { close(); onQuit(); }
  });
  step1(); document.body.appendChild(m);
  setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
};

/* ---------- Textes communs ---------- */
P.addStrings({
  fr: { defName: 'Crâneur', gn_qd: 'Quoridor', gn_df: '7 Différences', gn_uc: 'Undercover', gn_cn: 'Codenames', gn_dr: 'Dessine & Devine', gn_bj: 'Blackjack', gn_ym: 'Yam’s', gn_bn: 'Bataille navale',  quitGame: 'Quitter la partie', quitSure: 'Es-tu sûr de vouloir quitter ?', quitYes: 'Oui, quitter', quitNo: 'Non', menuBack: 'Retour au menu',  namePh: 'Écris ton pseudo…', nameReq: 'Entre ton pseudo pour jouer !', nameTaken: 'Choisis un vrai pseudo !', back: 'Retour', home: 'Accueil', settings: 'Réglages', sound: 'Sons', on: 'Activés', off: 'Coupés', language: 'Langue', close: 'Fermer',
    colPlayer: 'Joueur', colW: 'V', colG: 'P', aiTag: 'IA', lastGames: 'Dernières parties', lbEmpty: 'Aucune partie pour l’instant.', beat: '<b>{a}</b> bat {b}', winN: '<b>{a}</b> gagne à {n}', winTeam: '<b>{a}</b> gagnent à {n}', locale: 'fr-FR' },
  en: { defName: 'Skully', gn_qd: 'Quoridor', gn_df: '7 Differences', gn_uc: 'Undercover', gn_cn: 'Codenames', gn_dr: 'Draw & Guess', gn_bj: 'Blackjack', gn_ym: 'Yahtzee', gn_bn: 'Battleship',  quitGame: 'Leave the game', quitSure: 'Are you sure you want to leave?', quitYes: 'Yes, leave', quitNo: 'No', menuBack: 'Back to menu',  namePh: 'Type your nickname…', nameReq: 'Enter your nickname to play!', nameTaken: 'Pick a real nickname!', back: 'Back', home: 'Home', settings: 'Settings', sound: 'Sounds', on: 'On', off: 'Off', language: 'Language', close: 'Close',
    colPlayer: 'Player', colW: 'W', colG: 'G', aiTag: 'AI', lastGames: 'Recent games', lbEmpty: 'No games yet.', beat: '<b>{a}</b> beat {b}', winN: '<b>{a}</b> won a {n}-player game', winTeam: '<b>{a}</b> won a {n}-player game', locale: 'en-GB' },
  cs: { defName: 'Lebkoun', gn_qd: 'Quoridor', gn_df: '7 rozdílů', gn_uc: 'Undercover', gn_cn: 'Krycí jména', gn_dr: 'Kresli a hádej', gn_bj: 'Blackjack', gn_ym: 'Yahtzee', gn_bn: 'Lodě',  quitGame: 'Opustit hru', quitSure: 'Opravdu chceš odejít?', quitYes: 'Ano, odejít', quitNo: 'Ne', menuBack: 'Zpět do menu',  namePh: 'Napiš svou přezdívku…', nameReq: 'Pro hraní zadej přezdívku!', nameTaken: 'Vyber si skutečnou přezdívku!', back: 'Zpět', home: 'Domů', settings: 'Nastavení', sound: 'Zvuky', on: 'Zapnuté', off: 'Vypnuté', language: 'Jazyk', close: 'Zavřít',
    colPlayer: 'Hráč', colW: 'V', colG: 'H', aiTag: 'AI', lastGames: 'Poslední hry', lbEmpty: 'Zatím žádné hry.', beat: '<b>{a}</b> porazil {b}', winN: '<b>{a}</b> vyhrál hru ve {n}', winTeam: '<b>{a}</b> vyhráli hru ve {n}', locale: 'cs-CZ' }
});

/* ---------- Skins : les personnages des jeux ----------
   Repris tels quels du Quoridor, d'Undercover, de Codenames et de la Bataille navale.
   Un skin = un identifiant (ex. "qd1", "uc4", "cn7", "bn2", "bnm"). */
const SKINS = (() => {
  const QD = ["<path d=\"M20 4C11 4 5 10.5 5 18.5c0 5 2.4 8.6 6 10.6V34h18v-4.9c3.6-2 6-5.6 6-10.6C35 10.5 29 4 20 4z\" fill=\"#f3e7c9\" stroke=\"#0c0816\" stroke-width=\"2.5\"/><ellipse cx=\"14\" cy=\"19\" rx=\"5\" ry=\"5.6\" fill=\"#1b1030\"/><ellipse cx=\"26\" cy=\"19\" rx=\"5\" ry=\"5.6\" fill=\"#1b1030\"/><circle cx=\"12.6\" cy=\"17.4\" r=\"1.7\" fill=\"#fff\"/><circle cx=\"24.6\" cy=\"17.4\" r=\"1.7\" fill=\"#fff\"/><path d=\"M18.5 25.5l1.5-2.5 1.5 2.5z\" fill=\"#1b1030\"/><path d=\"M15 30v4M20 30v4M25 30v4\" stroke=\"#0c0816\" stroke-width=\"2\"/>", "<path d=\"M9 14L5 3l9 7M31 14l4-11-9 7\" fill=\"#f3e3b5\" stroke=\"#0c0816\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><path d=\"M20 8l13 7 2 12-15 9-15-9 2-12z\" fill=\"#e8394d\" stroke=\"#0c0816\" stroke-width=\"2.5\" stroke-linejoin=\"round\"/><circle cx=\"14.5\" cy=\"19\" r=\"3.6\" fill=\"#ffd84a\" stroke=\"#0c0816\" stroke-width=\"1.6\"/><circle cx=\"25.5\" cy=\"19\" r=\"3.6\" fill=\"#ffd84a\" stroke=\"#0c0816\" stroke-width=\"1.6\"/><circle cx=\"15\" cy=\"19.5\" r=\"1.5\" fill=\"#0c0816\"/><circle cx=\"25\" cy=\"19.5\" r=\"1.5\" fill=\"#0c0816\"/><path d=\"M13 26h14l-2 4H15z\" fill=\"#0c0816\"/><path d=\"M15 26l1.5 2.5L18 26M22 26l1.5 2.5L25 26\" fill=\"#fff\"/>", "<path d=\"M20 5C12.5 5 8 10.5 8 17.5V35l4-3.2 4 3.2 4-3.2 4 3.2 4-3.2 4 3.2V17.5C32 10.5 27.5 5 20 5z\" fill=\"#e6f2ff\" stroke=\"#0c0816\" stroke-width=\"2.5\" stroke-linejoin=\"round\"/><ellipse cx=\"15.5\" cy=\"18\" rx=\"3\" ry=\"4.4\" fill=\"#1b1030\"/><ellipse cx=\"24.5\" cy=\"18\" rx=\"3\" ry=\"4.4\" fill=\"#1b1030\"/><circle cx=\"14.7\" cy=\"16.5\" r=\"1.1\" fill=\"#fff\"/><circle cx=\"23.7\" cy=\"16.5\" r=\"1.1\" fill=\"#fff\"/><ellipse cx=\"20\" cy=\"25.5\" rx=\"2.2\" ry=\"2.8\" fill=\"#1b1030\"/>", "<path d=\"M19 9c0-3 1-5 4-6\" stroke=\"#2f6b22\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\"/><ellipse cx=\"13\" cy=\"22\" rx=\"9\" ry=\"12\" fill=\"#ff8a1f\" stroke=\"#0c0816\" stroke-width=\"2.5\"/><ellipse cx=\"27\" cy=\"22\" rx=\"9\" ry=\"12\" fill=\"#ff8a1f\" stroke=\"#0c0816\" stroke-width=\"2.5\"/><ellipse cx=\"20\" cy=\"22\" rx=\"8\" ry=\"13\" fill=\"#ff9a35\" stroke=\"#0c0816\" stroke-width=\"2.5\"/><path d=\"M11 20l3.5-5 3.5 5zM22 20l3.5-5 3.5 5z\" fill=\"#ffd84a\" stroke=\"#0c0816\" stroke-width=\"1.5\" stroke-linejoin=\"round\"/><path d=\"M12 26h16l-2 4-2-2-2 2-2-2-2 2-2-2z\" fill=\"#ffd84a\" stroke=\"#0c0816\" stroke-width=\"1.5\" stroke-linejoin=\"round\"/>"], QBG = ["#4a5f8f,#26304d", "#8a2a40,#4a1222", "#3b7f8f,#1d4049", "#8a5a20,#4a2a0c"];
  const quoridor = i => `<svg viewBox="0 0 40 40"><defs><radialGradient id="sq${i}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="${QBG[i].split(',')[0]}"/><stop offset="1" stop-color="${QBG[i].split(',')[1]}"/></radialGradient></defs><rect width="40" height="40" fill="url(#sq${i})"/><g transform="translate(5 5) scale(.75)">${QD[i]}</g></svg>`;
  const bgWrap = (svg, vb, col) => svg.replace(/^<svg[^>]*>/, m => m + `<rect x="-20" y="-20" width="${vb + 40}" height="${vb + 40}" fill="${col}"/>`);
  const uc = (() => {
    const COLORS = ['#e5484d', '#3fc1b0', '#ffcc4d', '#9c7bff', '#ff8a3d', '#4aa3ff', '#7ed957', '#ff6fb5', '#c0c7e8', '#b07a4f'];
    const SKIN = ['#f3c9a0', '#d9a273', '#f7d7b5', '#a8693f', '#e8b48a', '#8a5a3a', '#f0c49a', '#c98b5e', '#f5d2ae', '#b97a4c'];
    function avatar(seat, cls = 'av') {
      const c = COLORS[seat % 10], sk = SKIN[seat % 10], k = seat % 10, I = '#0b0e1c';
      const hats = [
        `<path d="M14 25h36l-3-4H17z" fill="${I}"/><path d="M19 22c0-9 4-13 13-13s13 4 13 13z" fill="#2b2f45" stroke="${I}" stroke-width="3"/><path d="M19 19h26" stroke="${c}" stroke-width="4"/><path d="M11 25.5h42" stroke="${I}" stroke-width="4" stroke-linecap="round"/>`,
        `<ellipse cx="33" cy="17" rx="17" ry="7" fill="${c}" stroke="${I}" stroke-width="3"/><circle cx="33" cy="9.5" r="2.5" fill="${I}"/>`,
        `<path d="M17 23c0-9 6-14 15-14s15 5 15 14z" fill="${c}" stroke="${I}" stroke-width="3"/><path d="M45 23h12" stroke="${I}" stroke-width="5" stroke-linecap="round"/>`,
        `<rect x="21" y="2" width="22" height="20" rx="2" fill="#20233a" stroke="${I}" stroke-width="3"/><path d="M21 16h22" stroke="${c}" stroke-width="4"/><path d="M13 22.5h38" stroke="${I}" stroke-width="4" stroke-linecap="round"/>`,
        `<path d="M17 25c0-11 6-16 15-16s15 5 15 16z" fill="${c}" stroke="${I}" stroke-width="3"/><path d="M17 22h30" stroke="${I}" stroke-width="3"/><circle cx="32" cy="8" r="3.5" fill="#fff" stroke="${I}" stroke-width="2.5"/>`
      ];
      const eyes = [
        `<rect x="20" y="29" width="10" height="6" rx="2" fill="${I}"/><rect x="34" y="29" width="10" height="6" rx="2" fill="${I}"/><path d="M30 31h4" stroke="${I}" stroke-width="2.5"/>`,
        `<circle cx="26" cy="32" r="4.5" fill="#dff3ff" stroke="${I}" stroke-width="2.5"/><circle cx="38" cy="32" r="4.5" fill="#dff3ff" stroke="${I}" stroke-width="2.5"/><path d="M30.5 32h3" stroke="${I}" stroke-width="2.5"/><circle cx="26" cy="32" r="1.6" fill="${I}"/><circle cx="38" cy="32" r="1.6" fill="${I}"/>`,
        `<path d="M22 32q3-3 6 0M36 32q3-3 6 0" stroke="${I}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
        `<circle cx="26" cy="32" r="2.2" fill="${I}"/><circle cx="38" cy="32" r="5" fill="rgba(220,240,255,.5)" stroke="#d9a520" stroke-width="2.5"/><circle cx="38" cy="32" r="2" fill="${I}"/><path d="M43 34l2 8" stroke="#d9a520" stroke-width="1.5"/>`,
        `<path d="M19 30h26v4H19z" fill="${I}"/><rect x="20" y="29" width="11" height="7" rx="3" fill="${I}"/><rect x="33" y="29" width="11" height="7" rx="3" fill="${I}"/>`
      ];
      const mous = k % 3 === 0 ? `<path d="M25 41q3.5-3 7 0q3.5-3 7 0q-3.5 3-7 1q-3.5 2-7-1z" fill="#3a2414" stroke="${I}" stroke-width="2"/>` : k % 3 === 1 ? `<path d="M28 42q4 3 8 0" stroke="${I}" stroke-width="2.6" fill="none" stroke-linecap="round"/>` : `<path d="M28 43h8" stroke="${I}" stroke-width="2.6" stroke-linecap="round"/>`;
      return `<svg class="${cls}" viewBox="0 0 64 64"><path d="M8 64c2-12 11-17 24-17s22 5 24 17z" fill="${c}" stroke="${I}" stroke-width="3"/><path d="M26 48l6 9 6-9" fill="#f1eee6" stroke="${I}" stroke-width="2.5" stroke-linejoin="round"/><circle cx="32" cy="33" r="14" fill="${sk}" stroke="${I}" stroke-width="3"/>${eyes[k % 5]}${mous}${hats[(k + Math.floor(k / 5)) % 5]}</svg>`;
    }
    return avatar;
  })();
  const cn = (() => {
    const COLORS = ['#ff8a5a', '#5ad8c8', '#ffcc4d', '#b48aff', '#ff6fb5', '#7ed957', '#4aa3ff', '#ff5a5f', '#c0c7e8', '#d89a5a'];
    const avatar = (seat, team) => {
      const c = COLORS[seat % 10], v = team === 'r' ? '#ff5a5f' : team === 'b' ? '#4aa3ff' : '#c0c7e8', I = '#0a0718';
      return `<svg viewBox="0 0 40 40"><path d="M6 40c1-8 6-12 14-12s13 4 14 12z" fill="${v}" stroke="${I}" stroke-width="2.5"/><circle cx="20" cy="18" r="13" fill="#efeaff" stroke="${I}" stroke-width="2.5"/><rect x="11" y="12" width="18" height="12" rx="6" fill="${c}" stroke="${I}" stroke-width="2.5"/><circle cx="16" cy="16" r="2" fill="#fff" opacity=".8"/></svg>`;
    };
    return avatar;
  })();
  const bn = (() => {
    const INK = '#0d0805';
    const COATS = ['#5a1a14', '#1c3550', '#2e4a1e', '#4a3412', '#3b1f4a', '#4a1f30'];
    let uid = 0;
    function captainSVG(seat, mood) {
      const id = 'c' + (uid++), coat = COATS[seat % COATS.length];
      const brow = mood === 'angry' ? '<path d="M36 44l11 4M53 48l11-5" stroke="#2a1606" stroke-width="3" stroke-linecap="round"/>' : mood === 'smirk' ? '<path d="M36 46l11-1M53 44l11 2" stroke="#2a1606" stroke-width="3" stroke-linecap="round"/>' : '<path d="M36 45l11 1M53 46l11-1" stroke="#2a1606" stroke-width="3" stroke-linecap="round"/>';
      const mouth = mood === 'angry' ? '<path d="M42 70l8-3 8 3" fill="none" stroke="#2a1006" stroke-width="2.6" stroke-linecap="round"/><path d="M44 69h12" stroke="#f1e2c2" stroke-width="1.6"/>' : mood === 'smirk' ? '<path d="M42 67l9 3 8-5" fill="none" stroke="#2a1006" stroke-width="2.6" stroke-linecap="round"/>' : '<path d="M43 68h14" stroke="#2a1006" stroke-width="2.6" stroke-linecap="round"/>';
      return `<svg viewBox="0 0 100 100"><defs><radialGradient id="${id}" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="#2a4b58"/><stop offset="1" stop-color="#0a1820"/></radialGradient></defs>
    <rect width="100" height="100" fill="url(#${id})"/>
    <polygon points="6,100 18,82 38,74 62,74 82,82 94,100" fill="${coat}"/><polygon points="38,74 50,100 62,74 56,84 44,84" fill="#f1e2c2" opacity=".9"/><polygon points="18,82 38,74 30,100 6,100" fill="#000" opacity=".25"/>
    <polygon points="42,66 58,66 60,78 40,78" fill="#a86d45"/>
    <polygon points="31,42 50,35 69,42 71,58 63,72 50,77 37,72 29,58" fill="#c98b5e"/><polygon points="50,35 69,42 71,58 50,54" fill="#dca274"/><polygon points="29,58 37,72 50,77 50,60" fill="#a86d45"/><polygon points="31,42 50,35 50,54 29,58" fill="#d39668"/>
    <polygon points="33,62 50,67 67,62 65,75 57,86 50,92 43,86 35,75" fill="#3b2416"/><polygon points="50,67 67,62 65,75 57,86 50,92" fill="#2a190e"/><polygon points="46,90 54,90 52,98 48,98" fill="#3b2416" stroke="${INK}" stroke-width="1"/><circle cx="50" cy="91" r="1.6" fill="#e0b04e"/>
    ${mouth}
    <polygon points="47,50 53,50 55,60 45,60" fill="#a86d45"/>
    <path d="M36 40l6 18" stroke="#7a3424" stroke-width="2.2" stroke-linecap="round"/>
    <polygon points="37,49 46,48 45,54 38,54" fill="#f1e2c2"/><circle cx="42" cy="51.2" r="2" fill="${INK}"/>
    <path d="M27 47L72 37" stroke="${INK}" stroke-width="2.4"/><polygon points="54,46 66,44 65,54 55,54" fill="${INK}"/>
    ${brow}
    <polygon points="10,42 50,24 90,42 72,36 50,32 28,36" fill="#161210" stroke="${INK}" stroke-width="1.5"/><polyline points="12,41 50,25 88,41" fill="none" stroke="#e0b04e" stroke-width="2"/>
    <polygon points="28,36 34,14 50,8 66,14 72,36 50,31" fill="#1f1915"/><polygon points="50,8 66,14 72,36 50,31" fill="#120e0b"/>
    <g transform="translate(50 22)"><circle r="4.4" fill="#f1e2c2"/><rect x="-2.6" y="2.4" width="5.2" height="3" fill="#f1e2c2"/><circle cx="-1.6" cy="-.4" r="1.2" fill="${INK}"/><circle cx="1.6" cy="-.4" r="1.2" fill="${INK}"/><path d="M-7 6l14-6M-7 0l14 6" stroke="#f1e2c2" stroke-width="1.4"/></g>
    </svg>`;
    }
    function morgrimSVG(mood) {
      const id = 'm' + (uid++), glow = mood === 'angry' ? 5.2 : 3.8;
      const mouth = mood === 'smirk' ? '<path d="M40 70q8 5 14 0" fill="none" stroke="#1a1f18" stroke-width="2.6" stroke-linecap="round"/>' : mood === 'angry' ? '<path d="M40 72q7-5 14 0" fill="none" stroke="#1a1f18" stroke-width="2.6" stroke-linecap="round"/>' : '<path d="M40 70h14" stroke="#1a1f18" stroke-width="2.4" stroke-linecap="round"/>';
      const brow = mood === 'angry' ? '<path d="M33 44l12 5" stroke="#1a1f18" stroke-width="3.4" stroke-linecap="round"/>' : '<path d="M33 46l12 1" stroke="#1a1f18" stroke-width="3" stroke-linecap="round"/>';
      return `<svg viewBox="0 0 100 100"><defs><radialGradient id="${id}" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="#26402c"/><stop offset="1" stop-color="#070f0a"/></radialGradient><filter id="${id}g" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="2.2"/></filter></defs>
    <rect width="100" height="100" fill="url(#${id})"/>
    <polygon points="6,100 16,82 38,74 62,74 84,82 94,100" fill="#1e2a1c"/><polygon points="16,82 30,90 26,100 6,100" fill="#0e140d"/><polygon points="62,74 84,82 78,92 70,84" fill="#2c3a28"/><polygon points="38,74 50,96 62,74" fill="#4a1414"/>
    <polygon points="31,42 50,35 69,42 71,58 63,72 50,77 37,72 29,58" fill="#7d8b7a"/><polygon points="31,42 50,35 50,54 29,58" fill="#95a392"/><polygon points="29,58 37,72 50,77 50,60" fill="#5f6c5c"/>
    <polygon points="50,35 69,42 71,58 64,72 50,77 50,60 56,54" fill="#e8e0c8"/><polygon points="56,54 71,58 64,72 50,77 50,60" fill="#cfc5aa"/>
    <polygon points="58,60 66,60 64,68 59,67" fill="#1a1f18"/>
    <g stroke="#1a1f18" stroke-width="1.4"><path d="M52 70v6M55 69v7M58 68v6M61 66v6"/></g><path d="M50 70h14" stroke="#1a1f18" stroke-width="1.6"/>
    ${mouth}
    <polygon points="48,52 52,52 50,60" fill="#1a1f18"/>
    <polygon points="35,48 46,47 45,55 36,55" fill="#121812"/><polygon points="54,46 66,45 65,55 55,55" fill="#0b0f0b"/>
    <circle cx="40.5" cy="51" r="${glow}" fill="#6dff9a" filter="url(#${id}g)"/><circle cx="40.5" cy="51" r="1.8" fill="#eafff0"/>
    <circle cx="60" cy="50" r="${glow}" fill="#6dff9a" filter="url(#${id}g)"/><circle cx="60" cy="50" r="1.8" fill="#eafff0"/>
    ${brow}
    <path d="M33 66l4 6" stroke="#4a5446" stroke-width="1.6"/>
    <polygon points="8,44 50,26 92,44 80,40 74,46 66,38 50,34 36,40 28,36 20,44" fill="#1a1612" stroke="${INK}" stroke-width="1.5"/>
    <polygon points="27,38 33,16 50,9 67,16 73,38 50,33" fill="#221c16"/><polygon points="50,9 67,16 73,38 50,33" fill="#14100c"/><polygon points="40,16 46,14 44,22" fill="#26402c"/><polygon points="60,24 65,22 64,30" fill="#26402c"/>
    <path d="M14 44l-6 8M88 44l5 7" stroke="#1a1612" stroke-width="2"/>
    </svg>`;
    }
    return { captainSVG, morgrimSVG };
  })();
  const list = [];
  for (let i = 0; i < 4; i++) list.push({ id: 'qd' + i, g: 'qd', svg: () => quoridor(i) });
  for (let i = 0; i < 10; i++) list.push({ id: 'uc' + i, g: 'uc', svg: () => bgWrap(uc(i, 'av'), 64, i % 2 ? '#1b2d54' : '#26407a') });
  for (let i = 0; i < 10; i++) list.push({ id: 'cn' + i, g: 'cn', svg: () => bgWrap(cn(i, ''), 40, '#141a33') });
  for (let i = 0; i < 6; i++) list.push({ id: 'bn' + i, g: 'bn', svg: () => bn.captainSVG(i, i % 3 === 1 ? 'smirk' : '') });
  list.push({ id: 'bnm', g: 'bn', svg: () => bn.morgrimSVG('smirk') });
  return list;
})();
P.SKINS = SKINS;
const skinById = id => SKINS.find(s => s.id === id) || null;
P.avatarNorm = id => (typeof id === 'string' && skinById(id) ? id : null);
P.avatarSVG = (id, cls) => { const s = skinById(id); if (!s) return ''; const out = s.svg(); return cls ? out.replace('<svg', `<svg class="${cls}"`) : out; };
const avKey = n => String(n || '').toLowerCase().replace(/[^a-z0-9à-ÿ]/g, '').slice(0, 24);
P.avatarKey = avKey;
P.myAvatar = () => P.avatarNorm(P.get('bg-skin', ''));
P.setMyAvatar = a => {
  a = P.avatarNorm(a); if (!a) return; P.set('bg-skin', a);
  P.pushAvatar();
};
P.pushAvatar = () => {
  const a = P.myAvatar(), k = avKey(P.hasName() ? P.name() : '');
  if (!a || !k) return;
  P.fbReq(SKIN_PATH + '/' + k, 'PUT', a).catch(() => {});
};
P.avatars = {};
// Les skins sont rangés dans /rooms/skins (/rooms est ouvert en lecture et écriture, contrairement à /avatars)
const SKIN_PATH = '/rooms/skins';
// Mise à jour en direct : dès que quelqu'un change de skin, tous les écrans ouverts le voient
P.watchAvatars = cb => {
  if (!window.EventSource) return;
  let es;
  const open = () => {
    try { es = new EventSource(P.DB_URL + SKIN_PATH + '.json'); } catch (e) { return; }
    const on = ev => {
      let msg; try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (!msg) return;
      const put = (k, v) => { const a = P.avatarNorm(v); if (a) P.avatars[k] = a; else delete P.avatars[k]; };
      if (msg.path === '/') { if (ev.type === 'put') P.avatars = {}; for (const k in msg.data || {}) put(k, msg.data[k]); }
      else put(msg.path.slice(1).split('/')[0], msg.data);
      const mk = avKey(P.hasName() ? P.name() : '');
      if (mk && P.avatars[mk] && P.avatars[mk] !== P.myAvatar()) P.set('bg-skin', P.avatars[mk]);
      cb && cb();
    };
    es.addEventListener('put', on); es.addEventListener('patch', on);
    es.onerror = () => { if (es.readyState === 2) setTimeout(open, 5000); };
  };
  open();
};
P.fetchAvatars = async () => {
  try {
    const d = await P.fbReq(SKIN_PATH, 'GET'); P.avatars = {}; for (const k in d || {}) { const a = P.avatarNorm(d[k]); if (a) P.avatars[k] = a; }
    // Même pseudo sur un autre appareil : le skin enregistré en ligne fait foi (il est publié à chaque changement)
    const mk = avKey(P.hasName() ? P.name() : '');
    if (mk && P.avatars[mk]) P.set('bg-skin', P.avatars[mk]); else if (mk && P.myAvatar()) P.pushAvatar();
  } catch (e) {}
  return P.avatars;
};
P.avatarOf = name => { const k = avKey(name); if (k === avKey(P.hasName() ? P.name() : '') && P.myAvatar()) return P.myAvatar(); return P.avatars[k] || null; };

})();
