# ZEKAI Travel — çalışma notları

Seyahat planlama.

## Mimari kısıt

Tek dosyalık HTML PWA (vanilla JS/CSS, build adımı yok, Hostinger). Backend yok.

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
| [Can I enter](https://canienter.com) | 199 pasaport için vize şartı | No | İstemci |
| [REST Countries](https://restcountries.com) | Ülke, para birimi, dil | No | İstemci |
| [administrative-divisons-db](https://github.com/kamikazechaser/administrative-divisions-db) | İl/ilçe hiyerarşisi | No | İstemci |
| [GeographQL](https://geographql.netlify.app) | Ülke, eyalet, şehir (GraphQL) | No | İstemci |
| [Frankfurter](https://www.frankfurter.app/docs) | ECB döviz kuru | No | İstemci |
| [Nominatim](https://nominatim.org/release-docs/latest/api/Overview/) | Adres ↔ koordinat, mekan arama | No | İstemci |
| [Open-Meteo](https://open-meteo.com/) | Hava tahmini | No | İstemci |
| [ConnectMeGuru](https://www.connectmeguru.com/api/mcp) | 190+ ülkede eSIM paketi | No | İstemci |

## Bu ürüne özel

- Vize ve idarî bölüm verisi bu üründe çekirdek özellik; hepsi anahtarsız, mevcut PWA mimarisi değişmeden kullanılabilir.
- `ConnectMeGuru` satış yapan ticari bir servis — şartlarını ve komisyon modelini okumadan bağlama.
- Vize çıktısını kesin bilgi diye sunma; kaynağını göster.
