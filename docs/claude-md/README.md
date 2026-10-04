# CLAUDE.md jeneratörü

Beş ürünün (DurakAI, HotelFlow, ZEKAI Travel, MediTour, FinFlow) `CLAUDE.md`
dosyalarını tek kaynaktan üretir.

## Neden

Dosyaların büyük kısmı beş üründe aynı: `ai-product-os` standartları, skill
kurulum mekaniği ve ad çakışması tuzağı, `skills.sh` ağ engeli, ücretsiz API
listesinin linki ve `Auth` sütununun neden güvenilmez olduğu. Elle kopyalanınca
bunlar zamanla birbirinden ayrışıyor.

`gen.py` ortak bloğu tek bir string'de tutar ve her dosyaya birebir aynı yazar.
Ürüne özel olan üç şey `URUNLER` listesinde durur: mimari kısıt, kullanılabilecek
API tablosu, ürüne özel notlar.

## Kullanım

```bash
python3 gen.py     # beş dosyayı bulunduğu dizine yazar
```

Üretilen dosya ilgili ürünün repo kökene `CLAUDE.md` adıyla konur.
HotelFlow'unki bu reponun kökünde zaten duruyor; buradaki kopyası tutulmaz.

## Değiştirirken

- **Beş ürünü birden ilgilendiren bir şey** → `gen.py` içindeki `ORTAK`
  string'ini değiştir, çalıştır, beş dosyayı da güncelle.
- **Tek ürünü ilgilendiren bir şey** → o ürünün `URUNLER` kaydını değiştir.
- Ortak bloğu üretilen dosyada elle düzenleme; bir sonraki çalıştırma ezer.
  Blok `<!-- ORTAK BLOK BAŞLANGIÇ -->` ve `<!-- ORTAK BLOK BİTİŞ -->`
  yorumlarıyla işaretli.

Senkron kontrolü:

```bash
for f in *-CLAUDE.md ../../CLAUDE.md; do
  sed -n '/ORTAK BLOK BAŞLANGIÇ/,/ORTAK BLOK BİTİŞ/p' "$f" | sha256sum
done | sort -u | wc -l     # 1 dönmeli
```

## Varsayım

Diğer dört ürünün reposu bu oturumda yoktu. Mimari tanımları
(`ai-product-os` §5'ten: tek dosyalık HTML PWA, vanilla JS/CSS, build adımı yok,
Hostinger) skill'in kendi beyanına dayanıyor, repoları okunarak doğrulanmadı.
Gerçek durum farklıysa `URUNLER` kaydındaki `mimari` alanını düzelt.
