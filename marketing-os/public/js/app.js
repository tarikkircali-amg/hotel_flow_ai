// Uygulama girişi: oturum, canlı olaylar, sekmeler.
import { api } from './api.js';
import { createOffice, esc } from './office.js';
import { renderCampaigns, renderProjects, openBrief, openProject, openCampaign, toast } from './panels.js';

const $ = (s) => document.querySelector(s);
const ICON = { deliverable: '📄', start: '🚀', approval: '🟠', error: '⚠️', decision: '👑' };
const state = { roster: [], projects: [], office: null, es: null };

async function boot() {
  applyTheme();
  try {
    const me = await api('/me');
    startApp(me);
  } catch (err) {
    if (err.status === 401) showLogin(); else toast(err.message);
  }
}

function showLogin() {
  $('#app-view').hidden = true;
  $('#login-view').hidden = false;
  $('#lg-user').focus();
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#login-error').textContent = '';
  try {
    await api('/login', { method: 'POST', body: { username: $('#lg-user').value, pass: $('#lg-pass').value } });
    startApp(await api('/me'));
  } catch (err) { $('#login-error').textContent = err.message; }
});

function startApp(me) {
  $('#login-view').hidden = true;
  $('#app-view').hidden = false;
  state.roster = me.roster;
  const badge = $('#mode-badge');
  badge.className = `badge ${me.mode === 'ai' ? 'badge-ai' : 'badge-demo'}`;
  badge.textContent = me.mode === 'ai' ? '✨ AI modu' : '🧪 Demo modu';
  badge.title = me.mode === 'ai' ? `Model: ${me.model}` : 'ANTHROPIC_API_KEY tanımlı değil — şablon çıktı üretiliyor';
  state.office = createOffice($('.office'), me.roster, { onStatus: (t) => { $('#live').textContent = t; $('#now-working').textContent = t; } });
  connectEvents();
  refresh();
  loadFeed();
}

async function refresh() {
  const [camps, projects] = await Promise.all([api('/campaigns'), api('/projects')]);
  state.projects = projects;
  renderCampaigns(camps);
  renderProjects(projects);
  // Onay bekleyen iş varsa müdür el sallayarak bekler; yoksa dinlenir.
  const waiting = camps.some((c) => c.status === 'onay_bekliyor');
  const running = camps.some((c) => c.status === 'calisiyor');
  if (waiting && !running) state.office.setState('mudur', 'waiting', 'Onayınızı bekliyoruz 🙌');
  else if (!waiting && state.office.stateOf('mudur') === 'waiting') state.office.setState('mudur', 'idle');
}

function feedItem(a) {
  const agent = state.roster.find((r) => r.id === a.agentId);
  const time = new Date(a.at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  return `<li><span class="ic" aria-hidden="true">${ICON[a.kind] || agent?.emoji || '•'}</span><span>${esc(a.text)}<br><span class="muted">${time}</span></span></li>`;
}

async function loadFeed() {
  const list = await api('/activity');
  $('#feed').innerHTML = list.map(feedItem).join('') || '<li class="empty">Henüz hareket yok.</li>';
}

function connectEvents() {
  state.es?.close();
  const es = new EventSource('/api/events');
  state.es = es;
  es.addEventListener('agent', (e) => { const d = JSON.parse(e.data); state.office.setState(d.agentId, d.state, d.line); });
  es.addEventListener('handoff', (e) => { const d = JSON.parse(e.data); state.office.handoff(d.from, d.to, d.title); });
  es.addEventListener('campaign', (e) => {
    const d = JSON.parse(e.data);
    refresh();
    if (d.status === 'onay_bekliyor') toast('🟠 Yeni iş onayınızı bekliyor!');
    if (d.status === 'hata') $('#now-working').textContent = '⚠️ Bir adım başarısız oldu — kampanyayı açıp yeniden deneyin.';
    if (d.status === 'onay_bekliyor') $('#now-working').textContent = '🟠 Ekip işi bitirdi, onay kutunuzu kontrol edin.';
  });
  es.addEventListener('activity', (e) => {
    const feed = $('#feed');
    feed.querySelector('.empty')?.remove();
    feed.insertAdjacentHTML('afterbegin', feedItem(JSON.parse(e.data)));
  });
  es.onerror = () => { $('#now-working').textContent = '🔌 Canlı bağlantı koptu, yeniden bağlanılıyor…'; };
}

// Sekmeler (klavye: sol/sağ ok)
const tabs = [...document.querySelectorAll('[role=tab]')];
function select(tab) {
  tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
  });
  tab.focus();
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => select(t));
  t.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') select(tabs[(i + 1) % tabs.length]);
    if (e.key === 'ArrowLeft') select(tabs[(i - 1 + tabs.length) % tabs.length]);
  });
});

document.addEventListener('click', (e) => {
  const open = e.target.closest('[data-open]');
  if (open) openCampaign(Number(open.dataset.open), state.roster, refresh).catch((err) => toast(err.message));
  const proj = e.target.closest('[data-project]');
  if (proj) openProject(state.projects.find((p) => String(p.id) === proj.dataset.project), refresh);
});
$('#new-brief').addEventListener('click', () => openBrief(state.projects, refresh));
$('#logout').addEventListener('click', async () => { await api('/logout', { method: 'POST' }).catch(() => {}); state.es?.close(); location.reload(); });

function applyTheme() {
  let t = null;
  try { t = localStorage.getItem('mos-theme'); } catch { /* depolama kapalı olabilir */ }
  if (t) document.documentElement.dataset.theme = t;
}
$('#theme-toggle').addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme === 'dark' ||
    (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  const next = dark ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('mos-theme', next); } catch { /* yoksay */ }
});

boot();
