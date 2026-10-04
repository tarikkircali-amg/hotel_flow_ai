# HotelFlow — çalışma notları

Club Calimera otel operasyonu. Backend: Express + `node-sqlite3-wasm`, tek dosya (`server.js`), build adımı yok.

## Mimari kısıt

Ailenin **backend'i olan tek ürünü**. Anahtar gerektiren entegrasyonlar buradan proxy'lenebilir; diğer dördünde böyle bir katman yok.

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
| [Frankfurter](https://www.frankfurter.app/docs) | ECB döviz kuru | No | İstemci |
| [Currency-api](https://github.com/fawazahmed0/currency-api#readme) | 150+ para birimi | No | İstemci |
| [REST Countries](https://restcountries.com) | Ülke, telefon kodu, para birimi | No | İstemci |
| [Can I enter](https://canienter.com) | 199 pasaport için vize şartı | No | İstemci |
| [Nominatim](https://nominatim.org/release-docs/latest/api/Overview/) | Adres ↔ koordinat | No | İstemci |
| [VATComply](https://www.vatcomply.com/documentation) | AB KDV doğrulama | No | İstemci |
| [Open-Meteo](https://open-meteo.com/) | Hava tahmini | No | İstemci |

## Bu ürüne özel

### Kurulu skill'ler (12)

- 10 Vercel skill'i (`vercel-labs/skills` + `vercel-labs/agent-skills`)
- `youtube-transcript` — hafif, `uv` ile tek Python dosyası, sistem paketi kurmaz
- `youtube-transcript-ytdlp` — `yt-dlp` tabanlı, Whisper'a düşebilir, `sudo apt install` kullanabilir

`youtube-transcript-ytdlp` elle yerleştirildi ve `skills-lock.json`'da **yok**. Upstream'de adı `youtube-transcript` ve CLI aynı adlı dizini uyarı vermeden eziyor. Bu repoda `npx skills add langbaseinc/agent-skills --skill youtube-transcript` **çalıştırma** — diğer skill'i siler. Gerekçe ve yeniden güncelleme adımları: `.claude/skills/youtube-transcript-ytdlp/VENDORED.md`.

### Diğer

- Vize şartları hukuki sonuç doğurur. `Can I enter` çıktısını misafire kesin bilgi diye sunma; kaynağını göster ve konsolosluğa yönlendir.
- Diğer dört ürünün anahtarlı API ihtiyacı da bu backend'e proxy katmanı eklenerek karşılanabilir.
- Bu ürünlerin `CLAUDE.md` dosyaları `docs/claude-md/gen.py` ile üretilir; ortak bloğu elle düzenleme.
