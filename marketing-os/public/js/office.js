// Ofis sahnesi: istasyonları çizer, canlı olaylara göre karakterleri canlandırır.
import { characterSVG } from './characters.js';

const STATE_TEXT = {
  idle: 'Boşta', thinking: 'Düşünüyor', working: 'Çalışıyor', done: 'Teslim etti', waiting: 'Onay bekliyor',
};
const STATE_CLASSES = ['is-thinking', 'is-working', 'is-done', 'is-waiting', 'is-talking'];

export function createOffice(root, roster, { onStatus } = {}) {
  const floor = root.querySelector('.floor');
  const stations = new Map();
  const bubbleTimers = new Map();
  const busy = new Set();
  const states = new Map();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  floor.innerHTML = roster.map((a) => `
    <div class="station" data-agent="${a.id}" style="grid-area:${a.id}">
      <div class="bubble" aria-hidden="true"></div>
      <div class="char">${characterSVG(a)}</div>
      <div class="desk"><div class="laptop"><div class="screen"></div></div></div>
      <div class="nameplate">${a.emoji} ${a.name}<small>${a.role}</small></div>
      <div class="state-label">${STATE_TEXT.idle}</div>
    </div>`).join('');
  floor.querySelectorAll('.station').forEach((el) => stations.set(el.dataset.agent, el));

  function say(agentId, html, ms = 3500) {
    const st = stations.get(agentId);
    if (!st) return;
    const b = st.querySelector('.bubble');
    b.innerHTML = html;
    b.classList.add('show');
    st.classList.add('is-talking');
    clearTimeout(bubbleTimers.get(agentId));
    if (ms) bubbleTimers.set(agentId, setTimeout(() => { b.classList.remove('show'); st.classList.remove('is-talking'); }, ms));
  }

  function setState(agentId, state, line) {
    if (agentId === 'all') { roster.forEach((a) => setState(a.id, 'idle')); return; }
    const st = stations.get(agentId);
    if (!st) return;
    st.classList.remove(...STATE_CLASSES);
    if (state !== 'idle') st.classList.add(`is-${state}`);
    st.querySelector('.state-label').textContent = STATE_TEXT[state] || state;
    states.set(agentId, state);
    if (state === 'idle') busy.delete(agentId); else busy.add(agentId);
    if (state === 'thinking') say(agentId, `${esc(line || '')} <span class="dots"><span>.</span><span>.</span><span>.</span></span>`, 0);
    else if (state === 'working') say(agentId, '⌨️ <span class="dots"><span>.</span><span>.</span><span>.</span></span>', 0);
    else if (state === 'done') { say(agentId, esc(line), 4200); setTimeout(() => setState(agentId, 'idle'), 4300); }
    else if (state === 'waiting') say(agentId, esc(line), 0);
    else if (state === 'idle') say(agentId, '', 1);
    const a = roster.find((r) => r.id === agentId);
    if (onStatus && state !== 'idle') onStatus(`${a.emoji} ${a.name} (${a.role}): ${STATE_TEXT[state]}${line ? ' — ' + line : ''}`);
  }

  // Evrak, gönderen masadan alıcı masaya kavis çizerek uçar; gönderen öne doğru bir adım atar.
  function handoff(from, to, title) {
    const a = stations.get(from), b = stations.get(to);
    if (!a || !b || reduced) return;
    const box = root.getBoundingClientRect();
    const p = (el) => { const r = el.querySelector('.desk').getBoundingClientRect(); return { x: r.left - box.left + r.width / 2 - 13, y: r.top - box.top - 30 }; };
    const s = p(a), e = p(b);
    const paper = document.createElement('div');
    paper.className = 'paper';
    paper.innerHTML = `📄<small>${esc(title)}</small>`;
    root.appendChild(paper);
    const midY = Math.min(s.y, e.y) - 80;
    paper.animate([
      { transform: `translate(${s.x}px, ${s.y}px) rotate(0deg)` },
      { transform: `translate(${(s.x + e.x) / 2}px, ${midY}px) rotate(180deg)`, offset: .5 },
      { transform: `translate(${e.x}px, ${e.y}px) rotate(360deg)` },
    ], { duration: 1300, easing: 'ease-in-out' }).onfinish = () => paper.remove();
    const ch = a.querySelector('.char');
    const dx = Math.max(-40, Math.min(40, (e.x - s.x) / 6));
    ch.style.transform = `translateX(${dx}px)`;
    setTimeout(() => { ch.style.transform = ''; }, 900);
    setTimeout(() => say(to, 'Aldım! 📥', 1500), 1300);
  }

  // Boştaki karakterler ara sıra kendi kendine konuşur — ofis "yaşıyor" hissi.
  setInterval(() => {
    const idle = roster.filter((a) => !busy.has(a.id));
    if (!idle.length || document.hidden) return;
    const a = idle[Math.floor(Math.random() * idle.length)];
    say(a.id, esc(a.idle[Math.floor(Math.random() * a.idle.length)]), 2800);
  }, 7000);

  return { setState, handoff, say, stateOf: (id) => states.get(id) || 'idle' };
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
