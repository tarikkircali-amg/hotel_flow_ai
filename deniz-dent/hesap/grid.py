exec(open('kotu.py').read().split('# ---- GERCEKCI')[0])
SONNET = (2.0, 10.0, 0.20)
def kur(sec, cagri_gun, sure, kur_, tts_bin, tur, sistem, yeni, cikti, verimor, gelen, sunucu, ek):
    if sec == 1: relay, byoc, stt = 0.07, 0.015, 0.0
    else:        relay, byoc, stt = 0.0, 0.0, 0.015
    return senaryo('', cagri_gun, sure, 30, kur_, tts_bin, tts_bin and tts_bin, tur, sistem, yeni, cikti,
                   SONNET, sunucu, verimor, gelen, relay, byoc, stt, ek)
# duzeltme: senaryo imzasi (ad,cagri_gun,sure,gun,kur,karakter,tts_bin,tur,...)
def S(sec, cagri_gun, sure, kur_, karakter, tts_bin, tur, sistem, yeni, cikti, verimor, gelen, sunucu, ek, byoc):
    if sec == 1: relay, stt = 0.07, 0.0
    else:        relay, stt = 0.0, byoc; byoc = 0.0
    if sec == 2: relay = 0.0
    return senaryo('', cagri_gun, sure, 30, kur_, karakter, tts_bin, tur, sistem, yeni, cikti,
                   SONNET, sunucu, verimor, gelen, relay, byoc if sec==1 else 0.0, stt, ek)

VER = (565+899)*1.20
VER_K = (5731+899)*1.20

print("KAPSAM MATRISI - aylik maliyet (TL), bizim maliyetimiz, emek harici\n")
print(f"{'Kapsam':28s} {'S1 beklenen':>13s} {'S1 en kotu':>12s} {'S2 beklenen':>13s} {'S2 en kotu':>12s}")
kapsamlar = [
    ('7/24 tum cagrilar', 1.00),
    ('Mesai disi + hafta sonu', 0.35),
    ('Sadece gece (23-08)', 0.12),
]
for ad, oran in kapsamlar:
    b1 = S(1, 100*oran, 2.5, 50, 1500, 0.05, 6, 2500, 350, 120, VER, 0.0,  40, 0,  0.0)
    k1 = S(1, 200*oran, 3.5, 60, 2100, 0.08,10, 4000, 500, 180, VER_K, 0.20,120, 50, 0.02)
    b2 = S(2, 100*oran, 2.5, 50, 1500, 0.05, 6, 2500, 350, 120, VER, 0.0,  40, 0,  0.010)
    k2 = S(2, 200*oran, 3.5, 60, 2100, 0.08,10, 4000, 500, 180, VER_K, 0.20,120, 50, 0.025)
    print(f"{ad:28s} {b1['toplam']:13,.0f} {k1['toplam']:12,.0f} {b2['toplam']:13,.0f} {k2['toplam']:12,.0f}")

print("\n\nSABIT / DEGISKEN AYRIMI (S1 beklenen, 7/24)")
b = S(1, 100, 2.5, 50, 1500, 0.05, 6, 2500, 350, 120, VER, 0.0, 40, 0, 0.0)
sabit = b['kalem']['verimor'] + b['kalem']['sunucu']
degisken = b['toplam'] - sabit
print(f"  sabit   {sabit:10,.0f} TL/ay")
print(f"  degisken{degisken:10,.0f} TL/ay  -> dakika basi {degisken/b['dk']:.2f} TL")

print("\n\nDAKIKA BASI DEGISKEN MALIYET (TL/dk)")
for ad, s in (('S1 beklenen', b),
              ('S1 en kotu', S(1,200,3.5,60,2100,0.08,10,4000,500,180,VER_K,0.20,120,50,0.02)),
              ('S2 beklenen', S(2,100,2.5,50,1500,0.05,6,2500,350,120,VER,0.0,40,0,0.010)),
              ('S2 en kotu', S(2,200,3.5,60,2100,0.08,10,4000,500,180,VER_K,0.20,120,50,0.025))):
    sb = s['kalem']['verimor'] + s['kalem']['sunucu']
    print(f"  {ad:12s} {(s['toplam']-sb)/s['dk']:6.2f} TL/dk   (sabit {sb:,.0f} TL/ay)")
