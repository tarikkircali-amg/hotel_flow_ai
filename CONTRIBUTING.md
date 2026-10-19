# Katkı Rehberi — hotel_flow_ai

Mizos Holding AI ekibi (ilk etap ~15 kişi) için geliştirme akışı. Kısa ve net.

## Temel kurallar
- `main`'e **doğrudan push yok**. Her değişiklik bir dal + Pull Request ile gelir.
- Non-negotiable kurallar `CLAUDE.md` içinde — her PR bunlara uymalı.
- Güvenlik açığı bulursan `SECURITY.md`'deki süreci izle (herkese açık issue açma).

## Dal isimlendirme
```
feature/<kisa-aciklama>     # yeni özellik
fix/<kisa-aciklama>         # hata düzeltme
chore/<kisa-aciklama>       # bakım, bağımlılık, doküman
```

## Akış
1. Güncel `main`'den dal aç:
   `git fetch origin main && git checkout -b feature/x origin/main`
2. Değişikliği yap. Çalıştır ve doğrula: `npm install && npm start`,
   ardından `curl localhost:3000/api/health`.
3. Anlamlı commit'ler at (ne + neden).
4. PR aç. PR şablonundaki kontrol listesini doldur.
5. En az **1 Code Owner onayı** al (`.github/CODEOWNERS`).
6. CI/kontroller yeşil + onay tamamsa merge et.

## Commit mesajı
- İlk satır ≤ 72 karakter, emir kipi: `Add health check retry`
- Gerekirse boş satır + ayrıntı.

## Kod standartları (AI_PRODUCT_OS özet)
- Dosya ≤ 500 satır (100–300 tercih), fonksiyon ≤ 40 satır, iç içe ≤ 3.
- Özellik bazlı organizasyon (dosya türüne göre değil).
- Hiçbir şey hardcode değil: URL/anahtar/limit/iş kuralı → config.
- Secret'lar ortam değişkeninde; repo'ya veya client'a asla girmez.

## Branch protection (yönetici kurar — GitHub UI)
Depo `mizos-holding` org'una taşındıktan sonra `main` için:
- "Require a pull request before merging" + en az 1 onay
- "Require review from Code Owners"
- "Do not allow force pushes" / "Do not allow deletions"
- (Opsiyonel) "Require status checks to pass" — CI eklendiğinde
