# Bekleyen Cevaplar — Takip Listesi

**Son güncelleme:** 06.10.2026

| # | Konu | Kimden | Gönderildi | Durum |
|---|---|---|---|---|
| 1 | **Fiyat teklifi** | Deniz Dent — Şerif Bey | 06.10.2026 | **"Değerlendirip haber vereceğiz" (06.10.2026).** 13.10'da nazik hatırlatma |
| 2 | **Twilio Sales** — A1 numara, A3 TTS dahil mi, C2 BYOC dakikası | Twilio — Isa Bell (isa@twilio.com), Digital Sales | 06.10.2026 | **CEVAPLANDI 07.10.2026.** Üç sorunun üçü de yanıtlandı. Modele işlendi |
| 3 | **Twilio Support #29847256** — Türkçe STT, hazır ses, KVKK veri işleme | Twilio | 06.10.2026 | Yanıt süresi garantisiz |
| 4 | **Verimor** — 15 günlük demo + paket fiyatı teyidi | Verimor | 06.10.2026 | **08.10: cevap geldi.** A-law ✓, gelen ücretsiz ✓, zorunlu modül yok ✓, rakamlar yıllıkmış ✓. **Açık kalan:** giden çağrı ücreti, FQDN/BYOC soruları. **Bizde:** ücretsiz numara başvurusu |

---

## Hangi cevap neyi açar

| Cevap | Açtığı karar |
|---|---|
| ~~**A3** (TTS dahil mi)~~ | **Cevaplandı: STT dahil, ayrı TTS sayacı yok** |
| ~~**C2** (BYOC dakikası)~~ | **Cevaplandı: $0,0040/dk** |
| **Twilio ilk faturası** | TTS'in gerçekten ayrı faturalanmadığının kesin teyidi |
| **Yuvarlama testi** (bizde) | ConversationRelay sayacı da yuvarlıyor mu — 5.250 ₺/ay. Bkz. `twilio-yuvarlama-testi.md` |
| **Giden çağrı ücreti** | Aktarımların maliyeti. Bulut Santral mı santralsiz mi kararını belirliyor |
| **Verimor demo** | Günde kaç çağrı, ortalama kaç dakika. **Modelin en büyük belirsizliği** |
| **Verimor paket fiyatı** | Sabit giderin doğru rakamı |
| **Twilio B1** (hazır ses dosyası) | Sabit cümle önbelleği Seçenek 1'de kullanılabilir mi (3.000 ₺/ay) |
| **Twilio B2** (Türkçe STT) | Seçenek 1 / Seçenek 2 kararının teknik temeli |
| **Şerif Bey** | Her şey |

---

## Bizim yapacaklarımız

- **Verimor ücretsiz numara başvurusu** — `oim.verimor.com.tr/abonelik-basvurusu`
  üzerinden. Numara alınıp Verimor'a iletilecek, 15 günlük demoyu onlar açacak.
  **Demo zincirinin ilk halkası bu.**

---

## Bizden klinikten istenecekler

Sözleşme aşamasına gelmeden toplanmalı:

- Veri sorumlusu bilgileri (KVKK aydınlatma metni için zorunlu)
- Kliniğin gerçek aydınlatma metni bağlantısı (SMS metninde hâlâ `[BAĞLANTI]` yer tutucusu var)
- Üç aydınlatma metninin klinik onayı
- Saklama sürelerinin KVKK danışmanı onayı
- SBYS (hasta yönetim sistemi) sağlayıcı adı ve entegrasyon dokümanı
- Sosyal medya erişimleri (form gönderildi, doldurulup dönmesi bekleniyor)

---

## Cevap gelmezse

**Twilio A3 ve C2 iki haftada gelmezse:** kliniğe tek sayı değil aralık
veririz ve Seçenek 2'ye ağırlık veririz. Orada Twilio hiç yok.

**Verimor demo çıkmazsa:** gerçek çağrı verisi olmadan ilerlemek zorunda
kalırız. Bu durumda teklifteki "ilk ay birlikte ölçeceğiz" maddesi daha
da kritik hâle gelir — ölçümü canlıya geçtikten sonra yaparız.
