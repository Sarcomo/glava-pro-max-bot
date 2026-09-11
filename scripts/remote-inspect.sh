#!/bin/bash
set -e
echo "=== nginx glava block ==="
sed -n '180,250p' /etc/nginx/sites-available/bribon
echo "=== server_name ==="
grep -n server_name /etc/nginx/sites-available/bribon | head -20
echo "=== health via cyrillic domain ==="
curl -sS -m 10 https://xn--90aauvej.xn--p1ai/glava/health || true
echo
echo "=== health via bribon ==="
curl -sS -m 10 -o /tmp/h.txt -w "%{http_code}" https://bribon.ru/glava/health || true
echo
cat /tmp/h.txt 2>/dev/null || true
echo
echo "=== decode domain ==="
python3 - <<'PY'
import encodings.idna as idna
print(idna.ToUnicode('xn--90aauvej') + '.' + idna.ToUnicode('xn--p1ai'))
PY
echo "=== package.json ==="
cat /opt/glava-pro-max-bot/package.json
echo "=== server.js head ==="
head -50 /opt/glava-pro-max-bot/src/server.js
echo "=== pm2 show ==="
pm2 show glava-pro-max-bot | head -40
