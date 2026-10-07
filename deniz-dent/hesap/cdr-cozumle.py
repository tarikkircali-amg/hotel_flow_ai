#!/usr/bin/env python3
"""Santral CDR (cagri detay kaydi) -> maliyet modelini besleyen olcumler.

Verimor demosu sirasinda toplanan cagri kayitlarini okur ve maliyet
modelindeki iki buyuk belirsizligi kapatir: gercekte gunde kac cagri
geliyor ve ortalama kac dakika suruyor.

Kullanim:
    python3 cdr-cozumle.py kayitlar.csv
    python3 cdr-cozumle.py kayitlar.csv --baslangic-sutun start_time --sure-sutun duration

Sutun adlari otomatik taninir; taninmazsa yukaridaki bayraklarla verilir.
Sure saniye kabul edilir (--sure-birimi dakika ile degistirilebilir).
"""

import argparse, csv, math, re, sys
from collections import Counter
from datetime import datetime

# Santraller bu adlari kullaniyor; buyuk/kucuk harf ve ayraç onemsiz.
BASLANGIC_ADLARI = ['start_time', 'starttime', 'start', 'calldate', 'call_date',
                    'date', 'tarih', 'baslangic', 'baslangic_zamani', 'zaman']
SURE_ADLARI = ['duration', 'billsec', 'bill_sec', 'talk_time', 'talktime',
               'sure', 'gorusme_suresi', 'konusma_suresi', 'length']
YON_ADLARI = ['direction', 'yon', 'call_type', 'type', 'tip']
DURUM_ADLARI = ['status', 'disposition', 'durum', 'sonuc', 'result']

ZAMAN_BICIMLERI = [
    '%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d %H:%M',
    '%d.%m.%Y %H:%M:%S', '%d.%m.%Y %H:%M', '%d/%m/%Y %H:%M:%S',
    '%m/%d/%Y %H:%M:%S', '%Y/%m/%d %H:%M:%S',
]


def sadelestir(ad):
    return ''.join(c for c in ad.lower() if c.isalnum())


def sutun_bul(basliklar, adaylar):
    sade = {sadelestir(b): b for b in basliklar}
    for aday in adaylar:
        if sadelestir(aday) in sade:
            return sade[sadelestir(aday)]
    return None


def zaman_coz(ham):
    # Kesirli saniyeyi yalnizca SONDAN ayikla: "01.10.2026" gibi Avrupa
    # tarihlerinde noktadan bolmek tarihi parcaliyor.
    ham = re.sub(r'\.\d+$', '', ham.strip().replace('T', ' ').split('+')[0])
    for bicim in ZAMAN_BICIMLERI:
        try:
            return datetime.strptime(ham, bicim)
        except ValueError:
            continue
    # Unix zaman damgasi
    try:
        n = float(ham)
        if n > 1e8:
            return datetime.fromtimestamp(n)
    except ValueError:
        pass
    return None


def sure_coz(ham, birim):
    ham = ham.strip()
    if not ham:
        return None
    # "00:02:31" bicimi
    if ':' in ham:
        parcalar = [float(p) for p in ham.split(':')]
        saniye = 0.0
        for p in parcalar:
            saniye = saniye * 60 + p
        return saniye
    try:
        n = float(ham.replace(',', '.'))
    except ValueError:
        return None
    return n * 60 if birim == 'dakika' else n


def eszamanli_tepe(araliklar):
    """Ayni anda acik olan en fazla cagri sayisi."""
    olaylar = []
    for bas, bit in araliklar:
        olaylar.append((bas, 1))
        olaylar.append((bit, -1))
    # Ayni anda biten ve baslayan varsa once bitisi isle: cakisma saymayalim.
    olaylar.sort(key=lambda o: (o[0], o[1]))
    simdi = tepe = 0
    for _, delta in olaylar:
        simdi += delta
        tepe = max(tepe, simdi)
    return tepe


def main():
    a = argparse.ArgumentParser(description='CDR dosyasindan cagri olcumleri cikarir.')
    a.add_argument('dosya')
    a.add_argument('--baslangic-sutun')
    a.add_argument('--sure-sutun')
    a.add_argument('--sure-birimi', choices=['saniye', 'dakika'], default='saniye')
    a.add_argument('--ayrac', default=None, help='CSV ayraci (varsayilan: otomatik)')
    a.add_argument('--mesai', default='09:00-19:00',
                   help='Mesai saatleri, orn. 09:00-19:00')
    a.add_argument('--sifir-sureleri-at', action='store_true',
                   help='Suresi 0 olan (cevaplanmamis) kayitlari disla')
    args = a.parse_args()

    ham = open(args.dosya, encoding='utf-8-sig', newline='').read()
    ayrac = args.ayrac or csv.Sniffer().sniff(ham[:4096], delimiters=',;\t|').delimiter
    okuyucu = csv.DictReader(ham.splitlines(), delimiter=ayrac)
    basliklar = okuyucu.fieldnames or []

    s_bas = args.baslangic_sutun or sutun_bul(basliklar, BASLANGIC_ADLARI)
    s_sure = args.sure_sutun or sutun_bul(basliklar, SURE_ADLARI)
    s_yon = sutun_bul(basliklar, YON_ADLARI)
    s_durum = sutun_bul(basliklar, DURUM_ADLARI)

    if not s_bas or not s_sure:
        print('Sutunlar taninamadi.', file=sys.stderr)
        print(f'  Dosyadaki sutunlar: {", ".join(basliklar)}', file=sys.stderr)
        print('  --baslangic-sutun ve --sure-sutun ile elle verin.', file=sys.stderr)
        sys.exit(1)

    kayitlar, atlanan = [], 0
    for satir in okuyucu:
        bas = zaman_coz(satir.get(s_bas, '') or '')
        sure = sure_coz(satir.get(s_sure, '') or '', args.sure_birimi)
        if bas is None or sure is None:
            atlanan += 1
            continue
        if args.sifir_sureleri_at and sure <= 0:
            continue
        kayitlar.append((bas, sure, (satir.get(s_yon) or '').lower(),
                         (satir.get(s_durum) or '').lower()))

    if not kayitlar:
        print('Okunabilir kayit yok.', file=sys.stderr)
        sys.exit(1)

    kayitlar.sort()
    gunler = Counter(k[0].date() for k in kayitlar)
    saatler = Counter(k[0].hour for k in kayitlar)
    sureler = [k[1] for k in kayitlar]
    toplam_dk = sum(sureler) / 60
    # Twilio kismi dakikayi yukari yuvarliyor.
    faturalanan_dk = sum(math.ceil(s / 60) for s in sureler)

    m_bas, m_bit = [int(p.split(':')[0]) for p in args.mesai.split('-')]
    mesai_ici = sum(1 for k in kayitlar
                    if m_bas <= k[0].hour < m_bit and k[0].weekday() < 5)

    gun_sayisi = len(gunler)
    g_degerler = sorted(gunler.values())
    ort_gun = len(kayitlar) / gun_sayisi
    ortanca = sorted(sureler)[len(sureler) // 2] / 60

    print(f'\n=== CDR OZETI — {args.dosya} ===')
    print(f'Sutunlar: baslangic="{s_bas}"  sure="{s_sure}"'
          + (f'  yon="{s_yon}"' if s_yon else '')
          + (f'  durum="{s_durum}"' if s_durum else ''))
    if atlanan:
        print(f'UYARI: {atlanan} satir okunamadi ve atlandi.')
    print(f'Donem: {kayitlar[0][0]:%d.%m.%Y} – {kayitlar[-1][0]:%d.%m.%Y}'
          f'  ({gun_sayisi} gun)')

    print('\n--- CAGRI HACMI ---')
    print(f'  Toplam cagri            {len(kayitlar):,}')
    print(f'  Gunluk ortalama         {ort_gun:.1f}')
    print(f'  Gunluk en az / en cok   {g_degerler[0]} / {g_degerler[-1]}')

    print('\n--- GORUSME SURESI ---')
    print(f'  Ortalama                {toplam_dk / len(kayitlar):.2f} dk')
    print(f'  Ortanca                 {ortanca:.2f} dk')
    print(f'  En uzun                 {max(sureler) / 60:.2f} dk')
    print(f'  Toplam gercek           {toplam_dk:,.0f} dk')
    print(f'  Toplam faturalanan      {faturalanan_dk:,.0f} dk'
          f'   (+%{(faturalanan_dk / toplam_dk - 1) * 100:.1f} yuvarlama)')

    print('\n--- SAATLIK DAGILIM ---')
    en_cok = max(saatler.values())
    for saat in range(24):
        n = saatler.get(saat, 0)
        cubuk = '#' * round(n / en_cok * 40) if en_cok else ''
        print(f'  {saat:02d}:00  {n:5,}  {cubuk}')

    print('\n--- KAPSAM ---')
    oran = mesai_ici / len(kayitlar) * 100
    print(f'  Mesai ici ({args.mesai}, hafta ici)   {mesai_ici:,}  (%{oran:.1f})')
    print(f'  Mesai disi + hafta sonu              '
          f'{len(kayitlar) - mesai_ici:,}  (%{100 - oran:.1f})')

    tepe = eszamanli_tepe([(k[0].timestamp(), k[0].timestamp() + k[1])
                           for k in kayitlar])
    print(f'\n--- ESZAMANLILIK ---')
    print(f'  En yuksek eszamanli cagri   {tepe}')
    print(f'  Verimor paketindeki kanal   6'
          + ('   YETERLI' if tepe <= 6 else '   YETERSIZ — kanal artirilmali'))

    print('\n--- AYLIK PROJEKSIYON (30 gun) ---')
    ay_cagri = ort_gun * 30
    ay_fat = faturalanan_dk / gun_sayisi * 30
    print(f'  Aylik cagri                 {ay_cagri:,.0f}')
    print(f'  Aylik faturalanan dakika    {ay_fat:,.0f}')
    print('\n  Bu iki sayiyi maliyet modelindeki "En Kotu Senaryo" sayfasina')
    print('  "Gunluk cagri" ve "Ortalama sure" olarak girin.')
    print(f'  Gunluk cagri: {ort_gun:.0f}   Ortalama sure: '
          f'{toplam_dk / len(kayitlar):.2f} dk\n')


if __name__ == '__main__':
    main()
