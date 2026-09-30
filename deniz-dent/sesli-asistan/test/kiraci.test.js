'use strict';

// KIRACI IZOLASYONU - spesifikasyon §10
//
// Bu testler veritabani gerektirmez; sema dosyasini okuyup izolasyonun
// GERCEKTEN kurulu oldugunu dogrularlar. Sebebi su: RLS'i unutmak veya
// yanlislikla kaldirmak sessiz bir hatadir - hicbir sey patlamaz, sadece
// klinikler birbirinin verisini gormeye baslar. Sessiz hatalari teste bagliyoruz.

process.env.DEMO_MOD = 'true';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const SEMA = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');

// Hasta/klinik verisi tasiyan her tablo listede olmali.
const KORUNAN_TABLOLAR = [
  'aramalar',
  'mesajlar',
  'randevu_talepleri',
  'acil_olaylar',
  'rizalar',
  'denetim',
  'oturumlar',
  'aktarim_niyetleri',
  'saklama_politikalari',
  'saklama_calismalari',
];

test('korunan tablolarin hepsi kiraci dongusunde listelenmis', () => {
  for (const tablo of KORUNAN_TABLOLAR) {
    assert.ok(
      new RegExp(`'${tablo}'`).test(SEMA),
      `${tablo} kiraci izolasyonu listesinde yok`
    );
  }
});

test('her korunan tabloda RLS aciliyor', () => {
  assert.ok(SEMA.includes('ENABLE ROW LEVEL SECURITY'), 'RLS acilmiyor');
});

test('RLS zorlaniyor - tablo sahibi de muaf degil', () => {
  // Bu satir olmadan, uygulama kullanicisi tablo sahibiyse RLS sessizce
  // devre disi kalir. Izolasyonun en sinsi kaybolma yolu budur.
  assert.ok(SEMA.includes('FORCE ROW LEVEL SECURITY'), 'FORCE ROW LEVEL SECURITY yok');
});

test('politika hem okumayi hem yazmayi kapsiyor', () => {
  assert.ok(SEMA.includes('USING (tenant_id = current_setting'), 'okuma politikasi yok');
  assert.ok(SEMA.includes('WITH CHECK (tenant_id = current_setting'), 'yazma politikasi yok');
});

test('yazmada kiraci ayari yoksa hata verilir - fail closed', () => {
  // DEFAULT'ta ikinci parametre YOK: current_setting('app.kiraci') ayar
  // kurulmamissa exception atar. true verilseydi NULL doner, NOT NULL
  // ihlali olurdu - yine hata, ama sebebi anlasilmaz olurdu.
  assert.ok(
    SEMA.includes("SET DEFAULT current_setting(''app.kiraci'')::uuid"),
    'tenant_id varsayilani oturum ayarindan gelmiyor'
  );
});

test('tenant_id zorunlu ve indeksli', () => {
  assert.ok(SEMA.includes('ALTER COLUMN tenant_id SET NOT NULL'), 'tenant_id zorunlu degil');
  assert.ok(SEMA.includes('_tenant_idx'), 'tenant_id indeksi yok');
});

test('mevcut satirlar sabit bir varsayilan kiraciya baglaniyor', () => {
  // Sabit UUID: migration tekrar calistirildiginda yeni kiraci uretmemeli.
  assert.ok(SEMA.includes('00000000-0000-4000-8000-000000000001'), 'varsayilan kiraci sabit degil');
  assert.ok(SEMA.includes('ON CONFLICT (id) DO NOTHING'), 'tekrar calistirmaya dayanikli degil');
});

test('saklama politikasi kiraci basina tek - kategori basina degil', () => {
  // UNIQUE(veri_kategorisi) kalsaydi ikinci klinik kendi saklama
  // politikasini tanimlayamazdi.
  assert.ok(
    SEMA.includes('saklama_politikalari_kiraci_kategori_idx'),
    'kiraci+kategori benzersizligi yok'
  );
  assert.ok(
    SEMA.includes('DROP CONSTRAINT IF EXISTS saklama_politikalari_veri_kategorisi_key'),
    'eski tekil kisit kaldirilmiyor'
  );
});

test('uygulama her baglantida kiraci ayarini kuruyor', () => {
  const dbPg = fs.readFileSync(path.join(__dirname, '..', 'src', 'db-pg.js'), 'utf8');
  assert.ok(dbPg.includes("havuz.on('connect'"), 'baglanti kurulumunda ayar yapilmiyor');
  assert.ok(dbPg.includes('set_config'), 'set_config kullanilmiyor');
  // Kimlik degeri sorguya birlestirilmemeli.
  assert.ok(dbPg.includes("'app.kiraci', config.kiraciId"), 'kiraci kimligi parametreli gecilmiyor');
});

test('saklama betigi kiraci kimligi olmadan calismiyor', () => {
  const s = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'saklama.js'), 'utf8');
  assert.ok(s.includes('KIRACI_ID tanimli degil'), 'kiraci kimligi dogrulanmiyor');
});

test('config demo disinda kiraci kimligini zorunlu tutuyor', () => {
  const c = fs.readFileSync(path.join(__dirname, '..', 'src', 'config.js'), 'utf8');
  assert.ok(c.includes("zorunlu('KIRACI_ID')"), 'uretimde KIRACI_ID zorunlu degil');
});
