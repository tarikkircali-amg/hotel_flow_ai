# HotelFlow AI

Otellere yapay zekâ destekli misafir iletişimi, satış ve operasyon yönetimi.
İnovatif Zeka ürünü.

Bu depo iki parçadan oluşur:

| Parça | Yer | Ne yapar |
|---|---|---|
| **Tanıtım sitesi** | `public/` | Ürün anlatımı, fiyatlandırma, hakkımızda, demo talep formu |
| **Arka uç** | `server.js` | REST API + SQLite. Oturum, rol bazlı yetki, anahtar–değer verisi, denetim kaydı, demo talepleri |

---

## Çalıştırma

```bash
npm install
npm start                 # http://localhost:3000
```

Site arka uç tarafından sunulur: `express.static('public')`. Ayrı bir web
sunucusuna gerek yoktur. Farklı port için `PORT=3100 npm start`.

### Demo kullanıcılar

| Kullanıcı | Şifre | Rol |
|---|---|---|
| `admin` | `admin` | admin |
| `resepsiyon` | `1234` | reception |
| `kat` | `1234` | housekeeping |
| `rapor` | `1234` | readonly |

> **Yayına almadan önce bu hesapları silin veya şifrelerini değiştirin.**
> Varsayılan şifreler yalnızca yerel geliştirme içindir.

---

## Doğrulama

```bash
npm install --include=dev
npm start                 # ayrı bir terminalde
npm run check
```

`tests/site-check.js` şunları doğrular: davranış (menü, SSS, tema, form),
erişilebilirlik (axe · WCAG 2.2 AA), %200 ve %400 yakınlaştırmada yatay
kaydırma olmaması, dokunma hedefi boyutları, JavaScript kapalıyken
okunabilirlik ve konsol hatası olmaması.

Başka bir adresi denetlemek için: `BASE_URL=https://ornek.com npm run check`.

---

## Site yapısı

```
public/
  index.html                 tek sayfa, bölüm çapaları (#cozumler … #iletisim)
  assets/css/tokens.css      tasarım token'ları — renk, boşluk, tipografi, hareket
  assets/css/site.css        taban, yardımcı sınıflar, buton, başlık, hero
  assets/css/sections.css    kart, hakkımızda, fiyatlandırma, SSS, form, altbilgi
  assets/js/site.js          tema, menü, SSS, form doğrulama ve gönderimi
```

**Hiçbir görsel değer sabit kodlanmaz.** Renk, boşluk, yazı boyutu, yarıçap,
gölge ve hareket süreleri yalnızca `tokens.css` içindeki token'lardan okunur.
Bileşenler yalnızca anlamsal (semantic) token tüketir; bir token yoksa önce
sisteme eklenir, sonra kullanılır.

Açık ve koyu tema desteklidir. Kullanıcı seçimi yoksa işletim sistemi tercihi
uygulanır; seçim `localStorage` içinde saklanır.

### Yazı tipi

Site, işletim sistemi yazı tipi zincirini kullanır. **Google Fonts bilerek
bağlanmaz:** ziyaretçinin IP adresini üçüncü tarafa gönderir, Alman mahkemeleri
bunu GDPR ihlali saymıştır ve birincil pazarlarımız Türkiye ile DACH'tır.

Inter'e geçmek isterseniz **öz-barındırın**:

1. Inter'in `woff2` dosyalarını `public/assets/fonts/` altına koyun.
2. `tokens.css` başına `@font-face` tanımlarını ekleyin (`font-display: swap`).
3. `--font-family-primary` zaten `Inter`'i ilk sırada listeler; başka değişiklik gerekmez.

---

## API

| Uç | Yetki | Açıklama |
|---|---|---|
| `POST /api/login` | — | Oturum açar, `token` döner |
| `POST /api/logout` | oturum | Oturumu kapatır |
| `GET /api/data` | oturum | Tüm anahtar–değer verisini döner |
| `PUT /api/data/:key` | oturum (readonly hariç) | Tek anahtar yazar, denetim kaydı bırakır |
| `GET /api/online` | oturum | Son 5 dakikadaki çevrimiçi kullanıcı sayısı |
| `GET /api/health` | — | Sağlık kontrolü |
| `POST /api/contact` | — | Demo talep formu. Doğrulama + hız sınırı + KVKK rızası zorunlu |
| `GET /api/leads` | **admin** | Demo taleplerini listeler, denetim kaydı bırakır |

Oturum belirteci `x-session` başlığıyla gönderilir.

### Demo talep formu

`POST /api/contact` herkese açıktır, bu nedenle iki katmanlı korunur:

- **Doğrulama** sunucuda tekrar yapılır; istemci doğrulaması yalnızca kolaylıktır.
- **Hız sınırı** iki ayrı kova kullanır: 15 dakikada en çok 30 deneme ve
  5 başarılı kayıt. Doğrulama hatası (400) kayıt kovasını tüketmez —
  e-postasını yanlış yazan kullanıcı kendini formdan kilitlemiş olmaz.
- **KVKK rızası** zorunludur ve zaman damgasıyla (`consent_at`) saklanır.
- Talepleri okumak **admin** yetkisi ister; herkese açık değildir.

Hız sınırı bellek içidir, tek örnek (instance) için yeterlidir. Birden çok
örneğe ölçeklerken Redis tabanlı bir sınırlayıcıya taşınmalıdır.

---

## Bilinen açıklar

Yayına almadan önce kapatılması gerekenler:

- **Varsayılan şifreler** — yukarıdaki demo hesapları silinmeli.
- **Şifre özeti düz SHA-256** — tuz ve anahtar türetme yok. `bcrypt`/`argon2`'ye geçilmeli.
- **Oturumların süresi dolmuyor** — `sessions` tablosunda sona erme yok.
- **Kiracı izolasyonu yok** — `kv` ve `leads` tabloları `organization_id` taşımıyor.
  Tek otel için sorun değildir; **çok otelli kullanımdan önce zorunludur.**
- **Yedekleme ve hazırlık (staging) ortamı yok.**
- **Demo talebi bildirimi yok** — talepler yalnızca veritabanına yazılır,
  kimseye e-posta gitmez. `GET /api/leads` ile düzenli bakılmalıdır.

---

## Dağıtım

Statik site ve API aynı süreçten sunulduğu için tek bir Node barındırması yeterlidir.

```bash
PORT=3000 npm start
```

Railway için sağlık kontrolü yolu: `/api/health`.

`calimera.db` dosyası çalışma dizinine yazılır ve sürüm kontrolüne alınmaz.
Kalıcı disk bağlanmazsa her dağıtımda veri kaybedilir.
