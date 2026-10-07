# Twilio ConversationRelay Yuvarlama Testi

**Neden:** Twilio'nun Voice/BYOC bacağının kısmi dakikayı yukarı yuvarladığı
teyitli. **ConversationRelay'in kendi $0,07/dk sayacının** aynı şekilde
yuvarlayıp yuvarlamadığı belgelenmemiş — Twilio Digital Sales de "elimde bunu
kesinleştiren bir satır yok" dedi ve testi bize önerdi.

**Değeri:** Aylık **5.250 ₺.**

| | Faturalanan | Twilio ₺/ay |
|---|---|---|
| İkisi de yuvarlanıyorsa | 9.000 dk | 33.300 ₺ |
| Sadece Voice bacağı yuvarlanıyorsa | 7.500 CR + 9.000 Voice | 28.050 ₺ |

Toplam maliyet 40.080 ₺ yerine **34.830 ₺** olur. Teklifteki brüt marjımız
4.920 ₺'den 10.170 ₺'ye çıkar — iki katından fazla.

**Şu an temkinli olanı varsayıyoruz.** Test olumlu çıkarsa aşağı çekeriz;
ters sürpriz olmaz.

---

## Test nasıl yapılır

### Gereken

- Twilio'da bir numara. Türkiye numarası satmıyorlar ama **test için ABD
  numarası yeterli** (~$1,15/ay) — ölçtüğümüz şey dakika sayacı, hattın
  nereden geldiği değil.
- Çalışan sunucumuz (`npm start`) ve genel adres (ngrok veya benzeri).
- Anthropic kredisi **gerekmiyor**: karşılama metni ConversationRelay
  tarafından okunuyor, modele hiç gitmiyor. Hiçbir şey söylemeden kapatmak
  testi bozmaz.

### Adımlar

1. Numarayı `/twilio/ses` adresimize yönlendir.
2. **60 saniyenin altında** bir çağrı yap. 25–35 saniye ideal: hem bir
   dakikanın açık şekilde altında, hem de bağlantı kurulacak kadar uzun.
3. Çağrı bitince `<Connect>`in `action` geri çağrısı sunucumuza düşüyor.
   Bu geri çağrı **SessionDuration** alanını saniye cinsinden taşıyor —
   gerçek süre bu.
4. 24–48 saat bekle, Twilio Console → Usage'da iki kalemi ayrı ayrı oku:
   - **ConversationRelay** kaç dakika faturalanmış
   - **Voice/BYOC** kaç dakika faturalanmış

### Sonuç nasıl okunur

| ConversationRelay satırı | Anlamı |
|---|---|
| **1 dakika** | CR de yukarı yuvarlıyor. 9.000 dakikalık modelimiz doğru, değişiklik yok |
| **0,5 dakika civarı** (saniye bazlı) | CR yuvarlamıyor. Modeli 34.830 ₺'ye çekebiliriz |

Tek çağrı yeterli ama **iki çağrı daha güvenli**: biri ~25 sn, biri ~55 sn.
İkisi de 1 dakika yazıyorsa yuvarlama kesin.

### Kodda yapılacak bir şey var mı

Hayır. `src/twilio.js` zaten `<Connect>`e `action` adresi veriyor
(`config.genelAdres + YOL_BITTI`) ve geri çağrıyı karşılıyor. Test sırasında
o geri çağrının gövdesini loglamak yeterli.

---

## Bu teste bağlı olmayan iki kazanım

**1. Türkçe ses belirlendi.** Twilio'nun kılavuzunda tr-TR için açıkça
listelenen ElevenLabs sesi: `IuRRIAcbQK5AQk1XevPj`. Projede varsayılan
yapıldı (`.env.example`, `src/config.js`).

Uyarı: bazı ElevenLabs modelleri yalnızca belirli dillerde çalışıyor.
Alternatif bir sese geçmeden önce Türkçe uyumluluğu doğrulanmalı. Önce
hız/kararlılık/benzerlik ayarlarıyla oynanmalı, ses değiştirmek son çare.

**2. Taahhütlü kullanım eşiği belli: aylık ~$1.000 Twilio harcaması**
(~$12.000/yıl).

| Durum | Aylık Twilio | Eşiğe göre |
|---|---|---|
| 1 klinik, 7.500 dk | $555 | Liste fiyatı |
| 1 klinik, 15.000 dk | $1.110 | **Eşikte** |
| 2 klinik, 7.500'er dk | $1.110 | **Eşikte** |
| 3–5 klinik | $1.665–5.550 | Rahat üstünde |

**Beş klinik beklemeye gerek yok.** İkinci klinik canlıya çıktığı anda —
ya da Deniz Dent aralığın üst ucuna yaklaşırsa — indirim görüşmesi
başlatılabilir. Bu, ikinci müşterinin birincinin maliyetini de düşürmesi
demek; fiyatlandırma kararlarında akılda tutulmalı.
