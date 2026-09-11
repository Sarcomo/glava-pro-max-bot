require('./setupCerts').setupRussianCaCerts();
require('dotenv').config();

const config = require('./config');
const { createApp } = require('./app');
const { getMe } = require('./maxApi');
const { warmupStubEstimatePdf } = require('./services/media');

async function main() {
  const app = createApp();

  app.listen(config.port, async () => {
    console.log(`Glava Pro MAX bot listening on port ${config.port}`);
    console.log(`Webhook path: POST /webhook`);
    console.log(`Health check: GET /health`);
    if (config.miniAppUrl) {
      console.log(`Mini-app URL: ${config.miniAppUrl}`);
      console.log('Подключите мини-приложение в кабинете MAX → Чат-боты → Расширенные настройки → URL → кнопка «Открыть»');
    }

    try {
      const me = await getMe();
      console.log(`Bot connected: ${me.first_name || me.name || me.username || 'OK'}`);
      warmupStubEstimatePdf();
    } catch (err) {
      console.error('Failed to verify bot token:', err.message);
      if (err.body?.code === 'verify.token') {
        console.error('Токен недействителен. Получите новый в MAX: Чат-боты → Настроить → Токен');
      } else {
        console.error('Проверьте MAX_BOT_TOKEN в .env');
      }
    }
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
