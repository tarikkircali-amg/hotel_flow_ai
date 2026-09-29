# B) Fizibilite ve Mimari — Deniz Dent AI Klinik Asistanı

**Tarih:** 29.09.2026 · **Uygulanan katman:** AI_PRODUCT_OS Tier 3 (yeni ürün, ücretli lansman, harici entegrasyon)

Bu doküman iç kullanım içindir. Deniz Dent'e giden PDF bunun sadeleştirilmiş halidir.

---

## 1. Önce dürüstlük: neyi yapabiliriz, neyi yapamayız

Teklif yazmadan önce bunu netleştirmek zorundayız, çünkü satış toplantısında verilen bir söz geri alınamaz.

### 1.1 Rahatça yapabileceğimiz şeyler

| İstek | Durum | Gerekçe |
|---|---|---|
| WhatsApp'tan randevu toplama | **Yapılır** | WhatsApp Cloud API resmi kanal. Otel botunda bu akışı zaten kurduk. |
| Instagram DM + Facebook Messenger | **Yapılır** | Meta Graph API üzerinden Instagram Messaging + Messenger. Aynı webhook altyapısı. |
| Otomatik randevu oluşturma | **Yapılır** | Takvim bizim veritabanımızda olacak, üçüncü parti yazılıma bağımlı değiliz. |
| Otomatik hekim ataması | **Yapılır** | Kural motoru: işlem tipi → hekim uzmanlığı → müsaitlik → hasta dili → yük dengesi. |
| Hasta hafızası / kalıcı CRM | **Yapılır** | Hasta kaydı + konuşma geçmişi + tedavi geçmişi + tercihler. KVKK şartlarıyla (bkz. §5). |
| 9 dilde bilgilendirme | **Yapılır** | TR, EN, DE, FR, IT, AR, FA, ZH, JA. Dil algılama + o dilde yanıt + Türkçe iç kayıt. |
| Fiyat bilgisine hakim asistan | **Yapılır** | Onaylı fiyat bandı tablosu + "uydurma yasağı" + muayeneye yönlendirme kuralı. |
| Sesli telefon karşılama | **Yapılır — ama en zor parça** | Twilio + STT/TTS + LLM. Gecikme ve Türkçe ses kalitesi gerçek risk (bkz. §4). |

### 1.2 Yapamayacağımız veya yapmamamız gereken şeyler — bunu toplantıda söylemeliyiz

**LinkedIn DM otomasyonu — YAPILAMAZ.**
LinkedIn'in mesajlaşma API'si (Messages API) sadece **Compliance Partner Program** altında veriliyor. Bu program özel, ücretli ve şartı şu: başvuran şirketin veya müşterilerinin **FINRA / SEC kayıtlı** olması ve ana kullanım amacının düzenlemeye tabi üyelerin yazışmalarını **arşivleme ve izleme** olması. Bir diş kliniğinin randevu botu bu tanıma girmiyor. 2026 itibarıyla LinkedIn API erişimi beş katmana bölünmüş durumda ve mesajlaşma hâlâ sadece bu uyum programında.
- Üçüncü parti "LinkedIn otomasyon" araçları tarayıcı/oturum taklidi ile çalışır — **kullanım şartları ihlali, hesap kapatma riski.** Bir kliniğin kurumsal hesabını buna sokmayız.
- **Yapacağımız alternatif:** LinkedIn şirket sayfasındaki CTA butonu ve gönderi bağlantıları WhatsApp'a yönlendirilir. Hasta LinkedIn'de görür, WhatsApp'ta yazar, asistan karşılar. Takip edilebilir bağlantı ile "LinkedIn kaynaklı" olarak CRM'e etiketlenir. İstenen sonuç elde edilir, yasak yol kullanılmaz.

**X (Twitter) DM — TEKNİK OLARAK MÜMKÜN, EKONOMİK OLARAK ANLAMSIZ.**
6 Şubat 2026'dan itibaren X, varsayılan olarak kullanım başına ödeme modeline geçti; eski Basic ($200/ay) ve Pro ($5.000/ay) katmanları yeni kayıtlara kapandı, sadece mevcut abonelerde duruyor. Ücretsiz katmanda DM erişimi yok.
- Bir Karşıyaka diş polikliniğinin X üzerinden aylık kaç randevu talebi geleceğini düşünürsek, en düşük ücretli katman bile randevu başına maliyeti saçmalaştırır.
- **Yapacağımız alternatif:** Faz 4'te opsiyonel. X profilindeki bağlantı WhatsApp'a yönlendirilir. Eğer klinik gerçekten X'ten hasta geldiğini ölçerse, o zaman maliyeti konuşuruz. Ölçmeden altyapı kurmayız.

**Asistan tıbbi teşhis ve tedavi tavsiyesi vermeyecek.**
Bu bir teknik kısıt değil, bilinçli bir ürün kararı ve hukuki zorunluluk. Asistan bilgi verir, yönlendirir, randevu oluşturur. "Bu ağrı kanal tedavisi gerektirir" demez. Fotoğraf üzerinden yorum yapmaz. Bunu kliniğin kendisi de istemeli — aksi halde sorumluluk kliniğe döner.

**Kesin fiyat taahhüdü vermeyecek.**
Ağız içi muayene görmeden implant fiyatı söylemek klinik açısından tehlikeli. Asistan **onaylı bant** verir ("implant tedavisi X–Y ₺ arasında, kesin bedel muayene sonrası") ve muayeneye yönlendirir. Bant dışına çıkamaz, indirim pazarlığı yapamaz.

---

## 2. Elimizde ne var — dürüst envanter

| Varlık | Gerçek durumu | Deniz Dent'te kullanımı |
|---|---|---|
| **Deniz Dent özel paneli** (`myinovatifzeka.com/deniz-dent-panel.html`) | Tek dosya HTML, **demo veri**, backend yok. Bugünkü randevu, hekim bazlı takvim, hasta kayıtları, bakiye, tahsilat, hatırlatma kartları var. | **Arayüz tasarımı %70 hazır.** Ekranlar duruyor, arkasına gerçek veritabanı ve API bağlanacak. Yeniden tasarım gerekmiyor — bu ciddi bir zaman kazancı. |
| **Clinician OS** | Ürün konsepti ve marka. Kliniklere randevu/hasta kaydı/gelen kutusu okuyan asistan olarak konumlanmış. | Deniz Dent bunun **ilk gerçek kurulumu** olacak. Ürünleşme buradan doğacak. |
| **Çok dilli WhatsApp rezervasyon botu** (otel) | Çalışan ürün. Misafir kendi dilinde yazar, ekip Türkçe görür, rezervasyon konuşmadan oluşur. | **Dil algılama + çeviri katmanı + konuşma akışı motoru doğrudan taşınır.** Alan bilgisi (oda → tedavi, misafir → hasta) değişecek. Tahminen %50-60 kod yeniden kullanımı. |
| **hotel_flow_ai backend** (`server.js`) | Express + SQLite, oturum auth, key-value tablo, audit tablosu. | **DİKKAT: Bu kod sağlık verisi için olduğu gibi kullanılamaz.** Aşağıya bakın. |
| **Twilio Voice / ConversationRelay** | Hesap ve erişim var. | Faz 3 sesli katmanın altyapısı. |
| **WhatsApp / Meta API'leri** | Erişim var. | Faz 1 ve 2. |

### 2.1 hotel_flow_ai backend'i neden temel alamayız

`server.js` bir prototip ve otel için yeterliydi. Hasta verisi için beş ayrı yerde kırılıyor:

1. **Şifreler tuzsuz SHA-256.** `sha(pass)` — rainbow table'a açık. Argon2/bcrypt olmalı.
2. **Oturum tokenları veritabanında düz metin.** Sızan bir `sessions` tablosu anında tam yetki demek. Hash'lenmiş saklanmalı.
3. **Demo şifreleri kod içinde gömülü** (`admin/admin`, `resepsiyon/1234`). Üretimde olamaz.
4. **Tenant izolasyonu yok.** Tek `kv` tablosu, `organization_id` yok, satır seviyesi güvenlik yok. Tek klinik için şimdi sorun değil, ürünleştirince ölümcül.
5. **CORS tamamen açık** (`app.use(cors())`) ve SQLite tek dosya — yedek, replikasyon, eşzamanlı yazma garantisi yok.

**Karar:** Backend PostgreSQL (Supabase) üzerine sıfırdan yazılacak. Otel backend'inden alınacak şey **kod değil, desen** — audit tablosu fikri, oturum akışı, panelin veri sözleşmesi. Bunu teklifte "hazır" diye göstermek yanlış olur; göstermiyoruz.

---

## 3. Hedef mimari

```
        Hasta kanalları
 ┌─────────────────────────────────────────────┐
 │ WhatsApp  Instagram  Messenger  Web  Telefon│
 └────┬───────────┬──────────┬──────┬──────┬───┘
      │           │          │      │      │
      ▼           ▼          ▼      ▼      ▼
 ┌─────────────────────────────────────────────┐
 │  KANAL AĞ GEÇİDİ (webhook, imza doğrulama)  │
 │  her sağlayıcı için ayrı endpoint            │
 └──────────────────────┬──────────────────────┘
                        ▼
 ┌─────────────────────────────────────────────┐
 │  KONUŞMA ÇEKİRDEĞİ                          │
 │  · dil algılama (9 dil)                     │
 │  · hasta tanıma (telefon/kimlik eşleme)     │
 │  · hafıza yükleme (geçmiş + tercih)         │
 │  · niyet sınıflama                          │
 └──────────────────────┬──────────────────────┘
                        ▼
 ┌─────────────────────────────────────────────┐
 │  AJAN KATMANI (Claude + versiyonlu prompt)   │
 │  · bilgi bankası (RAG · pgvector)           │
 │  · FİYAT YÖNETİŞİMİ (onaylı bant, uydurma ✗)│
 │  · güven eşiği: netleştir 0.90 / devret 0.60│
 └───────┬──────────────────────┬──────────────┘
         ▼                      ▼
 ┌───────────────┐   ┌────────────────────────┐
 │ ARAÇLAR       │   │ İNSANA DEVİR (takeover)│
 │ · müsaitlik   │   │ · özet + tam geçmiş    │
 │ · HEKİM ATAMA │   │ · personel gelen kutusu│
 │ · randevu yaz │   └────────────────────────┘
 │ · hatırlatma  │
 └───────┬───────┘
         ▼
 ┌─────────────────────────────────────────────┐
 │  PostgreSQL (Supabase) · RLS her tabloda    │
 │  hastalar · randevular · hekimler · işlemler│
 │  fiyat_listesi · rızalar · ai_hafiza · audit│
 └──────────────────────┬──────────────────────┘
                        ▼
 ┌─────────────────────────────────────────────┐
 │  DENİZ DENT PANELİ (mevcut arayüz + gerçek) │
 └─────────────────────────────────────────────┘
```

### 3.1 Teknoloji seçimleri ve nedeni

| Katman | Seçim | Neden |
|---|---|---|
| Veritabanı | PostgreSQL / Supabase | RLS, pgvector, yedek, kimlik doğrulama hazır. OS standardı. |
| Backend | Node.js (NestJS) | Otel kodundan devamlılık, tek dil. |
| Panel | Mevcut HTML → gerçek API'ye bağlanır | Hazır arayüzü çöpe atmıyoruz. Faz 2'de Next.js'e taşınabilir. |
| AI | Claude (sağlayıcı adaptörü arkasında) | Türkçe ve 9 dilde en iyi sonuç. Adaptör sayesinde sağlayıcıya kilitlenmiyoruz. |
| Vektör | pgvector | Ayrı servis gerekmez, klinik ölçeğinde fazlasıyla yeterli. |
| Mesajlaşma | WhatsApp Cloud API + Meta Graph | Resmi kanal, numara kapanma riski yok. |
| Ses | Twilio ConversationRelay | Mevcut erişim, düşük gecikmeli akış. |
| Otomasyon | n8n (sadece iç işler) | Hatırlatma, rapor, no-show takibi. Hasta yanıtı üretmez. |
| Barındırma | Hetzner (AB) veya TR sunucu | KVKK yurt dışı aktarım riskini azaltır (bkz. §5). |

### 3.2 Hekim atama motoru — rakiplerin hiçbirinde olmayan parça

Kural sırası (her adım bir sonrakine filtre uygular):

1. **İşlem → uzmanlık eşlemesi.** Ortodonti → ortodontist. Kanal → endodonti/genel. İmplant → cerrahi yetkinliği olan hekim.
2. **Devamlılık kuralı.** Hasta daha önce bir hekimde tedaviye başladıysa (kanal 2. seans gibi) **aynı hekim zorunlu.** Bu en önemli kural — panelde "Kanal tedavisi (2. seans) / Dt. Selin" örneği var.
3. **Müsaitlik.** Hekimin takvim boşluğu + işlem süresi + koltuk müsaitliği.
4. **Dil.** Hasta Almanca konuşuyorsa, Almanca bilen hekim varsa öncelik. Yoksa tercüme desteğiyle randevu + personele uyarı.
5. **Yük dengesi.** Eşit adaylar arasında haftalık doluluğu düşük olan.
6. **Hiçbiri uymuyorsa:** asistan randevu **uydurmaz**, talebi personele devreder.

Kurallar veritabanında tutulur (`agent_rules`), koda gömülmez. Klinik kendi kuralını panelden değiştirebilir.

### 3.3 Fiyat yönetişimi — "iyi/kötü senaryo"

Tarık'ın eklediği 7. madde ürünün en hassas parçası. İki senaryoyu ayrı ayrı tasarlıyoruz:

**İyi senaryo — asistan doğru davranır:**
- Hasta "implant ne kadar?" diye sorar
- Asistan `fiyat_listesi` tablosundan **onaylı bandı** okur: "Tek implant 18.000–26.000 ₺ arasında değişiyor"
- Neden değiştiğini açıklar (kemik durumu, marka, ek işlem)
- Ücretsiz muayene + panoramik röntgene yönlendirir
- Randevu önerir, hekim atar, kaydeder

**Kötü senaryo — asistanın asla yapmaması gerekenler ve teknik önlemi:**

| Risk | Önlem |
|---|---|
| Listede olmayan işleme fiyat uydurma | Prompt kuralı + fiyat aracı sadece tablodan okur; tabloda yoksa "bu işlem için muayene gerekiyor" der |
| Bant dışı indirim/pazarlık | Asistanın indirim yetkisi yok; pazarlık ısrarında personele devreder |
| Rakip fiyatı yorumlama | Kesin yasak, konuyu kliniğin değerine çevirir |
| "Sigorta karşılar mı" gibi taahhüt | Sadece kliniğin yazılı anlaşma listesinden okur, yoksa devreder |
| Sağlık turizmi hastasına paket fiyatı | Konaklama/transfer dahil paketler ayrı onaylı tabloda, yoksa teklif isteyip koordinatöre devreder |
| Prompt injection ile fiyat listesi sızdırma | Sistem prompt'u asla açıklanmaz; fiyat aracı yetki kontrollü |

Her fiyat yanıtı `audit_logs`'a yazılır: hangi hastaya, hangi bant, hangi kaynak. Klinik sonradan "asistan ne söyledi" sorusunu kanıtla cevaplayabilir.

---

## 4. Sesli katman — en zor parça, gerçekçi olalım

Deniz Dent'in 5. isteği ve rakiplere karşı en güçlü kozumuz. Ama **en yüksek teknik riskli parça da bu.** Faz 3'e koymamızın sebebi tam olarak bu.

**Akış:** çağrı → Twilio → STT → konuşma çekirdeği (aynı motor) → LLM → TTS → hasta → CRM'e yazım

**Gerçek riskler:**

| Risk | Gerçeklik | Azaltma |
|---|---|---|
| **Gecikme** | Konuşma doğal olsun diye toplam yanıt gecikmesi ~1–1,5 saniyenin altında kalmalı. STT + LLM + TTS zinciri bunu zorlar. | Akışlı (streaming) STT/TTS, kısa yanıt kuralı, hazır ses kalıpları (ilk karşılama önceden sentezlenmiş) |
| **Türkçe ses kalitesi** | Twilio'nun ConversationRelay için Türkçe desteğini resmî dokümanda **doğrulayamadım** — arama sonuçları dil listesi vermiyor. | **Faz 3 başında 1 haftalık teknik doğrulama (spike) zorunlu.** Twilio Türkçe yetersizse ElevenLabs TTS + ayrı STT ile kurarız. Bu maddeyi teklifte "doğrulama adımı" olarak açıkça yazıyoruz. |
| **Maliyet öngörülemezliği** | ConversationRelay ~$0,07/dk seviyesinden başlıyor; üstüne TTS (generatif ses 100 karakter başına ~$0,013), STT, LLM ve operatör dakika ücreti biniyor. | Dakika havuzu + aşım fiyatı sözleşmede net. Panelde canlı dakika sayacı. |
| **Yanlış anlama** | Telefonda isim, tarih, telefon numarası yanlış duyulur. | Kritik veride **geri okuma teyidi** ("Randevunuzu 14 Ekim Salı 14:00'e yazıyorum, doğru mu?"). Numara/tarih düşük güvenle geçilmez. |
| **Acil durum** | Hasta "dişim kırıldı, kanama var" derse bot bilgi vermeye çalışmamalı. | Acil anahtar kelime listesi → **anında insana veya acil hattına yönlendirme.** Bot triyaj yapmaz. |
| **Hasta botla konuşmak istemez** | Meşru bir tepki. | Karşılamada dijital asistan olduğunu **söyler** (OS kuralı: AI olduğunu gizlemek yasak). "Yetkiliye bağlanmak istiyorum" cümlesi her an devreye girer. |

---

## 5. KVKK — en pahalı hata teknik değil, hukuki olur

Hasta verisi KVKK m.6 uyarınca **özel nitelikli kişisel veri.** Sağlık verisi, sır saklama yükümlülüğü altındaki sağlık personeli veya yetkili kurumlarca belirli amaçlarla işlenebilir; bunun dışındaki her işleme için **açık rıza** aranır. Bu, projenin en çok dikkat isteyen tarafı.

**Kurulacak olanlar:**

| Gereklilik | Uygulama |
|---|---|
| Açık rıza | İlk temasta, kanal içinde, ayrı ve açık metinle. `rizalar` tablosunda zaman, kanal, metin versiyonu ile kayıtlı. Rıza yoksa hafıza yazılmaz. |
| Aydınlatma metni | Klinik adına, 9 dilde, konuşma başında erişilebilir bağlantı. |
| Veri minimizasyonu | LLM'e giden metinde TC kimlik, tam adres, ödeme bilgisi **maskelenir.** Model klinik bilgisini görür, hastanın kimlik verisini görmesi gerekmez. |
| Yurt dışı aktarım | LLM sağlayıcısı yurt dışı. Bu bir aktarımdır. → Veri işleyen sözleşmesi (DPA) + aktarım hukuki dayanağı + minimizasyon ile risk yönetilir. **Klinikle bu konuyu açık konuşmalıyız, gizlemek en büyük hata olur.** |
| Şifreleme | Beklemede ve aktarımda. Kanal kimlik bilgileri (WhatsApp token, Twilio) vault'ta, veritabanı kolonunda düz metin değil. |
| Saklama süresi | Konuşma/mesaj varsayılan 24 ay, hasta hafızası süre bazlı, denetim kaydı en az 12 ay, mali kayıtlar 10 yıl. Zamanlanmış silme ile **uygulanır**, niyetle değil. |
| Silme hakkı | Hasta talebinde veri silinir, yedeklerden de belgelenmiş döngü içinde. |
| Ses kaydı | Kayıt alınacaksa ayrı rıza. **Öneri: ses kaydını varsayılan olarak almayalım**, sadece metin dökümü tutalım — rıza yükü ve risk düşer. |
| Denetim | Giriş, yetki değişimi, veri değişimi, dışa aktarım, AI eylemi, ödeme → kim, ne, ne zaman, nereden, sonuç. |

**Ayrıca:** Klinik sağlık turizmi hastası kabul ediyorsa Sağlık Bakanlığı sağlık turizmi yetki belgesi konusunu kendileri teyit etmeli. Biz yazılım sağlayıcısıyız, bu onların yükümlülüğü — ama 9 dilli tanıtım yapacaksak bunu sormamız gerekir.

---

## 6. Ne hazır, ne yeni yazılacak

| Bileşen | Hazır | Yeni yazılacak | Not |
|---|---|---|---|
| Panel arayüzü (ekranlar) | **%70** | %30 (gerçek veriye bağlama, yeni ekranlar) | Demo HTML duruyor |
| Dil algılama + çeviri katmanı | **%80** | %20 (tıbbi terim sözlüğü) | Otel botundan |
| Konuşma akışı motoru | **%50** | %50 (klinik alan mantığı) | Otel botundan desen |
| Veritabanı şeması | %0 | **%100** | Sıfırdan, PostgreSQL + RLS |
| Backend API | %0 | **%100** | Otel `server.js` temel alınamaz (§2.1) |
| Kanal ağ geçidi (WhatsApp/IG/FB) | %10 | %90 | WhatsApp deneyimi var, IG/FB yeni |
| Ajan katmanı + RAG | %20 | %80 | Prompt mimarisi ve fiyat yönetişimi yeni |
| Hekim atama motoru | %0 | **%100** | Tamamen yeni, farklılaştırıcımız |
| Hasta CRM + hafıza | %0 | **%100** | Yeni |
| İnsana devir / personel gelen kutusu | %0 | **%100** | Yeni, ama olmazsa ürün satılamaz |
| Rıza / KVKK modülü | %0 | **%100** | Yeni, pazarlıksız |
| Sesli katman | %0 | **%100** | Yeni, 1 hafta doğrulama şart |
| Hatırlatma / no-show geri kazanım | %30 | %70 | Panelde kart var, motor yok |
| 9 dil içerik üretimi | %0 | **%100** | İçerik işi, kod işi değil — klinikten onay gerekir |

---

## 7. Gerçekçi takvim

**Varsayım:** Tek geliştirici (Tarık), bu projeye haftada ~25 saat. Diğer ürünler ve satış faaliyeti paralel devam ediyor. Takvim buna göre kurulmuştur — tam zamanlı olsaydı yaklaşık yarısı.

| Faz | Kapsam | Süre | Kümülatif |
|---|---|---|---|
| **Faz 0** | Keşif: hizmet listesi, fiyat bandı onayı, hekim uzmanlıkları, çalışma saatleri, SSS, rıza metinleri, mevcut veri envanteri | **1 hafta** | 1. hafta |
| **Faz 1** | Veritabanı + API + panel canlı + WhatsApp asistanı + hasta CRM + otomatik randevu + hekim atama + TR/EN + personel devir + KVKK rıza modülü | **5 hafta** | 6. hafta |
| **Faz 2** | Instagram DM + Facebook Messenger + 9 dil + fiyat yönetişimi tam + hatırlatma/no-show geri kazanım + bekleme listesi | **3 hafta** | 9. hafta |
| **Faz 3** | Sesli telefon karşılama: 1 hafta teknik doğrulama + 3 hafta kurulum, acil yönlendirme, geri okuma teyidi, dakika sayacı | **4 hafta** | 13. hafta |
| **Faz 4** | Sağlık turizmi modülü (MediTour bağlantısı, paket/teklif akışı), raporlama, X opsiyonel değerlendirme | **3 hafta** | 16. hafta |

**Faz 1 canlıya çıkış: ~6 hafta (Kasım ortası).** Tamamı: ~16 hafta ≈ **4 ay (Ocak sonu 2027).**

**Takvimi kaydırabilecek şeyler — kliniğe söylenmeli:**
1. Meta WhatsApp Business hesabı doğrulaması ve şablon onayları klinik evrakına bağlı (1–2 hafta sürebilir, bizim elimizde değil).
2. Fiyat bandı ve hizmet içeriği onayı **klinikten** gelmeli. Gecikirse Faz 1 gecikir.
3. 9 dilde içeriğin klinik tarafından onaylanması (tıbbi doğruluk sorumluluğu onlarda).
4. Twilio Türkçe doğrulaması olumsuz çıkarsa Faz 3'e +1 hafta.

---

## 8. Definition of done — her faz için

Bir faz şu dokuzu sağlamadan "bitti" sayılmaz: **çalışır · anlaşılır · güvenli · erişilebilir · test edilmiş · dokümante · gözlemlenebilir · deploy edilebilir · geri alınabilir.**

Ajan canlıya çıkmadan **beş zorunlu test** (OS kuralı):
1. **Olgusal** — bilinen cevabı olan soru → bilgi bankasından doğru cevap
2. **Bilinmeyen** — cevabı olmayan soru → uydurmaz, sorar veya bilmediğini söyler
3. **Ret** — başka hastanın verisi istenir → reddeder
4. **İzolasyon** — başka klinik bağlamı istenir → engellenir
5. **Fiyat bütünlüğü** — listede olmayan fiyat için baskı → uydurmayı reddeder

Halüsinasyon oranı birinci sınıf kalite metriği olarak takip edilir.
