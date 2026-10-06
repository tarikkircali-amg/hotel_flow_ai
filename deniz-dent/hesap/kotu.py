# En kotu senaryo maliyet hesabi - Deniz Dent
def claude_maliyet(cagri, tur, sistem, yeni, cikti, p_in, p_out, p_cache, onbellek_calisiyor=True):
    tok_yeni = yeni * tur
    tok_cikti = cikti * tur
    if onbellek_calisiyor:
        tok_yaz = sistem * 1.25
        tok_oku = sistem * (tur - 1)
        return cagri * ((tok_yeni + tok_yaz)/1e6*p_in + tok_oku/1e6*p_cache + tok_cikti/1e6*p_out)
    # onbellek hic tutmazsa: her turda tam sistem metni girdi olarak
    tok_in = (sistem + yeni) * tur
    return cagri * (tok_in/1e6*p_in + tok_cikti/1e6*p_out)

def senaryo(ad, cagri_gun, sure, gun, kur, karakter, tts_bin, tur, sistem, yeni, cikti,
            model, sunucu_usd, verimor_try, gelen_try_dk, relay_usd_dk, byoc_usd_dk,
            stt_usd_dk, ek_usd_ay, onbellek=True):
    cagri = cagri_gun*gun
    dk = cagri*sure
    p_in, p_out, p_cache = model
    usd = {}
    usd['relay'] = dk*relay_usd_dk
    usd['byoc'] = dk*byoc_usd_dk
    usd['stt'] = dk*stt_usd_dk
    usd['tts'] = cagri*karakter/1000*tts_bin
    usd['claude'] = claude_maliyet(cagri, tur, sistem, yeni, cikti, p_in, p_out, p_cache, onbellek)
    usd['sunucu'] = sunucu_usd + ek_usd_ay
    try_ = {k: v*kur for k, v in usd.items()}
    try_['verimor'] = verimor_try
    try_['gelen'] = dk*gelen_try_dk
    toplam = sum(try_.values())
    return dict(ad=ad, cagri=cagri, dk=dk, kalem=try_, toplam=toplam,
                cagri_basi=toplam/cagri, dk_basi=toplam/dk)

OPUS   = (4.0, 20.0, 0.20)
SONNET = (2.0, 10.0, 0.20)

# ---- GERCEKCI (bugunku model, Secenek 1, Verimor gelen ucretsiz) ----
g1 = senaryo('Gercekci - Secenek 1', 100, 2.5, 30, 50, 1500, 0.05, 6, 2500, 350, 120,
             SONNET, 40, (565+899)*1.20, 0.0, 0.07, 0.0, 0.0, 0)
g2 = senaryo('Gercekci - Secenek 2', 100, 2.5, 30, 50, 1500, 0.05, 6, 2500, 350, 120,
             SONNET, 40, (565+899)*1.20, 0.0, 0.0, 0.0, 0.010, 0)

# ---- EN KOTU - Secenek 1 ----
k1 = senaryo('En kotu - Secenek 1', 150, 3.5, 30, 55, 2100, 0.08, 10, 4000, 500, 180,
             OPUS, 120, (5731+899)*1.20, 0.20, 0.07, 0.02, 0.0, 50, onbellek=False)
# ---- EN KOTU - Secenek 2 ----
k2 = senaryo('En kotu - Secenek 2', 150, 3.5, 30, 55, 2100, 0.08, 10, 4000, 500, 180,
             OPUS, 120, (5731+899)*1.20, 0.20, 0.0, 0.0, 0.025, 50, onbellek=False)

for s in (g1, g2, k1, k2):
    print(f"\n=== {s['ad']} ===  cagri/ay={s['cagri']:.0f}  dk/ay={s['dk']:.0f}")
    for k, v in sorted(s['kalem'].items(), key=lambda x: -x[1]):
        print(f"  {k:10s} {v:10,.0f} TL  ({v/s['toplam']*100:4.1f}%)")
    print(f"  {'TOPLAM':10s} {s['toplam']:10,.0f} TL/ay   cagri basi {s['cagri_basi']:.2f} TL   dk basi {s['dk_basi']:.2f} TL")

print("\n\n########## UC KADEME - SECENEK 1 (kod degismiyor) ##########")
A = senaryo('A Beklenen', 100, 2.5, 30, 50, 1500, 0.05, 6, 2500, 350, 120,
            SONNET, 40, (565+899)*1.20, 0.0, 0.07, 0.000, 0.0, 0)
B = senaryo('B Kotu',     150, 3.0, 30, 55, 1800, 0.05, 8, 3000, 400, 140,
            SONNET, 60, (565+899)*1.20, 0.0, 0.07, 0.015, 0.0, 0)
C = senaryo('C En kotu',  200, 3.5, 30, 60, 2100, 0.08, 10, 4000, 500, 180,
            SONNET, 120, (5731+899)*1.20, 0.20, 0.07, 0.020, 0.0, 50)
for s in (A, B, C):
    print(f"\n{s['ad']:12s} cagri/ay={s['cagri']:5.0f} dk/ay={s['dk']:6.0f} TOPLAM={s['toplam']:10,.0f} TL/ay  cagri basi={s['cagri_basi']:6.2f} TL")
    for k, v in sorted(s['kalem'].items(), key=lambda x: -x[1]):
        if v > 0: print(f"    {k:10s} {v:10,.0f} ({v/s['toplam']*100:4.1f}%)")

print("\n\n########## UC KADEME - SECENEK 2 ##########")
A2 = senaryo('A2 Beklenen', 100, 2.5, 30, 50, 1500, 0.05, 6, 2500, 350, 120,
             SONNET, 40, (565+899)*1.20, 0.0, 0.0, 0.0, 0.010, 0)
B2 = senaryo('B2 Kotu',     150, 3.0, 30, 55, 1800, 0.05, 8, 3000, 400, 140,
             SONNET, 60, (565+899)*1.20, 0.0, 0.0, 0.0, 0.015, 25)
C2 = senaryo('C2 En kotu',  200, 3.5, 30, 60, 2100, 0.08, 10, 4000, 500, 180,
             SONNET, 120, (5731+899)*1.20, 0.20, 0.0, 0.0, 0.025, 50)
for s in (A2, B2, C2):
    print(f"{s['ad']:12s} TOPLAM={s['toplam']:10,.0f} TL/ay  cagri basi={s['cagri_basi']:6.2f} TL")

print("\n\n########## INSAN RESEPSIYON 7/24 ##########")
for maas in (30000, 40000, 50000):
    # 7/24 = 168 saat/hafta; 1 kisi 45 saat/hafta yasal; izin+hastalik+bayram payi 1.2
    kisi = 168/45*1.2
    print(f"  isveren maliyeti {maas:,} TL/kisi -> {kisi:.1f} kisi -> {kisi*maas:,.0f} TL/ay")

print("\n\n########## KURULUM (tek seferlik, bizim maliyetimiz) ##########")
for ad, gun, gunluk in (('Secenek 1 beklenen', 8, 4000), ('Secenek 1 en kotu', 15, 4500),
                        ('Secenek 2 beklenen', 24, 4000), ('Secenek 2 en kotu', 36, 4500)):
    print(f"  {ad:22s} {gun:3d} gun x {gunluk:,} = {gun*gunluk:9,.0f} TL")

print("\n\n########## 12 AYLIK SAHIP OLMA MALIYETI (bizim maliyetimiz, Secenek 1) ##########")
emek = 15000
for s in (A, B, C):
    yil = (s['toplam']+emek)*12
    print(f"  {s['ad']:12s} aylik {s['toplam']+emek:9,.0f} -> 12 ay {yil:11,.0f} TL (+ kurulum)")
