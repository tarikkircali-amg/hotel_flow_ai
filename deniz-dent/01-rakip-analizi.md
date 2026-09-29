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

> **"Rakipler kliniğinize bir sohbet botu bağlıyor. Biz kliniğinizin işletim sistemini kuruyor, asistanı onun içine koyuyoruz."**

Bu doğru bir iddia, çünkü doğrulanabilir bir gerçeğe dayanıyor: ClinicFlow, AgentFix ve AI Calls'un hiçbirinde hasta kaydı, hekim takvimi, tahsilat ve bakiye yok. Üçü de "sizin mevcut yazılımınıza bağlanırız" diyor. Deniz Dent'in **zaten böyle bir yazılımı yok** — Clinician OS + özel panel olarak bizde var.

### 3.2 Rakip başına eleme cümlesi

| Rakip | Onların gücü | Eleme cümlesi (Deniz Dent'e söylenecek) |
|---|---|---|
| **ClinicFlow** | En olgun, en iyi pazarlanan, fiyatı net | *"En yakın rakip. Ama sesli telefon karşılamaları kendi sitelerinde 'Yakında' yazıyor — sizin en çok istediğiniz madde onlarda henüz yok. Ve bir diş kliniği ile bir diyetisyeni aynı motorla yönetiyorlar. Aynı fiyat bandında, size özel yazılmış ve sesi çalışan bir sistem veriyoruz."* |
| **AgentFix** | Sesli canlı, sağlık odaklı | *"Sesi çalışıyor, doğru. Ama randevuyu otomatik oluşturmayı 'takvim bağlantısı kurulunca ekleyebiliriz' diye yazıyorlar — yani sizin bir klinik yazılımınız olduğunu varsayıyorlar. Hasta hafızası ve hekim ataması tekliflerinde hiç yok. Biz ikisini de ürünün çekirdeğine koyuyoruz."* |
| **AI Calls** | Ucuz görünüyor, dakika net | *"Bu bir çağrı merkezi kampanya aracı, klinik asistanı değil. İkinci dili ayrıca satıyorlar; sizin 9 dile ihtiyacınız var. WhatsApp en üst pakette. Sağlık turizmi hastası için yanlış araç."* |
| **AsIsta** | 999 ₺ |  *"999 liraya WhatsApp botu alırsınız, evet. Ama karşınızdaki firma bir gmail adresi ve bir cep telefonu. Hasta verisi özel nitelikli kişisel veri — KVKK'da en ağır kategori. Veri işleyen sözleşmesi imzalayamayacağınız bir tarafa hasta verisi veremezsiniz. Bu bir fiyat değil, bir risk."* |

### 3.3 Savunmasız olduğumuz noktalar — önceden hazırlıklı olmalıyız

Dürüst olmak gerekirse rakiplerin bizden üstün olduğu üç şey var:

1. **ClinicFlow şu anda canlı ve referanslı, biz değiliz.** Deniz Dent bizim ilk kliniğimiz. → Cevap: pilot yapısı, referans karşılığı indirim, aynı şehirde yüz yüze destek.
2. **ClinicFlow 3.000 ₺ ile giriyor, biz kurulum ücreti istiyoruz.** → Cevap: onlarda kurulum yok çünkü hazır şablon; bizde kurulum var çünkü size özel yazılıyor ve panel dahil. Karşılaştırma "3.000 ₺ vs bizim aylığımız" değil, "3.000 ₺ + mevcut klinik yazılımı lisansı + sesli asistan yokluğu" olmalı.
3. **AgentFix'in sesi bugün çalışıyor, bizimki Faz 3'te.** → Cevap: yol haritasını tarihli ver, faz sırasını kliniğin kendi acısına göre diz (WhatsApp trafiği önce, telefon sonra) ve bunu gizlemeden söyle.

### 3.4 Deniz Dent'e söylemeyeceğimiz şey

Rakipleri kötülemekle geçen bir sunum, satın alma güveni yaratmaz. Rakip tablosunu **sadece sorulursa** aç. Sunumun ana gövdesi kliniğin kendi kaybı (cevaplanmayan telefon, mesai dışı kaçan hasta, boş koltuk) ve bizim çözümümüz üzerine kurulmalı.

---

## 4. Kaynaklar

- ClinicFlow — https://clinicflow.com.tr/ · fiyat ve özellik sayfaları, blog karşılaştırma tabloları (29.09.2026)
- AgentFix — https://agentfix.com.tr/ (29.09.2026)
- AI Calls — https://aicalls.com.tr/fiyatlandirma/ · diş klinikleri sayfası (29.09.2026)
- AsIsta — https://klinik-asistan.vercel.app/ (29.09.2026)
- AiTakvim — https://aitakvim.com/ — içerik çekilemedi, doğrulanamadı
