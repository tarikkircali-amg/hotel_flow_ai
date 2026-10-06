# Verimor — Demo Başvurusu ve Paket Fiyatı Teyidi

**Tarih:** 06.10.2026
**Hazırlayan:** MİZ / My İnovatif Zeka

---

## 0. İÇ NOT — bu e-postanın iki işi var

**1. 15 günlük demoyu almak.** Asıl amaç bu. Elimizde **tek bir gerçek çağrı
verisi yok**; günde 100 çağrı da, 2,5 dakika ortalama da kliniğin tahmini.
Bütün maliyet modeli bu iki sayının üzerinde duruyor.

**2. Paket fiyatı çelişkisini kapatmak.** Yanlış paketi fiyatlayıp kliniğe
yanlış rakam vermeyelim.

### Demoda atlanmaması gereken nokta

Verimor'un verdiği **Bulut Santral demosu**, SIP Trunk modülünü kapsamayabilir.
Bizim ihtiyacımız santral değil; **kendi sunucumuzu hatta bağlamak.**
SIP Trunk olmadan demo yalnızca santral arayüzünü gösterir, bizim asistanımızı
test etmez — yani işimize yaramaz. E-postada bu açıkça soruluyor.

### Paket çelişkisi — tezimiz

E-postadaki rakamlar fiyat listesiyle tutmuyor. Hesapladık, şuna benziyor:

| E-postada yazan | Rakam | Fiyat listesinde en yakın |
|---|---|---|
| "2 kullanıcılı" | 5.731 ₺ | X Small (**5** kullanıcı) 12 ay toplamı: 5.796 ₺ |
| "5 kullanıcı" | 7.576 ₺ | Medium (**25** kullanıcı) 12 ay toplamı: 7.575 ₺ |

Yani rakamlar **12 aylık dönem toplamı** ve kullanıcı sayıları bir satır
kaymış görünüyor. Bunu tez olarak soruyoruz; "hangisi doğru" demekten
daha hızlı sonuç verir.

---

## 0b. DURUM

**Gönderildi — 06.10.2026.** Cevap bekleniyor.

Takip edilecek üç şey:
1. Demoya **SIP Trunk dahil mi** — dahil değilse demo bizim senaryomuzu
   test etmez, ısrar edilmeli
2. Paket fiyatı teyidi (12 aylık dönem toplamı tezi)
3. Gelen dakikanın ücretsizliğinin **yazılı** teyidi

---

## 1. GÖNDERİLEN E-POSTA

> Aşağıdaki metni olduğu gibi kullanabilirsiniz.

---

**Konu:** 15 günlük demo talebi ve paket fiyatı teyidi — MİZ / My İnovatif Zeka

Merhaba,

Detaylı bilgilendirmeniz için teşekkür ederiz. Dokümanları inceledik ve
ilerlemek istiyoruz. İki konuda desteğinize ihtiyacımız var.

### 1. 15 günlük demo başvurusu

Bahsettiğiniz 15 günlük Bulut Santral demosunu değerlendirmek istiyoruz.
Başvuru için ne yapmamız gerekiyor?

Kurgumuzu hatırlatmak isteriz: gelen çağrıyı **kendi sunucumuzdaki yapay
zekâ asistanı** karşılıyor. Yani santral arayüzünü değil, **hattın kendi
sistemimize bağlanmasını** test etmemiz gerekiyor.

Bu yüzden sormak istediğimiz:

- Demo paketi **SIP Trunk modülünü kapsıyor mu?** Kapsamıyorsa, demo
  süresince SIP Trunk'ı da açabilir misiniz? Bu modül olmadan kendi
  sunucumuzu bağlayamayacağımız için demo bizim senaryomuzu test etmiş
  olmaz.
- Demo için **geçici bir test numarası** verebiliyor musunuz? Kliniğin
  gerçek numarasını bu aşamada taşımak istemiyoruz.
- Demo kurulumu ne kadar sürüyor? Hangi bilgileri sizden almamız,
  hangilerini size vermemiz gerekiyor?

### 2. Paket fiyatlarında teyit

E-postanızdaki rakamlarla gönderdiğiniz fiyat listesi örtüşmüyor.
Hesapladığımızda şöyle bir ihtimal çıktı, teyit edebilir misiniz?

| E-postanızda | Rakam | Fiyat listesinde en yakın karşılık |
|---|---|---|
| "2 kullanıcılı" | 5.731 ₺ + KDV | X Small (**5** kullanıcı), 12 aylık dönem toplamı: 5.796 ₺ |
| "5 kullanıcı" | 7.576 ₺ + KDV | Medium (**25** kullanıcı), 12 aylık dönem toplamı: 7.575 ₺ |

Yani e-postadaki rakamlar **12 aylık dönem toplamı** gibi duruyor ve
kullanıcı sayıları bir paket kaymış olabilir mi?

Netleştirmek istediğimiz:

- Bu rakamlar **aylık mı, yoksa dönem toplamı mı?**
- Bize önerdiğiniz paket hangisi — Mini mi, X Small mı?
- Fiyat listesindeki rakamlar (Mini 429 ₺/ay, X Small 565 ₺/ay — 6 aylık
  periyot) geçerli mi?

Bizim ihtiyacımız 5 kullanıcıyı geçmiyor; sistemi insanlar değil yapay zekâ
asistanı kullanacak.

### 3. Hangi modüller zorunlu

Seslendirmeyi ve konuşma tanımayı kendi katmanımızda yapıyoruz. Bu nedenle
**TTS Robotu (479 ₺) ve Speech to Text (999 ₺)** modüllerine ihtiyacımız
olmadığını düşünüyoruz.

- Bu kurguda **SIP Trunk (899 ₺/ay)** dışında zorunlu başka modül var mı?
- Bulut Santral paketi zorunlu mu, yoksa yalnızca SIP Trunk ile
  ilerlenebiliyor mu?

### 4. Demodan önce bilmemiz gereken iki teknik nokta

Bunlar demonun işe yarayıp yaramayacağını belirlediği için önden soruyoruz:

- **G.711 A-law** destekliyor musunuz? Konuşmayı metne çevirdiğimiz için
  sıkıştırılmış kodekler Türkçe tanıma başarısını düşürüyor.
- **Gelen çağrı dakikası gerçekten ücretsiz mi?** E-postanızda "Verimor
  numaralarına gelen çağrılarda dakika başına ücretlendirme yansımaz"
  yazıyor. Maliyet modelimizin en kritik maddesi bu olduğu için yazılı
  teyidinizi rica ediyoruz.

Diğer teknik sorularımız (SIP TLS/SRTP, CLI iletimi, DTMF RFC 2833, numara
taşıma süresi, ses kaydının kapatılması) hazır; demo kurulumu netleşince
ayrıca iletiriz.

Teşekkürler.

**MİZ / My İnovatif Zeka**
İzmir

---

## 2. DEMO SÜRESİNCE NE ÖLÇECEĞİZ

> 15 gün kısa. Neyi ölçeceğimizi önceden bilmezsek demo biter, elimizde
> yine veri olmaz.

| Ölçüm | Neden | Nereden |
|---|---|---|
| **Günlük gerçek çağrı sayısı** | Modelin en kritik varsayımı. 100 mü, 40 mı, 200 mü? | Verimor CDR (ücretsiz API var) |
| **Ortalama görüşme süresi** | İkinci kritik varsayım. Maliyet dakika başına | Verimor CDR |
| **Saatlik dağılım** | Mesai dışı kapsam gerçekten yeter mi? | Verimor CDR |
| **Eşzamanlı tepe** | 6 kanal yeter mi | Verimor CDR |
| **Türkçe tanıma doğruluğu** | Seçenek 1/2 kararının temeli | Kendi dökümümüz, elle kontrol |
| **Uçtan uca gecikme** | Hasta bekliyor mu | Kendi logumuz |
| **Söz kesme davranışı** | Asistan kendi sesini kesiyor mu | Gerçek çağrı dinlemesi |

**Bu ölçümler bittiğinde maliyet modelindeki en büyük belirsizlik kapanır**
ve Seçenek 1 / Seçenek 2 kararı kendiliğinden netleşir.

**Not:** Ölçüm sırasında **ses kaydı almıyoruz.** CDR (çağrı detay kaydı)
süre ve saat bilgisi veriyor, içerik vermiyor — KVKK açısından bu yeterli
ve doğru olan. Tanıma doğruluğunu kendi yazılı dökümümüz üzerinden
değerlendireceğiz.
