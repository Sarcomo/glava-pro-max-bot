# MAX-бот «Глава Про»

Чат-бот для мессенджера [MAX](https://max.ru) строительной компании **Глава Про** ([sip.glava.pro](https://sip.glava.pro)).

Собирает заявки, квалифицирует клиентов, показывает каталог проектов, считает предварительную стоимость и передаёт лиды менеджеру.

## Стек

- Node.js 18+ / Express
- MAX Bot API (webhook)
- Хранение лидов: JSON (по умолчанию) или Google Sheets

## Быстрый старт (локально)

### 1. Установка

```bash
cd glava-pro-max-bot
npm install
cp .env.example .env
```

### 2. Настройка `.env`

Откройте `.env` и замените значения:

| Переменная | Что указать |
|---|---|
| `MAX_BOT_TOKEN` | Токен бота из кабинета MAX |
| `MAX_WEBHOOK_SECRET` | Секрет 5–256 символов (латиница, цифры, `-`) |
| `WEBHOOK_URL` | Публичный HTTPS URL, например `https://your-bot.onrender.com/webhook` |
| `MANAGER_PHONE` | Телефон менеджера |
| `MANAGER_EMAIL` | Email менеджера |

> **Важно:** не коммитьте `.env` и не вставляйте токен в код. Если токен был опубликован — перевыпустите его в кабинете MAX.

### 3. Запуск

```bash
npm start
```

Проверка: `GET http://localhost:3000/health` → `{"ok":true}`

### 4. Публичный HTTPS для webhook

MAX принимает webhook **только по HTTPS на порту 443**. Для локальной разработки используйте туннель:

**ngrok:**
```bash
ngrok http 3000
```
Скопируйте URL вида `https://xxxx.ngrok-free.app` → в `.env`:
```
WEBHOOK_URL=https://xxxx.ngrok-free.app/webhook
```

**cloudflared:**
```bash
cloudflared tunnel --url http://localhost:3000
```

### 5. Регистрация webhook в MAX

```bash
npm run register-webhook
```

Или вручную:

```bash
curl -X POST "https://platform-api2.max.ru/subscriptions" \
  -H "Authorization: YOUR_MAX_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/webhook",
    "secret": "your_webhook_secret",
    "update_types": ["message_created", "message_callback", "bot_started"]
  }'
```

### 6. Проверка бота

Откройте бота в MAX и отправьте `/start`.

## Команды бота

| Команда | Действие |
|---|---|
| `/start` | Главное меню |
| `/menu` | Главное меню |
| `/catalog` | Каталог проектов |
| `/faq` | Частые вопросы |
| `/manager` | Контакты менеджера |

## Функционал

- **Подобрать дом** — квиз из 7 вопросов + сбор контакта
- **Каталог проектов** — 4 проекта СИП с фильтрами
- **Рассчитать стоимость** — калькулятор по технологии, площади, комплектации
- **Запись на экскурсию** — имя, телефон, день, время, формат
- **FAQ** — 7 разделов с кнопкой «Получить консультацию»
- **Оценка участка** — при выборе «Нужна помощь с оценкой участка» в квизе
- **Связаться с менеджером** — контакты и заявка

## Лиды

Сохраняются в `data/leads.json` (по умолчанию) со структурой:

```json
{
  "datetime": "2026-07-10T12:00:00.000Z",
  "user_id": 12345,
  "name": "Иван",
  "phone": "+79991234567",
  "email": "",
  "technology": "СИП-панели",
  "area": "100–150 м²",
  "floors": "1 этаж",
  "bedrooms": "3",
  "completion": "Под ключ",
  "budget": "5–8 млн ₽",
  "plot": "Уже есть",
  "source": "MAX bot",
  "lead_type": "квиз",
  "comment": ""
}
```

### Google Sheets (опционально)

В `.env`:
```
LEADS_STORAGE=google_sheets
GOOGLE_SHEETS_ID=your_spreadsheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=bot@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Создайте лист `Leads` с колонками A–O (как в структуре выше). Дайте сервисному аккаунту доступ к таблице.

## Деплой на Render

1. Создайте **Web Service** из репозитория
2. Build command: `npm install`
3. Start command: `npm start`
4. Добавьте переменные окружения из `.env.example`
5. `WEBHOOK_URL=https://your-app.onrender.com/webhook`
6. После деплоя: `npm run register-webhook` (локально с теми же env) или через Render Shell

Файл `render.yaml` включён для Blueprint-деплоя.

## Деплой на VPS (Ubuntu)

```bash
# На сервере
git clone <your-repo> /opt/glava-pro-max-bot
cd /opt/glava-pro-max-bot
npm install
cp .env.example .env
nano .env   # заполните переменные

# PM2
npm install -g pm2
pm2 start src/index.js --name glava-pro-bot
pm2 save
pm2 startup
```

**Nginx + SSL (Let's Encrypt):**
```nginx
server {
    listen 443 ssl;
    server_name bot.sip.glava.pro;

    ssl_certificate /etc/letsencrypt/live/bot.sip.glava.pro/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bot.sip.glava.pro/privkey.pem;

    location /webhook {
        proxy_pass http://127.0.0.1:3000/webhook;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /health {
        proxy_pass http://127.0.0.1:3000/health;
    }
}
```

```bash
certbot --nginx -d bot.sip.glava.pro
npm run register-webhook
```

## Структура проекта

```
glava-pro-max-bot/
├── src/
│   ├── index.js              # Точка входа
│   ├── app.js                # Express + webhook
│   ├── config.js             # Конфигурация из env
│   ├── maxApi.js             # Клиент MAX Bot API
│   ├── handlers/
│   │   └── updateHandler.js  # Маршрутизация событий
│   ├── flows/                # Сценарии бота
│   ├── data/                 # Проекты, FAQ, константы
│   ├── services/             # Лиды, цены, состояние
│   └── utils/                # Клавиатуры
├── scripts/
│   └── register-webhook.js
├── data/
│   └── leads.json            # Лиды (создаётся автоматически)
├── .env.example
├── package.json
└── README.md
```

## Безопасность

- Токен только в `MAX_BOT_TOKEN`
- Webhook проверяет заголовок `X-Max-Bot-Api-Secret`
- Webhook отвечает `200 OK` сразу, обработка — асинхронно
- Токен не логируется

## Что заменить перед запуском

1. `MAX_BOT_TOKEN` — ваш токен из MAX
2. `MAX_WEBHOOK_SECRET` — свой секрет (например `glava-pro-2026-secret`)
3. `WEBHOOK_URL` — ваш HTTPS-домен + `/webhook`
4. `MANAGER_PHONE`, `MANAGER_EMAIL`, `SITE_URL` — реальные контакты
5. Зарегистрировать webhook командой `npm run register-webhook`

## Лицензия

MIT — для внутреннего использования Глава Про.
