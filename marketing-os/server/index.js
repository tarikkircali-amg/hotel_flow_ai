// MİZ Marketing OS — giriş noktası.
//   npm install && npm start  →  http://localhost:4000
const path = require('path');
const express = require('express');
const cfg = require('./config');
const { open } = require('./db');
const auth = require('./auth');
const { publish } = require('./events');
const { createClient } = require('./llm');
const { createPipeline } = require('./pipeline');
const { buildRouter } = require('./routes');
const { seedProjects } = require('./seed');

function createApp({ config = cfg, db = open(config.dbFile), client = createClient(config), sleep, log = console.log } = {}) {
  const org = auth.bootstrap(db, config, log);
  seedProjects(db, org.id);
  const pipeline = createPipeline({ db, cfg: config, client, publish, sleep });

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '200kb' }));
  app.use((req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY' });
    next();
  });
  app.use('/api', buildRouter({ db, cfg: config, pipeline }));
  app.use(express.static(path.join(__dirname, '..', 'public')));
  // Beklenmeyen hatalar: kullanıcıya iç ayrıntı sızdırmadan anlaşılır mesaj
  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    log('Beklenmeyen hata:', err);
    res.status(500).json({ error: 'Beklenmeyen bir hata oluştu. Sayfayı yenileyip tekrar deneyin.' });
  });
  return { app, db, pipeline };
}

if (require.main === module) {
  const { app, pipeline } = createApp();
  app.listen(cfg.port, () => {
    console.log(`🏢 MİZ Marketing OS çalışıyor: http://localhost:${cfg.port}`);
    console.log(pipeline.mode === 'ai'
      ? `   AI modu açık (model: ${cfg.model}).`
      : '   Demo modu: ANTHROPIC_API_KEY tanımlı değil, şablon çıktılar üretilecek.');
    const n = pipeline.recover();
    if (n) console.log(`   Yarım kalan ${n} kampanya kuyruğa geri alındı.`);
  });
}

module.exports = { createApp };
