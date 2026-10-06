'use strict';

// Markdown -> Word belgesi. Kullanim:
//   node word-uret.js <kaynak.md> <hedef.docx> "<belge basligi>"

const fs = require('node:fs');
const path = require('node:path');
const d = require('docx');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, LevelFormat,
} = d;

const KAYNAK = path.resolve(process.argv[2]);
const HEDEF = path.resolve(process.argv[3]);
const BASLIK = process.argv[4] || path.basename(HEDEF, '.docx');
if (!process.argv[2] || !process.argv[3]) {
  console.error('kullanim: node word-uret.js <kaynak.md> <hedef.docx> "<baslik>"');
  process.exit(1);
}

const MARKA = '0F766E';   // teal
const KOYU = '134E4A';
const KUTU = 'F0FDFA';    // acik teal - doldurulacak alanlar
const ALINTI = 'FEF3C7';  // acik amber - "neden soruyoruz" notlari

const SAYFA_GENISLIK = 9360; // 12240 - 2*1440 kenar bosluk

/** **kalin** ve *egik* isaretlerini TextRun dizisine cevirir. */
function metin(ham, ek = {}) {
  const parcalar = [];
  // Once kalin denenir; aksi halde '**x**' icindeki ilk yildiz cifti
  // egik olarak yakalanirdi.
  const re = /\*\*(.+?)\*\*|\*([^*\n]+?)\*/g;
  let son = 0, m;
  while ((m = re.exec(ham)) !== null) {
    if (m.index > son) parcalar.push(new TextRun({ text: ham.slice(son, m.index), ...ek }));
    if (m[1] !== undefined) parcalar.push(new TextRun({ text: m[1], bold: true, ...ek }));
    else parcalar.push(new TextRun({ text: m[2], italics: true, ...ek }));
    son = m.index + m[0].length;
  }
  if (son < ham.length) parcalar.push(new TextRun({ text: ham.slice(son), ...ek }));
  return parcalar.length ? parcalar : [new TextRun({ text: '', ...ek })];
}

/** Doldurulacak alan: acik zeminli, cerceveli tek hucreli tablo. */
function kutu(satirlar, zemin = KUTU) {
  return new Table({
    columnWidths: [SAYFA_GENISLIK],
    width: { size: SAYFA_GENISLIK, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: SAYFA_GENISLIK, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: zemin },
            margins: { top: 120, bottom: 120, left: 180, right: 180 },
            children: satirlar.map(
              (l) =>
                new Paragraph({
                  spacing: { after: 40, line: 300 },
                  children: [
                    new TextRun({ text: l || ' ', font: 'Consolas', size: 20, color: KOYU }),
                  ],
                })
            ),
          }),
        ],
      }),
    ],
  });
}

function tablo(satirlar) {
  const hucreler = satirlar.map((s) =>
    s.split('|').slice(1, -1).map((h) => h.trim())
  );
  const basliklar = hucreler[0];
  const govde = hucreler.slice(2); // ayirici satiri atla
  const n = basliklar.length;
  const g = Math.floor(SAYFA_GENISLIK / n);
  const genislikler = Array(n).fill(g);
  genislikler[n - 1] = SAYFA_GENISLIK - g * (n - 1);

  const satirYap = (degerler, baslik) =>
    new TableRow({
      children: degerler.map(
        (v, i) =>
          new TableCell({
            width: { size: genislikler[i], type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: baslik ? MARKA : 'FFFFFF' },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: metin(v, {
                  size: 20,
                  bold: baslik,
                  color: baslik ? 'FFFFFF' : '1F2937',
                }),
              }),
            ],
          })
      ),
    });

  return new Table({
    columnWidths: genislikler,
    width: { size: SAYFA_GENISLIK, type: WidthType.DXA },
    rows: [satirYap(basliklar, true), ...govde.map((r) => satirYap(r, false))],
  });
}

// ------------------------------------------------------------- donusum

// Markdown 76 karakterde elle kaydirilmis. Her satiri ayri paragraf yapmak
// Word'de cumleleri ortadan boler ve satira yayilan **kalin** isaretleri
// metinde gorunur birakir. Once duz metin satirlarini birlestiriyoruz.
function satirlariBirlestir(satirlar) {
  const cikti = [];
  let tampon = [];
  let kodIcinde = false;

  const bosalt = () => {
    if (tampon.length) cikti.push(tampon.join(' '));
    tampon = [];
  };

  for (const satir of satirlar) {
    const t = satir.trim();

    if (t.startsWith('```')) {
      bosalt();
      kodIcinde = !kodIcinde;
      cikti.push(satir);
      continue;
    }
    if (kodIcinde) {
      cikti.push(satir); // kod bloklarina dokunmuyoruz
      continue;
    }

    // Yapisal satirlar kendi baslarina durur.
    if (!t || t.startsWith('#') || t.startsWith('|') || t === '---') {
      bosalt();
      cikti.push(satir);
      continue;
    }
    // Alinti satirlari: ayni alintinin devami ise BIRLESTIRILIR. Aksi halde
    // satira yayilan **kalin** isaretleri ayri paragraflarda kalip metinde
    // gorunur hale geliyor.
    if (t.startsWith('>')) {
      const govdeMetni = t.replace(/^>\s?/, '');
      const oncekiAlinti = tampon.length && tampon[0].trim().startsWith('>');
      if (!govdeMetni) {
        // "> " tek basina: alinti icinde paragraf ayraci
        bosalt();
        tampon.push('>');
        bosalt();
        continue;
      }
      if (oncekiAlinti) tampon.push(govdeMetni);
      else {
        bosalt();
        tampon.push(satir);
      }
      continue;
    }

    // Madde ve numarali satirlar kendi baslangicini yapar.
    if (/^([-*]\s|\d+\.\s)/.test(t)) {
      bosalt();
      tampon.push(satir);
      continue;
    }
    // Devam satiri: alinti ise alintinin isaretini koru.
    if (tampon.length && tampon[0].trim().startsWith('>')) {
      tampon.push(satir.replace(/^\s*>?\s?/, ''));
      continue;
    }
    tampon.push(t);
  }
  bosalt();
  return cikti;
}

const ham = satirlariBirlestir(fs.readFileSync(KAYNAK, 'utf8').split(/\r?\n/));
const icerik = [];
let i = 0;

while (i < ham.length) {
  const satir = ham[i];

  // kod bloklari -> doldurulacak alan
  if (satir.trim().startsWith('```')) {
    const ic = [];
    i += 1;
    while (i < ham.length && !ham[i].trim().startsWith('```')) ic.push(ham[i]), (i += 1);
    i += 1;
    icerik.push(kutu(ic));
    icerik.push(new Paragraph({ spacing: { after: 160 }, children: [] }));
    continue;
  }

  // tablolar
  if (satir.trim().startsWith('|')) {
    const t = [];
    while (i < ham.length && ham[i].trim().startsWith('|')) t.push(ham[i]), (i += 1);
    icerik.push(tablo(t));
    icerik.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
    continue;
  }

  // alintilar -> vurgulu kutu
  if (satir.trim().startsWith('>')) {
    const paragraflar = [];
    while (i < ham.length && ham[i].trim().startsWith('>')) {
      const p = ham[i].replace(/^\s*>\s?/, '').trim();
      if (p) paragraflar.push(p);
      i += 1;
    }
    icerik.push(
      new Table({
        columnWidths: [SAYFA_GENISLIK],
        width: { size: SAYFA_GENISLIK, type: WidthType.DXA },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: SAYFA_GENISLIK, type: WidthType.DXA },
                shading: { type: ShadingType.CLEAR, fill: ALINTI },
                margins: { top: 140, bottom: 140, left: 200, right: 200 },
                children: paragraflar.map(
                  (p) =>
                    new Paragraph({
                      spacing: { after: 100, line: 300 },
                      children: metin(p, { size: 20, color: '451A03' }),
                    })
                ),
              }),
            ],
          }),
        ],
      })
    );
    icerik.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
    continue;
  }

  i += 1;

  if (!satir.trim()) continue;

  if (satir.startsWith('### ')) {
    icerik.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 280, after: 120 },
        children: metin(satir.slice(4), { bold: true, size: 24, color: KOYU }),
      })
    );
    continue;
  }
  if (satir.startsWith('## ')) {
    icerik.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 160 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: MARKA, space: 6 } },
        children: metin(satir.slice(3), { bold: true, size: 30, color: MARKA }),
      })
    );
    continue;
  }
  if (satir.startsWith('# ')) {
    icerik.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
        children: metin(satir.slice(2), { bold: true, size: 40, color: MARKA }),
      })
    );
    continue;
  }

  if (satir.trim() === '---') continue; // basliklarin cizgisi zaten var

  if (/^\s*[-*]\s+/.test(satir)) {
    icerik.push(
      new Paragraph({
        numbering: { reference: 'madde', level: 0 },
        spacing: { after: 80, line: 300 },
        children: metin(satir.replace(/^\s*[-*]\s+/, ''), { size: 22 }),
      })
    );
    continue;
  }

  if (/^\s*\d+\.\s+/.test(satir)) {
    icerik.push(
      new Paragraph({
        numbering: { reference: 'sayili', level: 0 },
        spacing: { after: 80, line: 300 },
        children: metin(satir.replace(/^\s*\d+\.\s+/, ''), { size: 22 }),
      })
    );
    continue;
  }

  icerik.push(
    new Paragraph({
      spacing: { after: 140, line: 320 },
      children: metin(satir, { size: 22 }),
    })
  );
}

const belge = new Document({
  creator: 'MİZ / My İnovatif Zeka',
  title: BASLIK,
  numbering: {
    config: [
      {
        reference: 'madde',
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: '•',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 460, hanging: 260 } } },
          },
        ],
      },
      {
        reference: 'sayili',
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: '%1.',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 460, hanging: 260 } } },
          },
        ],
      },
    ],
  },
  styles: {
    default: {
      document: { run: { font: 'Calibri', size: 22, color: '1F2937' } },
    },
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        },
      },
      children: icerik,
    },
  ],
});

Packer.toBuffer(belge).then((b) => {
  fs.mkdirSync(path.dirname(HEDEF), { recursive: true });
  fs.writeFileSync(HEDEF, b);
  console.log(`yazildi: ${HEDEF} (${(b.length / 1024).toFixed(0)} KB, ${icerik.length} ogе)`);
});
