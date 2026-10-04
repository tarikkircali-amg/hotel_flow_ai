# hotel_flow_ai — çalışma notları

Club Calimera Hotel Flow AI backend. Express + `node-sqlite3-wasm`, tek dosya (`server.js`), build adımı yok.

## Standartlar

`ai-product-os` skill'i bu projeyi de kapsıyor — iş yapmadan önce onu yükle. Özellikle:

- **İstemci kodunda sır yok.** API anahtarı, token, kimlik bilgisi yalnızca env değişkeninde. Bu ürün ailesinde (DurakAI, HotelFlow, ZEKAI Travel, MediTour, FinFlow) istemci tarafı Anthropic anahtarı bilinen bir açık sorun — büyütme.
- **Kiracı izolasyonu.** Her iş satırı `organization_id` taşır, değeri auth token'dan türetilir, istek gövdesinden değil.
- Diğer ihlal edilemezler skill'in §2'sinde.

HotelFlow ailenin backend'i olan tek ürünü. Diğer dördü tek dosyalık HTML PWA, proxy katmanı yok — anahtar gerektiren bir entegrasyon buradan geçmek zorunda.

## Kurulu skill'ler

`.claude/skills/` altında 12 skill var, `skills-lock.json` ile izleniyor. Güncelleme: `npx skills update`.

- 10 Vercel skill'i (`vercel-labs/skills` + `vercel-labs/agent-skills`)
- `youtube-transcript` — hafif, `uv` ile tek Python dosyası, sistem paketi kurmaz
- `youtube-transcript-ytdlp` — `yt-dlp` tabanlı, Whisper'a düşebilir, `sudo apt install` kullanabilir

**Dikkat:** `youtube-transcript-ytdlp` elle yerleştirildi ve lockfile'da yok. Upstream'de adı `youtube-transcript` ve CLI aynı adlı dizini **uyarı vermeden eziyor**. Bu repoda `npx skills add langbaseinc/agent-skills --skill youtube-transcript` çalıştırma — diğer skill'i siler. Gerekçe: `.claude/skills/youtube-transcript-ytdlp/VENDORED.md`.

Genel olarak: CLI skill'i frontmatter'daki `name` alanına göre kurar, dizin adına göre değil. `--skill` argümanı eşleşmezse sessizce atlanır.

## Ortam notu

`skills.sh` bu cloud ortamının ağ politikası tarafından engelli (proxy 403). Sonuç: `npx skills find <sorgu>` hata vermek yerine **"No skills found" diyor** — arama çalışmıyor demek, skill yok demek değil. `npx skills add <owner/repo>` GitHub üzerinden sorunsuz çalışıyor.

Düzeltmek için: environment ayarları → Network access → Custom → `skills.sh` ekle.

## Ücretsiz API kısa listesi

Beş ürün için `public-apis` listesinden ayıklanmış ~20 API, ürün başına tablo halinde:
https://claude.ai/code/artifact/424ff73f-fe69-409f-aadd-4130d5aba1ef

Dokümandaki **Tarayıcı** sütunu bağlayıcı: *Backend* yazan hiçbir API doğrudan PWA'dan çağrılamaz.

Listedeki `Auth` sütunu topluluk tarafından güncelleniyor ve eskiyor — üretime almadan önce sağlayıcının kendi sayfasını aç. (Kanıt: `balldontlie` repoda hâlâ `Auth: No`, gerçekte 2024'ten beri anahtar istiyor.)
