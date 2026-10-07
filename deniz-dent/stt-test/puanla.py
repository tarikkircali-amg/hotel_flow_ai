#!/usr/bin/env python3
"""Turkce STT saglayici degerlendirmesi.

cumleler.json'daki referans cumlelerle saglayicinin dokumunu karsilastirir.

Kelime hata orani (WER) tek basina yaniltici: "salı" yerine "sarı" yazan bir
saglayici %96 dogruluk gosterir ama randevuyu yanlis gune yazar. Bu yuzden
asil olcut KRITIK ALAN basarisi ve ACIL YAKALAMA oranidir.

Kullanim:
    python3 puanla.py dokum-saglayiciA.json
    python3 puanla.py dokum.json --ad "Google STT"

Dokum bicimi — iki secenekten biri:
    {"acil-01": "dişim kırıldı ve kanama...", ...}
    veya her satiri "id<TAB>dokum" olan bir .tsv
"""

import argparse, json, re, sys, unicodedata
from collections import defaultdict


def normalize(metin):
    """src/klinik.js icindeki normalize ile ayni davranir.

    Turkce harfler lower() ONCESINDE cevriliyor: Python'da 'İ'.lower()
    'i' + birlesen nokta (U+0307) uretiyor, nokta sonra temizlenince
    "implant" yerine "i mplant" kaliyordu.
    """
    m = str(metin or '')
    for a, b in (('İ','i'),('I','i'),('ı','i'),('Ş','s'),('ş','s'),('Ğ','g'),
                 ('ğ','g'),('Ü','u'),('ü','u'),('Ö','o'),('ö','o'),
                 ('Ç','c'),('ç','c')):
        m = m.replace(a, b)
    m = m.lower()
    # Kalan birlesen isaretleri (ornegin disaridan gelen dokumlerde) at.
    m = ''.join(k for k in unicodedata.normalize('NFD', m)
                if not unicodedata.combining(k))
    m = re.sub(r'[^a-z0-9\s]', ' ', m)
    return re.sub(r'\s+', ' ', m).strip()


SAYILAR = {
    'sifir':'0','bir':'1','iki':'2','uc':'3','dort':'4','bes':'5','alti':'6',
    'yedi':'7','sekiz':'8','dokuz':'9','on':'10','yirmi':'20','otuz':'30',
    'kirk':'40','elli':'50','altmis':'60','yetmis':'70','seksen':'80',
    'doksan':'90','yuz':'100',
}


def rakamlastir(metin):
    """'on dort' ve '14' ayni sayilsin diye sayi sozcuklerini rakama cevirir."""
    return ' '.join(SAYILAR.get(k, k) for k in normalize(metin).split())


def wer(referans, dokum):
    """Levenshtein tabanli kelime hata orani."""
    r, d = normalize(referans).split(), normalize(dokum).split()
    if not r:
        return 0.0 if not d else 1.0
    onceki = list(range(len(d) + 1))
    for i, rk in enumerate(r, 1):
        simdi = [i]
        for j, dk in enumerate(d, 1):
            simdi.append(min(onceki[j] + 1, simdi[j-1] + 1,
                             onceki[j-1] + (rk != dk)))
        onceki = simdi
    return onceki[-1] / len(r)


def gecer_mi(beklenen, dokum):
    """Beklenen ifade(ler) dokumde var mi?

    Turkce ekli bir dil oldugu icin eslesme GOVDE ONEKI ile yapilir:
    beklenen "ertele" ise dokumdeki "erteleyin" kabul edilir. Boylece
    sette her cekimi tek tek yazmak gerekmiyor.
    """
    kelimeler = normalize(dokum).split()
    for ham in (beklenen if isinstance(beklenen, list) else [beklenen]):
        govde = normalize(ham)
        if not govde:
            continue
        if ' ' in govde:                      # cok kelimeli ifade: oldugu gibi
            if govde in normalize(dokum):
                continue
            return False, ham
        if any(k.startswith(govde) for k in kelimeler):
            continue
        return False, ham
    return True, None


def main():
    a = argparse.ArgumentParser()
    a.add_argument('dokum')
    a.add_argument('--ad', default=None, help='Saglayici adi (raporda gorunur)')
    a.add_argument('--set', default='cumleler.json')
    a.add_argument('--ayrinti', action='store_true', help='Her cumleyi tek tek goster')
    args = a.parse_args()

    veri = json.load(open(args.set, encoding='utf-8'))
    cumleler = {c['id']: c for c in veri['cumleler']}

    ham = open(args.dokum, encoding='utf-8').read()
    if args.dokum.endswith('.tsv') or not ham.lstrip().startswith('{'):
        dokumler = {}
        for satir in ham.splitlines():
            if '\t' in satir:
                i, d = satir.split('\t', 1)
                dokumler[i.strip()] = d.strip()
    else:
        dokumler = json.load(open(args.dokum, encoding='utf-8'))

    eksik = [i for i in cumleler if i not in dokumler]
    fazla = [i for i in dokumler if i not in cumleler]

    ad = args.ad or args.dokum
    print(f'\n{"="*62}\n  STT DEGERLENDIRMESI — {ad}\n{"="*62}')
    print(f'  Set: {args.set} (surum {veri.get("_surum","?")}), '
          f'{len(cumleler)} cumle')
    if eksik:
        print(f'  UYARI: {len(eksik)} cumlenin dokumu yok: {", ".join(eksik[:5])}'
              + (' ...' if len(eksik) > 5 else ''))
    if fazla:
        print(f'  UYARI: sette olmayan {len(fazla)} id atlandi.')

    kat_wer, kat_n = defaultdict(float), defaultdict(int)
    alan_toplam = alan_gecen = 0
    acil_toplam = acil_gecen = 0
    kaciranlar, alan_hatalari = [], []

    for i, c in cumleler.items():
        if i not in dokumler:
            continue
        d = dokumler[i]
        h = wer(c['metin'], d)
        kat_wer[c['kategori']] += h
        kat_n[c['kategori']] += 1

        for alan, beklenen in (c.get('kritik') or {}).items():
            tamam, kayip = gecer_mi(beklenen, d)
            if alan == 'acil_tetikleyici':
                # Acilde TEK bir tetikleyicinin hayatta kalmasi yeterli:
                # acil.js herhangi bir anahtar kelimeyi gorunce devreye giriyor.
                acil_toplam += 1
                liste = beklenen if isinstance(beklenen, list) else [beklenen]
                if any(gecer_mi(x, d)[0] for x in liste):
                    acil_gecen += 1
                else:
                    kaciranlar.append((i, c['metin'], d))
                continue
            alan_toplam += 1
            if tamam:
                alan_gecen += 1
            else:
                alan_hatalari.append((i, alan, kayip, d))

        if args.ayrinti:
            print(f'\n  [{i}] WER %{h*100:.1f}')
            print(f'      ref: {c["metin"]}')
            print(f'      dok: {d}')

    toplam_wer = sum(kat_wer.values()) / max(1, sum(kat_n.values()))

    print(f'\n--- KELIME HATA ORANI (dusuk iyi) ---')
    for kat in sorted(kat_wer, key=lambda k: -kat_wer[k]/kat_n[k]):
        print(f'  {kat:10s} %{kat_wer[kat]/kat_n[kat]*100:5.1f}   ({kat_n[kat]} cumle)')
    print(f'  {"GENEL":10s} %{toplam_wer*100:5.1f}')

    print(f'\n--- KRITIK ALANLAR (tarih, saat, isim, tedavi, numara) ---')
    if alan_toplam:
        print(f'  Dogru: {alan_gecen}/{alan_toplam}  (%{alan_gecen/alan_toplam*100:.1f})')
    for i, alan, kayip, d in alan_hatalari:
        print(f'    [{i}] "{alan}" bulunamadi (beklenen: {kayip})')
        print(f'         dokum: {d}')

    print(f'\n--- ACIL YAKALAMA (en kritik olcut) ---')
    if acil_toplam:
        oran = acil_gecen / acil_toplam * 100
        print(f'  Yakalanan: {acil_gecen}/{acil_toplam}  (%{oran:.1f})')
        for i, ref, d in kaciranlar:
            print(f'    KACIRILDI [{i}]')
            print(f'      ref: {ref}')
            print(f'      dok: {d}')

    print(f'\n--- KARAR ---')
    sorunlar = []
    if acil_toplam and acil_gecen < acil_toplam:
        sorunlar.append(f'{acil_toplam - acil_gecen} acil cumle kacirildi')
    if alan_toplam and alan_gecen / alan_toplam < 0.90:
        sorunlar.append(f'kritik alan basarisi %{alan_gecen/alan_toplam*100:.0f} (<%90)')
    if toplam_wer > 0.15:
        sorunlar.append(f'WER %{toplam_wer*100:.0f} (>%15)')

    if sorunlar:
        print('  KULLANILAMAZ — ' + '; '.join(sorunlar))
    else:
        print('  Esikleri geciyor. Gecikme ve fiyatla birlikte degerlendirin.')
    print('''
  Esikler:
    Acil yakalama      %100 olmali. Tek kacirma elenme sebebidir.
    Kritik alan        >= %90
    WER                <= %15

  Gerekce: acil bir cumleyi kacirmak klinik sorumluluk doğurur; birkac
  kurusluk dakika farki bunu telafi etmez. Tarih/saat hatasi ise hastayi
  yanlis gun getirir ve guveni bitirir.
''')


if __name__ == '__main__':
    main()
