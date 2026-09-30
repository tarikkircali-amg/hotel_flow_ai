'use strict';

// Bellek ici depo (demo modu). Postgres uygulamasiyla ayni arayuzu sunmali,
// cunku ajan ve panel kodu ikisini ayirt etmiyor.

const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DEMO_MOD = 'true';
const db = require('../src/db-bellek');

test.beforeEach(() => db.sifirla());

test('arama acilir ve ayni call_sid ikinci kez acilmaz', async () => {
  const a1 = await db.aramaBaslat({ callSid: 'X1', arayanNo: '+9051', mesaiDisi: true });
  const a2 = await db.aramaBaslat({ callSid: 'X1', sessionId: 'S9', arayanNo: '+9051', mesaiDisi: true });
  assert.equal(a1.id, a2.id, 'ayni cagri tekrar acilmamali');
  assert.equal(a2.session_id, 'S9');
});

test('randevu talebi kuyruga beklemede olarak duser', async () => {
  const a = await db.aramaBaslat({ callSid: 'X2', arayanNo: '+9052', mesaiDisi: true });
  await db.randevuTalebiEkle({
    aramaId: a.id, hastaAdi: 'Ayşe Yıldırım', telefon: '+9052', islem: 'diş taşı temizliği',
  });

  const kuyruk = await db.randevuKuyrugu();
  assert.equal(kuyruk.length, 1);
  assert.equal(kuyruk[0].durum, 'beklemede');
  assert.equal(kuyruk[0].hasta_adi, 'Ayşe Yıldırım');
  assert.equal(kuyruk[0].arayan_no, '+9052', 'arama bilgisi kuyruga baglanmali');
});

test('onaylanan talep bir daha onaylanamaz', async () => {
  const r = await db.randevuTalebiEkle({ hastaAdi: 'Mehmet Kaya', telefon: '+9053' });

  const ilk = await db.randevuKarar(r.id, { durum: 'onaylandi', onaylayan: 'klinik' });
  assert.equal(ilk.durum, 'onaylandi');
  assert.equal(ilk.onaylayan, 'klinik');

  const ikinci = await db.randevuKarar(r.id, { durum: 'reddedildi', onaylayan: 'klinik' });
  assert.equal(ikinci, null, 'islenmis talep tekrar islenememeli');

  assert.equal((await db.randevuKuyrugu()).length, 0, 'onaylanan kuyruktan cikmali');
});

test('acil olay kaydedilir ve gorulunce kuyruktan cikar', async () => {
  const o = await db.acilKaydet({
    arayanNo: '+9054', tetikleyen: 'kanama', hastaSozu: 'kanama var', yonlendirme: '+905321112233',
  });
  assert.equal((await db.acilKuyrugu()).length, 1);

  await db.acilGoruldu(o.id);
  assert.equal((await db.acilKuyrugu()).length, 0);
});

test('gecmis gorusmeler yalnizca ozeti olanlari ve ayni numarayi dondurur', async () => {
  const eski = await db.aramaBaslat({ callSid: 'E1', arayanNo: '+9055', mesaiDisi: true });
  await db.aramaBitir(eski.id, { durum: 'tamamlandi', ozet: 'İmplant fiyatı sordu.' });

  const ozetsiz = await db.aramaBaslat({ callSid: 'E2', arayanNo: '+9055', mesaiDisi: true });
  await db.aramaBitir(ozetsiz.id, { durum: 'tamamlandi' });

  const baskasi = await db.aramaBaslat({ callSid: 'E3', arayanNo: '+9099', mesaiDisi: true });
  await db.aramaBitir(baskasi.id, { durum: 'tamamlandi', ozet: 'Başka hasta.' });

  const simdiki = await db.aramaBaslat({ callSid: 'E4', arayanNo: '+9055', mesaiDisi: true });
  const gecmis = await db.gecmisGorusmeler('+9055', simdiki.id);

  assert.equal(gecmis.length, 1);
  assert.equal(gecmis[0].ozet, 'İmplant fiyatı sordu.');
});

test('oturum token duz metin saklanmaz', async () => {
  const { token } = await db.oturumAc('klinik', '127.0.0.1');
  assert.equal(await db.oturumDogrula(token), 'klinik');

  const anahtarlar = [...db.veri.oturumlar.keys()];
  assert.equal(anahtarlar.length, 1);
  assert.notEqual(anahtarlar[0], token, 'token hash lenerek saklanmali');
  assert.match(anahtarlar[0], /^[0-9a-f]{64}$/, 'sha256 hash bekleniyor');

  await db.oturumKapat(token);
  assert.equal(await db.oturumDogrula(token), null);
});

test('gecersiz token reddedilir', async () => {
  assert.equal(await db.oturumDogrula('uydurma'), null);
  assert.equal(await db.oturumDogrula(null), null);
});

test('aktarim niyeti tek kullanimliktir', async () => {
  await db.aktarimNiyetiYaz('X9', '+905321112233', 'ACİL: kanama');
  const ilk = await db.aktarimNiyetiOku('X9');
  assert.equal(ilk.hedef_no, '+905321112233');
  assert.equal(await db.aktarimNiyetiOku('X9'), null, 'ikinci okumada bos donmeli');
});

test('denetim kaydi dinleyiciye duyurulur', async () => {
  const gorulenler = [];
  const birak = db.dinle((o) => gorulenler.push(o));

  await db.denetim({ aktor: 'asistan', eylem: 'fiyat_sorgu', sonuc: 'band_yok' });
  birak();
  await db.denetim({ aktor: 'asistan', eylem: 'sonraki', sonuc: 'ok' });

  assert.equal(gorulenler.length, 1, 'birakildiktan sonra olay gelmemeli');
  assert.equal(gorulenler[0].eylem, 'fiyat_sorgu');
});

test('ozet sorgusu panel icin dogru sayilari verir', async () => {
  const a = await db.aramaBaslat({ callSid: 'S1', arayanNo: '+9056', mesaiDisi: true });
  await db.aramaBitir(a.id, { durum: 'aktarildi' });
  await db.randevuTalebiEkle({ hastaAdi: 'Test', telefon: '+9056' });
  await db.acilKaydet({ tetikleyen: 'apse', hastaSozu: 'apse var' });

  const { rows } = await db.sorgu(`SELECT (SELECT COUNT(*) ...) AS bekleyen_randevu`);
  assert.equal(rows[0].bekleyen_randevu, 1);
  assert.equal(rows[0].acil, 1);
  assert.equal(rows[0].son_24s_arama, 1);
  assert.equal(rows[0].son_24s_aktarim, 1);
});
