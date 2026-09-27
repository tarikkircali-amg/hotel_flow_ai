# 🚀 Hostinger'a kurulum (MİZ Marketing OS)

> Kaynak: Hostinger'ın "Node.js web app" belgeleri (Eylül 2026). Node.js uygulamaları **Business Web Hosting**
> ve **Cloud (Startup / Professional / Enterprise / Enterprise Plus)** planlarında hPanel'den kurulur.
> Premium/Single planlarda yoktur; VPS'te ise komut satırıyla kurulur (aşağıda).

## ⚠️ Önce okuyun: ana sitenize dokunmayın

Hostinger, Node.js uygulamasını kurduğunuz alan adında **mevcut web sitesini kaldırmanızı** ister.
Bu yüzden Marketing OS'u ana alan adınıza değil, bir **alt alan adına** kurun:

```
pazarlama.alanadiniz.com   ← Marketing OS (Node.js web app)
alanadiniz.com             ← mevcut siteniz aynen kalır
```

## 1) GitHub dağıtım dalı (bir kez, otomatik)

Uygulama repoda `marketing-os/` klasöründe; Hostinger kök klasör seçtirmiyor. Bunun için
`.github/workflows/marketing-os.yml` her `main` güncellemesinde testleri çalıştırır, geçerse
`marketing-os/` içeriğini kökte olacak şekilde **`deploy/marketing-os`** dalına yazar.

- PR'ı `main`'e birleştirin → Actions sekmesinde "Marketing OS" iş akışı çalışır → `deploy/marketing-os` dalı oluşur.
- Elle tetiklemek için: Actions → Marketing OS → **Run workflow**.

## 2) hPanel'de uygulamayı oluşturun

1. hPanel → **Websites → Add Website → Node.js web app** (Deploy Web App).
2. **Import Git repository → Connect with GitHub** → `tarikkircali-amg/hotel_flow_ai` deposuna izin verin.
3. Depoyu seçin ve ayarları şöyle yapın:

| Alan | Değer |
|---|---|
| Alan adı | `pazarlama.alanadiniz.com` (alt alan adı) |
| Branch | `deploy/marketing-os` |
| Framework preset | Express (algılanmazsa **Other**) |
| Node.js version | 22 |
| Build command | *(boş bırakın — derleme adımı yok)* |
| Package manager | npm |
| Entry file | `server/index.js` |

4. **Environment variables** bölümüne ekleyin:

| Değişken | Değer | Not |
|---|---|---|
| `NODE_ENV` | `production` | |
| `MOS_ADMIN_PASSWORD` | güçlü bir parola | ilk girişte kullanılır |
| `MOS_COOKIE_SECURE` | `1` | Hostinger SSL ile HTTPS sunar |
| `MOS_TRUST_PROXY` | `1` | gerçek ziyaretçi IP'si (giriş sınırlama, denetim) |
| `MOS_DB_FILE` | `/home/<kullanıcı>/domains/pazarlama.alanadiniz.com/mos-data/marketing-os.db` | **uygulama klasörünün dışında** — yeniden dağıtımda silinmesin |
| `ANTHROPIC_API_KEY` | `sk-ant-…` | yoksa demo modu |
| `MOS_MODEL` | `claude-opus-5` | isteğe bağlı |
| `MOS_IMAGE_PROVIDER` + `OPENAI_API_KEY` veya `FAL_KEY` | | AI görsel için, isteğe bağlı |
| `MOS_PUBLISH_WEBHOOK_URL` + `MOS_PUBLISH_SECRET` | | Zapier/Make yayın köprüsü, isteğe bağlı |
| `MOS_CURRENCY` | `TRY` / `EUR` / `USD` | performans panosu |

   `<kullanıcı>` yolunu hPanel → **File Manager**'da görürsünüz (sunucu uygulamaları `~/domains/<alan-adı>/nodejs`
   altına kurulur; `mos-data` klasörünü onun **yanına** açın). Bu klasörün yeniden dağıtımlarda korunduğunu
   ilk kurulumdan sonra bir kez doğrulayın: bir kampanya oluşturun → **Redeploy** → kampanya hâlâ duruyor mu?

5. **Deploy**. Bitince `https://pazarlama.alanadiniz.com` açılır. Sağlık kontrolü: `/api/health`.

Sonraki her `main` güncellemesi → dağıtım dalı güncellenir → Hostinger otomatik yeniden kurar.

## 3) Sitenizden marka bilgisi

Uygulamada **Projeler → Düzenle → 🌐 Siteden bilgi al**: Hostinger'daki sitenizin adresini girin; başlık,
açıklama, başlıklar ve metinler okunur, ajans bunları her kampanyada **veri** olarak kullanır. Boş alanlar
(ne yapıyor / hedef kitle / ton) için öneri doldurulur; siz kontrol edip **Kaydet**'e basarsınız.
Yalnızca JavaScript ile yüklenen sayfalarda (bazı site oluşturucular) okunacak metin çıkmayabilir.

## 4) Canlı ofis ve paylaşımlı barındırma

Ofis ekranı Server-Sent Events kullanır (`X-Accel-Buffering: no` ile vekil tamponlaması kapatılır).
Bağlantı yine de engellenirse ekran her 15 saniyede bir kendini yeniler; iş akışı etkilenmez.

## 5) Yedek

⚙️ **Ayarlar → Veritabanı yedeğini indir** (yalnızca hesap sahibi). Haftada bir indirin.
Geri yüklemek için dosyayı `MOS_DB_FILE` yoluna koyup uygulamayı yeniden başlatın.

## Alternatif: dosya yükleyerek (GitHub'sız)

```bash
cd marketing-os
zip -r marketing-os.zip . --exclude "node_modules/*" --exclude "data/*" --exclude "docs/*"
```
hPanel → Add Website → Node.js web app → **Upload your files** → aynı ayarlar ve değişkenler.

## Alternatif: Hostinger VPS

```bash
# Ubuntu + Node 22 kurulu VPS'te
git clone -b deploy/marketing-os https://github.com/tarikkircali-amg/hotel_flow_ai.git marketing-os
cd marketing-os && npm ci --omit=dev
sudo mkdir -p /var/lib/marketing-os && sudo chown $USER /var/lib/marketing-os
npm i -g pm2
NODE_ENV=production MOS_DB_FILE=/var/lib/marketing-os/marketing-os.db MOS_TRUST_PROXY=1 MOS_COOKIE_SECURE=1 \
  MOS_ADMIN_PASSWORD='…' ANTHROPIC_API_KEY='…' pm2 start server/index.js --name marketing-os
pm2 save && pm2 startup
```
Nginx'te `pazarlama.alanadiniz.com` → `http://127.0.0.1:4000` vekil; `/api/events` için `proxy_buffering off;`.
