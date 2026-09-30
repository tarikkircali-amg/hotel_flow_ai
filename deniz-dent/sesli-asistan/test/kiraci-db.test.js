'use strict';

// KIRACI IZOLASYONU - GERCEK VERITABANI TESTI (spesifikasyon §10, §22)
//
// test/kiraci.test.js semanin dogru YAZILDIGINI kontrol eder; bu dosya
// izolasyonun gercekten CALISTIGINI kontrol eder. Ikisi farkli sey:
// dogru gorunen bir politika yanlis rolle calistiginda hicbir sey korumaz.
//
// Calistirmak icin bos bir veritabani gerekir:
//
//   TEST_DATABASE_URL=postgres://postgres@localhost:5432/dentest \
//     node --test test/kiraci-db.test.js
//
// TEST_DATABASE_URL yoksa testler ATLANIR - normal "npm test" akisini
// veritabani sartina baglamiyoruz.
//
// DIKKAT: Bu test verdigi veritabanindaki tablolari DUSURUR. Uretim
// veritabanina asla baglamayin.

process.env.DEMO_MOD = 'true';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const URL = process.env.TEST_DATABASE_URL;
const ATLA = !URL;

const A = '00000000-0000-4000-8000-000000000001';
const B = '00000000-0000-4000-8000-000000000002';

let Client;
if (!ATLA) ({ Client } = require('pg'));

/** Super kullanici RLS'i atlar; uygulama rolu ile baglaniyoruz. */
async function baglan(kullanici) {
  const c = new Client({ connectionString: kullaniciyiDegistir(URL, kullanici) });
  await c.connect();
  return c;
}

/** Ayni veritabanina farkli rolle baglanmak icin URL'deki kullaniciyi degistirir. */
function kullaniciyiDegistir(ham, kullanici) {
  if (!kullanici) return ham;
  const u = new (require('node:url').URL)(ham);
  u.username = kullanici;
  u.password = '';
  return u.toString();
}

async function kur() {
  const yonetici = new Client({ connectionString: URL });
  await yonetici.connect();

  // Temiz baslangic.
  await yonetici.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');

  const sema = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  await yonetici.query(sema);

  await yonetici.query(`
    DROP ROLE IF EXISTS uygulama_test;
    CREATE ROLE uygulama_test LOGIN;
    GRANT USAGE ON SCHEMA public TO uygulama_test;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO uygulama_test;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO uygulama_test;
  `);
  await yonetici.query(
    `INSERT INTO kiracilar (id, ad) VALUES ($1,'Ikinci Klinik') ON CONFLICT DO NOTHING`,
    [B]
  );

  // Rolun RLS'i atlamadigindan emin olalim - atlarsa test yalanci gecerdi.
  const { rows } = await yonetici.query(
    `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'uygulama_test'`
  );
  assert.strictEqual(rows[0].rolsuper, false, 'test rolu super kullanici olmamali');
  assert.strictEqual(rows[0].rolbypassrls, false, 'test rolu RLS atlamamali');

  await yonetici.end();
}

test('kiraci izolasyonu - gercek veritabani', { skip: ATLA && 'TEST_DATABASE_URL yok' }, async (t) => {
  await kur();
  const c = await baglan('uygulama_test');
  t.after(() => c.end());

  await t.test('A kendi kaydini yazar ve gorur', async () => {
    await c.query(`SET app.kiraci = '${A}'`);
    await c.query(`INSERT INTO aramalar (call_sid, arayan_no) VALUES ('CA_A','+905321112233')`);
    const { rows } = await c.query('SELECT count(*)::int n FROM aramalar');
    assert.strictEqual(rows[0].n, 1);
  });

  await t.test('B, A nin kaydini GOREMEZ', async () => {
    await c.query(`SET app.kiraci = '${B}'`);
    const { rows } = await c.query('SELECT count(*)::int n FROM aramalar');
    assert.strictEqual(rows[0].n, 0, 'capraz kiraci sizintisi');
  });

  await t.test('A, B nin kaydini GOREMEZ', async () => {
    await c.query(`SET app.kiraci = '${B}'`);
    await c.query(`INSERT INTO aramalar (call_sid) VALUES ('CA_B')`);
    await c.query(`SET app.kiraci = '${A}'`);
    const { rows } = await c.query('SELECT call_sid FROM aramalar');
    assert.deepStrictEqual(rows.map((r) => r.call_sid), ['CA_A']);
  });

  await t.test('kiraci ayari yoksa YAZILAMAZ - fail closed', async () => {
    // Postgres detayi: RESET ayari SILMEZ, bos dizeye cevirir. Bu yuzden
    // hata "unrecognized configuration parameter" degil, bos dizenin uuid'e
    // cevrilememesi olur. Onemli olan sonuc ayni: yazma REDDEDILIYOR.
    // Hic kurulmamis bir baglantida ise "unrecognized configuration" gelir.
    // Iki yolu da kabul ediyoruz cunku ikisi de fail-closed.
    await c.query('RESET app.kiraci');
    await assert.rejects(
      () => c.query(`INSERT INTO aramalar (call_sid) VALUES ('CA_KIRACISIZ')`),
      /invalid input syntax for type uuid|unrecognized configuration/i,
      'kiraci belirsizken yazma reddedilmeli'
    );
  });

  await t.test('kiraci ayari yoksa OKUNAMAZ - sizinti yok', async () => {
    // Iki ayri durum var ve ikisi de sizdirmiyor:
    //   * Hic kurulmamis baglanti: current_setting(...,true) NULL doner,
    //     karsilastirma NULL olur, sorgu 0 satir doner.
    //   * RESET edilmis baglanti: ayar BOS DIZE olur, ''::uuid hata verir.
    // Ikincisi daha gurultulu ve aslinda daha iyi: sessiz bos sonuc yerine
    // acik hata. Testin sartI "veri gorunmesin", ikisini de kabul ediyoruz.
    await c.query('RESET app.kiraci');
    let gorulen = null;
    try {
      const { rows } = await c.query('SELECT count(*)::int n FROM aramalar');
      gorulen = rows[0].n;
    } catch (err) {
      assert.match(err.message, /invalid input syntax for type uuid/i);
      return; // hata ile reddedildi - sizinti yok
    }
    assert.strictEqual(gorulen, 0, 'kiraci belirsizken veri gorunuyor');
  });

  await t.test('baska kiracinin kimligiyle kayit yazilamaz', async () => {
    await c.query(`SET app.kiraci = '${A}'`);
    await assert.rejects(
      () => c.query(`INSERT INTO aramalar (call_sid, tenant_id) VALUES ('CA_SAHTE','${B}')`),
      /row-level security/i
    );
  });

  await t.test('kayit baska kiraciya TASINAMAZ', async () => {
    await c.query(`SET app.kiraci = '${A}'`);
    await assert.rejects(
      () => c.query(`UPDATE aramalar SET tenant_id='${B}' WHERE call_sid='CA_A'`),
      /row-level security/i
    );
  });

  await t.test('baska kiracinin kaydi SILINEMEZ', async () => {
    await c.query(`SET app.kiraci = '${A}'`);
    const sonuc = await c.query(`DELETE FROM aramalar WHERE call_sid='CA_B'`);
    assert.strictEqual(sonuc.rowCount, 0, 'baska kiracinin kaydi silindi');
  });

  await t.test('sema iki kez uygulanabilir', async () => {
    const yonetici = new Client({ connectionString: URL });
    await yonetici.connect();
    const sema = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
    await yonetici.query(sema);
    await yonetici.end();
  });
});
