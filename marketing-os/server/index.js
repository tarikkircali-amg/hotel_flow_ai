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
const { seedProjects, seedBrand } = require('./seed');
const { buildReleaseRouter } = require('./release');
const { buildStudioRouter } = require('./studio');
const { buildMetricsRouter } = require('./metrics');

function createApp({ config = cfg, db = open(config.dbFile), client = createClient(config), sleep, log = console.log, fetchImpl, lookup } = {}) {
  const org = auth.bootstrap(db, config, log);
  seedProjects(db, org.id, log);
  seedBrand(db, org.id);
  const pipeline = createPipeline({ db, cfg: config, client, publish, sleep });

  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', Number(config.trustProxy) || config.trustProxy);
  app.use(express.json({ limit: '1mb' }));
  app.use((req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY' });
    next();
  });
  app.use('/api', buildRouter({ db, cfg: config, pipeline }));
  app.use('/api', buildReleaseRouter({ db, cfg: config, fetchImpl }));
  app.use('/api', buildStudioRouter({ db, cfg: config, client, fetchImpl, lookup }));
  app.use('/api', buildMetricsRouter({ db, cfg: config, pipeline }));
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
    if (process.env.NODE_ENV === 'production' && path.resolve(cfg.dbFile).startsWith(path.resolve(__dirname, '..'))) {
      console.warn('⚠️  Veritabanı uygulama klasörünün içinde. Barındırıcı yeniden dağıtımda bu klasörü silebilir;');
      console.warn('   MOS_DB_FILE ile uygulama dışında kalıcı bir yol verin (ör. ~/domains/<alan-adı>/mos-data/marketing-os.db).');
    }
    const n = pipeline.recover();
    if (n) console.log(`   Yarım kalan ${n} kampanya kuyruğa geri alındı.`);
  });
}

module.exports = { createApp };
