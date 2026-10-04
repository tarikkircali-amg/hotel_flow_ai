# Ürün fotoğrafları

Kendi çektiğiniz ürün fotoğrafları buraya gelir. Klasör şu an boş; fotoğraf
koyana kadar site teknik çizimleri gösterir.

## Nasıl eklenir

1. Fotoğrafı bu klasöre koyun, örneğin `saft.jpg`.
2. `assets/data/products.json` dosyasında ilgili kategoriye tek satır ekleyin:

```json
{ "id": "saft", "group": "shaft", "drawing": "saft",
  "photo": "saft.jpg", "materials": ["zn", "al"] }
```

O kategorideki bütün ürünler artık fotoğrafı gösterir. `photo` satırını
silerseniz teknik çizime geri döner.

**KUT MARİNE markası fotoğrafın üzerine site tarafından bindirilir.**
Fotoğrafı düzenlemenize, üzerine yazı yazmanıza gerek yok.

## Çekerken

- **Oran 4:3**, en az 800×600 piksel. Site 400×300 gösteriyor; büyük dosya
  sayfayı yavaşlatır, 1200×900 fazlasıyla yeter.
- **Düz ve sade zemin.** Beyaz fon, gri karton ya da temiz tezgâh. Dağınık
  arka plan ürünü kaybettirir.
- **Tek ürün, tam ortada.** Kenarlarda boşluk bırakın; site köşeleri
  yuvarlatıyor.
- **Yumuşak ışık.** Doğrudan flaş çinko yüzeyde parlama yapar. Gölgeli bir
  pencere kenarı ya da dışarıda bulutlu hava en iyisi.
- **Aynı açı, aynı mesafe.** Bütün ürünleri aynı kurulumda çekin; katalog
  derli toplu görünür.
- **Ölçü göstermek isterseniz** yanına kumpas veya cetvel koyun — müşteri
  büyüklüğü anlar.
- Dosya adında Türkçe karakter ve boşluk kullanmayın: `dar-saft.jpg` olur,
  `dar şaft.jpg` olmaz.

## Hangi fotoğraflar olmaz

Başka sitelerden, Google görsellerinden ya da üretici kataloglarından alınan
fotoğraflar buraya konulmaz. Bunlar başka firmaların telifli çekimleridir;
üzerine kendi markanızı koymak hem telif ihlali hem haksız rekabet olur.
Kendi ürününüzü kendiniz çekin — zaten elinizde.
