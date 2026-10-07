# Türkçe STT Değerlendirme Seti

Sesli asistanın konuşma tanıma sağlayıcısını seçmek için. **Seçenek 2'nin
ön koşulu**, ama sonucu her hâlükârda işimize yarıyor: Seçenek 1'de
ConversationRelay'in Türkçesi yetersiz çıkarsa da aynı ölçüme ihtiyacımız var.

**Süre:** 2 iş günü. Sağlayıcı seçmeden önce yapılmalı — kötü çıkarsa
Seçenek 2 zaten mantıklı olmaktan çıkar ve bunu 20 gün sonra değil 2 günde
öğrenmiş oluruz.

---

## Neden kelime hata oranı yetmiyor

Bir sağlayıcı "koptu" yerine "kaptı", "kan" yerine "can" yazarsa **kelime
hata oranı %2 çıkar** — mükemmele yakın görünür. Ama o çağrı bir çocuğun
dişinin kopmasıydı ve acil tarama devreye girmedi.

Bu yüzden üç ayrı ölçüt var ve **sıralaması önemli**:

| Ölçüt | Eşik | Neden |
|---|---|---|
| **Acil yakalama** | **%100** | Kaçırmak klinik sorumluluk doğurur. Tek kaçırma elenme sebebi |
| **Kritik alan** | ≥ %90 | Tarih/saat/isim hatası hastayı yanlış gün getirir |
| **Kelime hata oranı** | ≤ %15 | Genel anlaşılabilirlik |

Acil yakalamada `src/acil.js` ile aynı mantık kullanılıyor: cümledeki
tetikleyici kelimelerden **birinin** sağlam kalması yeterli, çünkü acil
tarama herhangi bir anahtar kelimeyi görünce devreye giriyor.

---

## Set neyi kapsıyor

39 cümle, 8 kategori:

| Kategori | Adet | Ne sınıyor |
|---|---|---|
| acil | 7 | `klinik.json`'daki tetikleyici kelimelerin hayatta kalması |
| randevu | 7 | Gün adları, yazıyla saatler, göreli tarihler ("öbür gün") |
| tedavi | 7 | Klinik terimler — zirkonyum, ortodonti, implant |
| isim | 4 | Türkçe özel karakterler ve yazıyla telefon numarası |
| fiyat | 3 | Fiyat ve ödeme soruları |
| iptal | 3 | **Olumsuzlama** — "iptal etmeyin" ile "iptal edin" farkı |
| gunluk | 4 | Temel seviye, karşılaştırma tabanı |
| zor | 4 | Duraksama, kendini düzeltme, hat sorunu — gerçek çağrıların hâli |

**Kritik alanlar SÖYLENEN biçimi bekler**, normalize edilmiş değeri değil:
"on dört" beklenir, "14:00" değil. Sayıya ve tarihe çevirmek anlama
katmanının işi, STT'nin değil. Eşleşme gövde önekiyle yapılır —
"ertele" beklenirse "erteleyin" kabul edilir.

---

## Nasıl yapılır

### 1. Kaydet

Cümleleri **telefon hattı kalitesinde** okut. Laboratuvar kaydı yanıltır.

- En az 2 kişi okusun (bir kadın bir erkek ses)
- Gerçek bir telefon çağrısı üzerinden kaydedin — sağlayıcının
  demo/test numarası varsa ideal
- Acil cümlelerini **telaşlı** okuyun, sakin değil. Gerçekte öyle geliyor
- Mümkünse bir seti arka plan gürültüsüyle tekrarlayın

### 2. Dökümü topla

Her sağlayıcı için bir dosya. İki biçimden biri:

```json
{ "acil-01": "dişim kırıldı ve kanama bir türlü durmuyor ne yapmalıyım", ... }
```

veya satır başına `id<TAB>döküm` olan bir `.tsv`.

### 3. Puanla

```
python3 puanla.py dokum-saglayiciA.json --ad "Sağlayıcı A"
python3 puanla.py dokum-saglayiciA.json --ayrinti    # cümle cümle
```

Çıktının sonundaki **KARAR** bölümü eşikleri uygular.

---

## Ölçüm sırasında ayrıca not edilecekler

Puanlayıcı bunları ölçmüyor ama karar bunlara da bağlı:

- **Gecikme.** Hasta sustuktan sonra dökümün gelmesi ne kadar sürüyor?
  Hedef 1–1,5 saniye. Doğruluğu yüksek ama yavaş bir sağlayıcı telefonda
  kullanılamaz.
- **Akış desteği.** Cümle bitmeden parça parça döküm veriyor mu? Sıra
  yönetimi buna bağlı.
- **Fiyat.** $/dakika ve faturalandırma dilimi (saniye mi, dakika mı).
- **Veri işleme.** Ses nerede işleniyor, saklanıyor mu, kapatılabiliyor mu?
  Sağlık verisi taşıdığımız için bu eleme kriteri.

---

## Doğrulama

Puanlayıcı iki sahte dökümle sınandı:

- **Kusursuz döküm** → %100 kritik alan, %100 acil, WER %0, geçer
- **Gerçekçi hatalı döküm** → WER yalnızca %2, ama "koptu→kaptı, kan→can"
  yüzünden bir acil cümle kaçıyor ve **KULLANILAMAZ** veriyor

İkincisi setin varlık sebebi: düşük WER tek başına hiçbir şey söylemiyor.
