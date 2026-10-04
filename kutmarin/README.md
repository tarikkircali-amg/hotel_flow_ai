# Kut Marin — tutya ve döküm kurşun sitesi

**KUT MARİN DÖKÜM – Hüseyin Okan Kut** için tanıtım ve katalog sitesi.
Dokuz dilli (Türkçe + 8 yabancı dil), sipariş WhatsApp üzerinden alınır.

> Bu klasör bağımsızdır. Depodaki `public/` (HotelFlow AI) ile hiçbir
> bağlantısı yoktur; ayrı yayına alınabilir.

---

## Çalıştırma

Site **bir web sunucusundan servis edilmelidir.** `index.html` dosyasına çift
tıklayarak açarsanız ürün listesi ve diller yüklenmez: tarayıcılar `file://`
üzerinden `fetch()` ile JSON okumaya izin vermez.

```bash
cd kutmarin
python3 -m http.server 3200       # ya da:  npx serve .
# http://localhost:3200
```

Yayına alırken klasörün içeriğini olduğu gibi kopyalamak yeterlidir.
**Derleme adımı yoktur** — Node, npm ya da build gerekmez.

### Sayfaları güncelleme

Ortak başlık/altbilgi tekrarı olmasın diye sayfalar parçalardan üretilir:

```bash
node build-pages.js     # pages.js + build-pages.js → *.html
```

Üretilen `.html` dosyaları depoda durur; sitenin çalışması için bu komut
gerekmez, yalnızca sayfa yapısını değiştirince çalıştırın.

---

## Dosya yapısı

```
kutmarin/
  index.html  urunler.html  rehber.html  hakkimizda.html  iletisim.html
  build-pages.js        sayfa iskeleti (başlık, menü, altbilgi, çekmece)
  pages.js              sayfa içerikleri
  assets/
    css/tokens.css      tasarım token'ları — renk, boşluk, tipografi, hareket
    css/site.css        taban, yerleşim, üst bar, hero
    css/components.css  kart, ürün, filtre, çekmece, rehber, altbilgi
    js/i18n.js          9 dilli altyapı, RTL, dil algılama
    js/catalog.js       ürün kataloğu ve filtreler
    js/cart.js          sipariş listesi ve WhatsApp gönderimi
    js/site.js          tema, mobil menü
    data/products.json  ÜRÜN VERİSİ — tek doğruluk kaynağı
    data/company.json   FİRMA BİLGİSİ — tek doğruluk kaynağı
    i18n/*.json         tr en de ru ar fr it es el
    img/*.svg           teknik çizimler (özgün, vektör)
  tests/site-check.js   36 doğrulama
```

---

## İçeriği güncelleme

### Ürün eklemek / fiyat değiştirmek

Yalnızca `assets/data/products.json`. Başka hiçbir dosyaya dokunmanız gerekmez.

```json
{ "sku": "K-ST 90", "category": "saft", "size": "90 mm",
  "spec": { "bore": 90 }, "price": 1900, "stock": "available" }
```

- `price: null` yazarsanız sitede **"Fiyat sorunuz"** görünür. **Bilmediğiniz
  fiyata uydurma rakam yazmayın** — müşteri WhatsApp'tan sorar.
- `stock`: `available` · `madeToOrder` · `out`
- `category`: `categories` listesindeki bir kimlik olmalı.

Ürün adı otomatik oluşur: *kategori adı (seçili dilde) + ölçü*. Yani yeni ürün
eklediğinizde **dokuz dilde birden** doğru görünür, çeviri yapmanız gerekmez.

### Telefon, adres, vergi bilgisi

Yalnızca `assets/data/company.json`. Tüm sayfalar, WhatsApp bağlantıları ve
altbilgi buradan okur.

### Çeviri

`assets/i18n/<dil>.json`. Dosyalar aynı anahtar kümesini taşır; `tr.json`
temeldir. Bir anahtar eksikse site boş göstermez, Türkçesine düşer.

Ziyaretçinin dili şu sırayla belirlenir: adresteki `?lang=de` → daha önce
yaptığı seçim → tarayıcı dili → Türkçe.

---

## Teknik çizimler

`assets/img/` altındaki 15 SVG **bu proje için çizilmiştir**; başka bir siteden
alınmamıştır, telif sorunu yoktur.

**İçlerinde yazı yoktur.** Site dokuz dilli olduğu için etiketler HTML tarafına
alınmış ve çevrilebilir yapılmıştır (karina şemasındaki 1–4 rakamları hariç;
karşılıkları `.diagram__legend` listesinde durur).

Gerçek ürün fotoğraflarınız olduğunda aynı adla değiştirmeniz yeterli:
`saft.svg` → `saft.jpg` yaparsanız `products.json` içindeki `drawing` alanını
ve `catalog.js` içindeki uzantıyı güncelleyin.

---

## WhatsApp ile sipariş

Sunucu yoktur, üyelik yoktur, sitede ödeme alınmaz.

1. Müşteri ürünleri listesine ekler (liste tarayıcısında saklanır).
2. "WhatsApp'tan gönder" WhatsApp'ı açar; liste hazır mesaj olarak gelir.
3. Müşteri göndermeden önce mesajı görür ve düzenleyebilir.
4. **Sipariş siz onaylayınca kesinleşir.** Site bunu açıkça yazar.

Mesaj müşterinin dilinde oluşur. Liste çok uzarsa WhatsApp mesajı kesebilir;
site bu durumda uyarı gösterir ve iki parça hâlinde göndermeyi önerir.

Numara değişirse `assets/data/company.json` → `whatsapp.number`.

---

## Doğrulama

```bash
npm install --include=dev        # depo kökünde
python3 -m http.server 3200      # kutmarin/ içinde, ayrı terminalde
node tests/site-check.js
```

36 test: dokuz dilin yüklenmesi, tarayıcı diline göre açılış, Arapça RTL,
ürün adlarının çevrilmesi, filtreler, sipariş listesi ve WhatsApp mesajı,
listenin yenileme sonrası kalıcılığı, beş sayfada **axe · WCAG 2.2 AA**,
%200 ve %400 yakınlaştırmada yatay kaydırma olmaması, konsol hatası olmaması.

---

## Erişilebilirlik ve gizlilik

- **WCAG 2.2 AA**: beş sayfada da axe ihlali yok. Klavyeyle tam kullanım,
  görünür odak, içeriğe geç bağlantısı, renk tek başına anlam taşımaz.
- WhatsApp düğmesinde beyaz yazı marka yeşili üzerinde 2.45:1 kalıyordu
  (AA eşiği 4.5). Marka yeşili korundu, yazı koyulaştırıldı: **9.5:1**.
- **Dışarıdan yazı tipi yüklenmez.** Google Fonts ziyaretçinin IP adresini
  üçüncü tarafa gönderir; işletim sistemi yazı tipi zinciri kullanılır.
- Üçüncü taraf izleme, çerez ya da analitik yoktur.
- Tarayıcıda saklanan tek şey: seçilen dil, tema ve sipariş listesi.

---

## Bilinen eksikler

Yayına almadan önce tamamlanması gerekenler:

- **Ürün listesi temsilîdir.** 16 kategori ve 17 ürün tanımlı. Gerçek katalogda
  çok daha fazlası var (Volvo Penta ~32, motor tutyaları ~22, kuyruk ~8,
  pervane ~11 vb.). Kategoriler hazır; ürünler `products.json` dosyasına
  eklenecek.
- **Fiyatlar eksik.** 17 üründen 7'sinin fiyatı biliniyor, 10'u "Fiyat sorunuz"
  olarak görünüyor. Bilinen fiyatlar da doğrulanmalı ve `priceUpdatedAt`
  güncellenmeli.
- **Ürün fotoğrafı yok.** Teknik çizimler geçici; gerçek fotoğraflarla
  değiştirilmeli.
- **Çalışma saatleri doğrulanmadı.** `contact.hoursValue` şu an genel bir ifade.
- **Ürün detay sayfası yok.** Katalog tek sayfa; ölçü tablosu gereken ürünler
  için ayrı sayfa açılabilir.
- **Mesafeli satış ve gizlilik metinleri yok.** Sitede ödeme alınmadığı için
  zorunlu değil, ancak eklenmesi doğru olur.
- Çeviriler gözden geçirilmedi. Teknik terimler sektör diline göre kontrol
  edilmeli (özellikle RU, AR, EL).
