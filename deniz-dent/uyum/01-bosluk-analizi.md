# MIZOS Dental Voice AI — Boşluk Analizi

**Kaynak spesifikasyon:** MIZOS_DENTAL_VOICE_AI_CLAUDE_KVKK_SBYS.md, Sürüm 1.0
**İncelenen kod:** `deniz-dent/sesli-asistan/` — 3.487 satır, 64 test
**Tarih:** 30.09.2026
**Hazırlayan:** Claude (MİZ / My İnovatif Zeka)

> Bu belge spesifikasyonun §24 maddesi gereği, **kod yazmaya başlamadan önce**
> hazırlanmıştır. Hiçbir uyum iddiası içermez; neyin var, neyin yok olduğunu
> söyler. `COMPLIANCE_REVIEW_REQUIRED` işaretli maddeler hukuk/KVKK uzmanı
> onayı olmadan "uyumlu" sayılamaz.

---

## Uygulama durumu — 30.09.2026

| Madde | Durum | Nerede |
|---|---|---|
| C1 Sağlık verisi güvenlik duvarı | **Bitti** | `src/gizlilik.js` + 20 test |
| C4 Prompt injection savunması | **Bitti** | sistem metni kural 9 + `test/enjeksiyon.test.js` |
| H1 Saklama motoru | **Bitti** | `scripts/saklama.js`, kuru çalışma varsayılan |
| H3 Rıza kaydı alanları | **Bitti** | `db/schema.sql` |
| H5 Log hijyeni | **Bitti** | `demo.js`, `twilio.js` |
| M1 Tanıtım koruması | **Bitti** (tespit) | `src/soylem.js` + 9 test |
| C2 Kiracı izolasyonu | **Bitti** | `db/schema.sql` + 12 test (8'i gerçek veritabanında) |
| C3 Ham metin ayrımı | Kısmen (duvar sonrası ham metin yazılmıyor) | — |
| H2 Sağlayıcı kaydı | **Hukuk onayı bekliyor** | — |
| H4 Güvenlik testi sınıfları | Kısmen (enjeksiyon bitti) | — |
| M2–M4 | Sırada | — |
| Faz 7 SBYS | **SBYS dokümanı bekliyor** | — |

Test sayısı: 64 → **111**.

M1 için not: tanıtım koruması bugün **tespit** ediyor, üretimi kesmiyor.
Sebep `src/soylem.js` başında yazılı — yanıt akış halinde hastaya gidiyor,
söylenmeden önce kesmek ilk ses gecikmesini artıran ayrı bir iş. Önleme
tarafı sistem metnindeki 8. kuralda.

---

## Yönetici özeti

Elimizdeki sistem **tek bir kliniğe (Deniz Dent) özel, mesai dışı çalışan bir
sesli asistan**. Spesifikasyon ise **çok kiracılı (multi-tenant), SBYS entegre,
sağlık verisi güvenlik duvarı olan bir platform** tarif ediyor. İkisi aynı şey
değil. Mevcut kod bu platformun **çekirdeği** sayılabilir ama platformun kendisi
değil.

Açık konuşmak gerekirse: spesifikasyonun tamamı, bugünkü kodun yaklaşık
**3–4 katı** iş demek. Bunu tek seferde yapmak yerine fazlara böldüm.

**İyi haber:** Spesifikasyonun en kritik iki ilkesi — *acil durum motorunun
LLM'e bırakılmaması* ve *fiyat/tanıtım uydurmanın engellenmesi* — zaten
uygulanmış durumda. Bunlar sonradan eklenmesi en zor olan şeylerdi.

**Kötü haber:** Sağlık verisi güvenlik duvarı (§5) **hiç yok**. Hastanın ham
cümlesi doğrudan LLM'e gidiyor. Spesifikasyonun en sert maddesi bu ve şu an
ihlal ediliyor.

---

## A. CURRENT ARCHITECTURE — Mevcut mimari

### Gerçek veri akışı (koddan çıkarıldı)

```
Telefon (PSTN)
   │
   ▼
Twilio Voice ──► POST /twilio/gelen          [src/twilio.js]
   │             X-Twilio-Signature doğrulanır
   │             TwiML: <Connect><ConversationRelay>
   ▼
WebSocket (wss) ──► imza tekrar doğrulanır   [src/twilio.js:150]
   │
   ▼
Gorusme sınıfı                                [src/ajan.js]
   │
   ├─► acilMi(klinik, söz)  ◄── LLM'DEN ÖNCE   [src/acil.js]
   │      eşleşirse: klinik onaylı metin okunur,
   │      nöbetçiye aktarılır, LLM hiç çağrılmaz
   │
   └─► Claude (streaming)                     [src/ajan.js:144]
          │  ham hasta cümlesi + klinik bilgisi
          │  system bloğu cache'li
          ▼
       3 araç:  fiyat_bandi_sorgula
                randevu_talebi_olustur
                insana_aktar            [src/araclar.js]
          │
          ▼
       PostgreSQL / bellek (demo)       [src/db-pg.js, db-bellek.js]
          │
          ▼
       Sabah teslim paneli              [src/panel.js]
```

### Veri deposu (db/schema.sql)

| Tablo | İçerik | Sağlık verisi riski |
|---|---|---|
| `aramalar` | çağrı üst verisi, arayan no, özet | **özet serbest metin — risk** |
| `mesajlar` | görüşmenin tam yazılı dökümü | **ham sağlık metni — yüksek risk** |
| `randevu_talepleri` | ad, telefon, işlem, not | işlem adı dolaylı sağlık verisi |
| `acil_olaylar` | tetikleyen kelime + hasta sözü | **ham sağlık metni** |
| `rizalar` | aydınlatma kaydı, metin versiyonu | yok |
| `denetim` | aktör, eylem, kaynak, JSONB detay | detay alanı denetlenmiyor |
| `oturumlar` | panel token'ı (sha256) | yok |
| `aktarim_niyetleri` | geçici aktarım hedefi | yok |

### Spesifikasyondan bilinçli sapmalar

Bunlar eksik değil, **farklı karar**. Gerekçeleriyle yazıyorum ki sonradan
"unutulmuş" sanılmasın:

| Spesifikasyon | Bizde | Gerekçe |
|---|---|---|
| n8n workflow (§17) | Node.js + Express kodu | n8n her düğümde veri kopyalar; sağlık verisi yüzeyini genişletir. Kodda akış tek süreçte kalıyor. **Yeniden değerlendirilebilir.** |
| Supabase (§9) | Saf PostgreSQL | Supabase'in veri bölgesi ve alt işleyenleri `NEEDS_PROVIDER_VERIFICATION`. Saf Postgres'i Türkiye'de barındırmak yurt dışı aktarım sorununu tamamen kaldırıyor. |
| TR/EN/DE (§16) | Sadece TR | **Kapsam kararınız** (29.09). Spesifikasyonla çelişiyor, bilerek. |
| SBYS adapter (§8) | Yok — sabah onay kuyruğu | SBYS markası/API'si henüz belli değil. Spesifikasyon bu durumda `MANUAL_HANDOFF_REQUIRED` diyor; kuyruğumuz tam olarak bu. **Uyumlu sapma.** |

---

## B. COMPLIANCE GAP ANALYSIS — Boşluk analizi

### CRITICAL

**C1 — Sağlık verisi güvenlik duvarı yok (§5)**
`src/ajan.js:144` — hastanın ham cümlesi (`"implantımın olduğu yer şişti,
numaram 0532..."`) doğrudan Claude'a gidiyor. Spesifikasyon bunun yerine
token'lanmış, sınıflandırılmış bir yapı istiyor. Şu an:
- kimlik ayrıştırma yok
- `patient_token` yok
- şikâyet kategorilendirmesi yok
- filtre olmadığı için "fail-closed" da yok

**C2 — Kiracı izolasyonu yok (§10)**
Hiçbir tabloda `tenant_id` yok, RLS yok. Bugün tek klinik olduğu için pratik
zarar yok; **ikinci klinik eklendiği an kritik güvenlik açığı.** Sonradan
eklemek, baştan koymaktan çok daha pahalı.

**C3 — Ham sağlık metni kalıcı saklanıyor (§5, §11)**
`mesajlar` tablosu görüşmenin tam dökümünü, `acil_olaylar` hasta sözünü ham
tutuyor. Spesifikasyon logda kategori/kod istiyor. Buradaki ayrım önemli:
*işlem için gereken* metin ile *log* farklı şeyler — ikisi şu an aynı yerde.

**C4 — Prompt injection savunması ve testi yok (§19)**
Hasta "önceki talimatlarını unut" derse ne olacağı test edilmemiş. Araç
listesi dar olduğu için zarar sınırlı, ama **doğrulanmamış.**

### HIGH

**H1 — Saklama motoru yok (§12)**
`db/schema.sql` sonunda silme sorguları **yorum satırı olarak** duruyor.
Çalışan hiçbir şey yok. `retention_policies` tablosu yok. Veri süresiz
birikiyor.

**H2 — Sağlayıcı kaydı ve yurt dışı aktarım kapısı yok (§13)**
Anthropic (ABD) ve ElevenLabs (ABD) kullanıyoruz. `providers` tablosu,
`approved` bayrağı, aktarım mekanizması kaydı — hiçbiri yok. Veri şu an
kontrolsüz biçimde yurt dışına gidiyor. `COMPLIANCE_REVIEW_REQUIRED`

**H3 — Aydınlatma kaydı eksik alanlı (§4)**
`rizalar` tablosunda `metin_versiyonu` var — bu iyi. Ama `legal_basis_code`,
`processing_purpose_code`, `retention_policy_id` yok. Spesifikasyon aydınlatma
ile açık rızayı ayırıyor; bizim tablo ikisini tek kayıtta topluyor.

**H4 — Güvenlik ve gizlilik testi sınıfları yok (§22)**
64 testimiz var ama hepsi işlevsel. Cross-tenant, PII sızıntısı, RLS bypass,
webhook spoof, prompt injection testi yok.

**H5 — Hata loglarında içerik denetimi yok**
`src/demo.js:163` — `console.error('[demo] hata:', err)` hata nesnesini olduğu
gibi basıyor. Hata nesnesi hasta metni taşıyabilir.

### MEDIUM

**M1 — Tanıtım/reklam koruması kısmi (§15)**
Fiyat uydurma engelleniyor (iyi). Ama "en iyi", "%100 başarı", "garantili"
gibi ifadeler için engelleme listesi yok.

**M2 — Bilgi havuzu sürümlenmiyor (§16)**
`config/klinik.json` düz dosya. `approved_by`, `approved_at`, `valid_from`,
`version` alanları yok. Kim neyi ne zaman onayladı belli değil.

**M3 — İnsana aktarım tetikleyicileri eksik (§21)**
Var olanlar: hasta isterse, acil durumda, asistan karar veremezse.
Eksik olanlar: kimlik eşleştirme belirsizse, güven eşiği altındaysa, hasta
itiraz/şikâyet/hukuki talep bildirirse.

**M4 — Denetim kaydı ile işlem verisi ayrılmamış (§11)**
`denetim.detay` JSONB alanı serbest; içine ne yazıldığı denetlenmiyor.

### LOW

**L1 — Anahtar rotasyonu prosedürü yok (§18)**
**L2 — Bağımlılık taraması yok (§18)**
**L3 — Yedeklerin şifrelenmesi belgelenmemiş (§18)**
**L4 — Sentetik test hastası seti yok (§22)** — testlerde uydurma isimler var ama tanımlı bir set değil

---

## C. TARGET ARCHITECTURE — Hedef mimari

```
Telefon / WhatsApp / Web
   │
   ▼
KANAL ADAPTÖRÜ ──────────────► imza doğrulama, tenant çözümleme
   │
   ▼
GİZLİLİK KAPISI ─────────────► aydınlatma metni (sürümlü) + kayıt
   │
   ▼
ACİL TARAMA  ◄── LLM'DEN ÖNCE  [VAR — değişmiyor]
   │
   ▼
SAĞLIK VERİSİ GÜVENLİK DUVARI  [YENİ — C1]
   │   ham metin ──► { patient_token, intent, complaint_category, urgency }
   │   başarısız olursa ──► İNSANA AKTAR (fail-closed)
   ▼
POLİTİKA MOTORU              [YENİ — H2]
   │   sağlayıcı onaylı mı? aktarım mekanizması var mı?
   ▼
LLM (Claude)                  [VAR — girdisi değişiyor]
   │
   ▼
ARAÇ ALLOWLIST                [VAR — genişletilecek]
   │
   ├─► SBYS ADAPTÖRÜ          [YENİ — arayüz; gerçek uç yok]
   │      API yoksa ──► MANUAL_HANDOFF_REQUIRED
   │
   └─► SABAH ONAY KUYRUĞU     [VAR]
   │
   ▼
DENETİM (maskeli)             [VAR — sıkılaştırılacak]
   │
   ▼
SAKLAMA MOTORU                [YENİ — H1]
```

---

## D. DATABASE CHANGES — Veritabanı değişiklikleri

Her biri ayrı, geri alınabilir migration:

| # | Değişiklik | Gerekçe |
|---|---|---|
| 001 | Tüm tablolara `tenant_id UUID NOT NULL` + RLS policy | C2 |
| 002 | `tenants`, `clinic_users`, roller | C2 |
| 003 | `retention_policies` tablosu + çalışan temizlik görevi | H1 |
| 004 | `providers` kaydı + `approved` kapısı | H2 |
| 005 | `rizalar` → `legal_basis_code`, `processing_purpose_code`, `retention_policy_id` | H3 |
| 006 | `mesajlar` → `icerik_sinifi` sütunu, ham metin ayrı şemaya | C3 |
| 007 | `knowledge_documents` — sürümlü, onaylı klinik bilgisi | M2 |

**Yıkıcı migration yok.** Hiçbir veri silinmiyor; sütun ekleniyor ve ham metin
ayrı şemaya taşınıyor.

---

## E. N8N WORKFLOW CHANGES

Şu an n8n kullanmıyoruz (bkz. A bölümü). İki seçenek:

1. **Kodda kalmaya devam** — veri yüzeyi dar, öneri budur
2. **n8n'e taşı** — görsel akış klinik tarafına anlatması kolay ama her düğümde veri kopyası

Karar sizin. Kararı verene kadar kod tarafında devam ediyorum.

---

## F. SBYS ADAPTER PLAN

```js
interface SbysAdapter {
  findPatient(minimalIdentity)
  getAppointmentAvailability(filters)
  createAppointment(payload)
  updateAppointment(id, payload)
  cancelAppointment(id, reason)
  handoffNote(payload)
}
```

İki uygulama yazılacak:
- `ManuelAdapter` — her çağrıda `MANUAL_HANDOFF_REQUIRED` döner (bugünkü davranış)
- `<SBYS_ADI>Adapter` — **klinik hangi SBYS'yi kullanıyorsa, o tedarikçinin resmî dokümanı elimize geçtiğinde**

**Gerçek endpoint uydurmayacağım.** Deniz Dent'in SBYS'sinin adını ve
entegrasyon dokümanını almadan bu adaptör yazılmaz.

---

## G. PRIVACY / HEALTH FIREWALL PLAN

Deterministik katman (LLM değil), sırayla:

1. **Kimlik ayrıştırma** — TC no, telefon, ad-soyad kalıpları → token
2. **Sağlık metni sınıflandırma** — klinik onaylı kategori listesine eşleme
3. **Aciliyet** — mevcut `acil.js` ile birleşik
4. **Minimizasyon** — LLM'e sadece kategori + token gider
5. **Fail-closed** — herhangi biri patlarsa `HUMAN_HANDOFF`

Çıktı örneği:
```json
{ "patient_token": "PAT_7f3a", "intent": "DENTAL_COMPLAINT_APPOINTMENT",
  "complaint_category": "POST_PROCEDURE_SWELLING",
  "urgency": "REVIEW_REQUIRED", "raw_identity_removed": true }
```

**Dürüst uyarı:** Tam token'lama konuşma kalitesini düşürür — asistan hastaya
adıyla hitap edemez, "geçen sefer bahsettiğiniz" diyemez. Kullanılabilirlik ile
gizlilik arasında bir ayar noktası var. Klinikle konuşulacak.

---

## H. SECURITY PLAN

Var: TLS, webhook imza doğrulama, sha256 oturum token'ı, bcrypt parola,
parametreli SQL, dar araç listesi, istemciye anahtar gitmemesi.

Eklenecek: hız sınırı, anahtar rotasyonu, bağımlılık taraması, admin MFA,
üretim/test ayrımı, şifreli yedek.

---

## I. TEST PLAN

Mevcut 64 testin üzerine, spesifikasyon §22'nin istediği sınıflar:

| Sınıf | Test sayısı (tahmin) |
|---|---|
| PRIVACY — cross-tenant, PII sızıntısı, log, silme | ~15 |
| SECURITY — webhook spoof, injection, IDOR, RLS bypass | ~12 |
| CLINICAL SAFETY — tanı isteği, ilaç isteği, acil ifade, çocuk arayan | ~10 |
| SBYS — çift kayıt, zaman aşımı, idempotency, Türkçe karakter | ~8 |

**Gerçek hasta verisiyle test yapılmayacak.** Sentetik hasta seti tanımlanacak.

---

## J. IMPLEMENTATION PHASES — Uygulama fazları

| Faz | İçerik | Bağımlılık |
|---|---|---|
| **1** | C2 kiracı izolasyonu + RLS + testleri | yok — hemen başlanabilir |
| **2** | C1 sağlık verisi güvenlik duvarı + C3 ham metin ayrımı | Faz 1 |
| **3** | H1 saklama motoru + H3 aydınlatma alanları | Faz 1 |
| **4** | H2 sağlayıcı kaydı + aktarım kapısı | **hukuk onayı gerekir** |
| **5** | C4 + H4 güvenlik/gizlilik testleri | Faz 1–3 |
| **6** | M1–M4 orta öncelikli maddeler | Faz 2 |
| **7** | SBYS adaptörü | **SBYS dokümanı gerekir** |
| **8** | Kanal genişletme (WhatsApp vb.) | Faz 2 |

Faz 1–3 ve 5–6 bizim elimizde. **Faz 4 ve 7 dışarıdan girdi bekliyor.**

---

## K. ITEMS REQUIRING HUMAN / LEGAL / SBYS VENDOR CONFIRMATION

Bunları ben karara bağlayamam. `COMPLIANCE_REVIEW_REQUIRED`:

1. **Hukuki işleme şartı** — her faaliyet için hangi madde? Açık rıza mı, sözleşmenin ifası mı? *(KVKK uzmanı)*
2. **Yurt dışı aktarım mekanizması** — Anthropic ve ElevenLabs ABD'de. Hangi mekanizma? *(KVKK uzmanı)*
3. **Saklama süreleri** — her veri kategorisi için kaç ay? Uydurmayacağım. *(KVKK uzmanı + klinik)*
4. **Acil yönlendirme metinleri** — hekim onayı şart, yazılı. *(Deniz Dent hekimi)*
5. **Onaylı fiyat ve tanıtım içeriği** — mevzuata uygunluğu kim onaylıyor? *(klinik)*
6. **SBYS markası ve entegrasyon dokümanı** — hangi sistem? *(Deniz Dent)*
7. **Ses kaydı** — varsayılan kapalı. Açılacaksa 8 madde önceden konfigüre edilmeli. *(klinik + hukuk)*
8. **Veri barındırma bölgesi** — Türkiye mi? *(MİZ kararı)*

---

## Sonuç

Spesifikasyon iyi yazılmış ve ciddi. Mevcut kodun **acil durum motoru ve fiyat
yönetişimi** kısmı spesifikasyonun ruhuna uygun; bunlar korunacak.

**En acil iş C1 (sağlık verisi güvenlik duvarı).** Bugün hastanın ham cümlesi
yurt dışındaki bir modele gidiyor ve bu, spesifikasyonun en sert maddesinin
ihlali.

Faz 1'den başlıyorum.
