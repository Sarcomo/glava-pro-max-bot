require('../src/setupCerts').setupRussianCaCerts();
require('dotenv').config();
const config = require('../src/config');
const { replaceWebhook, getMe } = require('../src/maxApi');

async function main() {
  const url = process.env.WEBHOOK_URL || config.webhookUrl;
  const secret = process.env.MAX_WEBHOOK_SECRET;

  if (!url) {
    console.error('Set WEBHOOK_URL in .env (HTTPS, e.g. https://your-domain.com/webhook)');
    process.exit(1);
  }

  if (!secret) {
    console.error('Set MAX_WEBHOOK_SECRET in .env');
    process.exit(1);
  }

  if (!url.startsWith('https://')) {
    console.error('WEBHOOK_URL must start with https://');
    process.exit(1);
  }

  try {
    const me = await getMe();
    console.log('Bot:', me.name || me.username);

    const result = await replaceWebhook(url, secret);
    console.log('Webhook registered:', JSON.stringify(result, null, 2));
    console.log('URL:', url);
  } catch (err) {
    console.error('Registration failed:', err.message);
    if (err.body) console.error(JSON.stringify(err.body, null, 2));
    process.exit(1);
  }
}

main();
