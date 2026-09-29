# C) Fazlı Teklif ve Fiyat Mantığı — İÇ DOKÜMAN

**Tarih:** 29.09.2026
**Uyarı:** Bu doküman marj, maliyet ve pazarlık sınırlarını içerir. **Deniz Dent'e verilmez.** Müşteriye giden sürüm PDF'tir.

---

## 1. Fiyatın dayandığı üç gerçek

### 1.1 Pazar çıpaları (doğrulanmış)

| Rakip | Aylık | Ne veriyor |
|---|---|---|
| AsIsta | 999 ₺ | Sadece WhatsApp, tek kişilik firma |
| ClinicFlow | 3.000 ₺ → 20.000 ₺ | WhatsApp+IG+SMS+e-posta, hazır SaaS, ses YOK |
| AI Calls | ~$60 → $520 | Genel amaçlı çağrı aracı, 2. dil ücretli |
| AgentFix | Şeffaf değil | Kurulum + kullanım + bakım modeli |

**Çıkarım:** Aylık fiyatımız ClinicFlow'un üst bandına (20.000 ₺) yakın durabilir, **ama sadece kapsam farkı gösterilebilirse.** Alt banda (3.000 ₺) inmeyiz — o fiyat şablon ürünün fiyatı, bizim ürünümüz değil.

### 1.2 Bu bir yazılım geliştirme işi değil, bir ürün lansmanı

16 haftalık iş, saat başına ücretlendirilse tek bir Karşıyaka polikliniğinin ödeyebileceğinin çok üstüne çıkar. Bu hesabı yapıp müşteriye sunmak yanlış olur.

**Doğru çerçeve:** Deniz Dent, **Clinician OS'un ilk kurulumunu** satın alıyor — fikri mülkiyeti değil. Ar-Ge maliyetini tek müşteriye yüklemiyoruz; ürünü biz sahipleniyoruz, başka kliniklere de satacağız. Deniz Dent bunun karşılığında **ilk müşteri avantajı** alıyor: indirimli kurulum, fiyat kilidi, yol haritasına söz hakkı.

Bu çerçeve hem dürüst hem de bizim lehimize. AI_PRODUCT_OS'un kuralı: *"İlk on müşteri gelir olarak değil, kanıt olarak değerlidir."*

### 1.3 Kliniğin gerçek kaybı — kendi sayılarıyla

Uydurma ROI sunmuyoruz. Toplantıda **onların sayılarını** dolduracağımız bir hesap tablosu kullanacağız:

```
(a) Günde cevaplanamayan çağrı sayısı          → ....
(b) Mesai dışı gelen mesaj sayısı (hafta)      → ....
(c) Randevuya gelmeyen hasta (ay)              → ....
(d) Ortalama işlem bedeli                      → .... ₺
(e) Yabancı hasta talebi (ay)                  → ....

Aylık kurtarılabilir gelir ≈ [(a×22 + b×4 + c) × dönüşüm oranı] × (d)
```

Panelde gördüğümüz sayılar (aylık 342.800 ₺ gelir, 46.700 ₺ bekleyen bakiye, günde 1 gelmeyen hasta) **demo veridir** — toplantıda gerçek gibi kullanmayacağız. Kliniğin kendi ağzından alacağız.

**Muhafazakâr eşik:** Sistem ayda sadece **3 ek randevu** kazandırırsa, ortalama 2.000 ₺'lik işlemde 6.000 ₺ eder. Faz 1 aylık ücretimizin altında. Bunu söylerken "3 randevu" gibi savunulabilir küçük bir sayı kullanacağız; "%25-40 dönüşüm artışı" gibi rakiplerin blog iddialarını tekrarlamayacağız.

---

## 2. Fiyat yapısı

Üç kalem: **kurulum (tek seferlik) + aylık abonelik + kullanım aşımı.** Gizli kalem yok.

### 2.1 Kurulum — faz başına, tek seferlik

| Faz | Kapsam | Liste | **Pilot fiyat** |
|---|---|---|---|
| **Faz 0+1** | Keşif, veritabanı, API, panel canlı, WhatsApp asistanı, hasta CRM, otomatik randevu, hekim atama, TR/EN, personel devri, KVKK rıza modülü | 48.000 ₺ | **29.000 ₺** |
| **Faz 2** | Instagram DM, Facebook Messenger, 9 dil, fiyat yönetişimi, hatırlatma + no-show geri kazanım, bekleme listesi | 28.000 ₺ | 28.000 ₺ |
| **Faz 3** | Sesli telefon karşılama (1 hafta teknik doğrulama dahil), acil yönlendirme, geri okuma teyidi | 55.000 ₺ | 55.000 ₺ |
| **Faz 4** | Sağlık turizmi modülü, raporlama, X değerlendirmesi | 32.000 ₺ | 32.000 ₺ |
| | **Toplam** | **163.000 ₺** | **144.000 ₺** |

**Neden sadece Faz 1'de indirim var:** İndirim referans karşılığıdır ve referans Faz 1 canlıya çıkınca doğar. Sonraki fazlara indirim vermek, indirimi fiyat haline getirir — OS'un açık uyarısı bu.

### 2.2 Aylık abonelik — kümülatif

Faz devreye girdikçe aylık artar. Klinik her fazı ayrı karar verebilir; zorunlu paket yok.

| Aşama | Aylık | Dahil adil kullanım |
|---|---|---|
| Faz 1 canlı | **7.900 ₺** | 500 hasta konuşması / ay |
| Faz 2 canlı | **10.900 ₺** | 1.000 konuşma / ay |
| Faz 3 canlı | **15.900 ₺** | 1.000 konuşma + **500 sesli dakika** / ay |
| Faz 4 canlı | **18.900 ₺** | 1.500 konuşma + 750 sesli dakika / ay |

**Aylık ücret neyi kapsar:** barındırma, AI kullanımı (adil kullanım içinde), WhatsApp/Meta kanal ücretleri, bakım, güvenlik güncellemesi, yedekleme, panel erişimi, sınırsız kullanıcı, mesai içi destek, ayda bir optimizasyon oturumu.

### 2.3 Aşım ve istisnalar

| Kalem | Fiyat |
|---|---|
| Ek hasta konuşması | 12 ₺ / konuşma |
| Ek sesli dakika | 9 ₺ / dakika |
| Ek dil (9'un dışında) | 8.000 ₺ tek seferlik |
| Ek hekim (5 hekimden sonra) | 900 ₺ / ay |
| Kapsam dışı geliştirme | 2.200 ₺ / saat, yazılı onayla |

**Kur maddesi:** AI, telefon ve mesajlaşma sağlayıcıları dövizle faturalandırır. Sağlayıcı maliyetinde **%20'yi aşan** kur/fiyat değişiminde aşım birim fiyatları 30 gün önceden bildirimle güncellenir. Aylık sabit ücret sözleşme yılı içinde değişmez. Bu maddeyi baştan koymak, sonra zam istemekten iyidir.

### 2.4 Ödeme koşulları

- Kurulum: **%50 sözleşmede, %50 faz canlıya çıkışta.** Peşin tamamı istemiyoruz — riski paylaşmak güven verir.
- Aylık: fazın canlıya çıktığı aydan itibaren, aylık peşin.
- **Yıllık peşin ödeme: 12 ay yerine 10 ay ücreti** (OS standardı, %17 tasarruf).
- Faz 1'de **30 gün pilot dönemi:** klinik 30. günde devam etmemeye karar verirse aylık ücret alınmaz, kurulum bedeli iade edilmez (emek harcanmıştır), sistem kapatılır, **hasta verisi eksiksiz teslim edilir.**

---

## 3. Pilot takası — ne karşılığında indirim veriyoruz

19.000 ₺'lik indirim bir iyilik değil, bir alışveriş. Toplantıda **yüksek sesle söylenecek:**

| Biz veriyoruz | Onlar veriyor |
|---|---|
| Faz 1 kurulumda %40 indirim (48.000 → 29.000 ₺) | **Adıyla referans** verme izni |
| 12 ay aylık ücret fiyat kilidi | **Yazılı vaka çalışması**, gerçek sayılarla |
| Yol haritasına öncelik hakkı | İzmir'deki diğer kliniklere **canlı demo izni** (hasta verisi görünmeden, anonim ortam) |
| Aynı şehirde yüz yüze destek | Pilot boyunca **dürüst geri bildirim** (haftalık 30 dk) |

**Bağlayıcılık:** 12 ay sözleşme. Klinik 12 ay bitmeden ayrılırsa indirim farkı (19.000 ₺) faturalanır. İndirimi süreye bağlıyoruz ki kalıcı fiyatımız olmasın.

---

## 4. Marj kontrolü — kendi hesabımız

**Tahmini altyapı maliyeti (Faz 4 seviyesi, 1.500 konuşma + 750 dakika/ay):**

| Kalem | Aylık tahmin |
|---|---|
| AI (prompt cache ile) | $60 – $120 |
| Sesli (Twilio + TTS/STT + operatör) | $70 – $140 |
| WhatsApp/Meta konuşma ücretleri | $20 – $50 |
| Barındırma (Hetzner + Supabase) | $30 – $60 |
| **Toplam** | **$180 – $370** |

> Kur belirtmiyorum çünkü sabit bir kur varsaymak sonradan yanlış çıkar. Teklif öncesi güncel kurla çevirip marjı **tekrar kontrol et.** Kabaca: altyapı maliyeti 18.900 ₺'lik aylığın **%25–45'i** bandında kalmalı. Üstüne çıkıyorsa ya adil kullanım limitini düşür ya aylığı yukarı çek.

**Hedef brüt marj: %70–85** (OS standardı). Faz 4'te 18.900 ₺ aylıkta bu sağlanıyor. Faz 1'de 7.900 ₺ aylıkta maliyet düşük olduğu için marj daha rahat.

**Bizim için anlamı:** Solo operasyonda aylık sabit maliyet 30.000–60.000 ₺ bandında → başabaş **3–5 müşteri.** Deniz Dent tek başına Faz 4'te başabaşın yaklaşık **%40'ını** karşılıyor. İkinci ve üçüncü klinik satışı bu kurulumun referansıyla gelecek — asıl getirisi bu.

---

## 5. Pazarlık senaryoları — sınırlar önceden belirli

| Klinik ne derse | Cevabımız | Sınır |
|---|---|---|
| *"999 liraya yapan var"* | *"Var. Karşınızdaki firma bir gmail adresi ve bir cep telefonu. Hasta verisi KVKK'nın en ağır kategorisi — veri işleyen sözleşmesi imzalayamayacağınız tarafa hasta verisi veremezsiniz. Kıyaslama fiyat değil, risk."* | Fiyat kırma yok |
| *"ClinicFlow 3.000 lira"* | *"Doğru ve ciddi bir ürün. Ama o fiyat sadece mesaj katmanı — hasta kaydınız, hekim takviminiz, tahsilatınız hâlâ ayrı bir yazılım gerektirir ve sesli asistanları kendi sitelerinde 'Yakında' yazıyor. Karşılaştırma 3.000 ₺ ile bizim aylık değil; 3.000 ₺ + klinik yazılımı lisansı + olmayan sesli asistan ile bizim toplam kapsam."* | Fiyat kırma yok, kapsam karşılaştır |
| *"Kurulum çok yüksek"* | Faz 1'i tek başına satarız (29.000 ₺ + 7.900 ₺/ay). Faz 2-3-4 sonra. | Faz 1 altına inmeyiz |
| *"Ses bize en önemli, öne alalım"* | Teknik olarak mümkün ama **önerimiz değil.** Faz 1 olmadan sesin yazacağı bir randevu sistemi yok. Faz 1+3 birlikte alınabilir: 84.000 ₺ kurulum (pilot: 65.000 ₺), 13.900 ₺/ay, 9 hafta. | Faz 1 atlanamaz |
| *"Önce ücretsiz deneyelim"* | Ücretsiz pilot yok — 30 günlük **çıkış hakkı** var (§2.4). Kurulum emeği ücretsiz verilmez. | Sabit |
| *"Yıllık ödeyelim, indirim?"* | 10 ay ücreti = 12 ay hizmet. | Sabit |
| *"Sözleşmeyi 6 aya düşürelim"* | Olur ama Faz 1 indirimi düşer (48.000 → 38.000 ₺), çünkü referans değeri kısalır. | 6 ay altına inmeyiz |

**Asla yapmayacağımız:** Faz 3'ü (ses) Faz 1 bitmeden taahhüt etmek, Twilio Türkçe doğrulaması yapılmadan ses kalitesi garantisi vermek, tıbbi triyaj sözü vermek, LinkedIn/X DM otomasyonu sözü vermek.

---

## 6. Teklifin geçerlilik ve kapsam dışı maddeleri

**Geçerlilik:** 30 gün (29.10.2026).

**Fiyata dahil değildir:**
- Meta WhatsApp Business hesap doğrulaması için kliniğin sağlaması gereken evrak
- Kliniğin numara taşıma / yeni hat maliyeti
- 9 dilde içeriğin **tıbbi doğruluk onayı** (klinik sorumluluğu)
- Sağlık turizmi yetki belgesi süreçleri
- Kliniğin mevcut (varsa) yazılımından veri göçü — ayrı teklif
- Donanım

**Klinikten beklenenler (yazılı, sözleşme eki):**
1. Hizmet listesi ve **onaylı fiyat bantları**
2. Hekim listesi, uzmanlıkları, yabancı dilleri, çalışma saatleri
3. En sık 30 hasta sorusu ve onaylı cevapları
4. Aydınlatma metni ve açık rıza metni onayı
5. Tek yetkili irtibat kişisi ve haftalık 30 dakika
6. Meta hesap doğrulama evrakı

Bu altısı gelmezse takvim kayar ve gecikme bizim değil.
