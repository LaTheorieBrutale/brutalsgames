/* =========================================================
   SKINS — les personnages des jeux, choisis comme avatar sur l'accueil.
   Chargé par toutes les pages (après shared.js quand il est là ; seul dans le Quoridor).
   Skins stockés en ligne dans /rooms/skins/<pseudo> et suivis en direct.
   ========================================================= */
(function () {
'use strict';
const P = window.P = window.P || {};
// Outils minimum quand shared.js n'est pas chargé (Quoridor)
if (!P.get) P.get = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
if (!P.set) P.set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
if (!P.DB_URL) P.DB_URL = 'https://quoridor-7b9d9-default-rtdb.europe-west1.firebasedatabase.app';
if (!P.fbReq) P.fbReq = async (path, method, body) => { const r = await fetch(P.DB_URL + path + '.json', { method: method || 'GET', cache: 'no-store', body: body === undefined ? undefined : JSON.stringify(body) }); if (!r.ok) throw new Error('http ' + r.status); return r.json(); };
const DEF_NAMES = ['crâneur', 'skully', 'lebkoun'];
if (!P.hasName) P.hasName = () => { const n = P.get('qd-name', '').trim(); return !!n && !DEF_NAMES.includes(n.toLowerCase()); };
if (!P.name) P.name = () => P.get('qd-name', '').trim().slice(0, 14);
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

// Avatar d'un joueur dans un jeu : son skin perso s'il en a un, sinon le personnage du jeu (html d'origine).
// La taille et la forme d'origine sont gardées (même classe sur le <svg>).
P.skinOr = (name, html) => {
  const a = name && P.avatarOf(name); if (!a) return html;
  const m = String(html).match(/^\s*<svg\b[^>]*?\bclass="([^"]*)"/);
  return P.avatarSVG(a, (m ? m[1] + ' ' : '') + 'pskin').replace('<svg', '<svg style="border-radius:24%;overflow:hidden"');
};
// Charger les skins et rafraîchir l'écran quand quelqu'un change le sien
P.skinLive = cb => { P.fetchAvatars().then(() => cb && cb()); P.watchAvatars(cb); };

/* ---------- Top 3 du classement : noms en or, argent et bronze, animés, partout ----------
   Le classement général est relu régulièrement ; chaque nom du top 3 trouvé dans la page
   (listes, bandeaux, chat, phrases…) est entouré d'un <span class="bg-rk rN">. */
(() => {
  const st = document.createElement('style');
  st.textContent = `
.bg-rk{display:inline;font-weight:inherit;-webkit-background-clip:text;background-clip:text;color:transparent!important;-webkit-text-fill-color:transparent;text-shadow:none!important;-webkit-text-stroke:0!important;filter:none!important;
  background-repeat:repeat-x,no-repeat;background-size:720px 100%,100% 100%;animation:bgRkShine 7.2s linear infinite}
/* calque 1 : un éclat doux qui traverse le nom (motif de 720 px, il avance d'exactement 720 px → boucle invisible) ;
   calque 2 : le métal, fixe (clair en haut, plus profond en bas) */
.bg-rk.r1{background-image:linear-gradient(90deg,rgba(255,250,225,0) 0,rgba(255,250,225,0) 300px,rgba(255,250,225,.35) 330px,rgba(255,252,235,.95) 360px,rgba(255,250,225,.35) 390px,rgba(255,250,225,0) 420px,rgba(255,250,225,0) 720px),linear-gradient(180deg,#ffe58a 0%,#f5c330 45%,#d99a12 100%)}
.bg-rk.r2{background-image:linear-gradient(90deg,rgba(255,255,255,0) 0,rgba(255,255,255,0) 300px,rgba(255,255,255,.35) 330px,rgba(255,255,255,.95) 360px,rgba(255,255,255,.35) 390px,rgba(255,255,255,0) 420px,rgba(255,255,255,0) 720px),linear-gradient(180deg,#f4f6fa 0%,#cfd6e2 50%,#a7b1c3 100%)}
.bg-rk.r3{background-image:linear-gradient(90deg,rgba(255,235,215,0) 0,rgba(255,235,215,0) 300px,rgba(255,235,215,.35) 330px,rgba(255,240,225,.95) 360px,rgba(255,235,215,.35) 390px,rgba(255,235,215,0) 420px,rgba(255,235,215,0) 720px),linear-gradient(180deg,#f4b27a 0%,#d5803f 50%,#a3561f 100%)}
@keyframes bgRkShine{from{background-position:-360px 0,0 0}to{background-position:360px 0,0 0}}`;
  (document.head || document.documentElement).appendChild(st);
  const key = n => String(n || '').trim().toLowerCase();
  let top = {}; try { top = JSON.parse(P.get('bg-top3', '{}')) || {}; } catch (e) { top = {}; }
  let re = null;
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function build() {
    const names = Object.keys(top).filter(n => n.length >= 2).sort((a, b) => b.length - a.length);
    re = names.length ? new RegExp(`(?<![\\p{L}\\p{N}_])(${names.map(esc).join('|')})(?![\\p{L}\\p{N}_])(?!['’]s\\s*Games)`, 'giu') : null;
  }
  const SKIP = 'script,style,textarea,input,select,option,svg,canvas,title,noscript,.bg-rk,[contenteditable="true"],.wordmark,.logo,.logo-t,.logo-q,.brand,[data-norank]';
  let busy = false;
  function wrapText(tn) {
    if (!re || !tn.nodeValue || tn.nodeValue.length > 400) return;
    const par = tn.parentElement; if (!par || par.closest(SKIP)) return;
    const txt = tn.nodeValue; re.lastIndex = 0; if (!re.test(txt)) return; re.lastIndex = 0;
    const frag = document.createDocumentFragment(); let last = 0, m;
    while ((m = re.exec(txt))) {
      if (m.index > last) frag.appendChild(document.createTextNode(txt.slice(last, m.index)));
      const sp = document.createElement('span'); sp.className = 'bg-rk r' + top[key(m[1])]; sp.textContent = m[1]; sp.style.animationDelay = (-(performance.timeOrigin + performance.now()) % 7200 / 1000).toFixed(3) + 's'; frag.appendChild(sp);
      last = m.index + m[1].length;
    }
    if (last < txt.length) frag.appendChild(document.createTextNode(txt.slice(last)));
    tn.parentNode.replaceChild(frag, tn);
  }
  function scan(root) {
    if (!re || !root) return;
    if (root.nodeType === 3) { wrapText(root); return; }
    if (root.nodeType !== 1 || root.closest && root.closest(SKIP)) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), list = [];
    while (w.nextNode()) list.push(w.currentNode);
    list.forEach(wrapText);
  }
  let queue = new Set(), raf = 0;
  const flush = () => { raf = 0; busy = true; try { queue.forEach(n => { if (n.isConnected) scan(n); }); } finally { queue.clear(); busy = false; } };
  const mo = new MutationObserver(ms => {
    if (busy || !re) return;
    ms.forEach(m => { if (m.type === 'characterData') queue.add(m.target); else m.addedNodes.forEach(n => queue.add(n)); });
    if (queue.size && !raf) raf = requestAnimationFrame(flush);
  });
  function unwrapAll() { document.querySelectorAll('.bg-rk').forEach(sp => { sp.replaceWith(document.createTextNode(sp.textContent)); }); }
  function apply(t) {
    const same = JSON.stringify(t) === JSON.stringify(top);
    top = t; P.set('bg-top3', JSON.stringify(t)); build();
    if (!same) { busy = true; try { unwrapAll(); document.body && document.body.normalize(); } finally { busy = false; } }
    busy = true; try { scan(document.body); } finally { busy = false; }
  }
  // classement : celui de shared.js s'il est là, sinon un calcul simple (Quoridor)
  async function load() {
    try {
      let rows;
      if (P.fetchMatches && P.ranking) rows = P.ranking(await P.fetchMatches());
      else {
        const d = await P.fbReq('/matches', 'GET'), tab = new Map();
        Object.values(d || {}).forEach(m => {
          if (!m || !Array.isArray(m.p) || !Number.isInteger(m.w)) return;
          const wa = Array.isArray(m.wa) && m.wa.length ? m.wa : [m.w], seen = new Set();
          m.p.forEach((n0, i) => { const n = String(n0).slice(0, 14), k = key(n); if (seen.has(k)) return; seen.add(k); const r = tab.get(k) || { name: n, w: 0, g: 0 }; r.g++; if (wa.includes(i)) r.w++; tab.set(k, r); });
        });
        rows = [...tab.values()].sort((a, b) => b.w - a.w || (b.w / b.g) - (a.w / a.g) || b.g - a.g);
      }
      const t = {}; rows.slice(0, 3).forEach((r, i) => { if (r.w > 0) t[key(r.name)] = i + 1; });
      apply(t);
    } catch (e) {}
  }
  const start = () => {
    build(); if (document.body) { busy = true; try { scan(document.body); } finally { busy = false; } mo.observe(document.body, { childList: true, subtree: true, characterData: true }); }
    load(); setInterval(() => { if (!document.hidden) load(); }, 60000);
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
})();
