# B) Fizibilite ve Mimari — Deniz Dent 7/24 Klinik Asistanı

**Revizyon 3 · 30.09.2026**

> **Kapsam kararı:** Yabancı dil desteği çıkarıldı. Sistem Türkçe-tek dil.
> Ayrıca sunum için **çalışan bir demo** eklendi: Postgres ve telefon numarası
> gerektirmeden, ElevenLabs sesiyle tarayıcıda çalışıyor (`sesli-asistan/` klasörü).
**Değişiklik sebebi:** Deniz Dent'te klinik yönetim sistemine benzer bir yapı **zaten var.** Talep, yeni bir klinik yazılımı değil; **mesai dışı ve 7/24 hizmet veren bir katman.**

Revizyon 1 (29.09) geçersizdir. Bu doküman iç kullanım içindir.

---

## 1. Kapsam neden ve nasıl değişti

| | Revizyon 1 (yanlış varsayım) | Revizyon 2 (gerçek) |
|---|---|---|
| Ürün | Klinik işletim sistemi + asistan | **Sadece mesai dışı/7/24 iletişim katmanı** |
| Panel | Deniz Dent paneli canlıya alınacak | **Yapılmayacak** — onlarda zaten var |
| Hasta CRM | Sıfırdan kurulacak | **Yapılmayacak** — onlarda zaten var |
| Merkez | WhatsApp | **Sesli telefon karşılama** |
| Süre | 16 hafta | **8 hafta** (ek modülle 11) |
| Kurulum | 144.000 ₺ | **55.000 ₺** |
| Aylık | 18.900 ₺ | **12.900 ₺** |

### 1.1 Kaybettiğimiz koz — dürüst olalım

Revizyon 1'in ana satış argümanı şuydu: *"Rakiplerde klinik yönetim yazılımı yok, sadece mesaj katmanı satıyorlar; bizde var."*

**Bu argüman artık geçersiz.** Deniz Dent'te zaten bir sistem varsa, biz de tam olarak rakiplerin bulunduğu kategoriye düştük: mevcut bir sistemin üstüne oturan iletişim katmanı.

Bunu kabul edip yeni kozla ilerlemek, eski kozu zorlamaktan iyidir. Toplantıda panel göstermek — onlara zaten sahip oldukları şeyi satmaya çalışmak — bizi amatör gösterir.

### 1.2 Kazandığımız koz

Talep "7/24 ve mesai dışı" olunca ağırlık merkezi **telefona** kayıyor. Gece ağrıyla uyanan hasta WhatsApp yazmaz, arar.

Ve rakip tablosunda durum şu:

| Rakip | Sesli karşılama |
|---|---|
| **ClinicFlow** (en güçlü rakip) | **YOK** — kendi sitesinde "Yakında" yazıyor |
| AsIsta | YOK |
| AI Calls | Var ama outbound kampanya aracı, klinik ürünü değil |
| **AgentFix** | **VAR** — gerçek rakip bu artık |

Yani yeni kapsam bizi ClinicFlow'un olmadığı yere, AgentFix'in karşısına koyuyor. AgentFix'in zaafı ise fiyat şeffaflığı olmaması, proje bazlı kurumsal satış yapması ve yerel olmaması.

---

## 2. Projenin tek kritik bilinmeyeni

> **Deniz Dent hangi sistemi kullanıyor ve o sistem dışarıdan veri alışverişine izin veriyor mu?**

Bu cevaplanmadan mimari kesinleşmez. **Toplantıdan önce veya toplantının ilk 10 dakikasında sorulmalı.** İki yol var, ikisi de çalışır, ikisi de aynı fiyat.

### A yolu — sistem bağlantıya açıksa
- Asistan müsait saatleri canlı okur
- Onaylanan randevuyu doğrudan sisteme yazar
- Sabah ekibin yapacağı iş kalmaz

Bunun için sistemin API'si, veritabanı erişimi veya en azından düzenli dışa aktarım imkânı olmalı.

### B yolu — sistem kapalıysa
- Asistan gece taleplerini toplar, **sabah onay kuyruğuna** koyar
- Ekip sabah listeyi görür, tek tıkla onaylar, kendi sistemine geçirir
- Hasta gece cevabını almıştır; kayıt sabah tamamlanır

**B yolu bir gerileme değil.** Müşterinin asıl acısı "gece hasta cevapsız kalıyor" — o acı B yolunda da çözülür. Sadece randevunun deftere geçişi otomatik değil, tek tıkla olur.

### Nasıl öğreneceğiz
Teklifte **ücretsiz bağlantı testi** sözü verdim: sistemin adını söylesinler, biz test edip yazılı bildirelim. Bu hem satışı hızlandırır hem bizi yanlış taahhütten korur.

**Türkiye'de yaygın diş klinik yazılımları kapalı olma eğilimindedir.** B yoluna hazırlıklı ol, A yolunu bonus say.

---

## 3. Hedef mimari (sadeleşmiş)

```
   Mesai dışı hasta kanalları
 ┌──────────────────────────────────┐
 │  TELEFON (ana)    WhatsApp   Web │
 └────┬──────────────────┬──────┬───┘
      ▼                  ▼      ▼
 ┌──────────────────────────────────┐
 │  KANAL AĞ GEÇİDİ                 │
 │  · mesai saati kontrolü          │
 │  · ACİL kelime taraması (ilk!)   │
 └──────────────┬───────────────────┘
                ▼
 ┌──────────────────────────────────┐
 │  KONUŞMA ÇEKİRDEĞİ               │
 │  · arayan tanıma (telefon no)    │
 │  · geçmiş görüşme yükleme        │
 │  · dil algılama (ek modül)       │
 └──────────────┬───────────────────┘
                ▼
 ┌──────────────────────────────────┐
 │  AJAN (Claude + versiyonlu prompt)│
 │  · onaylı bilgi bankası (RAG)    │
 │  · FİYAT BANDI — uydurma yasak   │
 │  · güven eşiği → devret          │
 └───────┬──────────────────┬───────┘
         ▼                  ▼
 ┌──────────────┐  ┌────────────────┐
 │ A: sisteme   │  │ B: SABAH ONAY  │
 │    doğrudan  │  │    KUYRUĞU     │
 │    yaz       │  │    (tek tık)   │
 └──────────────┘  └────────────────┘
                ▼
 ┌──────────────────────────────────┐
 │  SABAH TESLİM EKRANI             │
 │  gece kimler aradı, ne oldu      │
 │  + görüşme dökümü + denetim kaydı│
 └──────────────────────────────────┘
```

**Dikkat:** Acil kelime taraması ajandan **önce** çalışır. LLM'in acil bir çağrıda "düşünmesini" bekleyemeyiz; kanama/travma/şiddetli ağrı ifadeleri doğrudan yönlendirmeyi tetikler.

---

## 4. Ne hazır, ne yeni yazılacak

Kapsam daraldığı için yeniden kullanım oranı yükseldi.

| Bileşen | Hazır | Yeni | Not |
|---|---|---|---|
| ~~Dil algılama + çeviri katmanı~~ | — | — | **Kapsam dışı (30.09 kararı)** |
| Konuşma akışı motoru | **%50** | %50 | Otel botundan desen |
| Ajan katmanı + bilgi bankası | %20 | %80 | Fiyat yönetişimi yeni |
| Kanal ağ geçidi (WhatsApp) | %10 | %90 | WhatsApp deneyimi var |
| **Sesli katman** | %0 | **%100** | En zor parça, 1 hafta doğrulama şart |
| Sabah teslim ekranı | %30 | %70 | Panel arayüzünden bileşen alınabilir |
| Mevcut sisteme entegrasyon | %0 | **%100** | A/B kararına bağlı |
| Rıza / KVKK modülü | %0 | **%100** | Pazarlıksız |
| Acil yönlendirme | %0 | %100 | Basit ama kritik |
| ~~Klinik paneli~~ | — | — | **Kapsam dışı** |
| ~~Hasta CRM~~ | — | — | **Kapsam dışı** |
| ~~Hekim atama motoru~~ | — | — | **Kapsam dışı** (kendi sistemlerinde) |

**Not:** `hotel_flow_ai/server.js` yine temel alınamaz (tuzsuz SHA-256, düz metin oturum tokenı, gömülü demo şifreler, tenant izolasyonu yok, CORS açık). Ama kapsam küçüldüğü için etkisi az — zaten büyük bir backend yazmıyoruz.

---

## 5. Sesli katman — projenin kalbi ve en büyük riski

Artık bu **opsiyonel bir faz değil, ana ürün.** Risk yönetimi buna göre sıkılaşmalı.

| Risk | Gerçeklik | Azaltma |
|---|---|---|
| **Türkçe ses kalitesi** | Twilio ConversationRelay'in Türkçe desteğini resmî dokümanda **doğrulayamadım**. | **5. hafta teknik doğrulama zorunlu ve teklifte yazılı.** Yetersizse ElevenLabs TTS + ayrı STT ile kurarız. |
| **Gecikme** | Doğal konuşma için toplam yanıt ~1–1,5 sn altında olmalı. | Akışlı STT/TTS, kısa yanıt kuralı, karşılama cümlesi önceden sentezlenmiş |
| **Yanlış duyma** | Telefonda isim, tarih, numara yanlış anlaşılır. | Kritik veride **geri okuma teyidi**. Düşük güvende geçilmez. |
| **Acil durum** | Bot triyaj yaparsa klinik sorumlu olur. | Ajandan önce kelime taraması → doğrudan yönlendirme |
| **Maliyet öngörülemezliği** | Dakika + TTS + STT + LLM + operatör ücreti biniyor. | Dakika havuzu + aşım fiyatı sözleşmede net, panelde canlı sayaç |
| **Hasta botla konuşmak istemez** | Meşru tepki. | Asistan AI olduğunu **söyler**. "Yetkiliye bağlan" her an çalışır. |

---

## 6. KVKK

Revizyon 1'deki yükümlülüklerin tamamı geçerli. Kapsam daraldığı için **iki şey kolaylaştı:**

1. Hasta tıbbi kaydını biz tutmuyoruz — o kendi sistemlerinde kalıyor. Bizde sadece **görüşme kaydı ve iletişim verisi** var. Bu, veri sorumluluğumuzu ve riski azaltır.
2. Ses kaydı tutmama önerisi daha da önemli hale geldi (sesli ana kanal). **Varsayılan: kayıt yok, sadece yazılı döküm.**

Değişmeyen zorunluluklar: açık rıza, aydınlatma metni, veri minimizasyonu (LLM'e giden metinde kimlik maskeleme), şifreleme, saklama süresi, silme hakkı, denetim kaydı, yurt dışı aktarım şeffaflığı.

---

## 7. Takvim

**Varsayım:** Tek geliştirici, haftada ~25 saat.

| Hafta | İş | Çıktı |
|---|---|---|
| 1 | Keşif + **bağlantı testi (A/B kararı)** + fiyat bantları + acil kuralları + rıza metinleri | Kapsam kilitlendi |
| 2–4 | WhatsApp asistanı, bilgi bankası, sabah onay kuyruğu, insana devir, entegrasyon | **Gece WhatsApp kapandı** |
| 5 | **Sesli teknik doğrulama** (Türkçe kalite + gecikme ölçümü) | Ses sağlayıcısı kesinleşti |
| 6–8 | Sesli karşılama, geri okuma teyidi, acil aktarım, dakika sayacı | **7/24 tam kapsama** |
| +9–10 | Ek modül: Instagram, Facebook | Tüm kanallar tek kuyrukta |

**Takvimi kaydırabilecekler:** Meta hesap doğrulaması (1–2 hafta, bizim elimizde değil) · fiyat bantları ve acil kurallarının klinikten gelmesi · ses doğrulaması olumsuz çıkarsa +1 hafta.

---

## 8. Canlıya çıkış testleri

Ajan beş testi geçmeden açılmaz:

1. **Olgusal** — bilinen cevaplı soru → bilgi bankasından doğru cevap
2. **Bilinmeyen** — cevapsız soru → uydurmaz, sorar veya bilmediğini söyler
3. **Acil** — acil ifade → bilgi vermez, yönlendirir *(sesli kanalda en kritik test)*
4. **Gizlilik** — başka hastanın verisi istenir → reddeder
5. **Fiyat bütünlüğü** — listede olmayan fiyat için baskı → uydurmayı reddeder

Sesli kanal için ek: **gürültülü ortam**, **aksan**, **tarih/numara geri okuma doğruluğu**.
