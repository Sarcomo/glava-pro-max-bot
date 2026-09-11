#!/bin/bash
set -euo pipefail
BOT=/opt/glava-pro-max-bot

# Ensure nginx proxies mini-app
if ! grep -q "location /app/" /etc/nginx/sites-available/bribon; then
  python3 - <<'PY'
from pathlib import Path
path = Path('/etc/nginx/sites-available/bribon')
text = path.read_text()
snippet = '''
    location /app/ {
        proxy_pass http://127.0.0.1:3003/app/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /app {
        return 301 /app/;
    }
'''
# insert before first "location = /glava/webhook" if present, else before last closing brace of server
needle = 'location = /glava/webhook'
if needle in text:
    text = text.replace(needle, snippet + '\n    ' + needle, 1)
else:
    raise SystemExit('nginx glava webhook location not found')
path.write_text(text)
print('nginx updated')
PY
  nginx -t && systemctl reload nginx
fi

pm2 restart glava-pro-max-bot
sleep 2
curl -sS http://127.0.0.1:3003/health
echo
curl -sS -o /dev/null -w "app:%{http_code}\n" http://127.0.0.1:3003/app/
curl -sS -o /dev/null -w "media:%{http_code}\n" http://127.0.0.1:3003/app/media/sobol.jpg || true
echo DONE
