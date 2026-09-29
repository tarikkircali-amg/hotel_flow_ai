#!/bin/bash
# Teklif HTML -> PDF (headless Chromium ile A4 baskı)
set -e
cd "$(dirname "$0")"
CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
OUT="Deniz-Dent-AI-Klinik-Asistani-Teklif.pdf"

"$CHROME" --headless --disable-gpu --no-sandbox --disable-dev-shm-usage \
  --no-pdf-header-footer --virtual-time-budget=6000 \
  --print-to-pdf="$OUT" "file://$PWD/teklif.html" 2>/dev/null

python3 - <<'PY'
import pymupdf
d = pymupdf.open("Deniz-Dent-AI-Klinik-Asistani-Teklif.pdf")
print("Sayfa sayisi:", d.page_count)
for i, p in enumerate(d):
    t = p.get_text().strip()
    head = " | ".join(t.split("\n")[:2])[:70]
    print(f"{i+1:2d}: {len(t):5d} krk  {head}")
d[0].get_pixmap(dpi=105).save("/tmp/claude-0/-home-user-hotel-flow-ai/dcaf9501-2983-5416-a75a-e16c81584ed4/scratchpad/p1.png")
d[7].get_pixmap(dpi=105).save("/tmp/claude-0/-home-user-hotel-flow-ai/dcaf9501-2983-5416-a75a-e16c81584ed4/scratchpad/p8.png")
PY
