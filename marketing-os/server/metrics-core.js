// Ölçüm hesapları — saf fonksiyonlar (Node'a bağımlı değil; tarayıcı demosu da kullanır).
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const num = (v) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : NaN);

// Satırları doğrular; hatalı satırı atlamaz, tüm isteği reddeder (yarım veri yazılmasın).
function validateRows(rows) {
  if (!Array.isArray(rows) || !rows.length) return { error: 'En az bir satır veri gönderin.' };
  if (rows.length > 1000) return { error: 'Tek seferde en fazla 1000 satır gönderilebilir.' };
  const out = [];
  for (const [i, r] of rows.entries()) {
    const row = {
      day: String(r.day || '').trim(), channel: String(r.channel || '').trim().slice(0, 40),
      lang: String(r.lang || '').trim().toLowerCase().slice(0, 8),
      impressions: num(r.impressions ?? 0), clicks: num(r.clicks ?? 0), conversions: num(r.conversions ?? 0), spend: num(r.spend ?? 0),
    };
    if (!DAY.test(row.day)) return { error: `${i + 1}. satır: tarih YYYY-AA-GG biçiminde olmalı.` };
    if (!row.channel) return { error: `${i + 1}. satır: kanal adı eksik.` };
    if ([row.impressions, row.clicks, row.conversions, row.spend].some(Number.isNaN)) return { error: `${i + 1}. satır: sayılar 0 veya pozitif olmalı.` };
    out.push(row);
  }
  return { rows: out };
}

const ratio = (a, b) => (b > 0 ? a / b : null);
function kpis(t) {
  return { ctr: ratio(t.clicks, t.impressions), cvr: ratio(t.conversions, t.clicks), cpc: ratio(t.spend, t.clicks), cpa: ratio(t.spend, t.conversions) };
}

function summarize(rows) {
  const FIELDS = ['impressions', 'clicks', 'conversions', 'spend'];
  const zero = () => ({ impressions: 0, clicks: 0, conversions: 0, spend: 0 });
  const add = (acc, r) => { for (const k of FIELDS) acc[k] += r[k]; return acc; };
  const group = (key) => Object.values(rows.reduce((m, r) => {
    const k = key(r); m[k] = m[k] || { key: k, ...zero() }; add(m[k], r); return m;
  }, {})).map((g) => ({ ...g, ...kpis(g) }));
  const totals = rows.reduce(add, zero());
  return {
    totals: { ...totals, ...kpis(totals) },
    byDay: group((r) => r.day).sort((a, b) => a.key.localeCompare(b.key)),
    byChannel: group((r) => r.channel).sort((a, b) => b.clicks - a.clicks),
    byLang: group((r) => r.lang || '—').sort((a, b) => b.clicks - a.clicks),
  };
}

const NUM = new Intl.NumberFormat('tr-TR');
const n = (v) => NUM.format(v);
const PCT = new Intl.NumberFormat('tr-TR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (v) => (v == null ? '—' : PCT.format(v));
function money(v, cur) {
  if (v == null) return '—';
  try { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: cur }).format(v); } catch { return `${v.toFixed(2)} ${cur}`; }
}

function dataText(s, cur) {
  const line = (g) => `${g.key}: gösterim ${g.impressions}, tıklama ${g.clicks}, dönüşüm ${g.conversions}, harcama ${money(g.spend, cur)}, CTR ${pct(g.ctr)}, CPC ${money(g.cpc, cur)}, CPA ${money(g.cpa, cur)}`;
  return [`Para birimi: ${cur}`, `TOPLAM → ${line({ key: 'toplam', ...s.totals })}`,
    'KANAL:', ...s.byChannel.map(line), 'DİL:', ...s.byLang.map(line), 'GÜN:', ...s.byDay.map(line)].join('\n');
}

function demoReport(s, cur) {
  const best = s.byChannel[0];
  const cheapest = [...s.byChannel].filter((g) => g.cpa != null).sort((a, b) => a.cpa - b.cpa)[0];
  return `> ⚠️ **Demo modu:** Bu rapor kurallı bir özetle üretildi; AI yorumu için \`ANTHROPIC_API_KEY\` tanımlayın.\n\n## Özet
- Toplam ${n(s.totals.impressions)} gösterim, ${n(s.totals.clicks)} tıklama, ${n(s.totals.conversions)} dönüşüm; harcama ${money(s.totals.spend, cur)}.
- CTR ${pct(s.totals.ctr)}, CPC ${money(s.totals.cpc, cur)}, CPA ${money(s.totals.cpa, cur)}.
- En çok tıklama: **${best?.key || '—'}**${cheapest ? `; en düşük CPA: **${cheapest.key}** (${money(cheapest.cpa, cur)})` : ''}.

## Kanal karşılaştırması
| Kanal | Gösterim | Tıklama | Dönüşüm | CTR | CPA |
|---|---|---|---|---|---|
${s.byChannel.map((g) => `| ${g.key} | ${n(g.impressions)} | ${n(g.clicks)} | ${n(g.conversions)} | ${pct(g.ctr)} | ${money(g.cpa, cur)} |`).join('\n')}

## Önerilen aksiyon (öneri — karar sizde)
- Bütçeyi düşük CPA'lı kanala kaydırmayı değerlendirin; kararı en az 7 günlük veriyle verin.`;
}

module.exports = { validateRows, summarize, kpis, dataText, demoReport, pct, money };
