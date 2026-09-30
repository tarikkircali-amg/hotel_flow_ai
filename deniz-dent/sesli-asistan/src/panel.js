'use strict';

// SABAH TESLIM PANELI
//
// Ekip sabah geldiginde gece ne oldugunu tek ekranda gorur:
// acil olaylar, bekleyen randevu talepleri, gorusme dokumleri.
// Randevu onayi bir INSAN karari - asistan onaylamaz.

const express = require('express');
const bcrypt = require('bcryptjs');
const path = require('node:path');
const db = require('./db');
const config = require('./config');

// Giris denemesi sinirlamasi (basit, tek surec icin yeterli).
const denemeler = new Map(); // ip -> { sayi, ilk }
const AZAMI_DENEME = 10;
const PENCERE_MS = 10 * 60 * 1000;

function girisSiniri(req, res, next) {
  const ip = req.ip || 'bilinmeyen';
  const simdi = Date.now();
  const kayit = denemeler.get(ip);

  if (kayit && simdi - kayit.ilk < PENCERE_MS && kayit.sayi >= AZAMI_DENEME) {
    return res.status(429).json({
      hata: 'Çok fazla deneme yapıldı. 10 dakika sonra tekrar deneyin.',
    });
  }
  if (!kayit || simdi - kayit.ilk >= PENCERE_MS) {
    denemeler.set(ip, { sayi: 0, ilk: simdi });
  }
  return next();
}

function denemeArtir(ip) {
  const kayit = denemeler.get(ip);
  if (kayit) kayit.sayi += 1;
}

function tokenAl(req) {
  const baslik = req.header('Authorization');
  if (baslik?.startsWith('Bearer ')) return baslik.slice(7);
  return req.header('X-Oturum') || null;
}

async function oturumGerekli(req, res, next) {
  const kullanici = await db.oturumDogrula(tokenAl(req));
  if (!kullanici) {
    return res.status(401).json({ hata: 'Oturum geçersiz veya süresi dolmuş. Tekrar giriş yapın.' });
  }
  req.kullanici = kullanici;
  return next();
}

function yonlendirici() {
  const r = express.Router();

  r.use(express.json({ limit: '256kb' }));

  // --- Giris / cikis ---
  r.post('/api/giris', girisSiniri, async (req, res) => {
    const { kullanici, parola } = req.body ?? {};
    const ip = req.ip;

    const kullaniciDogru = kullanici === config.panel.kullanici;
    // Kullanici adi yanlis olsa da hash karsilastirmasi yapiyoruz:
    // yanit suresinden kullanici adi tahmini yapilmasin.
    const parolaDogru = await bcrypt.compare(String(parola ?? ''), config.panel.parolaHash);

    if (!kullaniciDogru || !parolaDogru) {
      denemeArtir(ip);
      await db.denetim({
        aktor: `panel:${kullanici ?? '?'}`,
        eylem: 'giris',
        ip,
        sonuc: 'basarisiz',
      });
      return res.status(401).json({ hata: 'Kullanıcı adı veya parola hatalı.' });
    }

    const { token, gecerlilik } = await db.oturumAc(kullanici, ip);
    await db.denetim({ aktor: `panel:${kullanici}`, eylem: 'giris', ip, sonuc: 'basarili' });
    return res.json({ token, gecerlilik });
  });

  r.post('/api/cikis', oturumGerekli, async (req, res) => {
    await db.oturumKapat(tokenAl(req));
    await db.denetim({ aktor: `panel:${req.kullanici}`, eylem: 'cikis', ip: req.ip, sonuc: 'ok' });
    res.json({ ok: true });
  });

  // --- Gece ozeti ---
  r.get('/api/ozet', oturumGerekli, async (req, res, next) => {
    try {
      const { rows } = await db.sorgu(`
        SELECT
          (SELECT COUNT(*) FROM randevu_talepleri WHERE durum = 'beklemede')          AS bekleyen_randevu,
          (SELECT COUNT(*) FROM acil_olaylar WHERE goruldu = FALSE)                   AS acil,
          (SELECT COUNT(*) FROM aramalar WHERE baslangic > now() - INTERVAL '24 hours') AS son_24s_arama,
          (SELECT COUNT(*) FROM aramalar
             WHERE baslangic > now() - INTERVAL '24 hours' AND durum = 'aktarildi')   AS son_24s_aktarim
      `);
      res.json(rows[0]);
    } catch (err) {
      next(err);
    }
  });

  // --- Randevu kuyrugu ---
  r.get('/api/randevular', oturumGerekli, async (req, res, next) => {
    try {
      const durum = ['beklemede', 'onaylandi', 'reddedildi'].includes(req.query.durum)
        ? req.query.durum
        : 'beklemede';
      res.json(await db.randevuKuyrugu({ durum }));
    } catch (err) {
      next(err);
    }
  });

  for (const [yol, durum] of [
    ['onayla', 'onaylandi'],
    ['reddet', 'reddedildi'],
  ]) {
    r.post(`/api/randevular/:id/${yol}`, oturumGerekli, async (req, res, next) => {
      try {
        const kayit = await db.randevuKarar(req.params.id, { durum, onaylayan: req.kullanici });
        if (!kayit) {
          return res.status(409).json({ hata: 'Bu talep zaten işlenmiş veya bulunamadı.' });
        }
        await db.denetim({
          aktor: `panel:${req.kullanici}`,
          eylem: `randevu_${durum}`,
          kaynak: 'randevu_talebi',
          kaynakId: kayit.id,
          ip: req.ip,
          sonuc: 'ok',
        });
        return res.json(kayit);
      } catch (err) {
        return next(err);
      }
    });
  }

  // --- Acil olaylar ---
  r.get('/api/acil', oturumGerekli, async (req, res, next) => {
    try {
      res.json(await db.acilKuyrugu());
    } catch (err) {
      next(err);
    }
  });

  r.post('/api/acil/:id/goruldu', oturumGerekli, async (req, res, next) => {
    try {
      await db.acilGoruldu(req.params.id);
      await db.denetim({
        aktor: `panel:${req.kullanici}`,
        eylem: 'acil_goruldu',
        kaynak: 'acil_olay',
        kaynakId: req.params.id,
        ip: req.ip,
        sonuc: 'ok',
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // --- Gorusme dokumu ---
  r.get('/api/aramalar', oturumGerekli, async (req, res, next) => {
    try {
      const { rows } = await db.sorgu(
        `SELECT id, arayan_no, baslangic, bitis, durum, aktarim_sebebi, ozet, mesai_disi
           FROM aramalar ORDER BY baslangic DESC LIMIT 100`
      );
      res.json(rows);
    } catch (err) {
      next(err);
    }
  });

  r.get('/api/aramalar/:id', oturumGerekli, async (req, res, next) => {
    try {
      let arama;
      let mesajlar;

      if (db.aramaGetir) {
        // Bellek modu (demo)
        const k = await db.aramaGetir(req.params.id);
        if (!k) return res.status(404).json({ hata: 'Arama bulunamadı.' });
        arama = [k.arama];
        mesajlar = k.mesajlar;
      } else {
        ({ rows: arama } = await db.sorgu(`SELECT * FROM aramalar WHERE id = $1`, [req.params.id]));
        if (!arama[0]) return res.status(404).json({ hata: 'Arama bulunamadı.' });
        ({ rows: mesajlar } = await db.sorgu(
          `SELECT yon, metin, olusturma FROM mesajlar WHERE arama_id = $1 ORDER BY id`,
          [req.params.id]
        ));
      }
      await db.denetim({
        aktor: `panel:${req.kullanici}`,
        eylem: 'dokum_goruntule',
        kaynak: 'arama',
        kaynakId: req.params.id,
        ip: req.ip,
        sonuc: 'ok',
      });
      return res.json({ arama: arama[0], mesajlar });
    } catch (err) {
      return next(err);
    }
  });

  // --- Statik ekran ---
  r.use('/', express.static(path.join(__dirname, '..', 'public')));

  return r;
}

module.exports = { yonlendirici, oturumGerekli };
