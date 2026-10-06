# Twilio'ya Gönderilecek Soru Listesi

**Hazırlayan:** MİZ / My İnovatif Zeka
**Tarih:** 06.10.2026
**Amaç:** Maliyet modelindeki üç boşluğu kapatmak

---

## 0. İÇ NOT — neden soruyoruz, hangisi acil

Üç soru **engelleyici**; bunlar cevaplanmadan kliniğe kesin fiyat verilemez.
Aşağıda `[ENGELLEYİCİ]` ile işaretli.

| # | Soru | Modeldeki etkisi |
|---|---|---|
| A3 | ConversationRelay'in $0,07'si **TTS ve STT'yi kapsıyor mu?** | **11.250 ₺/ay — toplamın %25'i.** Net maliyet 33.029 ₺ mi 44.279 ₺ mi, buna bağlı |
| C2 | **BYOC dakika ücreti** nedir? | Seçenek 1 bunsuz hesaplanamıyor |
| A1 | Türkiye'de sesli numara satıyor musunuz? | Satmıyorsa BYOC tek yol |

Geri kalanlar önemli ama projeyi bekletmiyor.

**Neden A3'ü soruyoruz:** Kodumuz telefon yolunda ElevenLabs'i hiç çağırmıyor.
Twilio'ya yalnızca metin gönderiyoruz (`{type:'text', token}`), seslendirmeyi
Twilio yapıyor (`ttsProvider: ElevenLabs`). Yani bu kalemi ya Twilio $0,07'nin
içinde veriyor ya da ayrıca faturalıyor. Hangisi olduğunu bilmiyoruz ve bu
%25'lik bir fark.

**Kime gönderilecek:** Twilio Sales (kurumsal fiyat için) + Support
(teknik sorular için). İkisine ayrı gitmesi daha hızlı olabilir —
A ve C bölümleri Sales'e, B ve D Support'a.

---

## 1. GÖNDERİLECEK METİN (İngilizce)

> Aşağıdaki bölümü olduğu gibi kopyalayıp gönderebilirsiniz.

---

Subject: ConversationRelay + BYOC pricing and technical questions — Turkish healthcare deployment

Hello,

We are building a 24/7 AI voice assistant for a dental clinic in İzmir, Turkey.
The system is already working on Twilio ConversationRelay: inbound calls are
answered by our own agent, which streams text tokens back over the WebSocket and
lets ConversationRelay handle speech.

We are now finalising our cost model and preparing a fixed quote for the clinic.
A few points are blocking us. Questions marked **[BLOCKER]** are the ones we
cannot price without.

### A. ConversationRelay pricing

**A1. [BLOCKER]** Do you sell **voice-enabled local numbers in Turkey** (+90)?
Our research suggests you do not. Please confirm, because it determines whether
BYOC is our only option.

**A2.** Is the ConversationRelay **$0.07/minute** rate current for 2026, and is
it billed per second or rounded to whole minutes? Our average call is 2.5–3
minutes, so the rounding rule matters to us.

**A3. [BLOCKER]** **What exactly does the $0.07/minute include?**
Specifically:

- Is **TTS** included, or billed separately? We set
  `ttsProvider: "ElevenLabs"` in the ConversationRelay configuration.
  If separate, what is the rate and how is it measured (per character, per
  second of generated audio, per minute)?
- Is **STT** included, or billed separately? If separate, what is the rate?
- Is the **Programmable Voice** leg billed on top of the $0.07, or included?

This single question moves our monthly estimate by about 25%, so we would
appreciate an itemised answer rather than a total.

**A4.** Does the TTS rate differ by provider (e.g. ElevenLabs vs Amazon Polly
vs Google)? If so, please send the per-provider list.

**A5.** Are there **volume discounts** on ConversationRelay? Our expected
volume is roughly **7,500–15,000 minutes/month** from one customer, and we
plan to deploy the same system to further clinics.

**A6.** Is there a **minimum commitment** or monthly platform fee for
ConversationRelay?

### B. ConversationRelay technical

**B1.** Can we play **pre-recorded audio** through ConversationRelay instead of
sending text? Our greeting, our legally required privacy notice, and our
closing sentence are byte-identical on every call. Pre-rendering them once
would cut TTS volume significantly. If this is supported, does it avoid the
TTS charge for those segments?

**B2.** Which **Turkish (tr-TR)** speech-to-text engines are available through
ConversationRelay? Is the engine selectable, and do you publish accuracy
figures for Turkish? Our callers are often in pain, in noisy environments, and
speaking quickly — recognition quality is the single biggest technical risk in
this project.

**B3.** Is **DTMF** (RFC 2833) delivered over the ConversationRelay WebSocket
as a `dtmf` message on BYOC-originated calls? We already handle this message
type: the patient can press a key to hear the privacy notice.

**B4.** How is **barge-in** (caller interrupting the assistant) handled, and is
it configurable? We currently set `interruptible: true` on outgoing text tokens.

**B5.** What is the **concurrency limit** per account, and how do we raise it?
We expect a peak of about 10 simultaneous calls.

**B6.** What is your **SLA** for ConversationRelay, and is there 24/7 technical
support? The clinic's line runs around the clock, so a night-time outage cannot
wait until morning.

### C. BYOC (Bring Your Own Carrier)

We plan to connect a Turkish carrier (Verimor) to Twilio over a SIP trunk and
keep using ConversationRelay.

**C1.** Is this architecture supported — a BYOC trunk feeding
`<Connect><ConversationRelay>`? Your documentation does not state it
explicitly, and we would rather confirm than discover otherwise in production.

**C2. [BLOCKER]** **What is the per-minute charge for inbound calls arriving
over a BYOC trunk?** This figure is missing from our model and we cannot
complete the costing without it.

**C3.** Do you support **G.711 A-law** end to end on BYOC trunks? Because we
run speech-to-text, highly compressed codecs reduce Turkish recognition
accuracy. A-law support is a requirement for us, not a preference.

**C4.** Do you support **SIP TLS** and **SRTP** on BYOC trunks? We are carrying
health-related data and need this for KVKK (the Turkish data protection law)
compliance.

**C5.** Is the **caller ID (CLI)** of the original caller passed through to our
application on BYOC-originated calls? We need the patient's number.

**C6.** Which **IP ranges or FQDNs** should the carrier send traffic to, and do
you have any restriction on carriers in Turkey?

**C7.** Have other customers run **ConversationRelay over BYOC in Turkey**?
If so, are there known issues we should plan around?

### D. Data processing and KVKK

The clinic is a healthcare provider. Under Turkish law (KVKK) patient health
information is a special category of personal data, so we need precise answers
here.

**D1.** **Where is call audio processed** for STT and TTS — which country or
region? Can processing be pinned to a specific region (e.g. EU)?

**D2.** Is call audio **retained** anywhere by Twilio or by the TTS/STT
sub-processor after the call ends? If so, for how long, and can retention be
**switched off entirely**? Our design deliberately **does not record calls** —
we keep only a written transcript.

**D3.** Are **transcripts** retained by Twilio? Same questions as D2.

**D4.** Which **sub-processors** are involved in the ConversationRelay path,
and is there a public list?

**D5.** Can you provide a **Data Processing Agreement** covering health data,
and do you support EU Standard Contractual Clauses?

### E. Commercial

**E1.** Is there a **partner or reseller programme**? We are a software company
deploying this to multiple clinics and would like to understand the structure.

**E2.** Can you issue invoices to a **Turkish company**, and in which currency?

**E3.** Is there **trial credit** available for a production-like test? We need
to measure Turkish recognition accuracy before committing.

Thank you. The three BLOCKER items (A1, A3, C2) are what we need most urgently
— even approximate figures for those would let us move forward.

Best regards,

**MİZ / My İnovatif Zeka**
İzmir, Turkey

---

## 1b. GÖNDERİM DURUMU

| Kanal | Kapsam | Durum |
|---|---|---|
| **Support bileti #29847256** | B (teknik) + D (KVKK veri işleme) | **Açıldı — 06.10.2026 15:09, P3, durum: New** |
| **Sales formu** | A (fiyat) + C (BYOC) | Gönderilecek |

Bilet: `help.twilio.com/tickets/29847256`
Hesap: HOTEL_FLOW_AI · Destek planı: Developer Support (ücretsiz, yanıt
süresi garantisi yok)

**Üç engelleyici sorunun üçü de Sales tarafında** (A1, A3, C2). Bilet
teknik soruları kapsıyor ama maliyet modelini kapatan rakamlar orada değil.

---

## 2. Cevaplar gelince ne yapacağız

| Cevap | Nereye işlenecek |
|---|---|
| A3 — TTS/STT dahil mi | `Deniz-Dent-Maliyet-Modeli.xlsx` → **Birim Maliyetler**, ElevenLabs satırı. Dahilse 0 yazılacak |
| A2 — faturalandırma dilimi | Aynı dosya; 60/60 ise ortalama süre yukarı yuvarlanacak |
| A5 — hacim indirimi | Relay dakika ücreti |
| C2 — BYOC dakikası | **En Kotu Senaryo** sayfası, "Twilio BYOC ($/dk)" satırı (şu an A kademesinde 0 varsayımı duruyor) |
| B1 — hazır ses dosyası | Olumluysa "sabit cümle önbelleği" kaldıracı Seçenek 1'de de kullanılabilir hâle gelir (3.000 ₺/ay) |
| B2 — Türkçe STT | Seçenek 1 ile Seçenek 2 karşılaştırmasının temeli |
| D1–D5 | `uyum/01-bosluk-analizi.md` → H2 (yurt dışı aktarım kaydı). KVKK danışmanına gidecek |

**Not:** C3 (A-law) ve C4 (TLS/SRTP) soruları Verimor'a da sorulmuş durumda.
İki tarafın cevabı uyuşmazsa zincir çalışmaz — ikisini yan yana
değerlendireceğiz.

---

## 3. Cevap gelmezse

Twilio'nun kurumsal olmayan hesaplara dönüş süresi belirsiz. İki hafta içinde
A3 ve C2 gelmezse:

1. **Seçenek 2'ye ağırlık verelim.** Orada Twilio hiç yok; bu soruların
   hiçbiri bizi bağlamıyor.
2. **Kliniğe aralık verelim**, tek sayı değil: "33.000–44.300 ₺ arası,
   tedarikçi cevabına bağlı." Uydurmaktan iyidir.

**MİZ / My İnovatif Zeka**
