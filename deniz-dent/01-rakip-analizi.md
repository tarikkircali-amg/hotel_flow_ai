> ## ⚠ REVİZYON 2 — 30.09.2026
>
> **Deniz Dent'te klinik yönetim sistemine benzer bir yapı zaten var.** Talep, yeni bir klinik
> yazılımı değil; **mesai dışı / 7/24 çalışan bir iletişim katmanı.**
>
> **Rakiplerin özellik ve fiyat bilgileri (Bölüm 1 ve 2) geçerlidir — değişmedi.**
> **Konumlandırma (Bölüm 3) yeniden yazıldı.** Eski ana mesaj ("rakiplerde klinik yazılımı yok,
> bizde var") artık geçersizdir; Deniz Dent'te o yazılım zaten bulunuyor.

# A) Rakip Analizi ve Konumlandırma — Deniz Dent AI Klinik Asistanı

**Hazırlayan:** My İnovatif Zeka (MİZ) · Tarık Kırcalı, İzmir
**Tarih:** 29.09.2026
**Kaynak doğrulaması:** Tüm veriler 29.09.2026 tarihinde rakiplerin kendi web sitelerinden okunmuştur. Doğrulanamayan hiçbir bilgi tabloya yazılmamıştır; boş/şüpheli alanlar açıkça "doğrulanamadı" olarak işaretlidir.

---

## 1. Pazarda gerçekten kim var

Arama sonucunda Türkiye'de klinik/diş odaklı AI asistanı iddiasıyla çıkan **5 oyuncu** doğrulandı. Dördü ciddiye alınacak seviyede, biri çok erken aşama.

### 1.1 ClinicFlow — **ana rakip, tek gerçek tehdit**
`clinicflow.com.tr`

Kendini "Türkiye'nin ilk ve tek LLM tabanlı klinik asistanı" olarak konumlandırıyor. Teknik olarak en olgun rakip ve pazarlaması bizden çok önde (onlarca SEO blog yazısı, karşılaştırma tabloları, fiyat şeffaflığı).

**Doğrulanan özellikler:**
- Claude Sonnet 4.5 tabanlı WhatsApp asistanı (resmi WhatsApp Business API, yeşil tik imkanı)
- Instagram DM otomasyonu + SMS + e-posta
- **6 aylık AI hafızası** ("Context Memory" diye pazarlıyorlar)
- Ayrı veritabanı şeması (tenant isolation) — teknik olarak doğru yapmışlar
- n8n otomasyon, Chatwoot destek arayüzü
- Branş-spesifik asistanlar: diş, psikolog, diyetisyen, estetisyen, dermatolog, fizyoterapi
- Google Takvim entegrasyonu, otomatik hatırlatma, bekleme listesi ile iptal doldurma
- KVKK/GDPR uyumlu sunucu iddiası
- İyzico ile ödeme, 30 gün ücretsiz deneme

**Fiyatlandırma (siteden birebir):**

| Paket | Kapasite | Aylık |
|---|---|---|
| Başlangıç | ~300 kişi/ay (günde ~250 sohbet iddiası ayrı sayfada) | **3.000 ₺** |
| Orta | ~900 kişi/ay | fiyat sayfada gizli |
| Üst | ~3.000 kişi/ay | **20.000 ₺** |
| Yıllık | Başlangıç paketi | **30.000 ₺/yıl** (≈2.500 ₺/ay) |

**KRİTİK ZAAFİYET — bizim giriş kapımız:**
> Ana sayfalarında "Telefonda AI Asistanı" kutusunun üzerinde **"Yakında"** yazıyor. ElevenLabs ile yapacaklarını duyurmuşlar ama **sesli telefon karşılama ürünleri canlı değil.** Deniz Dent'in 5 numaralı isteği tam olarak bu.

**Diğer zaafları:**
- **Klinik yönetim yazılımı değil, sadece iletişim katmanı.** Kendi karşılaştırma tablolarında rakip olarak DoktorTakvimi / Klinik365 / Randevum'u gösteriyorlar — yani hasta kaydı, hekim takvimi, tahsilat, bakiye takibi onların ürününde yok; mevcut yazılıma "bağlanıyorlar".
- **6 branşa aynı anda hizmet ediyorlar** → diş derinliği yok. Diyetisyen ve dermatolog aynı motorla çalışıyor.
- Çok dil iddiası blog seviyesinde ("otomatik dil algılama, 20+ dil") — bu LLM'in doğal yeteneği, ürünleştirilmiş 9 dilde onaylı tedavi/fiyat içeriği değil.
- **Hekim atama motoru yok** — hiçbir yerde iddia etmiyorlar.
- Hazır SaaS şablonu: klinik ürüne uyar, ürün kliniğe uymaz.

---

### 1.2 AgentFix — sesli tarafta canlı rakip
`agentfix.com.tr`

Sağlık kurumlarına odaklı, **çağrı hattı + WhatsApp** üzerinde çalışan sesli AI asistanı. Diş klinikleri için ayrı bölümleri var (implant, All on 4/6, zirkonyum, Hollywood Smile başlıkları listeli).

**Doğrulanan özellikler:**
- Gelen çağrıyı sesli karşılama (canlı, "yakında" değil)
- WhatsApp
- Mesai saatine göre karşılama, ekibe yönlendirme
- Görüşme geçmişi ve panel
- Klinik bilgi bankası (adres, saat, hizmet, paylaşılacak fiyat bilgisi)
- "Seçilen dillerde bilgilendirme" — dil sayısı sitede net değil, arama özetinde 40+ dil iddiası geçiyor ama site üzerinde **doğrulanamadı**
- Hastane / özel klinik / muayenehane / diş / estetik / poliklinik segmentleri

**Zaafları:**
- **Entegrasyon vaadi şartlı.** Kendi ifadeleri: *"Takvim bağlantısı kurulduğunda uygun saat gösterme, randevu oluşturma ve değişiklik adımlarını da ekleyebiliriz"* ve *"Bağlantıyı, kullandığınız sistemin desteklediği işlemlere göre planlarız."* → Yani otomatik randevu oluşturma hazır değil, proje bazlı ve müşterinin mevcut yazılımına bağımlı.
- **Klinik yönetim paneli yok** — sadece görüşme paneli.
- **Hasta hafızası / CRM iddiası yok.** Deniz Dent'in 3 numaralı isteği karşılanmıyor.
- **Hekim atama yok.**
- Fiyat şeffaf değil: "Kurulum, kullanım ve bakım ücretlerini görün" diyor ama açık fiyat listesi yayınlamıyor → proje bazlı, büyük kurum satışı yapıyorlar.

---

### 1.3 AI Calls — genel amaçlı, klinik ürünü değil
`aicalls.com.tr`

Yapay zeka destekli otomatik **çağrı ve kampanya** platformu. Diş kliniği sayfası SEO içeriği; ürünün kendisi sektörden bağımsız.

**Fiyatlandırma (siteden birebir, USD):**

| Paket | Aylık | Dahil dakika | Not |
|---|---|---|---|
| Başlangıç | **$59,99** | 100 dk | 1 asistan, 1 knowledge base |
| Profesyonel | **$129,99** | 250 dk | 5 asistan, **"Asistana İkinci Dil Atama"** |
| Kurumsal | **$259,99** | 500 dk | 20 asistan |
| Premium | **$519,99** | 1.000 dk | **WhatsApp entegrasyonu sadece bu pakette** |

Yıllık abonelikte 3 ay hediye + kurulum ücretsiz.

**Zaafları:**
- **Dil, satılan bir eklenti.** "Asistana ikinci dil atama" Profesyonel pakette başlıyor. 9 dil bu mimaride ya çok pahalı ya imkansız. Sağlık turizmi için yanlış araç.
- **Outbound kampanya odaklı** (kampanya oluşturma, aynı anda 200 arama, ses klonlama) — bu bir çağrı merkezi aracı, klinik resepsiyonisti değil.
- **WhatsApp en üst pakette** ($519,99/ay ≈ 21.000 ₺/ay kurdan bağımsız olarak pahalı) → Deniz Dent'in 1. isteği için ekonomik değil.
- Hasta kaydı, hekim takvimi, hekim atama, hasta hafızası: **hiçbiri yok.**
- Dakika bazlı fatura → maliyet öngörülemez.

---

### 1.4 AsIsta — ciddi rakip değil, fiyat çıpası
`klinik-asistan.vercel.app`

- WhatsApp asistanı, **999 ₺/ay tek plan**, sınırsız konuşma iddiası
- Randevu talebi toplama, klinik bilgi bankası, personel müdahale modu
- Doktor takvimini okuyup uygun saat önerme iddiası

**Neden rakip değil:** `vercel.app` alt alan adı (kendi domaini yok), iletişim adresi bir **gmail** hesabı ve kişisel cep telefonu. Tek kişilik, çok erken aşama bir proje. Sesli yok, çok dilli yok, KVKK/veri işleyen sözleşmesi yapılabilecek bir tüzel yapı görünmüyor.

**Ama tehlikeli:** 999 ₺ fiyatı pazarın algısını aşağı çekiyor. Deniz Dent bu fiyatı görürse "AI asistan 1.000 liraya oluyormuş" der. **Teklifte buna önceden cevap vermek zorundayız.**

---

### 1.5 AiTakvim — doğrulanamadı
`aitakvim.com`

Arama sonuçlarında "WhatsApp otomasyonu ve AI ile randevu yöneten, sekretere gerek bırakmayan 7/24 akıllı klinik asistanı" olarak çıkıyor. Ancak site tamamen JavaScript ile render ediliyor; ana sayfa ve `/fiyatlar` sayfası **iki farklı yöntemle de okunamadı — içerik çekilemedi.**

> **Dürüst not:** Bu oyuncu hakkında özellik ve fiyat iddiasında bulunmuyorum. Deniz Dent görüşmesi öncesi elle kontrol edilmeli. Sunuma girmeden önce 10 dakikalık manuel inceleme yeterli.

---

## 2. Rakip eleme tablosu

Satırlar Deniz Dent'in kendi istediği 5 madde + benim eklediğim 3 madde.

| Yetenek | ClinicFlow | AgentFix | AI Calls | AsIsta | **MİZ / Deniz Dent** |
|---|---|---|---|---|---|
| **1. Omnichannel randevu toplama** | WhatsApp, Instagram, SMS, e-posta | WhatsApp + telefon | Telefon (WhatsApp $520 pakette) | Sadece WhatsApp | **WhatsApp + Instagram + Facebook + web + telefon** |
| — LinkedIn / X | ✗ | ✗ | ✗ | ✗ | **✗ — API yok / ekonomik değil (bkz. B bölümü)** |
| **2. Otomatik hekim ataması** | İddia yok | İddia yok | ✗ | ✗ | **Kural motoru: işlem → uzmanlık → müsaitlik → hasta dili** |
| **3. Hasta hafızası / CRM** | 6 ay AI hafızası | İddia yok | ✗ | ✗ | **Kalıcı hasta CRM + süresiz konuşma geçmişi + tedavi geçmişi** |
| **4. Otomatik randevu oluşturma** | ✓ (Google Takvim) | "Bağlantı kurulunca eklenebilir" | ✗ | Talep toplar | **✓ Kendi takvimimize doğrudan yazar** |
| **5. Sesli telefon karşılama** | **"YAKINDA"** | ✓ | ✓ (kampanya odaklı) | ✗ | **✓ Faz 3'te canlı** |
| **6. Çok dilli (9 dil) derin bilgilendirme** | Blog seviyesi dil algılama | Net değil | 2. dil ücretli eklenti | ✗ | **9 dilde onaylı tedavi + fiyat + süreç içeriği** |
| **7. Fiyat bilgisine hakim, uydurmayan asistan** | Fiyat bilgisi verir | Paylaşılacak ücret bilgisi | ✗ | ✗ | **Onaylı fiyat bandı + "uydurma yasağı" kuralı + iyi/kötü senaryo yönetimi** |
| **Klinik yönetim paneli (hasta, tahsilat, bakiye)** | ✗ (iletişim katmanı) | ✗ (görüşme paneli) | ✗ | Basit panel | **✓ Clinician OS + Deniz Dent'e özel panel** |
| **Ürün tipi** | Hazır SaaS, 6 branş | Proje bazlı, kurumsal | Genel amaçlı araç | Tek kişilik proje | **Tek kliniğe özel (custom)** |
| **Aylık fiyat** | 3.000 – 20.000 ₺ | Şeffaf değil | $60 – $520 | 999 ₺ | Faz'a göre (C bölümü) |
| **Yerellik / destek** | Uzaktan | Uzaktan | Uzaktan | Kişisel telefon | **İzmir, yüz yüze, aynı şehir** |

---

## 3. Konumlandırma — rakipleri nasıl eliyoruz

Dört rakibi dört farklı cümleyle elemek zorundayız, çünkü dördü farklı sebeple zayıf. Tek bir "biz daha iyiyiz" cümlesi işe yaramaz.

### 3.1 Ana mesaj

> **"Sisteminiz siz açıkken çalışıyor. Biz kapalıyken çalışıyoruz."**

Kliniğin mevcut yazılımına dokunmuyoruz — bunu açıkça, erken ve tekrar tekrar söylüyoruz. Satın
alma önündeki en büyük korku "yeni yazılıma geçmek" korkusudur; onu daha ilk cümlede kaldırıyoruz.

**Destekleyici aritmetik (uydurma değil, basit hesap):**

| | Saat |
|---|---|
| Bir hafta | 168 |
| Klinik açık (hafta içi 09:00–18:00 + yarım gün cumartesi) | ~49 |
| **Klinik kapalı** | **~119 (%70)** |

Bu sayıyı toplantıda tahtaya yaz. Geri kalan her şey bunun üzerine kurulur.

### 3.2 Asıl koz: ses

Talep "7/24 ve mesai dışı" olunca ağırlık merkezi telefona kayıyor — gece ağrıyla uyanan hasta
WhatsApp yazmaz, arar. Ve rakip tablosu tam burada açılıyor:

| Rakip | Sesli karşılama | Sonuç |
|---|---|---|
| **ClinicFlow** | **YOK** — sitesinde "Yakında" | Sesli konuşulduğunda masadan kalkıyor |
| AsIsta | YOK | Zaten rakip değil |
| AI Calls | Var, ama outbound kampanya aracı | Klinik resepsiyonisti değil |
| **AgentFix** | **VAR** | **Tek gerçek rakip bu** |

Yani yeni kapsam bizi ClinicFlow'un boş bıraktığı yere koyuyor. Geriye tek rakip kalıyor.

### 3.3 Rakip başına eleme cümlesi

| Rakip | Eleme cümlesi |
|---|---|
| **ClinicFlow** | *"Ciddi bir ürün, doğru. Ama sizin asıl derdiniz gece çalan telefonun cevaplanması — sesli asistanları kendi sitelerinde 'Yakında' yazıyor. Ayda 3.000 lira mesaj katmanının fiyatı; gece telefonu kapatmıyor."* |
| **AgentFix** | *"Sesi çalışıyor, en yakın rakip bu. Ama fiyatlarını yayınlamıyorlar, proje bazlı kurumsal satış yapıyorlar ve entegrasyonu 'sisteminizin desteklediği kadar' diye şarta bağlıyorlar. Biz sisteminizi önce ücretsiz test edip sonucu yazılı veriyoruz — ve aynı şehirdeyiz."* |
| **AI Calls** | *"Bu bir çağrı merkezi kampanya aracı. Toplu arama ve ses klonlama için yapılmış. Gece gelen hastayı karşılayan bir klinik asistanı değil. İkinci dili bile ayrıca satıyorlar."* |
| **AsIsta** | *"999 liraya WhatsApp botu alırsınız. Ama karşınızdaki firma bir gmail adresi ve bir cep telefonu. Hasta verisi kanunen en korumalı kategori — sözleşme imzalayamayacağınız tarafa hasta verisi veremezsiniz. Bu bir fiyat değil, bir risk."* |

### 3.4 Zayıf olduğumuz noktalar — hazırlıklı ol

1. **Artık rakiplerle aynı kategorideyiz.** Panel kozu gitti. Tek ayrışma noktamız ses, yerellik ve
   onların sistemine özel entegrasyon. Bunu bilerek konuş; genel "biz daha iyiyiz" cümlesi tutmaz.
2. **AgentFix'in sesi bugün çalışıyor, bizimki 8. haftada.** Gizleme. Karşılığında ver: ücretsiz
   bağlantı testi, yüz yüze destek, şeffaf fiyat, 30 gün çıkış hakkı.
3. **ClinicFlow sesi yakında çıkarabilir.** Bu bir zaman penceresi. Deniz Dent'i hızlı kapatmak,
   ilk referansı almak ve ürünü satılabilir hale getirmek önemli.
4. **Sadece WhatsApp konuşulursa kaybederiz** — ClinicFlow orada hem ucuz hem canlı. Konuşmayı
   sesin üzerinde tut.

### 3.5 Toplantıda yapılmayacaklar

- **Paneli gösterme.** Onlarda zaten var; göstermek "beni dinlememiş" mesajı verir.
- **Rakip tablosunu kendin açma.** Sorulursa aç. Sunumun gövdesi kliniğin kendi kaybı (cevapsız
  gece çağrıları) ve çözüm üzerine kurulu olmalı.
- **Sistemlerini görmeden entegrasyon sözü verme.** "Önce ücretsiz test ederiz" de.

## 4. Kaynaklar

- ClinicFlow — https://clinicflow.com.tr/ · fiyat ve özellik sayfaları, blog karşılaştırma tabloları (29.09.2026)
- AgentFix — https://agentfix.com.tr/ (29.09.2026)
- AI Calls — https://aicalls.com.tr/fiyatlandirma/ · diş klinikleri sayfası (29.09.2026)
- AsIsta — https://klinik-asistan.vercel.app/ (29.09.2026)
- AiTakvim — https://aitakvim.com/ — içerik çekilemedi, doğrulanamadı
