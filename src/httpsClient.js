const fs = require('fs');
const https = require('https');
const path = require('path');

let caBundle = null;

function getCaBundle() {
  if (caBundle) return caBundle;

  const chainPath = path.resolve(__dirname, '..', 'certs', 'russian_trusted_ca_chain.pem');
  const rootCer = path.resolve(__dirname, '..', 'certs', 'russian_trusted_root_ca.cer');
  const subCer = path.resolve(__dirname, '..', 'certs', 'russian_trusted_sub_ca.cer');

  if (fs.existsSync(rootCer) && fs.existsSync(subCer)) {
    caBundle =
      fs.readFileSync(rootCer, 'utf8').trim() + '\n' + fs.readFileSync(subCer, 'utf8').trim();
    fs.mkdirSync(path.dirname(chainPath), { recursive: true });
    fs.writeFileSync(chainPath, caBundle + '\n');
    return caBundle;
  }

  if (fs.existsSync(chainPath)) {
    caBundle = fs.readFileSync(chainPath, 'utf8');
    return caBundle;
  }

  return null;
}

function httpsRequest(urlString, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const ca = getCaBundle();

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: `${url.pathname}${url.search}`,
      method,
      headers,
    };

    if (ca) {
      options.ca = ca;
    }

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          text: async () => text,
          json: async () => JSON.parse(text),
        });
      });
    });

    req.on('error', (err) => {
      if (err.code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY') {
        reject(
          new Error(
            'SSL: не удалось проверить сертификат MAX API. Убедитесь, что файлы есть в папке certs/.',
          ),
        );
        return;
      }
      reject(err);
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

module.exports = {
  getCaBundle,
  httpsRequest,
};
