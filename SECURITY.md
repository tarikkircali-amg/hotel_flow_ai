# Güvenlik Politikası

## Açık bildirimi
Bir güvenlik açığı bulursanız **herkese açık issue açmayın**. Bunun yerine
doğrudan bildirin: **tarikkircali@gmail.com**. Mümkünse şunları ekleyin:
- Etkilenen bileşen / endpoint
- Yeniden üretme adımları
- Potansiyel etki

Makul sürede dönüş yapılır; düzeltme yayınlanana kadar detayı gizli tutun.

## Desteklenen sürümler
Aktif geliştirilen dal: `main`. Yalnızca `main` üzerindeki kod için düzeltme
sağlanır.

## Bilinen açık konular (legacy / grandfathered)
Bu backend tek-dosya tarzı bir prototipten geldi ve aşağıdaki açıklar
**bilinmektedir**. İlgili kod her dokunulduğunda düzeltilmesi hedeflenir
(AI_PRODUCT_OS §5). Yeni özellikler bu açıkları kopyalamamalıdır.

| # | Konu | Risk | Önerilen düzeltme |
|---|------|------|-------------------|
| 1 | **Varsayılan/paylaşımlı demo şifreler** (`admin/admin`, `1234`) `server.js` içinde seed ediliyor | Kimlik doğrulama bypass | Üretimde seed'i kapat; ilk kurulumda zorunlu şifre değiştirme |
| 2 | **Tuzsuz SHA-256** parola hash'i (`sha()`) | Rainbow-table / brute-force | `bcrypt`/`argon2` + benzersiz salt'a geç |
| 3 | **CORS tümüne açık** (`app.use(cors())`) | CSRF / köken karışması | İzinli köken listesi (env'den) |
| 4 | **Tenant izolasyonu yok** — tablolar `organization_id` taşımıyor | Çok kiracılı kullanımda veri sızıntısı | İş tablolarına `organization_id` ekle; sorguları token'dan türet |
| 5 | **Oturum token'ı süresiz** — `sessions` tablosunda expiry yok | Çalınan token kalıcı | TTL + sunucu tarafı geçersiz kılma |
| 6 | **Audit kısmi** — yalnızca `write` loglanıyor; login/logout/yetki değişimi değil | Eksik denetim izi | Giriş, çıkış, yetki değişimi, export olaylarını da `audit`'e yaz |
| 7 | **Yedek/staging yok** | Veri kaybı riski | Düzenli `calimera.db` yedeği + staging ortamı |

## Üretim öncesi asgari kontrol listesi
- [ ] Demo kullanıcı seed'i kapalı, gerçek şifreler zorunlu
- [ ] Parola hash'i bcrypt/argon2
- [ ] CORS izinli köken listesi env'den
- [ ] Oturum token'larında TTL
- [ ] Yedekleme planı + staging
- [ ] Secret'lar ortam değişkeninde, repo'da değil
