#!/usr/bin/env python3
"""Beş ürün için CLAUDE.md üretir. Ortak blok tek yerde tanımlı, hepsine birebir aynı girer."""
import pathlib

DOC = "https://claude.ai/code/artifact/424ff73f-fe69-409f-aadd-4130d5aba1ef"

ORTAK = f"""<!-- ORTAK BLOK BAŞLANGIÇ — beş üründe birebir aynı, tek yerden güncelle -->

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
{DOC}

Dokümandaki **Tarayıcı** sütunu bağlayıcı: *Backend* yazan hiçbir API doğrudan istemciden çağrılamaz.

Listedeki `Auth` sütunu toplulukla güncelleniyor ve eskiyor — üretime almadan önce sağlayıcının kendi sayfasını aç. Kanıt: `balldontlie` repoda hâlâ `Auth: No`, gerçekte 2024'ten beri anahtar istiyor ve ücretsiz katmanı dakikada 5 istek.

<!-- ORTAK BLOK BİTİŞ -->"""

URUNLER = [
 dict(dosya="DurakAI", baslik="DurakAI", ozet="Toplu taşıma / durak asistanı.",
  mimari="Tek dosyalık HTML PWA (vanilla JS/CSS, build adımı yok, Hostinger). Backend yok — anahtar gerektiren hiçbir API bu haliyle kullanılamaz.",
  api="""| API | Ne verir | Auth | Nereden |
| --- | --- | --- | --- |
| [İBB Açık Veri](https://data.ibb.gov.tr) | İBB veri setleri | No | Backend (CORS bilinmiyor) |
| [Open-Meteo](https://open-meteo.com/) | Hava tahmini | No | İstemci |
| [Nominatim](https://nominatim.org/release-docs/latest/api/Overview/) | Adres ↔ koordinat | No | İstemci |
| [GTFS Scorecard](https://github.com/ChelseaKR/gtfs-scorecard/blob/main/docs/api.md) | GTFS feed kalite notu | No | İstemci |""",
  notlar="""- Listeden en az faydalanan ürün. Toplu taşıma API'lerinin tamamı tek şehir/tek ülke kaynakları; İBB dışında Türkiye verisi yok.
- `transport.rest` cazip görünür ama Almanya ve çevresi içindir.
- İBB dışı Türkiye toplu taşıma verisi için ayrı kaynak bulman gerekiyor."""),

 dict(dosya="HotelFlow", baslik="HotelFlow", ozet="Club Calimera otel operasyonu. Backend: Express + `node-sqlite3-wasm`, tek dosya (`server.js`), build adımı yok.",
  mimari="Ailenin **backend'i olan tek ürünü**. Anahtar gerektiren entegrasyonlar buradan proxy'lenebilir; diğer dördünde böyle bir katman yok.",
  api="""| API | Ne verir | Auth | Nereden |
| --- | --- | --- | --- |
| [Frankfurter](https://www.frankfurter.app/docs) | ECB döviz kuru | No | İstemci |
| [Currency-api](https://github.com/fawazahmed0/currency-api#readme) | 150+ para birimi | No | İstemci |
| [REST Countries](https://restcountries.com) | Ülke, telefon kodu, para birimi | No | İstemci |
| [Can I enter](https://canienter.com) | 199 pasaport için vize şartı | No | İstemci |
| [Nominatim](https://nominatim.org/release-docs/latest/api/Overview/) | Adres ↔ koordinat | No | İstemci |
| [VATComply](https://www.vatcomply.com/documentation) | AB KDV doğrulama | No | İstemci |
| [Open-Meteo](https://open-meteo.com/) | Hava tahmini | No | İstemci |""",
  notlar="""### Kurulu skill'ler (12)

- 10 Vercel skill'i (`vercel-labs/skills` + `vercel-labs/agent-skills`)
- `youtube-transcript` — hafif, `uv` ile tek Python dosyası, sistem paketi kurmaz
- `youtube-transcript-ytdlp` — `yt-dlp` tabanlı, Whisper'a düşebilir, `sudo apt install` kullanabilir

`youtube-transcript-ytdlp` elle yerleştirildi ve `skills-lock.json`'da **yok**. Upstream'de adı `youtube-transcript` ve CLI aynı adlı dizini uyarı vermeden eziyor. Bu repoda `npx skills add langbaseinc/agent-skills --skill youtube-transcript` **çalıştırma** — diğer skill'i siler. Gerekçe ve yeniden güncelleme adımları: `.claude/skills/youtube-transcript-ytdlp/VENDORED.md`.

### Diğer

- Vize şartları hukuki sonuç doğurur. `Can I enter` çıktısını misafire kesin bilgi diye sunma; kaynağını göster ve konsolosluğa yönlendir.
- Diğer dört ürünün anahtarlı API ihtiyacı da bu backend'e proxy katmanı eklenerek karşılanabilir.
- Bu ürünlerin `CLAUDE.md` dosyaları `docs/claude-md/gen.py` ile üretilir; ortak bloğu elle düzenleme."""),

 dict(dosya="ZEKAI-Travel", baslik="ZEKAI Travel", ozet="Seyahat planlama.",
  mimari="Tek dosyalık HTML PWA (vanilla JS/CSS, build adımı yok, Hostinger). Backend yok.",
  api="""| API | Ne verir | Auth | Nereden |
| --- | --- | --- | --- |
| [Can I enter](https://canienter.com) | 199 pasaport için vize şartı | No | İstemci |
| [REST Countries](https://restcountries.com) | Ülke, para birimi, dil | No | İstemci |
| [administrative-divisons-db](https://github.com/kamikazechaser/administrative-divisions-db) | İl/ilçe hiyerarşisi | No | İstemci |
| [GeographQL](https://geographql.netlify.app) | Ülke, eyalet, şehir (GraphQL) | No | İstemci |
| [Frankfurter](https://www.frankfurter.app/docs) | ECB döviz kuru | No | İstemci |
| [Nominatim](https://nominatim.org/release-docs/latest/api/Overview/) | Adres ↔ koordinat, mekan arama | No | İstemci |
| [Open-Meteo](https://open-meteo.com/) | Hava tahmini | No | İstemci |
| [ConnectMeGuru](https://www.connectmeguru.com/api/mcp) | 190+ ülkede eSIM paketi | No | İstemci |""",
  notlar="""- Vize ve idarî bölüm verisi bu üründe çekirdek özellik; hepsi anahtarsız, mevcut PWA mimarisi değişmeden kullanılabilir.
- `ConnectMeGuru` satış yapan ticari bir servis — şartlarını ve komisyon modelini okumadan bağlama.
- Vize çıktısını kesin bilgi diye sunma; kaynağını göster."""),

 dict(dosya="MediTour", baslik="MediTour", ozet="Sağlık turizmi.",
  mimari="Tek dosyalık HTML PWA (vanilla JS/CSS, build adımı yok, Hostinger). Backend yok.",
  api="""| API | Ne verir | Auth | Nereden |
| --- | --- | --- | --- |
| [Clinical Trials Directory](https://trials.starfile.org/api) | ClinicalTrials.gov klinik araştırmaları | No | İstemci |
| [Can I enter](https://canienter.com) | Hastanın pasaportuna göre vize şartı | No | İstemci |
| [Frankfurter](https://www.frankfurter.app/docs) | ECB döviz kuru | No | İstemci |
| [REST Countries](https://restcountries.com) | Ülke, dil, telefon kodu | No | İstemci |
| [Nominatim](https://nominatim.org/release-docs/latest/api/Overview/) | Klinik adresi ↔ koordinat | No | İstemci |""",
  notlar="""- **KVKK:** yukarıdaki API'lerin hiçbiri kişisel sağlık verisi almaz, hepsi tek yönlü referans sorgusu. Hasta verisini parametre olarak geçirirsen yurt dışına veri aktarımı olur. Sorguyu anonim tut.
- Sağlık kategorisinin 42 kaydının çoğu 2020-2022 Covid API'si — ölü veya donmuş veri.
- Hastane dizini, akreditasyon ve tedavi fiyatı için listede kaynak yok; bunlar ürünün çekirdeği, ayrı tedarik gerekiyor."""),

 dict(dosya="FinFlow", baslik="FinFlow", ozet="Finans.",
  mimari="Tek dosyalık HTML PWA (vanilla JS/CSS, build adımı yok, Hostinger). Backend yok — aşağıdaki *Backend* satırları bu haliyle kullanılamaz, önce proxy katmanı gerekir.",
  api="""| API | Ne verir | Auth | Nereden |
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
| [EOD Historical Data](https://eodhd.com/) | 150+ borsa | apiKey | **Backend** |""",
  notlar="""- **Temsor** listedeki en değerli kayıt: Türkiye'ye özel iki kayıttan biri ve tam bu ürünün işi. Ama anahtar istiyor, yani proxy katmanı olmadan kullanılamaz.
- **BIST verisi listede yok.** Borsa İstanbul fiyatı için ayrı sağlayıcıyla anlaşman gerekir.
- `Frankfurter` günlük kapanış verir, anlık işlem için yetersiz.
- `CoinGecko` listede `Auth: No` görünüyor ama birçok ucu artık demo anahtar istiyor — teyit et.
- `Alpha Vantage` ücretsiz katmanı dakikada 5 istek; üretim için gerçekçi değil."""),
]

SABLON = """# {baslik} — çalışma notları

{ozet}

## Mimari kısıt

{mimari}

{ortak}

## Bu ürüne özel

{notlar}
"""

out = pathlib.Path('.')
for u in URUNLER:
    p = out / f"{u['dosya']}-CLAUDE.md"
    p.write_text(SABLON.format(ortak=ORTAK.replace(
        "## Ücretsiz API kısa listesi",
        "## Ücretsiz API kısa listesi").rstrip() + "\n\n### Bu üründe kullanılabilecekler\n\n" + u['api'],
        **{k: v for k, v in u.items() if k != 'api'}), encoding='utf-8')
    print(f"yazıldı: {p.name}  ({len(p.read_text(encoding='utf-8').splitlines())} satır)")
