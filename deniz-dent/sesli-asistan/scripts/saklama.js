'use strict';

// SAKLAMA MOTORU - spesifikasyon §12
//
//   node scripts/saklama.js            KURU CALISMA (varsayilan, hicbir sey silmez)
//   node scripts/saklama.js --uygula   gercekten siler
//
// Tasarim kararlari:
//   * Varsayilan kuru calisma. Yanlislikla veri silen bir betik, hic
//     olmayan bir betikten kotudur.
//   * Sureler kodda YOK. saklama_politikalari tablosundan okunur ve
//     yalnizca aktif=true VE onaylayan dolu satirlar uygulanir.
//   * Onaysiz politika sessizce atlanmaz - ekrana yazilir.
//   * Silinen saglik icerigi denetim kaydina KOPYALANMAZ; sadece
//     kac satirin etkilendigi yazilir.

require('dotenv').config({ override: true });
const { Pool } = require('pg');

const UYGULA = process.argv.includes('--uygula');

const yesil = (s) => `\x1b[32m${s}\x1b[0m`;
const kirmizi = (s) => `\x1b[31m${s}\x1b[0m`;
const sari = (s) => `\x1b[33m${s}\x1b[0m`;

/**
 * Her veri kategorisi icin sayma ve silme sorgulari.
 * $1 = saklama_gun. Sorgular parametreli - string birlestirme yok.
 */
const KATEGORILER = {
  gorusme_dokumu: {
    say: `SELECT count(*)::int AS n FROM mesajlar m JOIN aramalar a ON a.id = m.arama_id
          WHERE a.baslangic < now() - ($1 || ' days')::interval`,
    sil: `DELETE FROM mesajlar m USING aramalar a
          WHERE m.arama_id = a.id AND a.baslangic < now() - ($1 || ' days')::interval`,
  },
  arama_kaydi: {
    say: `SELECT count(*)::int AS n FROM aramalar WHERE baslangic < now() - ($1 || ' days')::interval`,
    sil: `DELETE FROM aramalar WHERE baslangic < now() - ($1 || ' days')::interval`,
  },
  acil_olay: {
    say: `SELECT count(*)::int AS n FROM acil_olaylar WHERE olusturma < now() - ($1 || ' days')::interval`,
    sil: `DELETE FROM acil_olaylar WHERE olusturma < now() - ($1 || ' days')::interval`,
  },
  randevu_talebi: {
    say: `SELECT count(*)::int AS n FROM randevu_talepleri WHERE olusturma < now() - ($1 || ' days')::interval`,
    sil: `DELETE FROM randevu_talepleri WHERE olusturma < now() - ($1 || ' days')::interval`,
  },
  denetim: {
    say: `SELECT count(*)::int AS n FROM denetim WHERE olusturma < now() - ($1 || ' days')::interval`,
    sil: `DELETE FROM denetim WHERE olusturma < now() - ($1 || ' days')::interval`,
  },
};

/** Sureye bagli olmayan, her calismada guvenle temizlenebilecek olanlar. */
const RUTIN = [
  { ad: 'suresi dolmus oturumlar', sql: 'DELETE FROM oturumlar WHERE gecerlilik < now()' },
  {
    ad: 'eski aktarim niyetleri',
    sql: "DELETE FROM aktarim_niyetleri WHERE olusturma < now() - INTERVAL '1 hour'",
  },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(kirmizi('DATABASE_URL tanimli degil.'));
    process.exitCode = 1;
    return;
  }

  const havuz = new Pool({
    connectionString: url,
    ssl: String(process.env.DB_SSL).toLowerCase() === 'true' ? { rejectUnauthorized: false } : false,
  });

  console.log('');
  console.log(UYGULA ? kirmizi('  SAKLAMA MOTORU - UYGULAMA MODU') : yesil('  SAKLAMA MOTORU - KURU CALISMA'));
  console.log(UYGULA ? kirmizi('  Veri SILINECEK.') : '  Hicbir sey silinmez, sadece raporlanir.');
  console.log('');

  try {
    const { rows: politikalar } = await havuz.query(
      'SELECT * FROM saklama_politikalari ORDER BY veri_kategorisi'
    );

    if (!politikalar.length) {
      console.log(sari('  Tanimli saklama politikasi yok.'));
      console.log(sari('  Sureler hukuki karardir; kod uydurmaz. KVKK sorumlunuzla'));
      console.log(sari('  belirleyip saklama_politikalari tablosuna yazin.'));
      console.log('');
      return;
    }

    for (const p of politikalar) {
      const kategori = KATEGORILER[p.veri_kategorisi];

      if (!kategori) {
        console.log(`  ${sari('ATLANDI')} ${p.veri_kategorisi} - tanimsiz kategori`);
        continue;
      }
      if (!p.aktif || !p.onaylayan) {
        console.log(
          `  ${sari('ATLANDI')} ${p.veri_kategorisi} - ${!p.onaylayan ? 'ONAYLAYAN YOK' : 'aktif degil'}`
        );
        continue;
      }
      if (p.eylem !== 'sil') {
        console.log(`  ${sari('ATLANDI')} ${p.veri_kategorisi} - eylem "${p.eylem}" henuz desteklenmiyor`);
        continue;
      }

      const { rows } = await havuz.query(kategori.say, [String(p.saklama_gun)]);
      const adet = rows[0]?.n ?? 0;

      if (adet === 0) {
        console.log(`  ${yesil('TEMIZ')}   ${p.veri_kategorisi} (${p.saklama_gun} gun)`);
        continue;
      }

      if (!UYGULA) {
        console.log(`  ${sari('SILINECEK')} ${p.veri_kategorisi}: ${adet} satir (${p.saklama_gun} gun)`);
        continue;
      }

      const sonuc = await havuz.query(kategori.sil, [String(p.saklama_gun)]);
      console.log(`  ${kirmizi('SILINDI')} ${p.veri_kategorisi}: ${sonuc.rowCount} satir`);

      await havuz.query(
        `INSERT INTO saklama_calismalari (politika_id, kategori, etkilenen, kuru_calisma)
         VALUES ($1, $2, $3, false)`,
        [p.id, p.veri_kategorisi, sonuc.rowCount]
      );
    }

    console.log('');
    for (const r of RUTIN) {
      if (!UYGULA) {
        console.log(`  ${sari('(kuru)')}  ${r.ad}`);
        continue;
      }
      const s = await havuz.query(r.sql);
      console.log(`  ${yesil('temizlendi')} ${r.ad}: ${s.rowCount}`);
    }

    console.log('');
    if (!UYGULA) console.log(sari('  Gercekten silmek icin: node scripts/saklama.js --uygula'));
    console.log('');
  } catch (err) {
    console.error(kirmizi(`  Hata: ${err.message}`));
    process.exitCode = 1;
  } finally {
    await havuz.end();
  }
}

main();
