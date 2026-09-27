// Ofis sahnesi: masalar sabit, karakterler serbest dolaşır.
// Her karakterin sıralı bir eylem kuyruğu var: yürü → konuş → teslim et → dön.
// Görev geldiğinde boşta dolaşan karakter işini bırakıp masasına döner.
import { characterSVG } from './characters.js';

const STATE_TEXT = {
  idle: 'Boşta', thinking: 'Düşünüyor', working: 'Çalışıyor', done: 'Teslim etti', waiting: 'Onay bekliyor', away: 'Masada değil',
};
const STATE_CLASSES = ['is-thinking', 'is-working', 'is-done', 'is-waiting', 'is-talking'];
const W = 96, H = 120, SINK = 26; // karakter boyutu; masanın arkasına ne kadar gömülür
const SPEED = 420; // px/sn
const INCOMING_MAX_WAIT = 2500; // alıcı, evrak gelene kadar en fazla bu kadar bekler

const POIS = [
  { id: 'kahve', obj: '☕', label: 'Kahve', lines: ['Kahve molası ☕', 'Bir espresso, sonra devam!', 'Kafein yükleniyor…'] },
  { id: 'su', obj: '🚰', label: 'Su sebili', lines: ['Su içmeyi unutmayın 💧', 'Serinledim!'] },
  { id: 'pano', obj: '', label: 'İş panosu', lines: ['Panoda sıradaki işler 📋', 'Bu kartı “bitti”ye taşıyorum', 'Sprint planına bakıyorum'] },
  { id: 'kanepe', obj: '🛋️', label: 'Kanepe', lines: ['Beş dakika fikir molası 💭', 'İlham bekliyorum…'] },
  { id: 'yazici', obj: '🖨️', label: 'Yazıcı', lines: ['Çıktıyı alıyorum 🖨️', 'Kâğıt bitti mi yine?'] },
];
const HANDOFF_LINES = ['Buyur, hazır! 📄', 'Sıra sende! 👉', 'Teslim ediyorum ✨', 'Bunu sana bıraktım 🙌'];
const THANKS = ['Aldım! 📥', 'Teşekkürler! 👍', 'Hemen bakıyorum 👀', 'Süper, devralıyorum!'];

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function createOffice(root, roster, { onStatus } = {}) {
  const floor = root.querySelector('.floor');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const A = new Map(); // agentId -> { station, walker, pos, queue, state, home, walking, interrupt }

  floor.innerHTML = roster.map((a) => `
    <div class="station" data-agent="${a.id}" style="grid-area:${a.id}">
      <div class="seat"></div>
      <div class="desk"><div class="laptop"><div class="screen"></div></div></div>
      <div class="nameplate">${a.emoji} ${a.name}<small>${a.role}</small></div>
      <div class="state-label">${STATE_TEXT.idle}</div>
    </div>`).join('') + `
    <div class="lounge" aria-label="Dinlenme alanı">${POIS.map((p) => `<div class="poi ${p.id === 'pano' ? 'board' : ''}" data-poi="${p.id}">
      <span class="obj" aria-hidden="true">${p.id === 'pano' ? '<i></i><i></i><i></i><i></i><i></i><i></i>' : p.obj}</span>${p.label}</div>`).join('')}
    </div>`;

  for (const a of roster) {
    const walker = document.createElement('div');
    walker.className = 'walker';
    walker.dataset.agent = a.id;
    walker.setAttribute('aria-hidden', 'true');
    walker.innerHTML = `<div class="bubble"></div><div class="figure"><div class="flip">${characterSVG(a)}</div></div>
      <span class="carry">📄</span><span class="tag">${a.name}</span>`;
    floor.appendChild(walker);
    A.set(a.id, { agent: a, station: floor.querySelector(`.station[data-agent="${a.id}"]`), walker,
      pos: { x: 0, y: 0 }, queue: Promise.resolve(), state: 'idle', home: true, walking: false, interrupt: false, timer: null });
  }

  // ---------- Geometri ----------
  const rel = (el) => {
    const f = floor.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { left: r.left - f.left, top: r.top - f.top, right: r.right - f.left, bottom: r.bottom - f.top, width: r.width, height: r.height };
  };
  const homeOf = (id) => { const d = rel(A.get(id).station.querySelector('.desk')); return { x: d.left + d.width / 2 - W / 2, y: d.top - H + SINK }; };
  function visitSpot(id) { // alıcının masasının yanında ayakta durulacak yer
    const d = rel(A.get(id).station.querySelector('.desk'));
    const fw = floor.clientWidth;
    const x = d.right - 18 + W <= fw ? d.right - 18 : d.left - W + 18;
    return { x, y: d.top - H + 44 };
  }
  function poiSpot(poiId) {
    const p = rel(floor.querySelector(`[data-poi="${poiId}"]`));
    return { x: p.left + p.width / 2 - W / 2 + (Math.random() * 30 - 15), y: p.top - H + 34 };
  }

  // ---------- Hareket ----------
  function place(m, p, animMs = 0) {
    m.pos = p;
    m.walker.style.transitionDuration = `${animMs}ms`;
    m.walker.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px)`;
    m.walker.style.zIndex = m.home && !m.walking ? 2 : 10 + Math.round(p.y / 10);
  }

  // Koridor haritası: masa sıralarının önündeki yatay koridorlar ve masalar arasındaki dikey geçitler.
  function corridors() {
    const desks = [...A.values()].map((m) => rel(m.station.querySelector('.desk')));
    const stations = [...A.values()].map((m) => rel(m.station));
    const aisles = [...new Set(stations.map((r) => Math.round(r.bottom + 22)))].sort((a, b) => a - b); // ayak hizası
    const rows = new Map();
    for (const d of desks) { const k = Math.round(d.top / 20); rows.set(k, [...(rows.get(k) || []), d]); }
    const widest = [...rows.values()].sort((a, b) => b.length - a.length)[0].sort((a, b) => a.left - b.left);
    const edges = [0, ...widest.flatMap((d) => [d.left, d.right]), floor.clientWidth];
    const lanesX = [];
    for (let i = 0; i < edges.length; i += 2) lanesX.push((edges[i] + edges[i + 1]) / 2 - W / 2);
    return { aisles, lanesX };
  }

  function route(from, to) {
    const { aisles, lanesX } = corridors();
    const below = (y) => aisles.find((a) => a >= y + H - 12); // bu noktanın önündeki koridor (ayak hizası)
    const a1 = below(from.y) ?? from.y + H, a2 = below(to.y) ?? to.y + H;
    const pts = [{ x: from.x, y: a1 - H }];
    if (a1 !== a2) {
      const lx = lanesX.reduce((b, x) => (Math.abs(x - to.x) < Math.abs(b - to.x) ? x : b), lanesX[0]);
      pts.push({ x: lx, y: a1 - H }, { x: lx, y: a2 - H });
    }
    pts.push({ x: to.x, y: a2 - H }, to);
    return pts;
  }

  async function walkTo(m, target) {
    if (reduced) { place(m, target); return; }
    m.walking = true;
    m.walker.classList.add('walking', 'away');
    for (const p of route(m.pos, target)) {
      const dx = p.x - m.pos.x, dy = p.y - m.pos.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 2) continue;
      if (Math.abs(dx) > 2) m.walker.classList.toggle('face-left', dx < 0);
      const ms = (dist / SPEED) * 1000;
      place(m, p, ms);
      await wait(ms);
    }
    m.walking = false;
    m.walker.classList.remove('walking');
  }

  async function goHome(m) {
    if (m.home && !m.walking) return;
    await walkTo(m, homeOf(m.agent.id));
    m.home = true;
    m.walker.classList.remove('away', 'face-left');
    place(m, homeOf(m.agent.id));
    label(m);
  }

  const enqueue = (m, fn) => { m.queue = m.queue.then(fn).catch(() => {}); return m.queue; };

  // ---------- Konuşma ve durum ----------
  function say(id, html, ms = 3500) {
    const m = A.get(id);
    if (!m) return;
    const b = m.walker.querySelector('.bubble');
    b.innerHTML = html;
    b.classList.add('show');
    m.walker.classList.add('is-talking');
    clearTimeout(m.timer);
    if (ms) m.timer = setTimeout(() => { b.classList.remove('show'); m.walker.classList.remove('is-talking'); }, ms);
  }
  const dots = '<span class="dots"><span>.</span><span>.</span><span>.</span></span>';

  function label(m) {
    const text = !m.home && m.state === 'idle' ? STATE_TEXT.away : STATE_TEXT[m.state] || m.state;
    m.station.querySelector('.state-label').textContent = text;
  }

  function applyState(m, state, line) {
    m.state = state;
    for (const el of [m.station, m.walker]) {
      el.classList.remove(...STATE_CLASSES);
      if (state !== 'idle') el.classList.add(`is-${state}`);
    }
    label(m);
    if (state === 'thinking') say(m.agent.id, `${esc(line || '')} ${dots}`, 0);
    else if (state === 'working') say(m.agent.id, `⌨️ ${dots}`, 0);
    else if (state === 'done') say(m.agent.id, esc(line), 4200);
    else if (state === 'waiting') say(m.agent.id, esc(line), 0);
    else say(m.agent.id, '', 1);
    if (onStatus && state !== 'idle') onStatus(`${m.agent.emoji} ${m.agent.name} (${m.agent.role}): ${STATE_TEXT[state]}${line ? ' — ' + line : ''}`);
  }

  function setState(agentId, state, line) {
    if (agentId === 'all') { roster.forEach((a) => setState(a.id, 'idle')); return; }
    const m = A.get(agentId);
    if (!m) return;
    if (state === 'idle') { enqueue(m, async () => { if (m.state !== 'done') applyState(m, 'idle'); }); return; }
    m.interrupt = true; // dolaşıyorsa bıraksın
    enqueue(m, async () => {
      m.interrupt = false;
      if (state !== 'done') await goHome(m); // çalışmak/beklemek için masaya dön
      if (state === 'thinking' && m.incoming) { // evrak yoldaysa elime geçsin, sonra başlayayım
        await Promise.race([m.incoming, wait(INCOMING_MAX_WAIT)]);
        m.incoming = null;
      }
      applyState(m, state, line);
      if (state === 'done') setTimeout(() => { if (m.state === 'done') applyState(m, 'idle'); }, 4300);
    });
  }

  // Teslim: gönderen evrakı alır, alıcının masasına yürür, verir, masasına döner.
  function handoff(from, to, title) {
    const s = A.get(from), r = A.get(to);
    if (!s || !r) return;
    let arrived;
    r.incoming = new Promise((res) => { arrived = res; });
    enqueue(s, async () => {
      await wait(reduced ? 0 : 700); // "Teslim etti" balonu okunsun
      s.home = false;
      s.walker.classList.add('carrying');
      s.walker.querySelector('.carry').title = title;
      label(s);
      say(from, `📄 ${esc(title)}`, 0);
      await walkTo(s, visitSpot(to));
      s.walker.classList.toggle('face-left', s.pos.x > homeOf(to).x);
      say(from, pick(HANDOFF_LINES), 1800);
      await wait(reduced ? 0 : 450);
      s.walker.classList.remove('carrying');
      dropPaper(r, title);
      arrived();
      if (r.home && !r.walking) say(to, pick(THANKS), 1600);
      await wait(reduced ? 0 : 500);
      await goHome(s);
    }).finally(() => arrived()); // her durumda alıcıyı serbest bırak
  }

  function dropPaper(m, title) {
    const desk = m.station.querySelector('.desk');
    desk.querySelector('.desk-paper')?.remove();
    const p = document.createElement('span');
    p.className = 'desk-paper';
    p.textContent = '📄';
    p.title = title;
    desk.appendChild(p);
    setTimeout(() => p.remove(), 6000);
  }

  // ---------- Boşta hayat ----------
  const isFree = (m) => m.state === 'idle' && m.home && !m.walking && !m.interrupt;

  async function wander(m) {
    const poi = pick(POIS);
    m.home = false;
    label(m);
    await walkTo(m, poiSpot(poi.id));
    if (m.interrupt) return goHome(m);
    say(m.agent.id, esc(pick(poi.lines)), 2600);
    for (let t = 0; t < 30 && !m.interrupt; t++) await wait(100); // 3 sn bekle, görev gelirse erken dön
    await goHome(m);
  }

  async function chat(m, other) {
    m.home = false;
    label(m);
    await walkTo(m, visitSpot(other.agent.id));
    if (m.interrupt) return goHome(m);
    say(m.agent.id, pick(['Nasıl gidiyor? 😄', 'Öğlen ne yiyoruz?', 'Yeni kampanya fikrim var!', 'Şu renk paletine bir bak 🎨']), 2200);
    await wait(1200);
    if (isFree(other)) say(other.agent.id, pick(['Harika! 🙌', 'Bence de!', 'Anlat bakalım 👂', 'Kahve sonrası konuşalım ☕']), 2000);
    await wait(1400);
    await goHome(m);
  }

  if (!reduced) {
    setInterval(() => {
      if (document.hidden) return;
      const free = [...A.values()].filter(isFree);
      if (!free.length) return;
      const m = pick(free);
      const r = Math.random();
      if (r < 0.45) enqueue(m, () => wander(m));
      else if (r < 0.65 && free.length > 1) enqueue(m, () => chat(m, pick(free.filter((x) => x !== m))));
      else say(m.agent.id, esc(pick(m.agent.idle)), 2800);
    }, 5500);
  }

  // İlk yerleşim ve yeniden boyutlandırma
  const snapHome = () => { for (const m of A.values()) if (m.home && !m.walking) place(m, homeOf(m.agent.id)); };
  requestAnimationFrame(snapHome);
  new ResizeObserver(snapHome).observe(floor);

  return { setState, handoff, say, stateOf: (id) => A.get(id)?.state || 'idle' };
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
