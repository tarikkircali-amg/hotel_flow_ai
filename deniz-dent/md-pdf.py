#!/usr/bin/env python3
# Markdown -> baskiya hazir A4 HTML. PDF'e Chromium ile basilir.
# Kullanim: python3 md-pdf.py <kaynak.md> <hedef.html>
import html, re, sys

kaynak, hedef = sys.argv[1], sys.argv[2]

def satirIci(t):
    t = html.escape(t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'\*([^*\n]+?)\*', r'<em>\1</em>', t)
    return t

govde, i = [], 0
satirlar = open(kaynak, encoding='utf-8').read().split('\n')

def tabloyuKapat(blok):
    # ilk satir baslik, ikinci satir hizalama
    hucreler = [[h.strip() for h in s.strip().strip('|').split('|')] for s in blok]
    basliklar = hucreler[0]
    govdeSatirlari = hucreler[2:] if len(hucreler) > 1 else []
    # Tum basliklar bossa baslik satirini gostermeyiz (iki sutunlu bilgi tablosu)
    basliksiz = all(not h for h in basliklar)
    cik = ['<table class="t">']
    if not basliksiz:
        cik.append('<thead><tr>' + ''.join(f'<th>{satirIci(h)}</th>' for h in basliklar) + '</tr></thead>')
    cik.append('<tbody>')
    for r in govdeSatirlari:
        cik.append('<tr>' + ''.join(f'<td>{satirIci(c)}</td>' for c in r) + '</tr>')
    cik.append('</tbody></table>')
    return '\n'.join(cik)

liste = None
def listeyiKapat():
    global liste
    if liste:
        govde.append(f'</{liste}>')
        liste = None

while i < len(satirlar):
    s = satirlar[i]
    t = s.strip()

    if t.startswith('|'):
        listeyiKapat()
        blok = []
        while i < len(satirlar) and satirlar[i].strip().startswith('|'):
            blok.append(satirlar[i]); i += 1
        govde.append(tabloyuKapat(blok))
        continue

    i += 1

    if not t or t == '---':
        listeyiKapat()
        continue
    if t.startswith('### '):
        listeyiKapat(); govde.append(f'<h3>{satirIci(t[4:])}</h3>'); continue
    if t.startswith('## '):
        listeyiKapat(); govde.append(f'<h2>{satirIci(t[3:])}</h2>'); continue
    if t.startswith('# '):
        listeyiKapat(); govde.append(f'<h1>{satirIci(t[2:])}</h1>'); continue
    m = re.match(r'^[-*]\s+(.*)', t)
    if m:
        if liste != 'ul': listeyiKapat(); govde.append('<ul>'); liste = 'ul'
        govde.append(f'<li>{satirIci(m.group(1))}</li>'); continue
    m = re.match(r'^\d+\.\s+(.*)', t)
    if m:
        if liste != 'ol': listeyiKapat(); govde.append('<ol>'); liste = 'ol'
        govde.append(f'<li>{satirIci(m.group(1))}</li>'); continue
    listeyiKapat()
    govde.append(f'<p>{satirIci(t)}</p>')
listeyiKapat()

CSS = """
:root{ --marka:#0F766E; --koyu:#134E4A; --metin:#1C2631; --soluk:#5A6874;
       --cizgi:#D7E3E1; --zemin:#F0FDFA; }
@page{ size:A4; margin:16mm 15mm 18mm; }
*{ box-sizing:border-box; }
body{ margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
      font-size:10pt; line-height:1.5; color:var(--metin);
      -webkit-print-color-adjust:exact; print-color-adjust:exact; }
h1{ font-size:21pt; color:var(--marka); margin:0 0 4mm; line-height:1.2; letter-spacing:-.3px; }
h2{ font-size:13.5pt; color:var(--marka); margin:7mm 0 3mm; padding-bottom:1.6mm;
    border-bottom:1.6pt solid var(--marka); page-break-after:avoid; }
h3{ font-size:11.3pt; color:var(--koyu); margin:6mm 0 2mm; page-break-after:avoid; }
p{ margin:0 0 3mm; }
ul,ol{ margin:0 0 4mm; padding-left:5.5mm; }
li{ margin-bottom:1.6mm; }
strong{ color:#0B1F1D; }
em{ color:var(--soluk); }
table.t{ width:100%; border-collapse:collapse; margin:0 0 5mm; font-size:9.8pt;
         page-break-inside:avoid; }
table.t th{ background:var(--marka); color:#fff; text-align:left; font-weight:600;
            padding:2.2mm 2.6mm; border:0.6pt solid var(--marka); }
table.t td{ padding:2.2mm 2.6mm; border:0.6pt solid var(--cizgi); vertical-align:top; }
table.t tbody tr:nth-child(even) td{ background:var(--zemin); }
.altbilgi{ margin-top:6mm; padding-top:3mm; border-top:0.8pt solid var(--cizgi);
           font-size:8.6pt; color:var(--soluk); }
"""

open(hedef, 'w', encoding='utf-8').write(
    '<!doctype html><html lang="tr"><head><meta charset="utf-8">'
    '<title>Deniz Dent — Teklif</title><style>' + CSS + '</style></head><body>'
    + '\n'.join(govde)
    + '<div class="altbilgi">MİZ / My İnovatif Zeka · İzmir · '
      'Bu teklif 30 gün geçerlidir ve KDV hariç fiyatlar içerir.</div>'
    + '</body></html>')
print('html yazildi:', hedef)
