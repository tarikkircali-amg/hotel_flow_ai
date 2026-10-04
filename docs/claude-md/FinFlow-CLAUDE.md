# FinFlow — çalışma notları

Finans.

## Mimari kısıt

Tek dosyalık HTML PWA (vanilla JS/CSS, build adımı yok, Hostinger). Backend yok — aşağıdaki *Backend* satırları bu haliyle kullanılamaz, önce proxy katmanı gerekir.

<!-- ORTAK BLOK BAŞLANGIÇ — beş üründe birebir aynı, tek yerden güncelle -->

## Standartlar

`ai-product-os` skill'i bu projeyi kapsıyor — iş yapmadan önce yükle. İhlal edilemezler §2'de; bu ürün ailesinde en çok ihlal edilme riski taşıyan ikisi:

- **İstemci kodunda sır yok.** API anahtarı, token, kimlik bilgisi yalnızca env değişkeninde veya vault'ta. Ailenin bilinen açık sorunu istemci tarafı Anthropic anahtarı — büyütme.
- **Kiracı izolasyonu.** Her iş satırı `organization_id` taşır, değeri auth token'dan türetilir, istek gövdesinden değil.

Diğer bilinen açık sorunlar (dokunduğunda düzelt): varsayılan/paylaşılan parolalar, raw-SQL auth provisioning, yedek yok, staging yok.

Bu ürün OS'a uymuyor ve **grandfathered** — kullanıcı istemedikçe yeniden yazım önerme.

## Skill kurulumu

Skill'ler `.claude/skills/` altında dosya olarak durur, `skills-lock.json` ile izlenir. Güncelleme: `npx skills update`.

Kurulum: `npx skills add <owner/repo> --agent claude-code --skill <ad> --yes --copy`

**Tuzak:** CLI, skill'i frontmatter'daki `name` alanına göre `.claude/skills/<name>/` altına kurar — dizin adına göre değil. Eşleşmeyen `--skill` argümanı **sessizce atlanır**, ve aynı adlı mevcut bir dizin **uyarı vermeden ezilir**. İki farklı repodan aynı adlı skill kuruyorsan birini elle yerleştirip `name` alanını değiştir.

## Ortam notu

`skills.sh` cloud ortamının ağ politikası tarafından engelli (proxy 403). Sonuç: `npx skills find <sorgu>` hata vermek yerine **"No skills found" diyor** — arama çalışmıyor demek, skill yok demek değil. `npx skills add <owner/repo>` GitHub üzerinden sorunsuz.

Düzeltmek için: environment ayarları → Network access → Custom → `skills.sh` ekle.

## Ücretsiz API kısa listesi

Beş ürün için `public-apis` listesinden ayıklanmış ~20 API, ürün başına tablo:
https://claude.ai/code/artifact/424ff73f-fe69-409f-aadd-4130d5aba1ef

Dokümandaki **Tarayıcı** sütunu bağlayıcı: *Backend* yazan hiçbir API doğrudan istemciden çağrılamaz.

Listedeki `Auth` sütunu toplulukla güncelleniyor ve eskiyor — üretime almadan önce sağlayıcının kendi sayfasını aç. Kanıt: `balldontlie` repoda hâlâ `Auth: No`, gerçekte 2024'ten beri anahtar istiyor ve ücretsiz katmanı dakikada 5 istek.

<!-- ORTAK BLOK BİTİŞ -->

### Bu üründe kullanılabilecekler

| API | Ne verir | Auth | Nereden |
| --- | --- | --- | --- |
| [Temsor](https://api.temsor.com/docs) | TCKN, vergi no, IBAN, telefon, plaka doğrulama | apiKey | **Backend** |
| [Frankfurter](https://www.frankfurter.app/docs) | ECB döviz kuru | No | İstemci |
| [Currency-api](https://github.com/fawazahmed0/currency-api#readme) | 150+ para birimi | No | İstemci |
| [VATComply](https://www.vatcomply.com/documentation) | AB KDV doğrulama | No | İstemci |
| [CoinGecko](https://www.coingecko.com/api) | Kripto fiyat ve piyasa | No | İstemci |
| [Coinpaprika](https://api.coinpaprika.com) | Kripto fiyat ve hacim | No | İstemci |
| [DefiLlama](https://defillama.com/docs/api) | DeFi TVL, coin fiyatları | No | İstemci |
| [FRED](https://fred.stlouisfed.org/docs/api/fred/) | Makro ekonomik seriler | apiKey | **Backend** |
| [Twelve Data](https://twelvedata.com/) | Hisse, forex, kripto | apiKey | **Backend** |
| [Finnhub](https://finnhub.io/docs/api) | Hisse, döviz + WebSocket | apiKey | **Backend** |
| [Alpha Vantage](https://www.alphavantage.co/) | Hisse, teknik göstergeler | apiKey | **Backend** |
| [EOD Historical Data](https://eodhd.com/) | 150+ borsa | apiKey | **Backend** |

## Bu ürüne özel

- **Temsor** listedeki en değerli kayıt: Türkiye'ye özel iki kayıttan biri ve tam bu ürünün işi. Ama anahtar istiyor, yani proxy katmanı olmadan kullanılamaz.
- **BIST verisi listede yok.** Borsa İstanbul fiyatı için ayrı sağlayıcıyla anlaşman gerekir.
- `Frankfurter` günlük kapanış verir, anlık işlem için yetersiz.
- `CoinGecko` listede `Auth: No` görünüyor ama birçok ucu artık demo anahtar istiyor — teyit et.
- `Alpha Vantage` ücretsiz katmanı dakikada 5 istek; üretim için gerçekçi değil.
