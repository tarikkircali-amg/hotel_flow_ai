#!/usr/bin/env python3
# Deniz Dent - 7/24 sesli asistan maliyet ve fiyatlandirma modeli.
# Her sayi formulle baglidir; sari hucreleri degistirince her sey yeniden hesaplanir.

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

HEDEF = '/home/user/hotel_flow_ai/deniz-dent/Deniz-Dent-Maliyet-Modeli.xlsx'

MARKA = '0F766E'
GIRDI_DOLGU = PatternFill('solid', fgColor='FFF9C4')   # sari: elle degistirilecek
TURETILEN   = PatternFill('solid', fgColor='F1F5F9')
BASLIK_DOLGU = PatternFill('solid', fgColor=MARKA)

F = 'Arial'
b_baslik = Font(name=F, size=14, bold=True, color=MARKA)
b_alt    = Font(name=F, size=11, bold=True, color='FFFFFF')
b_kalin  = Font(name=F, size=10, bold=True)
b_normal = Font(name=F, size=10)
b_girdi  = Font(name=F, size=10, color='0000FF')        # mavi: elle girilen
b_not    = Font(name=F, size=9, italic=True, color='64748B')
b_vurgu  = Font(name=F, size=12, bold=True, color='B91C1C')

ince = Side(style='thin', color='CBD5E1')
cerceve = Border(left=ince, right=ince, top=ince, bottom=ince)

PARA_USD = '$#,##0.00'
PARA_USD0 = '$#,##0'
PARA_TRY = '#,##0 ₺'
YUZDE = '0%'
SAYI = '#,##0'
ONDALIK = '#,##0.0'

wb = openpyxl.Workbook()


def basliklandir(ws, baslik, altbaslik=None):
    ws['A1'] = baslik
    ws['A1'].font = b_baslik
    if altbaslik:
        ws['A2'] = altbaslik
        ws['A2'].font = b_not
    ws.freeze_panes = 'A4'


def bolum(ws, satir, metin, genislik=4):
    ws.cell(satir, 1, metin).font = b_alt
    for s in range(1, genislik + 1):
        ws.cell(satir, s).fill = BASLIK_DOLGU
        ws.cell(satir, s).font = b_alt


def girdi(ws, satir, etiket, deger, bicim=None, kaynak=''):
    ws.cell(satir, 1, etiket).font = b_normal
    h = ws.cell(satir, 2, deger)
    h.font = b_girdi
    h.fill = GIRDI_DOLGU
    h.border = cerceve
    if bicim:
        h.number_format = bicim
    if kaynak:
        ws.cell(satir, 3, kaynak).font = b_not
    return f'B{satir}'


def hesap(ws, satir, etiket, formul, bicim=None, kaynak='', kalin=False):
    ws.cell(satir, 1, etiket).font = b_kalin if kalin else b_normal
    h = ws.cell(satir, 2, formul)
    h.font = b_kalin if kalin else b_normal
    h.fill = TURETILEN
    if bicim:
        h.number_format = bicim
    if kaynak:
        ws.cell(satir, 3, kaynak).font = b_not
    return f'B{satir}'


# =====================================================================
# 1. VARSAYIMLAR
# =====================================================================
va = wb.active
va.title = 'Varsayimlar'
basliklandir(va, 'Deniz Dent — 7/24 Sesli Asistan Maliyet Modeli',
             'Sari hucreler elle degistirilir. Digerleri formulle hesaplanir. Hazirlayan: MIZ / My Inovatif Zeka · 02.10.2026')

va['A4'] = 'NASIL KULLANILIR: Yalnizca SARI hucreleri degistirin. Gri hucreler otomatik hesaplanir.'
va['A4'].font = Font(name=F, size=10, bold=True, color='B45309')

bolum(va, 6, 'ÇAĞRI HACMİ')
g_cagri   = girdi(va, 7,  'Günlük çağrı sayısı', 100, SAYI, 'Kliniğin verdiği tahmin')
g_sure    = girdi(va, 8,  'Ortalama görüşme süresi (dakika)', 2.5, ONDALIK, 'Varsayım — ilk aydan sonra gerçek veriyle güncellenecek')
g_gun     = girdi(va, 9,  'Ayda çalışma günü', 30, SAYI, '7/24 olduğu için tüm günler')
g_oran    = girdi(va, 10, 'Asistanın karşıladığı çağrı oranı', 1.0, YUZDE, '1,00 = tüm çağrıları asistan karşılar')

h_aycagri = hesap(va, 12, 'Aylık çağrı sayısı', f'={g_cagri}*{g_gun}*{g_oran}', SAYI, kalin=True)
h_aydk    = hesap(va, 13, 'Aylık toplam dakika', f'={h_aycagri}*{g_sure}', SAYI, kalin=True)

bolum(va, 15, 'TİCARİ')
g_kur     = girdi(va, 16, 'USD/TRY kuru', 50.0, ONDALIK, 'Temmuz 2026: ~47,5. Güncel kuru buraya yazın.')
g_marj    = girdi(va, 17, 'Hedef brüt marj', 0.55, YUZDE, 'Fiyat = maliyet / (1 - marj)')
g_model   = girdi(va, 18, 'Model seçimi (1/2/3)', 2, SAYI, '1=Opus 5.5  2=Sonnet 5.5  3=Haiku 4.5')

va['A20'] = 'Model seçimi notu: Sonnet 5.5 bu iş için yeterli. Opus daha güçlü ama bu görevde fark yaratmıyor;'
va['A20'].font = b_not
va['A21'] = 'acil tarama ve zorunlu aktarım zaten modelden bağımsız çalışıyor. Haiku en ucuzu, kaliteyi ölçmeden geçilmemeli.'
va['A21'].font = b_not

va.column_dimensions['A'].width = 38
va.column_dimensions['B'].width = 16
va.column_dimensions['C'].width = 62

# =====================================================================
# 2. BİRİM MALİYETLER
# =====================================================================
bm = wb.create_sheet('Birim Maliyetler')
basliklandir(bm, 'Birim Maliyetler',
             'Tarih: 02.10.2026 · Fiyatlar saglayici sayfalarindan alinmistir, degisebilir. Kaynak sutununu okuyun.')

bolum(bm, 5, 'TELEFON (Twilio)')
u_relay   = girdi(bm, 6, 'ConversationRelay ($/dakika)', 0.07, PARA_USD, 'Twilio Conversational AI fiyat sayfası, 2026')
u_gelen   = girdi(bm, 7, 'Gelen çağrı — Türkiye ($/dakika)', 0.0701, PARA_USD, 'Twilio Programmable Voice Türkiye, 2026')
u_numara  = girdi(bm, 8, 'Numara kirası ($/ay)', 1.15, PARA_USD, 'Uluslararası numara, başlangıç fiyatı')

bm['A9'] = 'UYARI: Twilio Türkiye için sesli yerel numara satmıyor olabilir. Doğrulanması gerekiyor —'
bm['A9'].font = Font(name=F, size=9, italic=True, color='B91C1C')
bm['A10'] = 'alternatif: kliniğin mevcut hattını Türk operatör/SIP üzerinden bağlamak. Bu, gelen çağrı kalemini düşürür.'
bm['A10'].font = Font(name=F, size=9, italic=True, color='B91C1C')

bolum(bm, 12, 'SES (ElevenLabs)')
u_tts     = girdi(bm, 13, 'Seslendirme ($/1.000 karakter)', 0.05, PARA_USD, 'ElevenLabs API, Flash v2.5, 2026')
u_karakter= girdi(bm, 14, 'Görüşme başına karakter', 1500, SAYI, 'Varsayım: 2,5 dk görüşmede asistan ~1.500 karakter konuşur')

bolum(bm, 16, 'YAPAY ZEKÂ (Anthropic Claude) — $/milyon token')
bm.cell(17, 2, 'Opus 5.5').font = b_kalin
bm.cell(17, 3, 'Sonnet 5.5').font = b_kalin
bm.cell(17, 4, 'Haiku 4.5').font = b_kalin

for satir, etiket, degerler, kaynak in [
    (18, 'Girdi', (4.00, 2.00, 1.00), 'Anthropic resmî fiyat listesi'),
    (19, 'Çıktı', (20.00, 10.00, 5.00), 'Anthropic resmî fiyat listesi'),
    (20, 'Önbellekten okuma', (0.20, 0.20, 0.10), 'Opus/Sonnet belgelenmiş; Haiku VARSAYIM'),
]:
    bm.cell(satir, 1, etiket).font = b_normal
    for i, d in enumerate(degerler):
        h = bm.cell(satir, 2 + i, d)
        h.font = b_girdi
        h.fill = GIRDI_DOLGU
        h.border = cerceve
        h.number_format = PARA_USD
    bm.cell(satir, 5, kaynak).font = b_not

bolum(bm, 22, 'GÖRÜŞME BAŞINA TOKEN KULLANIMI (varsayım)')
t_tur     = girdi(bm, 23, 'Görüşme başına tur sayısı', 6, SAYI, 'Hasta–asistan karşılıklı konuşma sayısı')
t_sistem  = girdi(bm, 24, 'Sistem metni (token)', 2500, SAYI, 'İlk turda önbelleğe yazılır, sonra okunur')
t_yeni    = girdi(bm, 25, 'Tur başına yeni girdi (token)', 350, SAYI, 'Hastanın sözü + araç sonuçları')
t_cikti   = girdi(bm, 26, 'Tur başına çıktı (token)', 120, SAYI, 'Asistanın cevabı — telefon için kısa')

bolum(bm, 28, 'ALTYAPI')
u_sunucu  = girdi(bm, 29, 'Sunucu + veritabanı ($/ay)', 40.0, PARA_USD, 'Hetzner/Railway sınıfı, yedekli')

bm.column_dimensions['A'].width = 36
for c in 'BCD':
    bm.column_dimensions[c].width = 14
bm.column_dimensions['E'].width = 46

# =====================================================================
# 3. AYLIK MALİYET
# =====================================================================
am = wb.create_sheet('Aylik Maliyet')
basliklandir(am, 'Aylık Maliyet', 'Varsayimlar ve Birim Maliyetler sayfalarindan otomatik hesaplanir.')

V = "Varsayimlar!"
B = "'Birim Maliyetler'!"

bolum(am, 5, 'HACİM')
hesap(am, 6, 'Aylık çağrı', f'={V}{h_aycagri}', SAYI)
hesap(am, 7, 'Aylık dakika', f'={V}{h_aydk}', SAYI)

bolum(am, 9, 'MALİYET KALEMLERİ ($)')
m_relay = hesap(am, 10, 'ConversationRelay', f'=B7*{B}{u_relay}', PARA_USD0)
m_gelen = hesap(am, 11, 'Gelen çağrı (telefon hattı)', f'=B7*{B}{u_gelen}', PARA_USD0)
m_num   = hesap(am, 12, 'Numara kirası', f'={B}{u_numara}', PARA_USD0)
m_tts   = hesap(am, 13, 'Seslendirme (ElevenLabs)', f'=B6*{B}{u_karakter}/1000*{B}{u_tts}', PARA_USD0)

# Claude: secilen modelin fiyatlarini INDEX ile al
idx = f'{V}{g_model}'
f_girdi  = f"INDEX({B}B18:D18,{idx})"
f_cikti  = f"INDEX({B}B19:D19,{idx})"
f_onbellek = f"INDEX({B}B20:D20,{idx})"

# gorusme basina token
tok_yeni   = f"({B}{t_yeni}*{B}{t_tur})"
tok_cikti  = f"({B}{t_cikti}*{B}{t_tur})"
tok_yaz    = f"({B}{t_sistem}*1.25)"                       # onbellege yazma ~1,25x
tok_oku    = f"({B}{t_sistem}*({B}{t_tur}-1))"

m_claude = hesap(
    am, 14, 'Yapay zekâ (Claude)',
    f'=B6*(({tok_yeni}+{tok_yaz})/1000000*{f_girdi}'
    f'+{tok_oku}/1000000*{f_onbellek}'
    f'+{tok_cikti}/1000000*{f_cikti})',
    PARA_USD0)
m_sunucu = hesap(am, 15, 'Sunucu + veritabanı', f'={B}{u_sunucu}', PARA_USD0)

am.cell(17, 1, 'TOPLAM ($/ay)').font = b_kalin
t_usd = am.cell(17, 2, f'=SUM(B10:B15)')
t_usd.font = Font(name=F, size=11, bold=True)
t_usd.number_format = PARA_USD0
t_usd.fill = TURETILEN

am.cell(18, 1, 'TOPLAM (₺/ay)').font = b_kalin
t_try = am.cell(18, 2, f'=B17*{V}{g_kur}')
t_try.font = Font(name=F, size=12, bold=True, color='B91C1C')
t_try.number_format = PARA_TRY
t_try.fill = TURETILEN

hesap(am, 20, 'Çağrı başına maliyet (₺)', f'=IF(B6=0,0,B18/B6)', '#,##0.00 ₺', kalin=True)
hesap(am, 21, 'Dakika başına maliyet (₺)', f'=IF(B7=0,0,B18/B7)', '#,##0.00 ₺')

bolum(am, 23, 'PAY DAĞILIMI')
for i, (etiket, hucre) in enumerate([
    ('Telefon (relay + çağrı + numara)', '=B10+B11+B12'),
    ('Seslendirme', '=B13'),
    ('Yapay zekâ', '=B14'),
    ('Altyapı', '=B15'),
]):
    s = 24 + i
    am.cell(s, 1, etiket).font = b_normal
    h = am.cell(s, 2, hucre)
    h.number_format = PARA_USD0
    h.fill = TURETILEN
    p = am.cell(s, 3, f'=IF($B$17=0,0,B{s}/$B$17)')
    p.number_format = YUZDE
    p.fill = TURETILEN

am.column_dimensions['A'].width = 34
am.column_dimensions['B'].width = 16
am.column_dimensions['C'].width = 12

# =====================================================================
# 4. FİYATLANDIRMA
# =====================================================================
fy = wb.create_sheet('Fiyatlandirma')
basliklandir(fy, 'Fiyatlandırma', 'Maliyetin uzerine hedef marj eklenerek onerilen fiyat hesaplanir.')

bolum(fy, 5, 'AYLIK')
fy.cell(6, 1, 'Aylık değişken maliyet (₺)').font = b_normal
h = fy.cell(6, 2, "='Aylik Maliyet'!B18"); h.number_format = PARA_TRY; h.fill = TURETILEN

p_emek = girdi(fy, 7, 'Aylık bakım/destek emeği (₺)', 15000, PARA_TRY, 'İzleme, güncelleme, klinik talepleri')

fy.cell(8, 1, 'Toplam aylık maliyet (₺)').font = b_kalin
h = fy.cell(8, 2, '=B6+B7'); h.number_format = PARA_TRY; h.fill = TURETILEN; h.font = b_kalin

fy.cell(10, 1, 'ÖNERİLEN AYLIK FİYAT (₺)').font = b_kalin
h = fy.cell(10, 2, f"=B8/(1-Varsayimlar!{g_marj})")
h.number_format = PARA_TRY
h.font = Font(name=F, size=14, bold=True, color=MARKA)
h.fill = PatternFill('solid', fgColor='CCFBF1')

fy.cell(11, 1, 'Aylık brüt kâr (₺)').font = b_normal
h = fy.cell(11, 2, '=B10-B8'); h.number_format = PARA_TRY; h.fill = TURETILEN

bolum(fy, 13, 'KURULUM (tek seferlik)')
k_gun   = girdi(fy, 14, 'Kurulum iş günü', 25, SAYI, 'Entegrasyon, klinik verisi, test, eğitim')
k_gunluk= girdi(fy, 15, 'Günlük maliyet (₺)', 4000, PARA_TRY, 'İç maliyet')
fy.cell(16, 1, 'Kurulum maliyeti (₺)').font = b_normal
h = fy.cell(16, 2, '=B14*B15'); h.number_format = PARA_TRY; h.fill = TURETILEN
fy.cell(17, 1, 'ÖNERİLEN KURULUM FİYATI (₺)').font = b_kalin
h = fy.cell(17, 2, f"=B16/(1-Varsayimlar!{g_marj})")
h.number_format = PARA_TRY
h.font = Font(name=F, size=13, bold=True, color=MARKA)
h.fill = PatternFill('solid', fgColor='CCFBF1')

bolum(fy, 19, 'KARŞILAŞTIRMA')
fy.cell(20, 1, 'Önceki teklif (mesai dışı kapsam)').font = b_normal
fy.cell(20, 2, 12900).number_format = PARA_TRY
fy.cell(20, 3, '55.000 ₺ kurulum + 12.900 ₺/ay — kapsam yalnızca mesai dışıydı').font = b_not

fy.cell(21, 1, 'Fark (kat)').font = b_normal
h = fy.cell(21, 2, '=IF(B20=0,0,B10/B20)'); h.number_format = '0.0"x"'; h.fill = TURETILEN

fy['A23'] = 'Not: Önceki teklif mesai dışı çağrıları kapsıyordu. 7/24 ve günde 100 çağrı,'
fy['A23'].font = b_not
fy['A24'] = 'kullanım bazlı kalemleri (telefon dakikası, seslendirme, model) doğrudan artırır.'
fy['A24'].font = b_not

fy.column_dimensions['A'].width = 36
fy.column_dimensions['B'].width = 18
fy.column_dimensions['C'].width = 56

# =====================================================================
# 5. SENARYOLAR
# =====================================================================
sn = wb.create_sheet('Senaryolar')
basliklandir(sn, 'Senaryolar — çağrı hacmine göre', 'Diger varsayimlar sabit tutularak yalnizca gunluk cagri sayisi degistirilmistir.')

basliklar = ['Günlük çağrı', 'Aylık çağrı', 'Aylık dakika', 'Maliyet ($/ay)',
             'Maliyet (₺/ay)', 'Çağrı başına (₺)', 'Önerilen fiyat (₺/ay)']
for i, bsl in enumerate(basliklar):
    h = sn.cell(5, 1 + i, bsl)
    h.font = b_alt
    h.fill = BASLIK_DOLGU
    h.alignment = Alignment(wrap_text=True, vertical='center')

for i, adet in enumerate([25, 50, 100, 150, 200, 300]):
    s = 6 + i
    sn.cell(s, 1, adet).number_format = SAYI
    sn.cell(s, 1).font = b_girdi
    sn.cell(s, 1).fill = GIRDI_DOLGU

    sn.cell(s, 2, f'=A{s}*{V}{g_gun}*{V}{g_oran}').number_format = SAYI
    sn.cell(s, 3, f'=B{s}*{V}{g_sure}').number_format = SAYI

    sn.cell(s, 4,
            f'=C{s}*({B}{u_relay}+{B}{u_gelen})+{B}{u_numara}'
            f'+B{s}*{B}{u_karakter}/1000*{B}{u_tts}'
            f'+B{s}*(({tok_yeni}+{tok_yaz})/1000000*{f_girdi}'
            f'+{tok_oku}/1000000*{f_onbellek}'
            f'+{tok_cikti}/1000000*{f_cikti})'
            f'+{B}{u_sunucu}').number_format = PARA_USD0

    sn.cell(s, 5, f'=D{s}*{V}{g_kur}').number_format = PARA_TRY
    sn.cell(s, 6, f'=IF(B{s}=0,0,E{s}/B{s})').number_format = '#,##0.00 ₺'
    sn.cell(s, 7, f"=(E{s}+Fiyatlandirma!$B$7)/(1-{V}{g_marj})").number_format = PARA_TRY
    sn.cell(s, 7).font = b_kalin

    for k in range(1, 8):
        sn.cell(s, k).border = cerceve

sn['A14'] = 'Sarı sütundaki günlük çağrı sayılarını değiştirebilirsiniz; satır kendini yeniden hesaplar.'
sn['A14'].font = b_not

sn.column_dimensions['A'].width = 14
for c in 'BCDEFG':
    sn.column_dimensions[c].width = 17

# =====================================================================
# 6. MALİYET DÜŞÜRME KALDIRAÇLARI
# =====================================================================
kl = wb.create_sheet('Kaldiraclar')
basliklandir(kl, 'Maliyet Düşürme Kaldıraçları',
             'Maliyetin %76si TELEFON. Yapay zeka sadece %4. Dusurulecek yer bellidir.')

kl['A4'] = 'Aşağıdaki her senaryo, yalnızca belirtilen kalemi değiştirip aylık maliyeti yeniden hesaplar.'
kl['A4'].font = b_not
kl['A5'] = 'Sarı hücreler varsayımdır — gerçek teklif alınca doldurulacak.'
kl['A5'].font = Font(name=F, size=9, italic=True, color='B45309')

bsl = ['Senaryo', 'Relay $/dk', 'Gelen $/dk', 'Çağrı oranı', 'Maliyet ($/ay)', 'Maliyet (₺/ay)', 'Tasarruf']
for i, b in enumerate(bsl):
    h = kl.cell(7, 1 + i, b)
    h.font = b_alt
    h.fill = BASLIK_DOLGU
    h.alignment = Alignment(wrap_text=True, vertical='center')

senaryolar = [
    ('A — Twilio (bugünkü varsayım)', 0.07, 0.0701, 1.00,
     'Referans. ConversationRelay + Twilio Türkiye gelen çağrı.'),
    ('B — Türk operatör + Twilio BYOC', 0.07, 0.010, 1.00,
     'Kendi operatorumuz Twilio ya BYOC ile baglanir. Relay aynen calisir, kod degismez. Teklif alinmali.'),
    ('C — Kendi STT + TTS (relay yok)', 0.015, 0.010, 1.00,
     'ConversationRelay yerine kendi akışımız. Geliştirme işi var, dakika ücreti düşer.'),
    ('D — Sadece mesai dışı', 0.07, 0.0701, 0.35,
     'Gündüz resepsiyon karşılar. Çağrıların ~%35i asistana düşer.'),
    ('E — B + D birlikte', 0.07, 0.010, 0.35,
     'Türk operatör + yalnızca mesai dışı. En gerçekçi başlangıç.'),
]

for i, (ad, relay, gelen, oran, aciklama) in enumerate(senaryolar):
    s = 8 + i
    kl.cell(s, 1, ad).font = b_kalin if i == 0 else b_normal
    for sut, deger, bic in ((2, relay, PARA_USD), (3, gelen, PARA_USD), (4, oran, YUZDE)):
        h = kl.cell(s, sut, deger)
        h.font = b_girdi
        h.fill = GIRDI_DOLGU
        h.border = cerceve
        h.number_format = bic

    cagri = f'(Varsayimlar!{g_cagri}*Varsayimlar!{g_gun}*D{s})'
    dk = f'({cagri}*Varsayimlar!{g_sure})'
    kl.cell(s, 5,
        f'={dk}*(B{s}+C{s})+{B}{u_numara}'
        f'+{cagri}*{B}{u_karakter}/1000*{B}{u_tts}'
        f'+{cagri}*(({tok_yeni}+{tok_yaz})/1000000*{f_girdi}'
        f'+{tok_oku}/1000000*{f_onbellek}'
        f'+{tok_cikti}/1000000*{f_cikti})'
        f'+{B}{u_sunucu}').number_format = PARA_USD0
    kl.cell(s, 6, f'=E{s}*Varsayimlar!{g_kur}').number_format = PARA_TRY
    kl.cell(s, 6).font = b_kalin
    kl.cell(s, 7, f'=IF($E$8=0,0,1-E{s}/$E$8)').number_format = YUZDE
    kl.cell(s, 8, aciklama).font = b_not
    for k in range(1, 8):
        kl.cell(s, k).border = cerceve

kl['A15'] = 'B senaryosu MİMARİ OLARAK DOĞRULANDI: Twilio BYOC (Bring Your Own Carrier) ile kendi'
kl['A15'].font = Font(name=F, size=10, bold=True, color='047857')
kl['A16'] = 'operatörümüzü bağlayıp ConversationRelay i aynen kullanmaya devam edebiliyoruz — kod değişmiyor.'
kl['A16'].font = Font(name=F, size=10, bold=True, color='047857')
kl['A17'] = 'EKSİK: Twilio nun BYOC dakika ücreti. Twilio ya sorulacak, modele eklenecek.'
kl['A17'].font = Font(name=F, size=10, bold=True, color='B45309')

kl['A19'] = 'ÖNEMLİ: B ve C senaryolarındaki dakika ücretleri VARSAYIMDIR. Türk SIP sağlayıcılardan'
kl['A15'].font = Font(name=F, size=10, bold=True, color='B91C1C')
kl['A20'] = 'teklif alınmadan bu sayılar müşteriye verilmemelidir.'
kl['A20'].font = Font(name=F, size=10, bold=True, color='B91C1C')

kl['A22'] = 'Yapay zekâ maliyeti neden küçük: görüşme başına yaklaşık 1 ₺. Model değiştirmek toplam'
kl['A22'].font = b_not
kl['A23'] = 'maliyeti ancak %4 oynatıyor. Telefon kalemi ise %76 — iyileştirme oraya yapılmalı.'
kl['A23'].font = b_not

kl.column_dimensions['A'].width = 32
for c in 'BCDEFG':
    kl.column_dimensions[c].width = 14
kl.column_dimensions['H'].width = 60

# =====================================================================
# 7. VERİMOR TEKLİFİ
# =====================================================================
vm = wb.create_sheet('Verimor')
basliklandir(vm, 'Verimor Teklifi — 06.10.2026',
             'Kaynak: Verimor e-postasi ve Bulut Santral fiyat listesi PDF. Fiyatlar KDV HARIC.')

vm['A4'] = 'EN ÖNEMLİ MADDE: Verimor numaralarına gelen çağrılarda DAKİKA ÜCRETİ YOK.'
vm['A4'].font = Font(name=F, size=11, bold=True, color='047857')
vm['A5'] = 'Maliyetin en büyük kalemi (gelen çağrı dakikası) tamamen ortadan kalkıyor.'
vm['A5'].font = Font(name=F, size=10, bold=True, color='047857')

bolum(vm, 7, 'VERİMOR SABİT ÜCRETLER (₺/ay, KDV hariç)')
v_santral = girdi(vm, 8, 'Bulut Santral paketi', 565, PARA_TRY,
                  'X Small: 5 kullanıcı / 3 dış hat, 6 aylık periyot (aylık 565 ₺)')
v_sip     = girdi(vm, 9, 'SIP Trunk modülü', 899, PARA_TRY,
                  'Aylık periyot. 6 aylıkta 824 ₺, 12 aylıkta 768 ₺')
v_kdv     = girdi(vm, 10, 'KDV oranı', 0.20, YUZDE, '')
hesap(vm, 11, 'Verimor toplam (KDV dahil)', f'=(B8+B9)*(1+B10)', PARA_TRY, kalin=True)

vm['A13'] = 'Gelen çağrı dakika ücreti'
vm['A13'].font = b_normal
h = vm.cell(13, 2, 0); h.number_format = PARA_TRY; h.fill = TURETILEN
vm.cell(13, 3, 'Verimor: "gelen çağrılarda dakika başına ücretlendirme yansımaz"').font = b_not

vm['A14'] = 'Numara taşıma / tahsis'
vm['A14'].font = b_normal
vm.cell(14, 3, 'Taşıma ücretsiz. Yeni numara tahsisi 468 ₺ tek seferlik; ilk numara ücretsiz.').font = b_not

vm['A15'] = 'Eşzamanlı kanal'
vm['A15'].font = b_normal
vm.cell(15, 2, 6).number_format = SAYI
vm.cell(15, 3, 'Artırılabilir. 100 çağrı/gün için yeterli (yoğun saatte bile ~1 kanal doluluk).').font = b_not

vm['A16'] = 'Taahhüt'
vm['A16'].font = b_normal
vm.cell(16, 3, 'Yok. Ön ödemeli ilerliyor.').font = b_not

bolum(vm, 18, 'İKİ MİMARİ SEÇENEK')
bsl2 = ['Seçenek', 'Relay $/dk', 'STT $/dk', 'Maliyet (₺/ay)', 'Çağrı başı (₺)', 'Önerilen fiyat (₺/ay)']
for i, bb in enumerate(bsl2):
    h = vm.cell(19, 1 + i, bb)
    h.font = b_alt
    h.fill = BASLIK_DOLGU
    h.alignment = Alignment(wrap_text=True, vertical='center')

secenekler = [
    ('1 — Verimor → Twilio BYOC → Relay', 0.07, 0.000,
     'Kod DEĞİŞMEZ. Twilio BYOC dakika ücreti henüz bilinmiyor, eklenecek.'),
    ('2 — Verimor → kendi medya katmanı', 0.000, 0.010,
     'Twilio tamamen çıkar. Verimor LiveKit + ElevenLabs entegrasyonunu belgeliyor. Geliştirme işi var.'),
]
cagri_f = f'(Varsayimlar!{g_cagri}*Varsayimlar!{g_gun})'
dk_f = f'({cagri_f}*Varsayimlar!{g_sure})'

for i, (ad, relay, stt, aciklama) in enumerate(secenekler):
    s2 = 20 + i
    vm.cell(s2, 1, ad).font = b_kalin
    for sut, deger in ((2, relay), (3, stt)):
        h = vm.cell(s2, sut, deger)
        h.font = b_girdi
        h.fill = GIRDI_DOLGU
        h.border = cerceve
        h.number_format = '$#,##0.000'
    vm.cell(s2, 4,
        f'=($B$11)+({dk_f}*(B{s2}+C{s2})'
        f'+{cagri_f}*{B}{u_karakter}/1000*{B}{u_tts}'
        f'+{cagri_f}*(({tok_yeni}+{tok_yaz})/1000000*{f_girdi}'
        f'+{tok_oku}/1000000*{f_onbellek}'
        f'+{tok_cikti}/1000000*{f_cikti})'
        f'+{B}{u_sunucu})*Varsayimlar!{g_kur}').number_format = PARA_TRY
    vm.cell(s2, 4).font = b_kalin
    vm.cell(s2, 5, f'=IF({cagri_f}=0,0,D{s2}/{cagri_f})').number_format = '#,##0.00 ₺'
    vm.cell(s2, 6, f"=(D{s2}+Fiyatlandirma!$B$7)/(1-Varsayimlar!{g_marj})").number_format = PARA_TRY
    vm.cell(s2, 7, aciklama).font = b_not
    for k in range(1, 7):
        vm.cell(s2, k).border = cerceve

vm['A23'] = 'STT (konuşmayı metne çevirme) ücreti VARSAYIMDIR — $0,010/dk. Sağlayıcıdan teklif alınmadı.'
vm['A23'].font = Font(name=F, size=10, bold=True, color='B45309')

vm['A25'] = 'CEVAPLANMASI GEREKENLER'
vm['A25'].font = b_kalin
for i, soru in enumerate([
    'Twilio BYOC dakika ücreti nedir? (Seçenek 1 bunsuz tamamlanmıyor)',
    'STT sağlayıcı ve fiyatı? (Seçenek 2 bunsuz tamamlanmıyor)',
    'E-postadaki paket fiyatları (5.731 / 7.576 ₺) fiyat listesiyle eşleşmiyor — hangisi geçerli?',
    'SIP Trunk modülü dışında başka zorunlu modül var mı?',
    'WhatsApp: Verimor şu an yalnızca OTP gönderiyor; çift yönlü sohbet için Meta Cloud API gerekiyor.',
]):
    vm.cell(26 + i, 1, f'{i+1}. {soru}').font = b_normal

vm.column_dimensions['A'].width = 40
for c in 'BCDEF':
    vm.column_dimensions[c].width = 16
vm.column_dimensions['G'].width = 60

wb.save(HEDEF)
print(f'yazildi: {HEDEF}')
