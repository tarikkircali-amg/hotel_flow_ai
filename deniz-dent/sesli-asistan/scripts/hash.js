'use strict';

// Panel parolasi icin bcrypt hash uretir.
// Kullanim:  node scripts/hash.js 'parolaniz'
//
// Cikan degeri .env icindeki PANEL_PAROLA_HASH alanina yazin.
// Parolanin kendisi hicbir yere kaydedilmez.

const bcrypt = require('bcryptjs');

const parola = process.argv[2];
if (!parola) {
  console.error("Kullanim: node scripts/hash.js 'parolaniz'");
  process.exit(1);
}
if (parola.length < 10) {
  console.error('Parola en az 10 karakter olmali.');
  process.exit(1);
}

console.log(bcrypt.hashSync(parola, 12));
