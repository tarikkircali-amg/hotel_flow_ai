EMEK = 15000          # aylik bakim/destek emegi (toplam, tum musteriler icin)
MARJ = 0.45           # yazilim+emek uzerine marj
EL   = 0.15           # altyapi uzerine isletme payi (pass-through + %15)

ALTYAPI = {   # TL/ay, bizim maliyetimiz
 ('7/24','S1','beklenen'):44279, ('7/24','S1','enkotu'):212508,
 ('7/24','S2','beklenen'):21779, ('7/24','S2','enkotu'):130608,
 ('mesaidisi','S1','beklenen'):17940, ('mesaidisi','S1','enkotu'):86179,
 ('mesaidisi','S2','beklenen'):10065, ('mesaidisi','S2','enkotu'):57514,
}

print("ONERILEN AYLIK FIYAT - emek kac musteriye bolunuyor?\n")
print(f"{'Kapsam / Secenek':22s}" + "".join(f"{f'{n} musteri':>14s}" for n in (1,3,5)))
for kapsam in ('7/24','mesaidisi'):
    for sec in ('S1','S2'):
        satir = f"{kapsam+' / '+sec:22s}"
        for n in (1,3,5):
            emek = EMEK/n
            altyapi = ALTYAPI[(kapsam,sec,'beklenen')]
            fiyat = emek/(1-MARJ) + altyapi*(1+EL)
            satir += f"{fiyat:14,.0f}"
        print(satir)

print("\n\nTAVAN FIYAT YAPISI (paket + asim) - 3 musteri varsayimi, S1\n")
emek = EMEK/3
for kapsam, dk_paket, altyapi_dk in (('7/24', 7500, 5.40), ('mesaidisi', 2625, 5.40)):
    sabit = 3757
    taban = emek/(1-MARJ) + (sabit + dk_paket*altyapi_dk)*(1+EL)
    asim = altyapi_dk*(1+EL)
    print(f"  {kapsam:12s} paket {dk_paket:,} dk  ->  taban {taban:9,.0f} TL/ay   asim {asim:.2f} TL/dk")
    for carpan in (1.0, 1.5, 2.0, 2.8):
        dk = dk_paket*carpan
        fatura = taban + max(0, dk-dk_paket)*asim
        maliyet = emek + sabit + dk*altyapi_dk
        print(f"      {dk:8,.0f} dk ({carpan:.1f}x) -> fatura {fatura:9,.0f}  maliyet {maliyet:9,.0f}  brut kar {fatura-maliyet:9,.0f} ({(fatura-maliyet)/fatura*100:4.1f}%)")

print("\n\nAYNI YAPI EN KOTU BIRIM MALIYETLE (S1 en kotu: 9,25 TL/dk, sabit 18.156)")
emek = EMEK/3
taban = emek/(1-MARJ) + (3757 + 7500*5.40)*(1+EL)
asim  = 5.40*1.15
for carpan in (1.0, 1.5, 2.0, 2.8):
    dk = 7500*carpan
    fatura = taban + max(0, dk-7500)*asim
    maliyet = emek + 18156 + dk*9.25
    print(f"      {dk:8,.0f} dk -> fatura {fatura:9,.0f}  maliyet {maliyet:9,.0f}  brut kar {fatura-maliyet:9,.0f}")
