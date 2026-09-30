-- Deniz Dent Sesli Asistan - veritabani semasi
-- PostgreSQL 14+
--
-- Tasarim notlari:
--   * Hasta tibbi kaydi BURADA TUTULMAZ. O, klinigin mevcut sisteminde kalir.
--     Burada sadece iletisim verisi ve gorusme kaydi bulunur - KVKK yuzeyini
--     bilerek dar tutuyoruz.
--   * Ses kaydi tutulmaz, sadece yazili dokum.
--   * Saklama suresi zamanlanmis gorevle uygulanir (bkz. sonundaki temizlik).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------------
-- Aramalar: her telefon gorusmesi / kanal oturumu
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aramalar (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_sid        TEXT UNIQUE NOT NULL,
  session_id      TEXT,
  kanal           TEXT NOT NULL DEFAULT 'telefon',
  arayan_no       TEXT,
  aranan_no       TEXT,
  dil             TEXT,
  mesai_disi      BOOLEAN NOT NULL DEFAULT TRUE,
  durum           TEXT NOT NULL DEFAULT 'devam',
    -- devam | tamamlandi | aktarildi | acil_aktarildi | hata
  aktarim_sebebi  TEXT,
  baslangic       TIMESTAMPTZ NOT NULL DEFAULT now(),
  bitis           TIMESTAMPTZ,
  ozet            TEXT
);

CREATE INDEX IF NOT EXISTS aramalar_baslangic_idx ON aramalar (baslangic DESC);
CREATE INDEX IF NOT EXISTS aramalar_arayan_idx    ON aramalar (arayan_no);
CREATE INDEX IF NOT EXISTS aramalar_durum_idx     ON aramalar (durum);

-- ------------------------------------------------------------------
-- Mesajlar: gorusmenin yazili dokumu
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mesajlar (
  id         BIGSERIAL PRIMARY KEY,
  arama_id   UUID NOT NULL REFERENCES aramalar(id) ON DELETE CASCADE,
  yon        TEXT NOT NULL,            -- hasta | asistan | sistem
  metin      TEXT NOT NULL,
  olusturma  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mesajlar_arama_idx ON mesajlar (arama_id, id);

-- ------------------------------------------------------------------
-- Randevu talepleri: sabah onay kuyrugu (B yolu)
-- A yolunda buraya yazilir VE mevcut sisteme aktarilir; aktarim
-- sonucu aktarim_durumu alaninda tutulur.
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS randevu_talepleri (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arama_id          UUID REFERENCES aramalar(id) ON DELETE SET NULL,
  hasta_adi         TEXT NOT NULL,
  telefon           TEXT NOT NULL,
  islem             TEXT,
  tercih_tarih      DATE,
  tercih_saat       TEXT,
  not_metni         TEXT,
  yeni_hasta        BOOLEAN,
  durum             TEXT NOT NULL DEFAULT 'beklemede',
    -- beklemede | onaylandi | reddedildi
  aktarim_durumu    TEXT NOT NULL DEFAULT 'aktarilmadi',
    -- aktarilmadi | aktarildi | hata   (A yolu icin)
  onaylayan         TEXT,
  onay_zamani       TIMESTAMPTZ,
  olusturma         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS randevu_durum_idx     ON randevu_talepleri (durum, olusturma DESC);
CREATE INDEX IF NOT EXISTS randevu_olusturma_idx ON randevu_talepleri (olusturma DESC);

-- ------------------------------------------------------------------
-- Acil olaylar: asistanin acil olarak sinifladigi ve yonlendirdigi cagrilar
-- Ayri tabloda, cunku bunlar klinigin ertesi gun MUTLAKA gormesi gerekenler.
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS acil_olaylar (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arama_id    UUID REFERENCES aramalar(id) ON DELETE SET NULL,
  arayan_no   TEXT,
  tetikleyen  TEXT NOT NULL,        -- eslesen anahtar kelime
  hasta_sozu  TEXT NOT NULL,
  yonlendirme TEXT,                 -- aktarilan numara veya 'mesaj'
  goruldu     BOOLEAN NOT NULL DEFAULT FALSE,
  olusturma   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS acil_goruldu_idx ON acil_olaylar (goruldu, olusturma DESC);

-- ------------------------------------------------------------------
-- Ridalar: KVKK acik riza kaydi
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rizalar (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arama_id        UUID REFERENCES aramalar(id) ON DELETE SET NULL,
  telefon         TEXT,
  kanal           TEXT NOT NULL,
  metin_versiyonu TEXT NOT NULL,
  bilgilendirildi BOOLEAN NOT NULL DEFAULT TRUE,
  olusturma       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Aydinlatma ve acik riza AYRI kavramlar (spesifikasyon §4). Bu sutunlar
-- hangi faaliyetin hangi hukuki sebebe dayandigini kayda gecirir.
-- Degerleri KOD UYDURMAZ - klinigin KVKK metninden gelir.
ALTER TABLE rizalar ADD COLUMN IF NOT EXISTS legal_basis_code       TEXT;
ALTER TABLE rizalar ADD COLUMN IF NOT EXISTS processing_purpose_code TEXT;
ALTER TABLE rizalar ADD COLUMN IF NOT EXISTS retention_policy_id    UUID;
ALTER TABLE rizalar ADD COLUMN IF NOT EXISTS riza_alindi            BOOLEAN NOT NULL DEFAULT FALSE;

-- ------------------------------------------------------------------
-- Denetim kaydi: kim, ne, ne zaman, sonuc
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS denetim (
  id         BIGSERIAL PRIMARY KEY,
  aktor      TEXT NOT NULL,          -- asistan | panel:<kullanici> | sistem
  eylem      TEXT NOT NULL,
  kaynak     TEXT,
  kaynak_id  TEXT,
  detay      JSONB,
  ip         TEXT,
  sonuc      TEXT,
  olusturma  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS denetim_olusturma_idx ON denetim (olusturma DESC);
CREATE INDEX IF NOT EXISTS denetim_eylem_idx     ON denetim (eylem);

-- ------------------------------------------------------------------
-- Panel oturumlari: token ASLA duz metin saklanmaz, sha256 hash'i tutulur
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS oturumlar (
  token_hash TEXT PRIMARY KEY,
  kullanici  TEXT NOT NULL,
  ip         TEXT,
  olusturma  TIMESTAMPTZ NOT NULL DEFAULT now(),
  gecerlilik TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS oturumlar_gecerlilik_idx ON oturumlar (gecerlilik);

-- ------------------------------------------------------------------
-- Aktarim niyeti: ConversationRelay oturumu kapanirken action webhook'unun
-- okuyacagi gecici kayit. handoffData'ya guvenmek yerine burayi okuyoruz.
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aktarim_niyetleri (
  call_sid   TEXT PRIMARY KEY,
  hedef_no   TEXT NOT NULL,
  sebep      TEXT,
  olusturma  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------
-- Saklama politikalari (spesifikasyon §12)
--
-- Sureler KOD ICINDE SABIT DEGIL. "5 yil sakla" gibi bir hukuki sure
-- uydurulmaz; her satiri klinigin KVKK sorumlusu onaylar ve onaylayan
-- kisi kayda gecer. Onaysiz satir temizlik gorevinde CALISTIRILMAZ.
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS saklama_politikalari (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  veri_kategorisi TEXT NOT NULL,
    -- gorusme_dokumu | arama_kaydi | denetim | acil_olay | randevu_talebi | oturum
  amac           TEXT NOT NULL,
  legal_basis_code TEXT,
  saklama_gun    INTEGER NOT NULL CHECK (saklama_gun > 0),
  eylem          TEXT NOT NULL DEFAULT 'sil',   -- sil | anonimlestir | hukuki_muhafaza
  onaylayan      TEXT,
  onay_zamani    TIMESTAMPTZ,
  aktif          BOOLEAN NOT NULL DEFAULT FALSE,
  olusturma      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (veri_kategorisi)
);

-- Silme islemlerinin kaydi. Silinen SAGLIK ICERIGI buraya kopyalanmaz -
-- sadece kac satirin silindigi yazilir (spesifikasyon §12).
CREATE TABLE IF NOT EXISTS saklama_calismalari (
  id            BIGSERIAL PRIMARY KEY,
  politika_id   UUID REFERENCES saklama_politikalari(id) ON DELETE SET NULL,
  kategori      TEXT NOT NULL,
  etkilenen     INTEGER NOT NULL,
  kuru_calisma  BOOLEAN NOT NULL,
  olusturma     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------
-- Temizlik artik scripts/saklama.js tarafindan, saklama_politikalari
-- tablosundaki ONAYLI satirlara gore yapilir. Buraya sabit sure
-- yazilmiyor - hangi verinin ne kadar saklanacagi hukuki bir karardir.
--
-- Gunluk zamanlanmis gorev:
--   node scripts/saklama.js            (kuru calisma - sadece raporlar)
--   node scripts/saklama.js --uygula   (gercekten siler)
-- ------------------------------------------------------------------

-- ==================================================================
-- KIRACI IZOLASYONU (spesifikasyon §10)
--
-- Bugun tek klinik var, ama ikinci klinik eklendigi an bu sart. Sonradan
-- eklemek bastan koymaktan cok daha pahali - o yuzden simdi koyuyoruz.
--
-- Calisma mantigi:
--   * Uygulama her baglantida  SET app.kiraci = '<uuid>'  yapar (db-pg.js).
--   * OKUMA: politika bu ayara uymayan satirlari gostermez.
--   * YAZMA: tenant_id varsayilani ayardan gelir; ayar yoksa INSERT
--     HATA VERIR. Kiracisiz veri yazilamaz - fail-closed.
--   * FORCE ROW LEVEL SECURITY: tablo sahibi bile politikadan muaf degil.
--     Bu satir olmadan uygulama kullanicisi tablo sahibiyse RLS sessizce
--     devre disi kalir ve izolasyon sadece kagit uzerinde olur.
-- ==================================================================

CREATE TABLE IF NOT EXISTS kiracilar (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad          TEXT NOT NULL,
  aktif       BOOLEAN NOT NULL DEFAULT TRUE,
  olusturma   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mevcut veriler icin varsayilan kiraci. Sabit UUID: migration tekrar
-- calistirildiginda ayni kiraciya baglansin.
INSERT INTO kiracilar (id, ad)
VALUES ('00000000-0000-4000-8000-000000000001', 'Varsayilan Klinik')
ON CONFLICT (id) DO NOTHING;

DO $kiraci$
DECLARE
  t text;
  varsayilan constant uuid := '00000000-0000-4000-8000-000000000001';
  tablolar constant text[] := ARRAY[
    'aramalar', 'mesajlar', 'randevu_talepleri', 'acil_olaylar',
    'rizalar', 'denetim', 'oturumlar', 'aktarim_niyetleri',
    'saklama_politikalari', 'saklama_calismalari'
  ];
BEGIN
  FOREACH t IN ARRAY tablolar LOOP
    -- 1) Sutun once BOS birakilarak eklenir - mevcut satirlar bozulmaz.
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id UUID', t);

    -- 2) Mevcut satirlar varsayilan kiraciya baglanir.
    EXECUTE format('UPDATE %I SET tenant_id = %L WHERE tenant_id IS NULL', t, varsayilan);

    -- 3) Varsayilan deger oturum ayarindan gelir. Ayar yoksa INSERT hata verir.
    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN tenant_id SET DEFAULT current_setting(''app.kiraci'')::uuid', t);

    -- 4) Artik zorunlu.
    EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL', t);

    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS kiraci_izolasyon ON %I', t);
    EXECUTE format(
      'CREATE POLICY kiraci_izolasyon ON %I'
      ' USING (tenant_id = current_setting(''app.kiraci'', true)::uuid)'
      ' WITH CHECK (tenant_id = current_setting(''app.kiraci'', true)::uuid)', t);

    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (tenant_id)', t || '_tenant_idx', t);
  END LOOP;
END
$kiraci$;

-- Saklama politikasi kategori basina TEKTI; bu, ikinci klinigin kendi
-- politikasini tanimlamasini engellerdi. Kiraci basina tek olmali.
ALTER TABLE saklama_politikalari DROP CONSTRAINT IF EXISTS saklama_politikalari_veri_kategorisi_key;
CREATE UNIQUE INDEX IF NOT EXISTS saklama_politikalari_kiraci_kategori_idx
  ON saklama_politikalari (tenant_id, veri_kategorisi);
