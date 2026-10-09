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
    .filter(validMatch).map(m => ({ id: m.id, t: m.t, p: m.p.map(x => String(x).slice(0, 14)), w: m.w, wa: winnersArr(m), b: Array.isArray(m.b) ? m.b.map(Boolean) : m.p.map(() => false), g: ['diff', 'uc', 'cn', 'dr', 'bj'].includes(m.g) ? m.g : 'quoridor' }))
    .sort((a, b) => a.t - b.t);
};
P.pushMatch = async m => {
  if (!/^[A-Za-z0-9_-]{1,48}$/.test(m.id)) return;
  const rec = { t: m.t, p: m.p, w: m.w, b: m.b, g: m.g }; if (Array.isArray(m.wa) && m.wa.length > 1) rec.wa = m.wa;
  try { await P.fbReq(`/matches/${m.id}`, 'PUT', rec); } catch (e) {}
};
// Classement : victoires, parties, pourcentage
P.ranking = (matches, game) => {
  const tab = new Map();
  for (const m of matches) {
    if (game && m.g !== game) continue;
    m.p.forEach((n, i) => {
      const k = n.toLowerCase(), r = tab.get(k) || { name: n, w: 0, g: 0, ai: false, hu: 0 };
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
    es.onerror = () => { if (!opened) { es.close(); poll(); } };
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
        if (this.conns[f]) return;
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

/* ---------- Textes communs ---------- */
P.addStrings({
  fr: { defName: 'Crâneur', namePh: 'Écris ton pseudo…', nameReq: 'Entre ton pseudo pour jouer !', nameTaken: 'Choisis un vrai pseudo !', back: 'Retour', home: 'Accueil', settings: 'Réglages', sound: 'Sons', on: 'Activés', off: 'Coupés', language: 'Langue', close: 'Fermer',
    colPlayer: 'Joueur', colW: 'V', colG: 'P', aiTag: 'IA', lastGames: 'Dernières parties', lbEmpty: 'Aucune partie pour l’instant.', beat: '<b>{a}</b> bat {b}', winN: '<b>{a}</b> gagne à {n}', winTeam: '<b>{a}</b> gagnent à {n}', locale: 'fr-FR' },
  en: { defName: 'Skully', namePh: 'Type your nickname…', nameReq: 'Enter your nickname to play!', nameTaken: 'Pick a real nickname!', back: 'Back', home: 'Home', settings: 'Settings', sound: 'Sounds', on: 'On', off: 'Off', language: 'Language', close: 'Close',
    colPlayer: 'Player', colW: 'W', colG: 'G', aiTag: 'AI', lastGames: 'Recent games', lbEmpty: 'No games yet.', beat: '<b>{a}</b> beat {b}', winN: '<b>{a}</b> won a {n}-player game', winTeam: '<b>{a}</b> won a {n}-player game', locale: 'en-GB' },
  cs: { defName: 'Lebkoun', namePh: 'Napiš svou přezdívku…', nameReq: 'Pro hraní zadej přezdívku!', nameTaken: 'Vyber si skutečnou přezdívku!', back: 'Zpět', home: 'Domů', settings: 'Nastavení', sound: 'Zvuky', on: 'Zapnuté', off: 'Vypnuté', language: 'Jazyk', close: 'Zavřít',
    colPlayer: 'Hráč', colW: 'V', colG: 'H', aiTag: 'AI', lastGames: 'Poslední hry', lbEmpty: 'Zatím žádné hry.', beat: '<b>{a}</b> porazil {b}', winN: '<b>{a}</b> vyhrál hru ve {n}', winTeam: '<b>{a}</b> vyhráli hru ve {n}', locale: 'cs-CZ' }
});
})();
