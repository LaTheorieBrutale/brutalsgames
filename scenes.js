/* =========================================================
   GÉNÉRATEUR DE SCÈNES CARTOON + DIFFÉRENCES
   Coordonnées logiques 640×480. Tout est tiré d'une graine : deux joueurs
   avec la même graine voient exactement les mêmes images.
   ========================================================= */
(function () {
'use strict';
const W = 640, H = 480, INK = '#120a1e';
function rng(seed) { // mulberry32
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const pick = (r, arr) => arr[r() * arr.length | 0];
const rr = (r, a, b) => a + r() * (b - a);

/* ---------- Outils de dessin (contours épais) ---------- */
let LW = 4;
// Volume : chaque forme pleine reçoit un dégradé lumière (haut-gauche) → ombre (bas-droite), découpé à sa forme
let SHADE = 0, SHADE_BASE = false;
function shade(g) {
  const R = SHADE, cy = SHADE_BASE ? -R : 0;
  g.save(); g.clip();
  const gr = g.createLinearGradient(-R * 0.7, cy - R, R * 0.7, cy + R);
  gr.addColorStop(0, 'rgba(255,255,255,.30)'); gr.addColorStop(0.45, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(25,5,45,.26)');
  g.fillStyle = gr; g.fillRect(-R * 2.2, cy - R * 2.4, R * 4.4, R * 4.8);
  g.restore();
}
function fillStroke(g, fill) { if (fill) { g.fillStyle = fill; g.fill(); if (SHADE && typeof fill === 'string' && fill !== INK && fill[0] === '#') shade(g); } g.lineWidth = LW; g.strokeStyle = INK; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); }
function ell(g, x, y, rx, ry, fill, rot = 0) { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); fillStroke(g, fill); }
function circ(g, x, y, r, fill) { ell(g, x, y, r, r, fill); }
function dot(g, x, y, r, fill) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); }
function rrect(g, x, y, w, h, rad, fill) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, rad) : g.rect(x, y, w, h); fillStroke(g, fill); }
function poly(g, pts, fill) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); fillStroke(g, fill); }
function line(g, pts, w = LW) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.lineWidth = w; g.strokeStyle = INK; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); }
function shine(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, rx, ry, -0.5, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,.55)'; g.fill(); }
function eyes(g, x, y, sp, r, look = 0) { for (const s of [-1, 1]) { circ(g, x + s * sp, y, r, '#fff'); dot(g, x + s * sp + look * r * 0.35, y + r * 0.1, r * 0.5, INK); dot(g, x + s * sp + look * r * 0.35 - r * 0.2, y - r * 0.15, r * 0.18, '#fff'); } }

/* ---------- Bibliothèque d'objets ----------
   Chaque objet : r (rayon de collision à l'échelle 1), cols (palettes), nv (nb de variantes),
   flip (asymétrique), mut (mutations possibles), draw(g, o). Coordonnées locales : (0,0) = centre,
   ou base pour les objets posés (base:true → dessin au-dessus de y=0). */
const K = {};
// --- Commun : ciel et nature ---
K.sun = { r: 38, cols: ['#ffd23f', '#ffb13d'], nv: 2, mut: ['variant', 'color'],
  draw(g, o) {
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g.save(); g.rotate(a); poly(g, [[-6, -34], [6, -34], [0, -48]], o.col); g.restore(); }
    circ(g, 0, 0, 30, o.col);
    if (o.v === 0) { dot(g, -10, -5, 3.5, INK); dot(g, 10, -5, 3.5, INK); }
    else { rrect(g, -22, -11, 18, 11, 4, INK); rrect(g, 4, -11, 18, 11, 4, INK); line(g, [[-4, -7], [4, -7]], 3); }
    g.beginPath(); g.arc(0, 4, 12, 0.2, Math.PI - 0.2); g.lineWidth = 3.5; g.strokeStyle = INK; g.stroke();
    dot(g, -18, 6, 4, 'rgba(255,120,120,.5)'); dot(g, 18, 6, 4, 'rgba(255,120,120,.5)');
  } };
K.cloud = { r: 36, cols: ['#ffffff', '#eaf2ff'], nv: 2, flip: true, mut: ['variant', 'remove', 'add', 'scale'],
  draw(g, o) {
    const blobs = o.v ? [[-26, 6, 16], [-8, -6, 20], [14, -2, 18], [30, 8, 13]] : [[-20, 4, 16], [0, -6, 21], [22, 4, 15]];
    const x0 = blobs[0][0], x1 = blobs[blobs.length - 1][0];
    g.lineWidth = LW * 2; g.strokeStyle = INK;
    for (const [x, y, r] of blobs) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); }
    g.beginPath(); g.rect(x0, 4, x1 - x0, 16); g.stroke();
    g.fillStyle = o.col;
    for (const [x, y, r] of blobs) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
    g.fillRect(x0, 4, x1 - x0, 16);
    shine(g, -4, -14, 8, 4);
  } };
K.tree = { r: 54, base: true, cols: ['#5ab84a', '#7ac83a', '#3f9a5a'], nv: 2, flip: true, mut: ['variant', 'color', 'flip', 'scale'],
  draw(g, o) {
    poly(g, [[-9, 0], [-7, -50], [7, -50], [9, 0]], '#9a6a3a');
    circ(g, -22, -66, 24, o.col); circ(g, 22, -62, 22, o.col); circ(g, 0, -88, 28, o.col);
    dot(g, -22, -66, 21, o.col); dot(g, 22, -62, 19, o.col); dot(g, 0, -88, 25, o.col);
    shine(g, -8, -100, 9, 5);
    if (o.v) for (const [x, y] of [[-24, -62], [14, -86], [24, -58], [-4, -76]]) circ(g, x, y, 5.5, '#ff4a4a');
  } };
K.pine = { r: 50, base: true, cols: ['#2f8a5a', '#3fa04a', '#2a6a5a'], nv: 2, mut: ['color', 'variant', 'scale', 'remove'],
  draw(g, o) {
    rrect(g, -7, -18, 14, 18, 3, '#8a5a3a');
    for (const [y, w] of [[-18, 34], [-48, 28], [-76, 20]]) {
      poly(g, [[-w, y], [w, y], [0, y - 40]], o.col);
      if (o.v) poly(g, [[-w * 0.55, y - 18], [w * 0.55, y - 18], [0, y - 40]], '#ffffff');
    }
  } };
K.house = { r: 52, base: true, cols: ['#e84a4a', '#4a7ad8', '#8a5ad8', '#e8a03a'], nv: 2, mut: ['color', 'variant'],
  draw(g, o) {
    if (o.v) rrect(g, 16, -92, 12, 26, 2, '#b86a4a');
    rrect(g, -38, -56, 76, 56, 3, '#fff2d6');
    poly(g, [[-46, -54], [0, -96], [46, -54]], o.col);
    rrect(g, -10, -30, 20, 30, 3, '#9a6a3a'); dot(g, 5, -15, 2, INK);
    rrect(g, -32, -44, 16, 14, 2, '#8ad8ff'); if (o.v) rrect(g, 16, -44, 16, 14, 2, '#8ad8ff');
  } };
K.fence = { r: 42, base: true, cols: ['#c8955a', '#e8d0a0'], nv: 2, mut: ['variant', 'remove', 'color'],
  draw(g, o) {
    const n = o.v ? 4 : 3, w = 76, step = w / (n - 1);
    rrect(g, -42, -34, 84, 8, 3, o.col); rrect(g, -42, -16, 84, 8, 3, o.col);
    for (let i = 0; i < n; i++) poly(g, [[-38 + i * step - 6, 0], [-38 + i * step - 6, -40], [-38 + i * step, -48], [-38 + i * step + 6, -40], [-38 + i * step + 6, 0]], o.col);
  } };
K.sheep = { r: 32, base: true, cols: ['#ffffff', '#f0e6d0', '#4a4a56'], nv: 1, flip: true, mut: ['color', 'flip', 'remove'],
  draw(g, o) {
    for (const x of [-14, -4, 8, 16]) rrect(g, x - 3, -14, 6, 14, 2, '#2a2a36');
    const blobs = [[-16, -26, 12], [-4, -32, 13], [10, -30, 12], [18, -22, 10], [-2, -18, 13], [-18, -16, 9]];
    for (const [x, y, r] of blobs) circ(g, x, y, r, o.col);
    for (const [x, y, r] of blobs) dot(g, x, y, r - 2, o.col);
    ell(g, -26, -30, 9, 11, '#2a2a36', 0.3); dot(g, -29, -32, 2, '#fff'); ell(g, -24, -40, 5, 3, '#2a2a36', -0.4);
  } };
K.flower = { r: 17, base: true, cols: ['#ff5a8a', '#ffd23f', '#ffffff', '#8a6aff', '#ff8a3a'], nv: 2, mut: ['color', 'variant', 'remove', 'add'],
  draw(g, o) {
    line(g, [[0, 0], [0, -24]], 4); g.save(); g.strokeStyle = '#4aa84a'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -24); g.stroke(); g.restore();
    ell(g, 6, -10, 6, 3, '#5ab84a', -0.5);
    if (o.v === 0) { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; circ(g, Math.cos(a) * 8, -30 + Math.sin(a) * 8, 6, o.col); } circ(g, 0, -30, 5, '#ffb13d'); }
    else { g.beginPath(); g.moveTo(-10, -36); g.lineTo(-5, -28); g.lineTo(0, -38); g.lineTo(5, -28); g.lineTo(10, -36); g.quadraticCurveTo(12, -18, 0, -20); g.quadraticCurveTo(-12, -18, -10, -36); fillStroke(g, o.col); }
  } };
K.grass = { r: 15, base: true, cols: ['#5ab84a', '#7ac83a', '#3f9a5a'], nv: 2, mut: ['variant', 'remove', 'add', 'color'],
  draw(g, o) {
    const blades = o.v ? [[-12, -14, -0.5], [-6, -22, -0.2], [0, -28, 0], [6, -22, 0.2], [12, -14, 0.5]] : [[-7, -18, -0.35], [0, -26, 0], [7, -18, 0.35]];
    for (const [x, h, a] of blades) { g.beginPath(); g.moveTo(x - 3, 0); g.quadraticCurveTo(x + a * 10, h * 0.5, x + a * 16, h); g.quadraticCurveTo(x + a * 6 + 3, h * 0.5, x + 3, 0); g.closePath(); fillStroke(g, o.col); }
  } };
K.rock = { r: 21, base: true, cols: ['#9a9aa8', '#b8a890', '#7f8a98', '#c8b8a0'], nv: 2, mut: ['variant', 'remove', 'add', 'color', 'scale'],
  draw(g, o) {
    const one = (x, s) => { poly(g, [[x - 18 * s, 0], [x - 16 * s, -14 * s], [x - 6 * s, -24 * s], [x + 10 * s, -22 * s], [x + 18 * s, -10 * s], [x + 18 * s, 0]], o.col); shine(g, x - 6 * s, -16 * s, 5 * s, 3 * s); };
    if (o.v) { one(-10, 0.75); one(10, 0.6); } else one(0, 1);
  } };
K.butterfly = { r: 19, cols: ['#ff7aa0', '#5ad8ff', '#ffd23f', '#c46bff'], nv: 2, mut: ['color', 'variant', 'remove', 'add'],
  draw(g, o) {
    for (const s of [-1, 1]) { ell(g, s * 10, -6, 10, 12, o.col, s * 0.4); ell(g, s * 8, 9, 7, 8, o.col, -s * 0.4); if (o.v) { dot(g, s * 11, -7, 3.5, '#fff'); dot(g, s * 8, 9, 2.5, '#fff'); } }
    ell(g, 0, 2, 3.5, 13, '#3a2a4a'); line(g, [[-1, -10], [-6, -20]], 2.5); line(g, [[1, -10], [6, -20]], 2.5);
  } };
K.bird = { r: 19, cols: ['#ffffff', '#5a6a8a', '#ff8a3a'], nv: 2, flip: true, mut: ['variant', 'remove', 'add', 'color', 'flip'],
  draw(g, o) {
    const up = o.v ? -14 : 6;
    g.beginPath(); g.moveTo(-26, up); g.quadraticCurveTo(-12, up - 10, -2, 0); g.quadraticCurveTo(12, up - 10, 26, up); g.quadraticCurveTo(12, up - 2, 0, 6); g.quadraticCurveTo(-12, up - 2, -26, up); fillStroke(g, o.col);
    ell(g, -2, 2, 7, 5, o.col); poly(g, [[-9, 2], [-15, 4], [-9, 5]], '#ffb13d'); dot(g, -5, 0, 1.6, INK);
  } };
K.log = { r: 27, base: true, cols: ['#9a6a3a', '#b8804a'], nv: 1, flip: true, mut: ['remove', 'add', 'scale'],
  draw(g, o) { rrect(g, -26, -20, 48, 20, 8, o.col); ell(g, 22, -10, 7, 10, '#e8c890'); line(g, [[20, -12], [24, -8]], 2); line(g, [[-14, -14], [2, -14]], 2.5); } };
// --- Plage ---
K.boat = { r: 42, base: true, cols: ['#ffffff', '#ff5a6a', '#ffd23f', '#5ad8ff'], nv: 2, flip: true, mut: ['color', 'flip', 'variant'],
  draw(g, o) {
    line(g, [[0, -14], [0, -70]], 5);
    poly(g, [[3, -68], [3, -18], [30, -18]], o.col);
    if (o.v) poly(g, [[-3, -60], [-3, -20], [-22, -20]], o.col); else poly(g, [[0, -70], [16, -64], [0, -58]], '#ff5a6a');
    poly(g, [[-36, -16], [36, -16], [26, 0], [-28, 0]], '#c8704a'); line(g, [[-30, -8], [30, -8]], 2.5);
  } };
K.palm = { r: 56, base: true, cols: ['#4ab84a', '#3fa06a'], nv: 2, flip: true, mut: ['flip', 'variant', 'color'],
  draw(g, o) {
    for (let i = 0; i < 6; i++) { const y = -i * 16; rrect(g, -8 + i * 2.5, y - 16, 16, 17, 4, '#c8955a'); }
    for (const [a, l] of [[-2.6, 40], [-2.0, 44], [-1.2, 42], [-0.5, 40], [0.1, 36]]) {
      g.save(); g.translate(14, -98); g.rotate(a); ell(g, l / 2, 0, l / 2, 9, o.col); line(g, [[4, 0], [l - 4, 0]], 2); g.restore();
    }
    if (o.v) for (const [x, y] of [[8, -90], [18, -88], [12, -84]]) circ(g, x, y, 6, '#8a5a2a');
  } };
K.parasol = { r: 42, base: true, cols: ['#ff5a6a', '#5ad8ff', '#ffd23f', '#86f2a0'], nv: 2, flip: true, mut: ['color', 'variant', 'flip', 'remove'],
  draw(g, o) {
    g.save(); g.rotate(0.12);
    line(g, [[0, 0], [0, -70]], 5);
    const n = o.v ? 6 : 4;
    g.beginPath(); g.moveTo(-44, -64); g.quadraticCurveTo(0, -112, 44, -64); g.closePath(); fillStroke(g, '#ffffff');
    for (let i = 0; i < n; i += 2) { const x0 = -44 + i * 88 / n, x1 = x0 + 88 / n; g.beginPath(); g.moveTo(0, -92); g.lineTo(x0, -64); g.lineTo(x1, -64); g.closePath(); g.fillStyle = o.col; g.fill(); }
    g.beginPath(); g.moveTo(-44, -64); g.quadraticCurveTo(0, -112, 44, -64); g.closePath(); fillStroke(g, null);
    for (let i = 1; i < n; i++) line(g, [[0, -92], [-44 + i * 88 / n, -64]], 2.5);
    g.restore();
  } };
K.sandcastle = { r: 36, base: true, cols: ['#ff5a6a', '#5ad8ff', '#86f2a0'], nv: 2, mut: ['color', 'variant'],
  draw(g, o) {
    const sand = '#e8c878';
    rrect(g, -32, -30, 64, 30, 3, sand);
    const towers = o.v ? [-24, 0, 24] : [-22, 22];
    for (const x of towers) { rrect(g, x - 9, -52, 18, 24, 2, sand); for (const dx of [-7, 0, 7]) rrect(g, x + dx - 3, -58, 6, 7, 1, sand); }
    rrect(g, -6, -16, 12, 16, 6, '#b89048');
    line(g, [[towers[0], -58], [towers[0], -76]], 2.5); poly(g, [[towers[0], -76], [towers[0] + 14, -71], [towers[0], -66]], o.col);
  } };
K.ball = { r: 19, base: true, cols: ['#ff5a6a', '#5ad8ff', '#ffd23f'], nv: 1, mut: ['color', 'remove', 'add', 'scale'],
  draw(g, o) {
    circ(g, 0, -17, 17, '#ffffff');
    g.save(); g.beginPath(); g.arc(0, -17, 15.5, 0, Math.PI * 2); g.clip();
    g.fillStyle = o.col; g.beginPath(); g.moveTo(0, -17); g.arc(0, -17, 18, -1.2, -0.2); g.fill(); g.beginPath(); g.moveTo(0, -17); g.arc(0, -17, 18, 0.9, 1.9); g.fill(); g.beginPath(); g.moveTo(0, -17); g.arc(0, -17, 18, 3, 4); g.fill();
    g.restore(); circ(g, 0, -17, 17, null); dot(g, 0, -17, 3, '#fff'); shine(g, -6, -25, 4, 2.5);
  } };
K.bucket = { r: 20, base: true, cols: ['#ff5a6a', '#5ad8ff', '#86f2a0', '#ffd23f'], nv: 1, mut: ['color', 'remove', 'add'],
  draw(g, o) { g.beginPath(); g.arc(0, -28, 14, Math.PI, 0); g.lineWidth = 3; g.strokeStyle = INK; g.stroke(); poly(g, [[-15, -28], [15, -28], [11, 0], [-11, 0]], o.col); rrect(g, -16, -31, 32, 6, 2, o.col); } };
// --- Camping ---
K.tent = { r: 52, base: true, cols: ['#ff8a3a', '#4a9ad8', '#e84a4a', '#86c84a'], nv: 2, mut: ['color', 'variant'],
  draw(g, o) {
    poly(g, [[-50, 0], [0, -70], [50, 0]], o.col);
    if (o.v === 0) poly(g, [[-16, 0], [0, -40], [16, 0]], '#3a2a20'); else { poly(g, [[-16, 0], [0, -40], [-4, 0]], '#3a2a20'); poly(g, [[0, -40], [22, 0], [10, 0]], o.col); }
    line(g, [[0, -70], [0, -80]], 3); poly(g, [[0, -80], [12, -76], [0, -72]], '#ffd23f');
  } };
K.fire = { r: 28, base: true, cols: ['#ff8a3a'], nv: 2, mut: ['variant'],
  draw(g, o) {
    for (const [x, y] of [[-14, -4], [14, -4], [0, -2]]) circ(g, x, y, 5, '#8a8a96');
    g.save(); g.rotate(0.35); rrect(g, -22, -10, 44, 9, 4, '#8a5a3a'); g.restore(); g.save(); g.rotate(-0.35); rrect(g, -22, -10, 44, 9, 4, '#9a6a3a'); g.restore();
    if (o.v === 0) { g.beginPath(); g.moveTo(0, -54); g.quadraticCurveTo(22, -24, 8, -8); g.lineTo(-8, -8); g.quadraticCurveTo(-22, -24, 0, -54); fillStroke(g, '#ff8a3a'); g.beginPath(); g.moveTo(0, -34); g.quadraticCurveTo(10, -18, 4, -9); g.lineTo(-4, -9); g.quadraticCurveTo(-10, -18, 0, -34); fillStroke(g, '#ffe46a'); }
    else for (let i = 0; i < 3; i++) circ(g, -4 + i * 5, -22 - i * 12, 5 + i * 2, '#c8c8d0');
  } };
// --- Espace ---
K.planet = { r: 36, cols: ['#ff9a5a', '#5ad8ff', '#c46bff', '#86f2a0', '#ffd23f'], nv: 2, mut: ['color', 'variant', 'scale', 'remove'],
  draw(g, o) {
    if (o.v) { g.save(); g.beginPath(); g.ellipse(0, 0, 46, 12, -0.3, Math.PI, Math.PI * 2); g.lineWidth = 9; g.strokeStyle = INK; g.stroke(); g.lineWidth = 4; g.strokeStyle = '#ffe6a0'; g.stroke(); g.restore(); }
    circ(g, 0, 0, 28, o.col);
    g.save(); g.beginPath(); g.arc(0, 0, 26, 0, Math.PI * 2); g.clip(); g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(-30, 4, 60, 8); g.fillRect(-30, -14, 60, 5); g.restore();
    shine(g, -10, -12, 7, 4);
    if (o.v) { g.save(); g.beginPath(); g.ellipse(0, 0, 46, 12, -0.3, 0, Math.PI); g.lineWidth = 9; g.strokeStyle = INK; g.stroke(); g.lineWidth = 4; g.strokeStyle = '#ffe6a0'; g.stroke(); g.restore(); }
  } };
K.rocket = { r: 42, cols: ['#ff5a6a', '#5ad8ff', '#ffd23f'], nv: 2, flip: true, mut: ['color', 'variant', 'flip'],
  draw(g, o) {
    g.save(); g.rotate(0.5);
    if (o.v === 0) { g.beginPath(); g.moveTo(-9, 26); g.quadraticCurveTo(0, 56, 9, 26); fillStroke(g, '#ffb13d'); }
    for (const s of [-1, 1]) poly(g, [[s * 12, 6], [s * 24, 26], [s * 10, 24]], o.col);
    g.beginPath(); g.moveTo(-13, 26); g.lineTo(-13, -14); g.quadraticCurveTo(0, -46, 13, -14); g.lineTo(13, 26); g.closePath(); fillStroke(g, '#f0f0f8');
    circ(g, 0, -6, 7, '#8ad8ff'); g.beginPath(); g.moveTo(-11, -22); g.quadraticCurveTo(0, -46, 11, -22); g.closePath(); fillStroke(g, o.col);
    g.restore();
  } };
K.ufo = { r: 38, cols: ['#b8c0d8', '#ffd23f', '#86f2a0'], nv: 2, mut: ['color', 'variant', 'remove'],
  draw(g, o) {
    ell(g, 0, -10, 16, 14, 'rgba(160,230,255,.7)');
    ell(g, 0, 0, 38, 11, o.col);
    const n = o.v ? 5 : 3;
    for (let i = 0; i < n; i++) circ(g, -24 + i * (48 / (n - 1)), 1, 3.5, '#ffe46a');
  } };
K.alien = { r: 25, base: true, cols: ['#86f2a0', '#c46bff', '#5ad8ff', '#ffd23f'], nv: 3, mut: ['color', 'variant', 'remove', 'add'],
  draw(g, o) {
    for (const s of [-1, 1]) { line(g, [[s * 8, -38], [s * 14, -52]], 3); circ(g, s * 14, -53, 4, o.col); }
    g.beginPath(); g.moveTo(-18, 0); g.quadraticCurveTo(-22, -46, 0, -44); g.quadraticCurveTo(22, -46, 18, 0); g.closePath(); fillStroke(g, o.col);
    const n = o.v + 1;
    for (let i = 0; i < n; i++) { const x = n === 1 ? 0 : -8 + i * (16 / (n - 1)); circ(g, x, -28, n === 1 ? 8 : 5, '#fff'); dot(g, x, -27, n === 1 ? 4 : 2.5, INK); }
    g.beginPath(); g.arc(0, -16, 6, 0.2, Math.PI - 0.2); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
  } };
K.flag = { r: 30, base: true, cols: ['#ff5a6a', '#5ad8ff', '#ffd23f', '#86f2a0'], nv: 1, flip: true, mut: ['color', 'remove'],
  draw(g, o) { line(g, [[0, 0], [0, -62]], 4); poly(g, [[2, -62], [32, -56], [2, -44]], o.col); circ(g, 0, -64, 3, '#ffd23f'); } };
// --- Montagne ---
K.snowman = { r: 42, base: true, cols: ['#ff5a6a', '#5ad8ff', '#86f2a0', '#ffd23f'], nv: 2, mut: ['color', 'variant', 'remove'],
  draw(g, o) {
    circ(g, 0, -20, 22, '#ffffff'); circ(g, 0, -56, 16, '#ffffff');
    dot(g, 0, -24, 2.6, INK); dot(g, 0, -14, 2.6, INK);
    rrect(g, -17, -44, 34, 8, 4, o.col); rrect(g, 6, -42, 8, 18, 3, o.col);
    dot(g, -6, -60, 2.4, INK); dot(g, 6, -60, 2.4, INK); poly(g, [[0, -56], [14, -53], [0, -51]], '#ff8a3a');
    if (o.v === 0) { rrect(g, -15, -76, 30, 6, 2, '#2a2a36'); rrect(g, -10, -96, 20, 22, 2, '#2a2a36'); }
    else { g.beginPath(); g.arc(0, -70, 14, Math.PI, 0); fillStroke(g, o.col); circ(g, 0, -86, 5, '#ffffff'); }
  } };
K.penguin = { r: 27, base: true, cols: ['#ff5a6a', '#5ad8ff', '#ffd23f'], nv: 2, flip: true, mut: ['flip', 'variant', 'color', 'remove', 'add'],
  draw(g, o) {
    ell(g, -6, -1, 7, 3.5, '#ff9a3a'); ell(g, 6, -1, 7, 3.5, '#ff9a3a');
    ell(g, 0, -24, 17, 24, '#2a2a36'); ell(g, 2, -20, 11, 17, '#ffffff');
    ell(g, -16, -24, 5, 12, '#2a2a36', 0.3);
    dot(g, -4, -38, 2.4, INK); dot(g, 6, -38, 2.4, INK); poly(g, [[-2, -34], [8, -34], [2, -28]], '#ff9a3a');
    if (o.v) rrect(g, -14, -31, 30, 6, 3, o.col);
  } };
K.sled = { r: 30, base: true, cols: ['#e84a4a', '#4a7ad8'], nv: 1, flip: true, mut: ['color', 'remove'],
  draw(g, o) { rrect(g, -26, -18, 48, 10, 3, o.col); line(g, [[-24, -8], [-24, -2]], 3); line(g, [[18, -8], [18, -2]], 3); g.beginPath(); g.moveTo(-30, -2); g.lineTo(22, -2); g.quadraticCurveTo(34, -2, 32, -14); g.lineWidth = 4; g.strokeStyle = INK; g.stroke(); } };
K.snowflake = { r: 15, cols: ['#ffffff', '#cfefff'], nv: 1, mut: ['remove', 'add', 'scale'],
  draw(g, o) {
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, x = Math.cos(a) * 12, y = Math.sin(a) * 12; line(g, [[0, 0], [x, y]], 6); }
    g.save(); g.strokeStyle = o.col; g.lineCap = 'round'; g.lineWidth = 3;
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 12, Math.sin(a) * 12); g.stroke(); }
    g.restore();
  } };
K.star = { r: 11, cols: ['#fff6b0', '#ffd0f0', '#b8f0ff'], nv: 1, mut: ['remove', 'add', 'color'],
  draw(g, o) { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4.5 : 10; p.push([Math.cos(a) * r, Math.sin(a) * r]); } LW = 3; poly(g, p, o.col); LW = 4; } };
K.mushroom = { r: 17, base: true, cols: ['#e84a4a', '#4ab8e8', '#e8c84a', '#b84ae8'], nv: 2, mut: ['color', 'variant', 'remove', 'add'],
  draw(g, o) {
    rrect(g, -6, -18, 12, 18, 4, '#f4e7c8');
    g.beginPath(); g.moveTo(-18, -16); g.quadraticCurveTo(0, -46, 18, -16); g.closePath(); fillStroke(g, o.col);
    if (o.v === 0) { dot(g, -7, -24, 3, '#fff'); dot(g, 5, -28, 2.5, '#fff'); dot(g, 9, -20, 2, '#fff'); }
  } };
// --- Fond marin ---
K.fish = { r: 25, cols: ['#ff9a3c', '#5ad8ff', '#ffcf3f', '#ff7aa0', '#86f2a0'], nv: 3, flip: true, mut: ['color', 'variant', 'flip', 'remove', 'add'],
  draw(g, o) {
    poly(g, [[16, 0], [32, -13], [32, 13]], o.col);
    ell(g, 0, 0, 22, 15, o.col);
    if (o.v === 1) { line(g, [[-2, -13], [-2, 13]], 3.5); line(g, [[8, -11], [8, 11]], 3.5); }
    if (o.v === 2) { dot(g, 2, -5, 3, 'rgba(0,0,0,.25)'); dot(g, 9, 3, 3, 'rgba(0,0,0,.25)'); dot(g, -3, 6, 2.5, 'rgba(0,0,0,.25)'); }
    poly(g, [[-2, -14], [8, -22], [10, -12]], o.col);
    circ(g, -11, -3, 5, '#fff'); dot(g, -12, -3, 2.5, INK);
    line(g, [[-20, 4], [-15, 6]], 2.5);
  } };
K.seaweed = { r: 32, base: true, cols: ['#3fae5a', '#5ad87a', '#2f8a7a', '#8ad84a'], nv: 2, flip: true, mut: ['color', 'variant', 'flip'],
  draw(g, o) {
    const h = o.v ? 110 : 75;
    g.beginPath(); g.moveTo(-6, 0);
    for (let y = 0; y > -h; y -= 15) g.quadraticCurveTo(-14 + (y % 30 ? 0 : 20), y - 7, -6 + (y % 30 ? 10 : 0), y - 15);
    g.lineTo(2, -h); for (let y = -h; y < 0; y += 15) g.quadraticCurveTo(10 - (y % 30 ? 0 : 18), y + 7, 6, y + 15);
    g.closePath(); fillStroke(g, o.col);
  } };
K.bubble = { r: 11, cols: ['#d8f6ff'], nv: 1, mut: ['remove', 'add', 'scale'],
  draw(g, o) { g.beginPath(); g.arc(0, 0, 9, 0, Math.PI * 2); g.fillStyle = 'rgba(220,250,255,.35)'; g.fill(); LW = 3; g.lineWidth = LW; g.strokeStyle = INK; g.stroke(); LW = 4; dot(g, -3, -3, 2.5, '#fff'); } };
K.shell = { r: 17, base: true, cols: ['#ffc0d0', '#ffe0b0', '#d0c0ff'], nv: 1, flip: true, mut: ['color', 'remove', 'add'],
  draw(g, o) { g.beginPath(); g.moveTo(-16, 0); g.quadraticCurveTo(-16, -26, 0, -26); g.quadraticCurveTo(16, -26, 16, 0); g.closePath(); fillStroke(g, o.col); for (const x of [-8, 0, 8]) line(g, [[x * 0.4, -2], [x, -22]], 2.5); rrect(g, -5, -3, 10, 6, 2, o.col); } };
K.starfish = { r: 19, base: true, cols: ['#ff7a5a', '#ffcf3f', '#c46bff', '#5ad8ff'], nv: 1, mut: ['color', 'remove', 'add'],
  draw(g, o) { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 7 : 18; p.push([Math.cos(a) * r, -12 + Math.sin(a) * r]); } poly(g, p, o.col); dot(g, -2, -14, 1.6, INK); dot(g, 3, -14, 1.6, INK); } };
K.chest = { r: 38, base: true, cols: ['#a8643a'], nv: 2, mut: ['variant'],
  draw(g, o) {
    rrect(g, -32, -34, 64, 34, 4, o.col); line(g, [[-32, -18], [32, -18]], 3);
    if (o.v === 0) { g.beginPath(); g.moveTo(-32, -34); g.quadraticCurveTo(0, -56, 32, -34); g.closePath(); fillStroke(g, '#c47a4a'); }
    else { g.beginPath(); g.moveTo(-32, -34); g.lineTo(-26, -66); g.quadraticCurveTo(6, -76, 30, -62); g.lineTo(32, -34); fillStroke(g, '#c47a4a'); for (let i = 0; i < 5; i++) circ(g, -18 + i * 9, -38 - (i % 2) * 5, 6, '#ffcf3f'); }
    rrect(g, -6, -26, 12, 12, 2, '#ffcf3f');
  } };
K.crab = { r: 23, base: true, cols: ['#ff5a4a', '#ff9a3c', '#c44aff'], nv: 2, mut: ['color', 'variant', 'remove'],
  draw(g, o) {
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) line(g, [[s * 10, -8], [s * (18 + i * 3), -2 + i * 2], [s * (22 + i * 3), 2 + i * 2]], 3);
    for (const s of [-1, 1]) { const up = o.v === 0 ? -34 : -18; line(g, [[s * 12, -14], [s * 20, up + 6]], 4); circ(g, s * 22, up, 8, o.col); line(g, [[s * 22, up], [s * 28, up - 6]], 2.5); }
    ell(g, 0, -12, 18, 12, o.col); line(g, [[-5, -22], [-6, -30]], 2.5); line(g, [[5, -22], [6, -30]], 2.5);
    circ(g, -6, -31, 3.5, '#fff'); circ(g, 6, -31, 3.5, '#fff'); dot(g, -6, -31, 1.6, INK); dot(g, 6, -31, 1.6, INK);
  } };
K.jelly = { r: 25, cols: ['#ffb0f0', '#b0d8ff', '#d0ffb0', '#ffd8a0'], nv: 1, mut: ['color', 'remove', 'add'],
  draw(g, o) {
    for (let i = 0; i < 4; i++) { const x = -12 + i * 8; line(g, [[x, 2], [x - 4, 14], [x + 2, 24], [x - 2, 32]], 3); }
    g.beginPath(); g.moveTo(-20, 4); g.quadraticCurveTo(-22, -24, 0, -24); g.quadraticCurveTo(22, -24, 20, 4); g.closePath(); fillStroke(g, o.col);
    dot(g, -6, -8, 2.4, INK); dot(g, 6, -8, 2.4, INK); shine(g, -9, -16, 4, 2.5);
  } };

/* ---------- Thèmes : fond + recette d'objets (chaque image a son propre décor) ---------- */
// --- Ville ---
K.building = { r: 58, base: true, cols: ['#7a8ad8', '#d87a6a', '#5ab89a', '#d8b05a'], nv: 2, mut: ['color', 'variant', 'scale'],
  draw(g, o) {
    const h = o.v ? 112 : 92;
    rrect(g, -25, -h, 50, h, 3, o.col);
    rrect(g, -28, -h - 7, 56, 9, 2, '#4a4566');
    for (let y = -h + 10, j = 0; y < -26; y += 19, j++) for (let i = 0; i < 3; i++) rrect(g, -18 + i * 13, y, 10, 12, 2, (i + j + (o.v ? 1 : 0)) % 3 ? '#ffe08a' : '#3a4a7a');
    rrect(g, -8, -20, 16, 20, 2, '#5a3a2a');
  } };
K.car = { r: 34, base: true, flip: true, cols: ['#e84a4a', '#4a8ae8', '#ffd23f', '#5ac85a'], nv: 2, mut: ['color', 'variant', 'flip', 'remove', 'add'],
  draw(g, o) {
    if (o.v) { rrect(g, -30, -44, 46, 26, 6, o.col); rrect(g, -25, -40, 15, 11, 3, '#bfe8ff'); rrect(g, -6, -40, 15, 11, 3, '#bfe8ff'); }
    else { poly(g, [[-21, -22], [-12, -40], [14, -40], [23, -22]], o.col); poly(g, [[-15, -24], [-9, -36], [0, -36], [0, -24]], '#bfe8ff'); poly(g, [[3, -24], [3, -36], [12, -36], [17, -24]], '#bfe8ff'); }
    rrect(g, -35, -26, 70, 19, 8, o.col);
    dot(g, 31, -18, 3.5, '#fff6a0'); dot(g, -31, -18, 3, '#ff6a5a');
    for (const x of [-20, 20]) { circ(g, x, -7, 9, '#2a2a3a'); dot(g, x, -7, 3.5, '#c8c8d8'); }
  } };
K.tlight = { r: 34, base: true, cols: ['#3a3a4a'], nv: 3, mut: ['variant', 'remove'],
  draw(g, o) {
    rrect(g, -3, -40, 6, 40, 2, '#6a6a7a');
    rrect(g, -12, -82, 24, 44, 6, o.col);
    ['#ff4a4a', '#ffcf3f', '#5ae06a'].forEach((c, i) => circ(g, 0, -72 + i * 13, 5, i === o.v ? c : '#24242e'));
  } };
K.lamp = { r: 40, base: true, cols: ['#3a4a6a', '#2a6a5a'], nv: 2, mut: ['variant', 'remove'],
  draw(g, o) {
    rrect(g, -9, -8, 18, 8, 2, o.col); rrect(g, -3, -74, 6, 70, 2, o.col);
    const heads = o.v ? [-14, 14] : [0];
    if (o.v) line(g, [[-14, -74], [14, -74]], 4);
    for (const x of heads) { dot(g, x, -70, 12, 'rgba(255,225,130,.45)'); poly(g, [[x - 9, -78], [x + 9, -78], [x + 6, -88], [x - 6, -88]], o.col); circ(g, x, -73, 5, '#fff2a0'); }
  } };
K.bench = { r: 30, base: true, cols: ['#b8783a', '#4a8ad8', '#5ab85a'], nv: 1, mut: ['color', 'remove'],
  draw(g, o) {
    rrect(g, -24, -14, 5, 14, 1, '#4a4a5a'); rrect(g, 19, -14, 5, 14, 1, '#4a4a5a');
    rrect(g, -29, -19, 58, 6, 2, o.col); rrect(g, -29, -36, 58, 6, 2, o.col); rrect(g, -29, -27, 58, 6, 2, o.col);
  } };
K.cat = { r: 22, base: true, flip: true, cols: ['#f0a050', '#6a6a7a', '#f4f0e8', '#3a3a4a'], nv: 2, mut: ['color', 'flip', 'remove', 'add', 'variant'],
  draw(g, o) {
    g.beginPath(); g.moveTo(12, -12); g.quadraticCurveTo(28, -18, 22, -36); g.lineWidth = LW * 2.4; g.strokeStyle = INK; g.lineCap = 'round'; g.stroke(); g.lineWidth = LW * 1.2; g.strokeStyle = o.col; g.stroke();
    ell(g, 0, -12, 16, 11, o.col);
    poly(g, [[-21, -30], [-19, -42], [-13, -34]], o.col); poly(g, [[-11, -35], [-5, -43], [-3, -31]], o.col);
    circ(g, -12, -27, 10, o.col);
    dot(g, -15, -28, 1.9, INK); dot(g, -8, -28, 1.9, INK); dot(g, -11.5, -24, 1.6, '#ff8aa0');
    if (o.v) rrect(g, -19, -19, 14, 4, 2, '#e84a4a');
  } };
K.trash = { r: 20, base: true, cols: ['#5a8a5a', '#4a6ab8', '#8a8a9a'], nv: 2, mut: ['color', 'variant', 'remove'],
  draw(g, o) {
    rrect(g, -13, -32, 26, 32, 4, o.col);
    for (const x of [-5, 5]) line(g, [[x, -26], [x, -6]], 2.5);
    if (o.v) { g.save(); g.translate(14, -36); g.rotate(0.7); rrect(g, -16, -4, 30, 7, 3, o.col); g.restore(); }
    else rrect(g, -15, -38, 30, 7, 3, o.col);
  } };
K.balloon = { r: 20, cols: ['#ff5a6a', '#4aa8ff', '#ffd23f', '#7a5ad8'], nv: 1, mut: ['color', 'remove', 'add'],
  draw(g, o) {
    g.beginPath(); g.moveTo(0, 16); g.quadraticCurveTo(6, 30, -2, 44); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
    poly(g, [[-3, 18], [3, 18], [0, 13]], o.col); ell(g, 0, 0, 14, 17, o.col); shine(g, -5, -6, 4, 6);
  } };
// --- Ferme ---
K.barn = { r: 56, base: true, cols: ['#d84a3a', '#4a7ad8', '#8a5a3a'], nv: 2, mut: ['color', 'variant'],
  draw(g, o) {
    rrect(g, -40, -62, 80, 62, 3, o.col);
    poly(g, [[-47, -60], [-30, -90], [30, -90], [47, -60]], '#5a3a3a');
    rrect(g, -15, -38, 30, 38, 2, '#f4ead2'); line(g, [[-15, -38], [15, 0]], 3); line(g, [[15, -38], [-15, 0]], 3);
    if (o.v) circ(g, 0, -74, 8, '#f4ead2'); else rrect(g, -9, -81, 18, 13, 2, '#f4ead2');
  } };
K.cow = { r: 36, base: true, flip: true, cols: ['#ffffff', '#c88a5a', '#4a4a4a'], nv: 2, mut: ['color', 'flip', 'variant', 'remove'],
  draw(g, o) {
    for (const x of [-18, -8, 10, 20]) rrect(g, x - 3, -22, 7, 22, 2, o.col);
    ell(g, 2, -30, 28, 15, o.col);
    const sp = o.col === '#4a4a4a' ? '#ffffff' : '#3a3a3a';
    if (o.v) { dot(g, 8, -34, 7, sp); dot(g, -8, -26, 5, sp); dot(g, 20, -26, 4, sp); }
    g.beginPath(); g.moveTo(29, -32); g.quadraticCurveTo(36, -24, 33, -14); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
    poly(g, [[-36, -50], [-40, -58], [-32, -52]], '#f4ead2'); poly(g, [[-26, -52], [-22, -60], [-20, -50]], '#f4ead2');
    rrect(g, -40, -52, 20, 22, 7, o.col); ell(g, -32, -32, 10, 6, '#ffb0b8');
    dot(g, -36, -44, 2, INK); dot(g, -26, -44, 2, INK);
  } };
K.chicken = { r: 18, base: true, flip: true, cols: ['#ffffff', '#d88a3a', '#4a3a3a'], nv: 1, mut: ['color', 'flip', 'remove', 'add'],
  draw(g, o) {
    line(g, [[-3, -6], [-4, 0]], 2.5); line(g, [[4, -6], [5, 0]], 2.5);
    poly(g, [[10, -18], [20, -24], [18, -12]], o.col);
    ell(g, 0, -14, 13, 10, o.col);
    poly(g, [[-15, -32], [-12, -38], [-9, -33], [-6, -38], [-4, -31]], '#e84a4a');
    circ(g, -10, -26, 7, o.col);
    poly(g, [[-17, -27], [-23, -25], [-17, -23]], '#ffb02a'); dot(g, -11, -27, 1.6, INK);
  } };
K.tractor = { r: 40, base: true, flip: true, cols: ['#3aa04a', '#e84a3a', '#ffcf3f'], nv: 1, mut: ['color', 'flip', 'remove'],
  draw(g, o) {
    rrect(g, -24, -52, 5, 16, 1, '#5a5a6a');
    rrect(g, -32, -38, 44, 20, 4, o.col);
    rrect(g, 0, -64, 28, 30, 4, o.col); rrect(g, 4, -60, 20, 14, 2, '#bfe8ff');
    circ(g, 16, -18, 18, '#2a2a3a'); circ(g, 16, -18, 7, '#ffcf3f');
    circ(g, -22, -10, 10, '#2a2a3a'); dot(g, -22, -10, 4, '#ffcf3f');
  } };
K.hay = { r: 30, base: true, cols: ['#e8c050'], nv: 2, mut: ['variant', 'remove', 'add', 'scale'],
  draw(g, o) {
    if (o.v) { rrect(g, -27, -30, 54, 30, 4, o.col); for (const y of [-20, -10]) line(g, [[-27, y], [27, y]], 2.5); line(g, [[-10, -30], [-10, 0]], 3.5); line(g, [[10, -30], [10, 0]], 3.5); }
    else { rrect(g, -28, -38, 56, 38, 18, o.col); g.beginPath(); g.arc(-14, -19, 10, 0, Math.PI * 1.6); g.lineWidth = 3; g.strokeStyle = INK; g.stroke(); line(g, [[4, -30], [22, -30]], 2.5); line(g, [[4, -10], [22, -10]], 2.5); }
  } };
K.pumpkin = { r: 20, base: true, cols: ['#ff8a2a', '#ffd23f', '#9ad04a'], nv: 1, mut: ['color', 'remove', 'add'],
  draw(g, o) {
    rrect(g, -2, -33, 5, 9, 2, '#5a8a3a');
    ell(g, -9, -14, 9, 13, o.col); ell(g, 9, -14, 9, 13, o.col); ell(g, 0, -14, 10, 14, o.col);
  } };
K.sunflower = { r: 30, base: true, cols: ['#ffd23f', '#ff8a3a'], nv: 1, mut: ['color', 'remove', 'add'],
  draw(g, o) {
    line(g, [[0, 0], [0, -44]], 5); g.save(); g.lineWidth = 2.5; g.strokeStyle = '#4aa84a'; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -44); g.stroke(); g.restore();
    ell(g, -10, -20, 9, 4, '#4aa84a', -0.5); ell(g, 10, -28, 9, 4, '#4aa84a', 0.5);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ell(g, Math.cos(a) * 14, -50 + Math.sin(a) * 14, 7, 4, o.col, a); }
    circ(g, 0, -50, 9, '#7a4a2a');
  } };
// --- Bonbons ---
K.lolli = { r: 30, base: true, cols: ['#ff5aa0', '#5ac8ff', '#ffd23f', '#8ae05a'], nv: 2, mut: ['color', 'variant', 'remove', 'add'],
  draw(g, o) {
    rrect(g, -2.5, -40, 5, 40, 2, '#f4ead2');
    circ(g, 0, -57, 18, o.col);
    g.save(); g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineCap = 'round';
    if (o.v) { for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(0, -57); const a = i * Math.PI / 2; g.lineTo(Math.cos(a) * 15, -57 + Math.sin(a) * 15); g.stroke(); } }
    else { g.beginPath(); for (let a = 0; a < Math.PI * 5; a += 0.2) { const rad = a * 1.0; g.lineTo(Math.cos(a) * rad, -57 + Math.sin(a) * rad); } g.stroke(); }
    g.restore();
  } };
K.cupcake = { r: 26, base: true, cols: ['#ff9ac8', '#c8a0ff', '#8ae8c8', '#fff0a0'], nv: 2, mut: ['color', 'variant', 'remove'],
  draw(g, o) {
    poly(g, [[-15, 0], [-19, -22], [19, -22], [15, 0]], '#e8a060');
    for (const x of [-8, 0, 8]) line(g, [[x, -20], [x * 0.85, -2]], 2.5);
    ell(g, 0, -27, 22, 8, o.col); ell(g, 0, -35, 16, 8, o.col); ell(g, 0, -42, 9, 6, o.col);
    if (o.v) circ(g, 0, -51, 5, '#ff3a4a');
  } };
K.donut = { r: 22, cols: ['#ff8ac0', '#8a5a3a', '#5ac8ff', '#fff4e0'], nv: 2, mut: ['color', 'variant', 'remove', 'add'],
  draw(g, o) {
    const ring = (ro, ri, fill) => { g.beginPath(); g.arc(0, 0, ro, 0, Math.PI * 2); g.moveTo(ri, 0); g.arc(0, 0, ri, 0, Math.PI * 2, true); g.fillStyle = fill; g.fill('evenodd'); g.lineWidth = LW; g.strokeStyle = INK; g.stroke(); };
    ring(20, 6, '#e8b070'); ring(17, 7.5, o.col);
    if (o.v) [['#ff4a4a', -11, -5, 0.4], ['#4ae07a', 9, -9, -0.8], ['#ffd23f', 11, 6, 0.9], ['#5aa8ff', -6, 11, -0.2], ['#ffffff', 0, -13, 1.4]].forEach(([c, x, y, a]) => { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = c; g.fillRect(-3, -1.2, 6, 2.4); g.restore(); });
  } };
K.cane = { r: 32, base: true, flip: true, cols: ['#ff3a4a', '#3ab85a', '#4a8ae8'], nv: 1, mut: ['color', 'flip', 'remove'],
  draw(g, o) {
    const p = () => { g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -46); g.arc(11, -46, 11, Math.PI, 0); g.lineTo(22, -38); };
    p(); g.lineCap = 'round'; g.lineWidth = 15; g.strokeStyle = INK; g.stroke();
    p(); g.lineWidth = 9; g.strokeStyle = '#ffffff'; g.stroke();
    p(); g.setLineDash([6, 6]); g.strokeStyle = o.col; g.stroke(); g.setLineDash([]);
  } };
K.icecream = { r: 30, base: true, cols: ['#ffb0c8', '#a0e0ff', '#fff0b0', '#a0f0a0'], nv: 2, mut: ['color', 'variant', 'remove'],
  draw(g, o) {
    poly(g, [[-12, -30], [12, -30], [0, 0]], '#e8b060');
    line(g, [[-7, -26], [3, -8]], 2); line(g, [[7, -26], [-3, -8]], 2);
    if (o.v) circ(g, 0, -58, 11, '#9a6a4a');
    circ(g, 0, -40, 13, o.col); dot(g, 0, o.v ? -70 : -54, 4.5, '#ff3a4a');
  } };
K.gummy = { r: 20, base: true, cols: ['#ff4a5a', '#4ae07a', '#ffd23f', '#5aa8ff'], nv: 1, mut: ['color', 'remove', 'add'],
  draw(g, o) {
    circ(g, -7, -36, 4.5, o.col); circ(g, 7, -36, 4.5, o.col);
    ell(g, -10, -14, 4, 6, o.col); ell(g, 10, -14, 4, 6, o.col);
    ell(g, 0, -13, 10, 13, o.col); circ(g, 0, -29, 9, o.col);
    dot(g, -3, -30, 1.6, INK); dot(g, 3, -30, 1.6, INK); shine(g, -4, -16, 2.5, 4);
  } };
// --- Halloween ---
K.jack = { r: 24, base: true, cols: ['#ff7a1a'], nv: 2, mut: ['variant', 'remove', 'add'],
  draw(g, o) {
    rrect(g, -2, -38, 5, 9, 2, '#4a7a3a');
    ell(g, -11, -17, 11, 16, o.col); ell(g, 11, -17, 11, 16, o.col); ell(g, 0, -17, 12, 17, o.col);
    const glow = '#ffe680';
    if (o.v) { poly(g, [[-12, -24], [-4, -20], [-11, -17]], glow); poly(g, [[12, -24], [4, -20], [11, -17]], glow); }
    else { poly(g, [[-11, -18], [-7, -26], [-3, -18]], glow); poly(g, [[3, -18], [7, -26], [11, -18]], glow); }
    poly(g, [[-11, -10], [-6, -7], [-2, -10], [2, -7], [6, -10], [11, -10], [6, -3], [-6, -3]], glow);
  } };
K.spook = { r: 26, flip: true, cols: ['#f4f0ff', '#c8f0d0'], nv: 2, mut: ['variant', 'flip', 'remove', 'add'],
  draw(g, o) {
    g.beginPath(); g.moveTo(-18, 14); g.lineTo(-18, -4); g.arc(0, -4, 18, Math.PI, 0); g.lineTo(18, 14);
    for (let i = 0; i < 3; i++) g.quadraticCurveTo(12 - i * 12, 22, 6 - i * 12, 14);
    g.closePath(); fillStroke(g, o.col);
    ell(g, -6, -6, 3, 5, INK); ell(g, 6, -6, 3, 5, INK);
    if (o.v) ell(g, 0, 5, 4, 5, INK); else { g.beginPath(); g.arc(0, 3, 5, 0.2, Math.PI - 0.2); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke(); }
  } };
K.bat = { r: 22, flip: true, cols: ['#3a2a4a', '#7a4a9a'], nv: 2, mut: ['variant', 'flip', 'remove', 'add', 'color'],
  draw(g, o) {
    const up = o.v ? -10 : 6;
    for (const s of [-1, 1]) poly(g, [[s * 6, -2], [s * 18, up - 8], [s * 26, up], [s * 20, up + 2], [s * 16, up + 6], [s * 10, 4]], o.col);
    ell(g, 0, 0, 8, 9, o.col);
    poly(g, [[-6, -6], [-5, -14], [-2, -8]], o.col); poly(g, [[6, -6], [5, -14], [2, -8]], o.col);
    dot(g, -3, -1, 1.8, '#ff4a4a'); dot(g, 3, -1, 1.8, '#ff4a4a');
  } };
K.grave = { r: 26, base: true, cols: ['#9a9aaa', '#7a9a8a'], nv: 2, mut: ['variant', 'remove', 'add'],
  draw(g, o) {
    if (o.v) { poly(g, [[-5, 0], [-5, -30], [-17, -30], [-17, -40], [-5, -40], [-5, -52], [5, -52], [5, -40], [17, -40], [17, -30], [5, -30], [5, 0]], o.col); }
    else { g.beginPath(); g.moveTo(-17, 0); g.lineTo(-17, -32); g.arc(0, -32, 17, Math.PI, 0); g.lineTo(17, 0); g.closePath(); fillStroke(g, o.col); line(g, [[-8, -30], [8, -30]], 3); line(g, [[-8, -21], [8, -21]], 3); }
    rrect(g, -22, -4, 44, 6, 3, '#5a6a4a');
  } };
K.deadtree = { r: 50, base: true, flip: true, cols: ['#5a4440', '#4a4a5a'], nv: 2, mut: ['variant', 'flip', 'scale'],
  draw(g, o) {
    const br = o.v ? [[0, -60, -26, -88], [0, -50, 28, -80], [-14, -76, -30, -74], [14, -66, 34, -92]] : [[0, -62, -24, -90], [0, -54, 26, -84], [-12, -78, -4, -100]];
    for (const [x1, y1, x2, y2] of br) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineCap = 'round'; g.lineWidth = 11; g.strokeStyle = INK; g.stroke(); g.lineWidth = 5; g.strokeStyle = o.col; g.stroke(); }
    poly(g, [[-11, 0], [-6, -66], [6, -66], [11, 0]], o.col);
    ell(g, 0, -32, 3, 5, INK);
  } };
K.moon = { r: 34, cols: ['#fff2b0', '#d0e0ff'], nv: 2, mut: ['variant', 'color'],
  draw(g, o) {
    if (o.v) { g.beginPath(); g.arc(0, 0, 30, 0, Math.PI * 2); g.moveTo(32, -6); g.arc(14, -6, 25, 0, Math.PI * 2, true); g.fillStyle = o.col; g.fill('evenodd'); g.lineWidth = LW; g.strokeStyle = INK; g.stroke(); }
    else { circ(g, 0, 0, 30, o.col); circ(g, -9, -8, 6, 'rgba(0,0,0,.08)'); circ(g, 10, 8, 8, 'rgba(0,0,0,.08)'); circ(g, 8, -14, 4, 'rgba(0,0,0,.08)'); }
  } };
// --- Désert ---
K.cactus = { r: 34, base: true, flip: true, cols: ['#4aa85a', '#7ac83a', '#2f8a6a'], nv: 2, mut: ['color', 'variant', 'flip', 'remove', 'add'],
  draw(g, o) {
    rrect(g, 8, -42, 16, 10, 5, o.col); rrect(g, 15, -60, 10, 26, 5, o.col);
    if (o.v) { rrect(g, -24, -34, 16, 10, 5, o.col); rrect(g, -25, -52, 10, 26, 5, o.col); }
    rrect(g, -10, -66, 20, 66, 10, o.col);
    line(g, [[0, -58], [0, -8]], 2.5);
    if (o.v) circ(g, 0, -68, 5, '#ff7ab0');
  } };
K.camel = { r: 40, base: true, flip: true, cols: ['#d8a860', '#b8884a'], nv: 2, mut: ['variant', 'flip', 'remove'],
  draw(g, o) {
    for (const x of [-14, -6, 14, 22]) rrect(g, x - 3, -30, 6, 30, 2, o.col);
    if (o.v) { ell(g, -4, -50, 10, 10, o.col); ell(g, 16, -50, 10, 10, o.col); } else ell(g, 6, -52, 14, 12, o.col);
    ell(g, 4, -38, 26, 13, o.col);
    poly(g, [[-18, -42], [-30, -66], [-24, -70], [-12, -44]], o.col);
    ell(g, -32, -68, 11, 7, o.col); dot(g, -34, -70, 1.8, INK);
  } };
K.pyramid = { r: 56, base: true, cols: ['#e8c070', '#d8a858'], nv: 2, mut: ['variant', 'scale'],
  draw(g, o) {
    poly(g, [[-58, 0], [0, -72], [58, 0]], o.col);
    poly(g, [[0, -72], [58, 0], [16, 0]], 'rgba(120,70,20,.18)');
    for (const y of [-18, -36, -54]) { const w = 58 * (1 + y / 72); line(g, [[-w, y], [w, y]], 2); }
    if (o.v) rrect(g, -7, -14, 14, 14, 2, '#5a3a2a');
  } };
K.snake = { r: 22, base: true, flip: true, cols: ['#5ac85a', '#d8c040', '#e85a4a'], nv: 1, mut: ['color', 'flip', 'remove', 'add'],
  draw(g, o) {
    const p = () => { g.beginPath(); g.moveTo(20, -4); g.bezierCurveTo(8, -18, -4, 6, -14, -10); };
    p(); g.lineCap = 'round'; g.lineWidth = 13; g.strokeStyle = INK; g.stroke(); p(); g.lineWidth = 7; g.strokeStyle = o.col; g.stroke();
    line(g, [[-24, -15], [-29, -15]], 2); ell(g, -18, -14, 7, 5.5, o.col); dot(g, -19, -16, 1.6, INK);
  } };
K.tumble = { r: 18, base: true, cols: ['#b8925a'], nv: 1, mut: ['remove', 'add', 'scale'],
  draw(g, o) {
    circ(g, 0, -16, 16, 'rgba(184,146,90,.35)');
    g.save(); g.lineWidth = 2.5; g.strokeStyle = '#7a5a2a';
    for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(Math.cos(i) * 4, -16 + Math.sin(i * 2) * 4, 9 + (i % 3) * 2, i, i + 2.4); g.stroke(); }
    g.restore();
  } };

/* ---------- Thèmes ---------- */
function sky(g, top, bottom, h) { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
function hills(g, r, y, amp, col, step = 50) { g.fillStyle = col; g.beginPath(); g.moveTo(0, H); g.lineTo(0, y); for (let x = 0; x <= W + step; x += step) g.quadraticCurveTo(x - step / 2, y - amp * (0.5 + r()), x, y); g.lineTo(W, H); g.closePath(); g.fill(); }
function ground(g, y, top, bottom) { const gr = g.createLinearGradient(0, y, 0, H); gr.addColorStop(0, top); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(0, y, W, H - y); line(g, [[0, y], [W, y]], 4); }
const GRASSY = [30, 610, 340, 468];
const THEMES = {
  prairie: {
    bg(g, r) { sky(g, '#7fd4ff', '#d8f4ff', 300); hills(g, r, 250, 30, '#9ad86a'); hills(g, r, 280, 22, '#7ac84a'); ground(g, 300, '#6fc24a', '#4fa83a'); },
    recipe: [
      { k: 'sun', n: [1, 1], z: [70, 570, 55, 90] }, { k: 'cloud', n: [2, 3], z: [50, 590, 40, 160] },
      { k: 'house', n: [0, 1], z: [70, 570, 312, 325] }, { k: 'tree', n: [1, 2], z: [50, 590, 318, 335] },
      { k: 'fence', n: [1, 1], z: [60, 580, 345, 365] }, { k: 'sheep', n: [1, 2], z: [60, 580, 375, 445] },
      { k: 'flower', n: [3, 5], z: GRASSY }, { k: 'grass', n: [4, 7], z: GRASSY }, { k: 'rock', n: [2, 4], z: GRASSY },
      { k: 'butterfly', n: [1, 2], z: [50, 590, 190, 290] }, { k: 'bird', n: [1, 2], z: [50, 590, 70, 180] }
    ], adds: ['flower', 'grass', 'rock', 'butterfly', 'bird', 'cloud', 'grass', 'rock']
  },
  beach: {
    bg(g, r) {
      sky(g, '#6fd0ff', '#e0f8ff', 230);
      g.fillStyle = '#2f9ad8'; g.fillRect(0, 205, W, 75); line(g, [[0, 205], [W, 205]], 4);
      g.save(); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 3; g.lineCap = 'round'; for (let i = 0; i < 9; i++) { const x = r() * W, y = 220 + r() * 45; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - 6, x + 20, y); g.stroke(); } g.restore();
      const gr = g.createLinearGradient(0, 270, 0, H); gr.addColorStop(0, '#ffe8a8'); gr.addColorStop(1, '#f0c870'); g.fillStyle = gr;
      g.beginPath(); g.moveTo(0, 285); g.quadraticCurveTo(320, 262, W, 288); g.lineTo(W, H); g.lineTo(0, H); g.fill(); line(g, [[0, 285], [320, 274], [W, 288]], 4);
    },
    recipe: [
      { k: 'sun', n: [1, 1], z: [70, 570, 55, 90] }, { k: 'cloud', n: [1, 2], z: [50, 590, 40, 150] },
      { k: 'boat', n: [1, 1], z: [60, 580, 238, 250] }, { k: 'bird', n: [1, 3], z: [50, 590, 60, 180] },
      { k: 'palm', n: [1, 1], z: [40, 600, 330, 350] }, { k: 'parasol', n: [1, 2], z: [90, 550, 355, 410] },
      { k: 'sandcastle', n: [1, 1], z: [90, 550, 410, 460] }, { k: 'ball', n: [1, 2], z: [40, 600, 380, 470] },
      { k: 'bucket', n: [0, 1], z: [40, 600, 390, 470] }, { k: 'shell', n: [2, 3], z: [30, 610, 330, 470] },
      { k: 'starfish', n: [1, 2], z: [30, 610, 330, 470] }, { k: 'rock', n: [1, 3], z: [30, 610, 320, 470] }
    ], adds: ['shell', 'starfish', 'ball', 'rock', 'bird', 'cloud', 'bucket']
  },
  forest: {
    bg(g, r) {
      sky(g, '#ffd08a', '#fff4d6', 280);
      g.fillStyle = '#4a8a6a'; for (let x = -20; x < W + 40; x += 34) { const h = 60 + r() * 50; g.beginPath(); g.moveTo(x - 22, 300); g.lineTo(x, 300 - h); g.lineTo(x + 22, 300); g.fill(); }
      ground(g, 300, '#8ab84a', '#6a9a3a');
      g.fillStyle = '#c8a070'; g.beginPath(); g.moveTo(260, 300); g.quadraticCurveTo(220, 400, 300, H); g.lineTo(380, H); g.quadraticCurveTo(300, 400, 300, 300); g.fill();
    },
    recipe: [
      { k: 'sun', n: [1, 1], z: [70, 570, 55, 90] }, { k: 'cloud', n: [1, 2], z: [50, 590, 40, 150] },
      { k: 'pine', n: [2, 4], z: [30, 610, 318, 345] }, { k: 'tent', n: [1, 1], z: [110, 530, 385, 410] },
      { k: 'fire', n: [1, 1], z: [100, 540, 430, 462] }, { k: 'log', n: [1, 2], z: GRASSY },
      { k: 'mushroom', n: [1, 3], z: GRASSY }, { k: 'rock', n: [2, 3], z: GRASSY }, { k: 'grass', n: [3, 6], z: GRASSY },
      { k: 'flower', n: [1, 3], z: GRASSY }, { k: 'bird', n: [1, 2], z: [50, 590, 70, 180] }, { k: 'butterfly', n: [0, 1], z: [50, 590, 190, 280] }
    ], adds: ['mushroom', 'rock', 'grass', 'flower', 'bird', 'log', 'grass']
  },
  space: {
    bg(g, r) {
      sky(g, '#120a3a', '#3a2a7a', H);
      for (let i = 0; i < 70; i++) dot(g, r() * W, r() * 360, r() * 1.6 + 0.4, `rgba(255,255,255,${0.4 + r() * 0.6})`);
      ground(g, 372, '#b8b0c8', '#8a82a0');
      for (let i = 0; i < 6; i++) { const x = r() * W, y = 395 + r() * 70, w = 20 + r() * 30; g.beginPath(); g.ellipse(x, y, w, w * 0.3, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(60,50,90,.25)'; g.fill(); }
    },
    recipe: [
      { k: 'planet', n: [2, 3], z: [50, 590, 50, 260] }, { k: 'rocket', n: [1, 1], z: [70, 570, 90, 290] },
      { k: 'ufo', n: [1, 1], z: [70, 570, 70, 250] }, { k: 'star', n: [4, 7], z: [30, 610, 25, 340] },
      { k: 'alien', n: [1, 2], z: [50, 590, 400, 462] }, { k: 'flag', n: [0, 1], z: [50, 590, 395, 455] },
      { k: 'rock', n: [3, 5], z: [30, 610, 390, 470] }
    ], adds: ['star', 'rock', 'alien', 'star', 'rock', 'planet', 'flag']
  },
  sea: {
    bg(g, r) {
      let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#3ac6e8'); gr.addColorStop(0.7, '#1f5a9a'); gr.addColorStop(1, '#173a6a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.save(); g.globalAlpha = 0.12; g.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { const x = r() * W; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 40, 0); g.lineTo(x - 60, 380); g.lineTo(x - 110, 380); g.fill(); } g.restore();
      g.fillStyle = '#2a4a7a'; g.beginPath(); g.moveTo(0, 370); for (let x = 0; x <= W; x += 60) g.lineTo(x, 345 + r() * 25); g.lineTo(W, 380); g.lineTo(0, 380); g.fill();
      gr = g.createLinearGradient(0, 370, 0, H); gr.addColorStop(0, '#f0d890'); gr.addColorStop(1, '#c8a860'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 380); g.quadraticCurveTo(320, 360, W, 385); g.lineTo(W, H); g.lineTo(0, H); g.fill();
      line(g, [[0, 380], [320, 371], [W, 385]], 4);
      for (let i = 0; i < 14; i++) { const x = r() * W, y = 400 + r() * 70; line(g, [[x, y], [x + 14, y - 2]], 2); }
    },
    recipe: [
      { k: 'chest', n: [1, 1], z: [80, 560, 445, 465] },
      { k: 'seaweed', n: [2, 4], z: [30, 610, 395, 420] },
      { k: 'crab', n: [1, 1], z: [40, 600, 430, 468] },
      { k: 'shell', n: [1, 3], z: [40, 600, 420, 468] },
      { k: 'starfish', n: [1, 3], z: [40, 600, 420, 468] },
      { k: 'rock', n: [1, 3], z: [30, 610, 410, 470] },
      { k: 'fish', n: [3, 5], z: [50, 590, 60, 320] },
      { k: 'jelly', n: [1, 2], z: [50, 590, 60, 280] },
      { k: 'bubble', n: [3, 6], z: [30, 610, 30, 330] }
    ], adds: ['fish', 'bubble', 'shell', 'starfish', 'jelly', 'rock']
  },
  winter: {
    bg(g, r) {
      sky(g, '#9ad8ff', '#eaf8ff', 300);
      g.fillStyle = '#c8d8f0'; g.beginPath(); g.moveTo(0, 300); for (let x = 0; x <= W; x += 110) { g.lineTo(x + 55, 150 + r() * 60); g.lineTo(x + 110, 300); } g.fill();
      g.fillStyle = '#ffffff'; for (let x = 0; x <= W; x += 110) { /* neiges éternelles */ }
      ground(g, 300, '#ffffff', '#d8ecff');
      for (let i = 0; i < 10; i++) { const x = r() * W, y = 320 + r() * 150; g.beginPath(); g.ellipse(x, y, 30, 6, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(150,190,230,.25)'; g.fill(); }
    },
    recipe: [
      { k: 'sun', n: [1, 1], z: [70, 570, 55, 90] }, { k: 'cloud', n: [1, 3], z: [50, 590, 40, 160] },
      { k: 'house', n: [0, 1], z: [70, 570, 315, 325] }, { k: 'pine', n: [2, 4], z: [30, 610, 320, 350] },
      { k: 'snowman', n: [1, 1], z: [80, 560, 400, 455] }, { k: 'penguin', n: [1, 2], z: [50, 590, 390, 468] },
      { k: 'sled', n: [0, 1], z: [50, 590, 390, 468] }, { k: 'rock', n: [2, 3], z: [30, 610, 360, 470] },
      { k: 'snowflake', n: [3, 6], z: [30, 610, 30, 290] }, { k: 'bird', n: [0, 1], z: [50, 590, 70, 180] }
    ], adds: ['snowflake', 'rock', 'penguin', 'cloud', 'snowflake']
  },
  city: {
    bg(g, r) {
      sky(g, '#f7a77a', '#ffe0b8', 320);
      g.fillStyle = '#d8909a'; for (let x = -10; x < W; x += 46) { const h = 60 + r() * 80; g.fillRect(x, 330 - h, 40, h); }
      ground(g, 330, '#c8beb4', '#b0a69c');
      g.fillStyle = '#5a5a6a'; g.fillRect(0, 410, W, 70); line(g, [[0, 410], [W, 410]], 4);
      g.fillStyle = '#f4ead2'; for (let x = 10; x < W; x += 70) g.fillRect(x, 443, 36, 5);
    },
    recipe: [
      { k: 'sun', n: [0, 1], z: [70, 570, 55, 90] }, { k: 'cloud', n: [1, 2], z: [50, 590, 40, 140] },
      { k: 'building', n: [2, 3], z: [40, 600, 330, 334] }, { k: 'lamp', n: [1, 2], z: [30, 610, 345, 360] },
      { k: 'tlight', n: [0, 1], z: [40, 600, 345, 360] }, { k: 'bench', n: [0, 1], z: [60, 580, 365, 395] },
      { k: 'trash', n: [1, 2], z: [30, 610, 370, 400] }, { k: 'cat', n: [1, 2], z: [30, 610, 370, 402] },
      { k: 'car', n: [1, 2], z: [50, 590, 446, 468] }, { k: 'balloon', n: [1, 2], z: [40, 600, 90, 250] }, { k: 'bird', n: [1, 2], z: [50, 590, 60, 170] }
    ], adds: ['cat', 'car', 'balloon', 'bird', 'cloud', 'trash']
  },
  farm: {
    bg(g, r) {
      sky(g, '#8fd2f2', '#e4f6ff', 300); hills(g, r, 260, 26, '#9ad86a'); ground(g, 290, '#8ec85a', '#6ea844');
      g.save(); g.strokeStyle = 'rgba(90,60,20,.25)'; g.lineWidth = 6; for (let y = 312; y < H; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y + 8); g.stroke(); } g.restore();
    },
    recipe: [
      { k: 'sun', n: [1, 1], z: [70, 570, 55, 90] }, { k: 'cloud', n: [1, 3], z: [50, 590, 40, 160] },
      { k: 'barn', n: [1, 1], z: [70, 570, 300, 312] }, { k: 'fence', n: [1, 1], z: [60, 580, 335, 350] },
      { k: 'tractor', n: [0, 1], z: [60, 580, 380, 440] }, { k: 'cow', n: [1, 2], z: [60, 580, 370, 445] },
      { k: 'chicken', n: [2, 3], z: [30, 610, 385, 468] }, { k: 'hay', n: [1, 2], z: [40, 600, 365, 455] },
      { k: 'pumpkin', n: [1, 3], z: [30, 610, 395, 470] }, { k: 'sunflower', n: [1, 2], z: [30, 610, 330, 400] }, { k: 'bird', n: [0, 2], z: [50, 590, 60, 180] }
    ], adds: ['chicken', 'pumpkin', 'hay', 'sunflower', 'cloud', 'bird']
  },
  candy: {
    bg(g, r) {
      sky(g, '#f6b8dc', '#fff0f8', 300); hills(g, r, 255, 30, '#a8ead0'); hills(g, r, 280, 22, '#ffb8d8');
      ground(g, 300, '#ffd8ec', '#ffc0e0');
      g.save(); g.globalAlpha = 0.35; for (let i = 0; i < 26; i++) { g.fillStyle = ['#ffffff', '#ff8ac0', '#8ae8c8', '#ffe08a'][i % 4]; g.beginPath(); g.arc(r() * W, 315 + r() * 160, 3 + r() * 3, 0, Math.PI * 2); g.fill(); } g.restore();
    },
    recipe: [
      { k: 'sun', n: [1, 1], z: [70, 570, 55, 90] }, { k: 'cloud', n: [2, 3], z: [50, 590, 40, 160] },
      { k: 'lolli', n: [2, 3], z: [30, 610, 330, 450] }, { k: 'cupcake', n: [1, 2], z: [40, 600, 360, 465] },
      { k: 'donut', n: [1, 3], z: [30, 610, 330, 460] }, { k: 'cane', n: [1, 2], z: [40, 600, 340, 460] },
      { k: 'icecream', n: [1, 2], z: [40, 600, 360, 462] }, { k: 'gummy', n: [2, 3], z: [30, 610, 385, 470] }, { k: 'balloon', n: [0, 2], z: [40, 600, 90, 240] }
    ], adds: ['gummy', 'donut', 'lolli', 'balloon', 'cloud']
  },
  halloween: {
    bg(g, r) {
      sky(g, '#24163e', '#5a3a78', 310);
      for (let i = 0; i < 40; i++) dot(g, r() * W, r() * 250, r() * 1.4 + 0.4, `rgba(255,255,255,${0.35 + r() * 0.5})`);
      hills(g, r, 270, 30, '#2e2448'); ground(g, 300, '#3a4a3c', '#26342a');
      g.fillStyle = 'rgba(220,210,255,.08)'; for (let i = 0; i < 3; i++) g.fillRect(0, 330 + i * 46, W, 18);
    },
    recipe: [
      { k: 'moon', n: [1, 1], z: [70, 570, 55, 110] }, { k: 'bat', n: [2, 3], z: [40, 600, 60, 240] }, { k: 'spook', n: [1, 2], z: [40, 600, 150, 280] },
      { k: 'deadtree', n: [1, 2], z: [40, 600, 312, 335] }, { k: 'grave', n: [2, 3], z: [30, 610, 355, 455] },
      { k: 'jack', n: [2, 3], z: [30, 610, 380, 468] }, { k: 'mushroom', n: [1, 2], z: [30, 610, 340, 468] }, { k: 'rock', n: [1, 2], z: [30, 610, 340, 470] }
    ], adds: ['bat', 'jack', 'grave', 'spook', 'mushroom']
  },
  desert: {
    bg(g, r) {
      sky(g, '#ffc47a', '#fff0d0', 300);
      hills(g, r, 255, 34, '#f0c070', 90); hills(g, r, 280, 24, '#e8b060', 70); ground(g, 300, '#f4cf86', '#e8b868');
    },
    recipe: [
      { k: 'sun', n: [1, 1], z: [70, 570, 55, 90] }, { k: 'cloud', n: [0, 1], z: [50, 590, 40, 140] }, { k: 'bird', n: [1, 2], z: [50, 590, 60, 180] },
      { k: 'pyramid', n: [0, 1], z: [80, 560, 298, 304] }, { k: 'palm', n: [0, 1], z: [40, 600, 330, 350] },
      { k: 'cactus', n: [2, 3], z: [30, 610, 340, 460] }, { k: 'camel', n: [1, 1], z: [60, 580, 370, 440] },
      { k: 'snake', n: [1, 2], z: [30, 610, 400, 468] }, { k: 'tumble', n: [1, 2], z: [30, 610, 380, 468] }, { k: 'rock', n: [2, 3], z: [30, 610, 350, 470] }
    ], adds: ['cactus', 'snake', 'tumble', 'rock', 'bird']
  }
};
const THEME_KEYS = Object.keys(THEMES);

let SCALE = 1; // vue adaptée : objets plus gros
function makeObj(r, k, x, y) {
  const d = K[k];
  return { k, x, y, s: rr(r, 1.0, 1.28) * SCALE, flip: d.flip && r() < 0.5, col: pick(r, d.cols), v: r() * d.nv | 0, len: rr(r, 0, 60) };
}
const rad = o => K[o.k].r * o.s;
// centre visuel (les objets posés sont dessinés au-dessus de leur base)
const center = o => K[o.k].base ? { x: o.x, y: o.y - rad(o) * 0.9 } : { x: o.x, y: o.y };
function free(objs, x, y, r, k) {
  const c = K[k].base ? { x, y: y - r * 0.9 } : { x, y };
  for (const o of objs) { const oc = center(o); if (Math.hypot(oc.x - c.x, oc.y - c.y) < (rad(o) + r) * 0.92) return false; }
  return c.x - r > 4 && c.x + r < W - 4 && c.y - r > 4 && c.y + r < H - 2;
}
function place(r, objs, k, z) {
  for (let t = 0; t < 80; t++) {
    const x = rr(r, z[0], z[1]), y = rr(r, z[2], z[3]), o = makeObj(r, k, x, y);
    if (free(objs, x, y, rad(o), k)) return o;
  }
  return null;
}

/* ---------- Génération d'une partie ---------- */
// level : 0 facile (5 différences), 1 normal (7), 2 difficile (9) — toujours des changements francs
// vis : vue adaptée (forte myopie / basse vision) — objets plus gros, contours épais, différences très franches
function generate(seed, level, vis) {
  SCALE = vis ? 1.3 : 1;
  try {
    // si le décor tiré ne permet pas assez de différences, on retire (même thème : graine + 6k), de façon déterministe
    const want = level === 0 ? 5 : level === 1 ? 7 : 9; let best = null;
    for (let k = 0; k < 6; k++) { const sc = gen(seed + 6 * k, level, !!vis); if (!best || sc.diffs.length > best.diffs.length) best = sc; if (sc.diffs.length >= want) break; }
    best.seed = seed; return best;
  } finally { SCALE = 1; }
}
function gen(seed, level, vis) {
  const r = rng(seed), theme = THEME_KEYS[seed % THEME_KEYS.length], T = THEMES[theme];
  const bgSeed = (r() * 1e9) | 0;
  const objs = [];
  for (const it of T.recipe) {
    const n = it.n[0] + (r() * (it.n[1] - it.n[0] + 1 + (level === 2 && it.n[1] > 1 && !vis ? 1 : 0)) | 0);
    for (let i = 0; i < n; i++) { const o = place(r, objs, it.k, it.z); if (o) objs.push(o); }
  }
  const nDiff = level === 0 ? 5 : level === 1 ? 7 : 9;
  // Différences franches : objets qui apparaissent / disparaissent / changent de couleur en priorité
  const weights = level === 0 ? { add: 4, remove: 5, color: 3 }
    : vis ? { add: 5, remove: 5, color: 3, scale: 1 }
    : level === 1 ? { add: 4, remove: 4, color: 3, variant: 1, scale: 1 }
    : { add: 4, remove: 4, color: 3, variant: 1, flip: 1 };
  const right = objs.map(o => Object.assign({}, o));
  const diffs = [], perKind = {};
  // Taille minimale (rayon en px sur 640×480) pour qu'une différence se voie bien : facile > normal > difficile
  let minR = vis ? 30 : level === 0 ? 25 : level === 1 ? 20 : 0;
  const hex = c => /^#[0-9a-f]{6}$/i.test(c) ? [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)) : null;
  const cdist = (a, b) => { const x = hex(a), y = hex(b); return x && y ? Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) : 999; };
  const capped = k => (perKind[k] || 0) >= (level === 2 || vis ? 3 : 2); // au plus 2 différences sur le même type d'objet
  const clash = (x, y, rr2) => diffs.some(d => Math.hypot(d.x - x, d.y - y) < d.r + rr2 + 10);
  const order = objs.map((o, i) => i).sort(() => r() - 0.5);
  let guard = 0;
  while (diffs.length < nDiff && guard++ < 1200) {
    if (guard === 500 || guard === 850) minR *= 0.85; // décor trop chargé : on assouplit un peu la taille minimale
    // choix d'un type de changement pondéré
    const types = Object.keys(weights), tot = types.reduce((s, k) => s + weights[k], 0);
    let x = r() * tot, type = types[0]; for (const k of types) { if ((x -= weights[k]) < 0) { type = k; break; } }
    if (type === 'add') {
      const k = pick(r, T.adds), it = T.recipe.find(q => q.k === k);
      if (capped(k)) continue;
      if (K[k].r * 1.9 < minR) continue; // trop petit même agrandi (étoile, bulle…)
      const o = place(r, right.filter(Boolean), k, it.z); if (!o) continue;
      if (rad(o) < minR) { o.s = minR * 1.08 / K[k].r; const cc = center(o); if (!free(right.filter(Boolean), cc.x, cc.y, rad(o), k)) continue; }
      const c = center(o), rr2 = rad(o) + 6;
      if (clash(c.x, c.y, rr2)) continue;
      right.push(o); diffs.push({ x: c.x, y: c.y, r: rr2, type }); perKind[k] = (perKind[k] || 0) + 1; continue;
    }
    const big = type === 'variant' ? Math.max(minR, level < 2 ? 30 : 0) : minR;
    const i = order.find(j => { const o = objs[j]; return right[j] && !right[j]._m && rad(o) >= big && K[o.k].mut.includes(type === 'move' ? 'scale' : type); });
    if (i === undefined) continue;
    const o = objs[i], c = center(o);
    if (capped(o.k)) { order.splice(order.indexOf(i), 1); order.push(i); continue; }
    let rr2 = rad(o) + 6;
    if (type === 'move') rr2 += 14;
    if (type === 'scale') rr2 = rad(o) * (level < 2 ? 1.45 : 1.3) + 6;
    if (clash(c.x, c.y, rr2)) { order.splice(order.indexOf(i), 1); order.push(i); continue; }
    const m = Object.assign({}, o, { _m: 1 });
    if (type === 'remove') { right[i] = null; }
    else {
      if (type === 'color') {
        let cs = K[o.k].cols.filter(cc => cc !== o.col);
        if (level < 2 || vis) cs = cs.filter(cc => cdist(cc, o.col) > (vis ? 130 : 110)); // couleur nettement différente seulement
        if (!cs.length) { order.splice(order.indexOf(i), 1); order.push(i); continue; }
        m.col = level < 2 || vis ? cs.reduce((a, b) => cdist(b, o.col) > cdist(a, o.col) ? b : a) : pick(r, cs);
      }
      if (type === 'variant') { if (K[o.k].nv < 2) continue; m.v = (o.v + 1 + (r() * (K[o.k].nv - 1) | 0)) % K[o.k].nv; }
      if (type === 'flip') { if (!K[o.k].flip) continue; m.flip = !o.flip; }
      if (type === 'scale') m.s = o.s * (level < 2 ? (r() < 0.5 ? 0.6 : 1.45) : (r() < 0.5 ? 0.68 : 1.32));
      if (type === 'move') { m.x += (r() < 0.5 ? -1 : 1) * 16; if (!K[o.k].base) m.y += (r() < 0.5 ? -1 : 1) * 12; }
      right[i] = m;
    }
    diffs.push({ x: c.x, y: c.y, r: Math.min(rr2, 70), type }); perKind[o.k] = (perKind[o.k] || 0) + 1;
  }
  return { seed, theme, level, vis, bgSeed, left: objs, right: right.filter(Boolean), diffs };
}

let THICK = 1; // épaisseur des contours (×1.6 en vue adaptée)
function drawObj(g, o) {
  const d = K[o.k];
  g.save(); g.translate(o.x, o.y); g.scale(o.s * (o.flip ? -1 : 1), o.s);
  LW = 4 * THICK / o.s;
  if (d.base) { g.beginPath(); g.ellipse(0, 1, d.r * 0.72, d.r * 0.15, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(25,10,45,.22)'; g.fill(); } // ombre au sol
  SHADE = d.r; SHADE_BASE = !!d.base;
  d.draw(g, o);
  SHADE = 0;
  g.restore(); LW = 4;
}
// Dessine une des deux images (side 'left' | 'right') dans un contexte déjà mis à l'échelle 640×480
function draw(g, scene, side) {
  const T = THEMES[scene.theme];
  THICK = scene.vis ? 1.6 : 1;
  LW = 4; T.bg(g, rng(scene.bgSeed));
  if (scene.vis) { g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(0, 0, W, H); } // décor un peu adouci : les objets ressortent
  const list = scene[side].slice();
  // objets posés triés par profondeur, objets volants ensuite
  list.sort((a, b) => (K[a.k].base ? 0 : 1) - (K[b.k].base ? 0 : 1) || (K[a.k].base ? a.y - b.y : 0));
  for (const o of list) drawObj(g, o);
  THICK = 1;
  // léger vignettage : l'œil reste au centre, les bords sont plus doux
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.72);
  vg.addColorStop(0, 'rgba(10,5,30,0)'); vg.addColorStop(1, 'rgba(10,5,30,.22)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
}
// Graine dont le décor diffère de celui d'avant (une image = un nouveau thème)
function seedAfter(prev) { let s; do { s = (Math.random() * 1e9) | 0; } while (prev != null && s % THEME_KEYS.length === prev % THEME_KEYS.length); return s; }
window.Scenes = { generate, draw, W, H, THEME_KEYS, seedAfter };
})();
