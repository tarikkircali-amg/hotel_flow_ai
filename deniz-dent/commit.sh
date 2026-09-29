#!/bin/bash
set -e
cd /home/user/hotel_flow_ai
git checkout claude/eloquent-einstein-b3fus0 2>/dev/null || git checkout -b claude/eloquent-einstein-b3fus0
git add deniz-dent
git status --short
git -c user.name="Tarık Kırcalı" -c user.email="tarikkircali@gmail.com" commit -F - <<'MSG'
Deniz Dent AI klinik asistanı: rakip analizi, fizibilite ve teklif

29.09 yüz yüze demo sonrası Deniz Dent Diş Polikliniği (Karşıyaka) için
hazırlanan teklif paketi.

- 01-rakip-analizi.md: Türkiye pazarındaki 5 oyuncunun (ClinicFlow,
  AgentFix, AI Calls, AsIsta, AiTakvim) doğrulanmış özellik ve fiyat
  karşılaştırması, eleme tablosu ve konumlandırma
- 02-fizibilite-mimari.md: hedef mimari, hazır/yeni yazılacak envanteri,
  hekim atama motoru, fiyat yönetişimi, KVKK yükümlülükleri, 16 haftalık
  gerçekçi takvim. LinkedIn ve X kanallarının neden kapsam dışı olduğu
  gerekçeleriyle yazılı.
- 03-teklif-fiyat-mantigi.md: iç doküman — kurulum/aylık/aşım fiyat
  mantığı, pilot takası, marj kontrolü, pazarlık sınırları
- teklif.html + Deniz-Dent-AI-Klinik-Asistani-Teklif.pdf: müşteriye
  sunulacak 11 sayfalık teklif ve yol haritası
- render.sh: HTML'den PDF üretimi

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_0149teNF1LWQwdFzSiSxHK2B
MSG
echo "--- commit ok ---"
git log --oneline -3
