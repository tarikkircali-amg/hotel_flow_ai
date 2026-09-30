'use strict';

// BELLEK ICI DEPO - yalnizca DEMO MODU icin.
//
// src/db.js ile ayni arayuzu sunar, boylece ajan ve panel kodu demo ile
// gercek kurulum arasinda hicbir fark gormez. Surec kapaninca veri ucar;
// demo icin istenen davranis budur - hasta verisi diskte kalmaz.

const crypto = require('node:crypto');

const uuid = () => crypto.randomUUID();
const simdi = () => new Date();

const veri = {
  aramalar: new Map(),
  mesajlar: [],
  randevular: new Map(),
  aciller: new Map(),
  rizalar: [],
  denetim: [],
  oturumlar: new Map(),
  aktarimlar: new Map(),
};

function sifirla() {
  for (const k of Object.keys(veri)) {
    if (veri[k] instanceof Map) veri[k].clear();
    else veri[k].length = 0;
  }
}

// Demo ekrani "bu cagrida neler oldu" panelini bundan besliyor.
const dinleyiciler = new Set();
function olayDuyur(olay) {
  for (const d of dinleyiciler) {
    try {
      d(olay);
    } catch {
      /* dinleyici hatasi akisi bozmasin */
    }
  }
}
const dinle = (fn) => {
  dinleyiciler.add(fn);
  return () => dinleyiciler.delete(fn);
};

// --- Denetim -------------------------------------------------------------
async function denetim(kayit) {
  const satir = { id: veri.denetim.length + 1, ...kayit, olusturma: simdi() };
  veri.denetim.push(satir);
  olayDuyur({ tur: 'denetim', ...satir });
}

// --- Aramalar ------------------------------------------------------------
async function aramaBaslat({ callSid, sessionId, kanal, arayanNo, arananNo, dil, mesaiDisi }) {
  const mevcut = [...veri.aramalar.values()].find((a) => a.call_sid === callSid);
  if (mevcut) {
    mevcut.session_id = sessionId ?? mevcut.session_id;
    return mevcut;
  }
  const kayit = {
    id: uuid(),
    call_sid: callSid,
    session_id: sessionId ?? null,
    kanal: kanal ?? 'telefon',
    arayan_no: arayanNo ?? null,
    aranan_no: arananNo ?? null,
    dil: dil ?? null,
    mesai_disi: mesaiDisi,
    durum: 'devam',
    aktarim_sebebi: null,
    baslangic: simdi(),
    bitis: null,
    ozet: null,
  };
  veri.aramalar.set(kayit.id, kayit);
  return kayit;
}

async function aramaBitir(aramaId, { durum, aktarimSebebi, ozet }) {
  const a = veri.aramalar.get(aramaId);
  if (!a) return;
  a.durum = durum;
  a.aktarim_sebebi = aktarimSebebi ?? a.aktarim_sebebi;
  a.ozet = ozet ?? a.ozet;
  a.bitis = simdi();
}

async function mesajEkle(aramaId, yon, metin) {
  if (!metin || !String(metin).trim()) return;
  veri.mesajlar.push({
    id: veri.mesajlar.length + 1,
    arama_id: aramaId,
    yon,
    metin: String(metin).trim(),
    olusturma: simdi(),
  });
}

async function gecmisGorusmeler(arayanNo, haricAramaId, limit = 3) {
  if (!arayanNo) return [];
  return [...veri.aramalar.values()]
    .filter((a) => a.arayan_no === arayanNo && a.id !== haricAramaId && a.ozet)
    .sort((x, y) => y.baslangic - x.baslangic)
    .slice(0, limit)
    .map((a) => ({ id: a.id, baslangic: a.baslangic, ozet: a.ozet }));
}

// --- Randevu talepleri ---------------------------------------------------
async function randevuTalebiEkle(t) {
  const kayit = {
    id: uuid(),
    arama_id: t.aramaId ?? null,
    hasta_adi: t.hastaAdi,
    telefon: t.telefon,
    islem: t.islem ?? null,
    tercih_tarih: t.tercihTarih ?? null,
    tercih_saat: t.tercihSaat ?? null,
    not_metni: t.not ?? null,
    yeni_hasta: t.yeniHasta ?? null,
    durum: 'beklemede',
    aktarim_durumu: 'aktarilmadi',
    onaylayan: null,
    onay_zamani: null,
    olusturma: simdi(),
  };
  veri.randevular.set(kayit.id, kayit);
  olayDuyur({ tur: 'randevu', kayit });
  return kayit;
}

async function randevuKuyrugu({ durum = 'beklemede', limit = 100 } = {}) {
  return [...veri.randevular.values()]
    .filter((r) => r.durum === durum)
    .sort((a, b) => b.olusturma - a.olusturma)
    .slice(0, limit)
    .map((r) => {
      const a = r.arama_id ? veri.aramalar.get(r.arama_id) : null;
      return { ...r, arayan_no: a?.arayan_no ?? null, arama_baslangic: a?.baslangic ?? null };
    });
}

async function randevuKarar(id, { durum, onaylayan }) {
  const r = veri.randevular.get(id);
  if (!r || r.durum !== 'beklemede') return null;
  r.durum = durum;
  r.onaylayan = onaylayan;
  r.onay_zamani = simdi();
  return r;
}

// --- Acil ----------------------------------------------------------------
async function acilKaydet({ aramaId, arayanNo, tetikleyen, hastaSozu, yonlendirme }) {
  const kayit = {
    id: uuid(),
    arama_id: aramaId ?? null,
    arayan_no: arayanNo ?? null,
    tetikleyen,
    hasta_sozu: hastaSozu,
    yonlendirme: yonlendirme ?? null,
    goruldu: false,
    olusturma: simdi(),
  };
  veri.aciller.set(kayit.id, kayit);
  olayDuyur({ tur: 'acil', kayit });
  return kayit;
}

async function acilKuyrugu(limit = 50) {
  return [...veri.aciller.values()]
    .filter((a) => !a.goruldu)
    .sort((a, b) => b.olusturma - a.olusturma)
    .slice(0, limit);
}

async function acilGoruldu(id) {
  const a = veri.aciller.get(id);
  if (a) a.goruldu = true;
}

// --- Riza ----------------------------------------------------------------
async function rizaKaydet(r) {
  veri.rizalar.push({ id: uuid(), ...r, olusturma: simdi() });
}

// --- Aktarim -------------------------------------------------------------
async function aktarimNiyetiYaz(callSid, hedefNo, sebep) {
  veri.aktarimlar.set(callSid, { call_sid: callSid, hedef_no: hedefNo, sebep, olusturma: simdi() });
  olayDuyur({ tur: 'aktarim', hedef: hedefNo, sebep });
}

async function aktarimNiyetiOku(callSid) {
  const k = veri.aktarimlar.get(callSid) ?? null;
  veri.aktarimlar.delete(callSid);
  return k;
}

// --- Panel oturumu -------------------------------------------------------
const tokenHash = (t) => crypto.createHash('sha256').update(t).digest('hex');

async function oturumAc(kullanici, ip, saat = 12) {
  const token = crypto.randomBytes(32).toString('base64url');
  const gecerlilik = new Date(Date.now() + saat * 3600_000);
  veri.oturumlar.set(tokenHash(token), { kullanici, ip, gecerlilik });
  return { token, gecerlilik };
}

async function oturumDogrula(token) {
  if (!token) return null;
  const o = veri.oturumlar.get(tokenHash(token));
  if (!o || o.gecerlilik < simdi()) return null;
  return o.kullanici;
}

async function oturumKapat(token) {
  if (token) veri.oturumlar.delete(tokenHash(token));
}

async function suresiGecenOturumlariSil() {
  for (const [k, o] of veri.oturumlar) if (o.gecerlilik < simdi()) veri.oturumlar.delete(k);
}

// --- Panel'in kullandigi ham sorgular ------------------------------------
// Demo modunda SQL yok; panel'in ihtiyac duydugu birkac sorguyu taklit ediyoruz.
async function sorgu(metin) {
  const s = metin.replace(/\s+/g, ' ').trim();

  if (s === 'SELECT 1') return { rows: [{ '?column?': 1 }] };

  if (s.includes('bekleyen_randevu')) {
    const dun = new Date(Date.now() - 86400000);
    return {
      rows: [
        {
          bekleyen_randevu: [...veri.randevular.values()].filter((r) => r.durum === 'beklemede').length,
          acil: [...veri.aciller.values()].filter((a) => !a.goruldu).length,
          son_24s_arama: [...veri.aramalar.values()].filter((a) => a.baslangic > dun).length,
          son_24s_aktarim: [...veri.aramalar.values()].filter(
            (a) => a.baslangic > dun && a.durum === 'aktarildi'
          ).length,
        },
      ],
    };
  }

  if (s.startsWith('SELECT id, arayan_no, baslangic')) {
    return {
      rows: [...veri.aramalar.values()]
        .sort((a, b) => b.baslangic - a.baslangic)
        .slice(0, 100),
    };
  }

  if (s.startsWith('SELECT * FROM aramalar WHERE id')) {
    return { rows: [] }; // asagidaki ozel yol kullanilir
  }

  return { rows: [] };
}

// Panel'in dokum ucu icin dogrudan erisim (SQL taklidi yerine acik fonksiyon).
async function aramaGetir(id) {
  const a = veri.aramalar.get(id);
  if (!a) return null;
  return { arama: a, mesajlar: veri.mesajlar.filter((m) => m.arama_id === id) };
}

module.exports = {
  bellekModu: true,
  veri,
  sifirla,
  dinle,
  sorgu,
  aramaGetir,
  denetim,
  aramaBaslat,
  aramaBitir,
  mesajEkle,
  gecmisGorusmeler,
  randevuTalebiEkle,
  randevuKuyrugu,
  randevuKarar,
  acilKaydet,
  acilKuyrugu,
  acilGoruldu,
  rizaKaydet,
  aktarimNiyetiYaz,
  aktarimNiyetiOku,
  oturumAc,
  oturumDogrula,
  oturumKapat,
  suresiGecenOturumlariSil,
  havuz: { end: async () => {} },
};
