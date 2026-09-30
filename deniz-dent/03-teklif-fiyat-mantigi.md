# C) Teklif ve Fiyat Mantığı — İÇ DOKÜMAN

**Revizyon 3 · 30.09.2026**

> **Kapsam kararı:** Yabancı dil çıkarıldı → ek modül 24.000 ₺'den **14.000 ₺'ye**,
> aylık eki 3.000 ₺'den **2.000 ₺'ye** indi. Ana paket (55.000 ₺ + 12.900 ₺/ay) değişmedi;
> yabancı dil zaten ana pakette değildi.
**Uyarı:** Marj, maliyet ve pazarlık sınırları içerir. **Deniz Dent'e verilmez.** Müşteriye giden sürüm PDF'tir.

---

## 1. Fiyat neden düştü

Revizyon 1: 144.000 ₺ kurulum + 18.900 ₺/ay
Revizyon 2: **55.000 ₺ kurulum + 12.900 ₺/ay**

Sebep basit ve dürüst: **kapsam küçüldü.** Klinik paneli, hasta CRM'i ve hekim atama motoru artık yazılmıyor — onlarda zaten var. 16 hafta 8 haftaya indi.

Fiyatı düşürmek zayıflık değil. Kapsamı küçülüp fiyatı aynı tutmak, müşteri bunu fark ettiğinde güveni bitirir.

---

## 2. Pazar çıpaları — konum değişti

Artık rakiplerle **aynı kategorideyiz.** Bunu bilerek fiyatlamak zorundayız.

| Rakip | Aylık | Sesli var mı |
|---|---|---|
| AsIsta | 999 ₺ | Hayır |
| **ClinicFlow** | 3.000 → 20.000 ₺ | **Hayır — "Yakında"** |
| AI Calls | ~$60 → $520 | Var (kampanya aracı) |
| **AgentFix** | Şeffaf değil | **Var — asıl rakip** |

### 2.1 Stratejik uyarı: hafif paketi öne çıkarma

Teklifte "Hafif giriş" (sadece WhatsApp, 17.000 ₺ + 5.900 ₺/ay) seçeneği var. **Bunu kendin önerme.**

Sebep: Sadece WhatsApp'ta ClinicFlow ayda 3.000 ₺ istiyor ve ürünü canlı. O karşılaştırmada kaybederiz. Bizim üstünlüğümüz **sesin kendisi.** Sesli paket konuşulduğunda ClinicFlow masadan kalkıyor, geriye sadece AgentFix kalıyor — ve onun fiyatı şeffaf değil, yerel değil.

Hafif paket sadece şu durumda masaya konur: klinik bütçe için net biçimde geri adım atıyor ve teklifi tamamen kaybetme riski doğuyor. O zaman da "sonra sesli ekleriz" köprüsüyle verilir.

---

## 3. Fiyat yapısı

### 3.1 Ana paket — önerilen ve satılacak olan

| Kalem | Liste | **Pilot** |
|---|---|---|
| Kurulum (WhatsApp + sesli, 8 hafta) | 69.000 ₺ | **55.000 ₺** |
| Aylık | — | **12.900 ₺** |
| Dahil | 800 görüşme + 400 sesli dakika / ay | |

### 3.2 Diğer seçenekler

| Paket | Kurulum | Aylık | Dahil |
|---|---|---|---|
| Hafif giriş (sadece WhatsApp, 4 hafta) | 17.000 ₺ | 5.900 ₺ | 400 görüşme |
| → sonradan sesli ekleme | +45.000 ₺ | 12.900 ₺ | 800 + 400 dk |
| Ek modül (Instagram + Facebook) | 14.000 ₺ | +2.000 ₺ | 1.200 + 500 dk |

**Not:** Hafif girişten ana pakete geçiş toplamı 62.000 ₺ — doğrudan ana paketi almaktan 7.000 ₺ pahalı. Bu kasıtlı; parçalı alım bize daha çok kurulum emeği çıkarıyor. Sorarlarsa açıkça söyle.

### 3.3 Aşım

| Kalem | Fiyat |
|---|---|
| Ek görüşme | 12 ₺ |
| Ek sesli dakika | 9 ₺ |

| Kapsam dışı geliştirme | 2.200 ₺/saat, yazılı onayla |

**Kur maddesi** sözleşmede: sağlayıcı maliyetinde %20'yi aşan değişimde sadece aşım birim fiyatları 30 gün bildirimle güncellenir. Sabit aylık değişmez.

### 3.4 Ödeme

- Kurulum %50 sözleşmede, %50 canlıya çıkışta
- Aylık, canlıya çıkıştan itibaren peşin
- Yıllık peşin: 12 ay yerine 10 ay ücreti
- 30 gün çıkış hakkı: aylık alınmaz, kurulum iade edilmez, **görüşme kayıtları eksiksiz teslim edilir**
- Sözleşme 12 ay

---

## 4. Marj kontrolü

**Tahmini altyapı maliyeti — ana paket (800 görüşme + 400 dakika/ay):**

| Kalem | Aylık |
|---|---|
| Sesli (dakika + TTS + STT) | $50 – $90 |
| AI (prompt cache ile) | $40 – $70 |
| WhatsApp kanal ücretleri | $15 – $35 |
| Barındırma | $30 – $50 |
| **Toplam** | **$135 – $245** |

> Kur yazmıyorum; teklif öncesi güncel kurla çevirip **tekrar kontrol et.** Hedef: altyapı maliyeti 12.900 ₺'nin **%25–40'ı** bandında kalsın. Üstüne çıkıyorsa dakika havuzunu 400'den 300'e düşür.

**Hedef brüt marj %70–85.** Ana pakette sağlanıyor.

**Bizim için anlamı:** Solo operasyonda aylık sabit maliyet 30.000–60.000 ₺ → başabaş 3–5 müşteri. Deniz Dent tek başına başabaşın ~%25–40'ını karşılıyor. Asıl getiri: bu kurulumun referansıyla gelecek 2. ve 3. klinik. **Ve artık ürün daha satılabilir** — çünkü "mevcut sisteminizi değiştirmenize gerek yok" demek, satış önündeki en büyük engeli kaldırıyor.

---

## 5. Pilot takası

14.000 ₺ indirim bir jest değil, alışveriş. Yüksek sesle söylenecek:

| Biz veriyoruz | Onlar veriyor |
|---|---|
| Kurulumda 14.000 ₺ indirim | Adıyla referans verme izni |
| 12 ay aylık ücret kilidi | Gerçek sayılarla yazılı vaka çalışması |
| Yol haritasına öncelik hakkı | Diğer kliniklere demo izni (hasta verisi görünmeden) |
| Aynı şehirde yüz yüze destek | İlk ay haftada 30 dk geri bildirim |

12 ay bitmeden ayrılırsa indirim farkı faturalanır.

---

## 6. Pazarlık senaryoları

| Klinik ne derse | Cevabımız | Sınır |
|---|---|---|
| *"ClinicFlow ayda 3.000 lira"* | *"Ciddi ürün, doğru. Ama sizin asıl isteğiniz gece çalan telefonun cevaplanması — ClinicFlow'un sesli asistanı yok, kendi sitelerinde 'Yakında' yazıyor. 3.000 lira mesaj katmanının fiyatı. Gece telefonu kapatmıyor."* | Fiyat kırma yok |
| *"999 liraya yapan var"* | *"Var. Karşınızdaki firma bir gmail adresi ve bir cep telefonu. Hasta verisi kanunen en korumalı kategori; sözleşme imzalayamayacağınız tarafa hasta verisi veremezsiniz. Bu fiyat değil, risk."* | Fiyat kırma yok |
| *"Bizde zaten sistem var, ne işimize yarar?"* | *"Sisteminize dokunmuyoruz. Sisteminiz siz açıkken çalışıyor. Biz kapalıyken çalışıyoruz. Haftada yaklaşık 119 saat şu anda cevapsız."* | Ana mesaj |
| *"Kurulum yüksek"* | Ana paketi böl: kurulumu 3 taksite yay (sözleşme / 4. hafta / 8. hafta). **Fiyatı düşürme, vadeyi uzat.** | 55.000 altına inme |
| *"Sadece WhatsApp yeterli"* | *"Olur ama gece gelen talebin çoğu telefonla gelir; ağrıyla uyanan hasta yazmaz, arar. WhatsApp'la başlarsak asıl kaybı kapatmamış oluruz."* Israr ederse hafif paket. | §2.1'e bak |
| *"Önce ücretsiz deneyelim"* | Ücretsiz pilot yok. 30 günlük **çıkış hakkı** var. Ayrıca **bağlantı testi ücretsiz** — bu zaten bir jest. | Sabit |
| *"Sistemimiz bağlantıya kapalı çıkarsa?"* | *"O zaman B yolu: gece talepleri sabah tek tıkla onay kuyruğuna düşer. Hasta yine gece cevabını alır. Fiyat değişmez."* | Fiyat aynı |
| *"6 ay sözleşme"* | Olur ama indirim düşer (69.000 → 62.000 ₺). | 6 ay altına inme |

**Asla yapmayacağımız:** Ses kalitesini doğrulamadan garanti vermek · sistemlerini görmeden "doğrudan entegre ederiz" demek · tıbbi triyaj sözü vermek · LinkedIn/X DM sözü vermek · panel satmaya çalışmak.

---

## 7. Toplantı öncesi yapılacaklar

1. **Sistemlerinin adını öğren** — mümkünse toplantıdan önce telefonla sor. Mimarinin tamamı buna bağlı.
2. **AiTakvim'e 10 dakika bak** — rakip incelemesinde sitesi açılmadı, tek doğrulanamayan oyuncu.
3. **Güncel kurla marjı kontrol et** (§4).
4. **Demoyu bir kez baştan sona çalıştır** — sunumda ilk kez açmak en kötü senaryo.
4. **Paneli sunuma koyma.** Onlarda zaten var; göstermek bizi dinlememiş gösterir.
