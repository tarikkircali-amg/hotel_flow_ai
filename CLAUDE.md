# CLAUDE.md — hotel_flow_ai (Club Calimera · Hotel Flow AI)

Bu depo **Mizos Holding AI** ortamının bir parçasıdır. Hem ekip üyeleri hem de
AI oturumları (Claude Code) bu kurallara uyar. Kısa tutuldu; ayrıntı için
AI_PRODUCT_OS standartlarına bakın.

## Proje
- Node.js + Express REST API, veritabanı: SQLite (`node-sqlite3-wasm`).
- Giriş noktası: `server.js`. Çalıştırma: `npm install` → `npm start` (varsayılan port 3000).
- Durum: **legacy / grandfathered** — tek-dosya tarzı. İstenmedikçe **yeniden yazma yok**.

## Non-negotiable kurallar (her değişiklikte geçerli)
1. **Client'ta secret yok.** API anahtarı/token/parola → ortam değişkeni veya vault.
   Asla tarayıcıda, repo'da veya düz metin DB kolonunda tutulmaz.
2. **Tenant izolasyonu.** Yeni iş tabloları `organization_id` taşır; sorgu bunu
   auth token'dan türetir, istek girdisinden değil. (Mevcut legacy şema bunu
   taşımıyor — bkz. SECURITY.md.)
3. **Tüketici-etkili AI aksiyonunda insan onayı.** Oku/öner/taslak serbest; sil,
   öde, yayınla, müşteriye gönder, toplu güncelle, yetki değiştir → açık onay şart.
4. **Erişilebilirlik varsayılan** (WCAG 2.2 AA): klavye, odak görünür, renk tek
   gösterge değil.
5. **Hatalar açıklar ve kurtarır.** Ham stack trace / tek başına hata kodu yok.
6. **Hiçbir şey hardcode değil.** URL, anahtar, limit, iş kuralı → config.
7. **Önemli olaylar audit'lenir.** Giriş, yetki değişimi, veri değişimi, export,
   AI aksiyonu, ödeme: kim / ne / ne zaman / nereden / sonuç.

Bir istek bu kurallarla çakışırsa: açıkça söyle, riski anlat, uyumlu alternatifi öner.

## Çalışma akışı (branch / PR)
- `main`'e doğrudan push yok; her değişiklik PR ile gelir.
- En az 1 Code Owner onayı gerekir (bkz. `.github/CODEOWNERS`).
- Commit mesajları açıklayıcı; PR şablonundaki kontrol listesi doldurulur.
- Ayrıntı: `CONTRIBUTING.md`.

## Cloud oturumları
- SessionStart hook (`.claude/hooks/session-start.sh`) bağımlılıkları kurar ve
  `/api/health` smoke testi yapar. Hook `main`'e merge edilince tüm gelecek
  oturumlar kullanır.
