const fs = require('fs');
const path = require('path');

/**
 * MAX API (platform-api2.max.ru) uses Russian Trusted CA.
 * Node.js does not trust it by default — load certs automatically on Windows/local dev.
 */
function setupRussianCaCerts() {
  const chainPath = path.resolve(__dirname, '..', 'certs', 'russian_trusted_ca_chain.pem');
  const rootCer = path.resolve(__dirname, '..', 'certs', 'russian_trusted_root_ca.cer');
  const subCer = path.resolve(__dirname, '..', 'certs', 'russian_trusted_sub_ca.cer');

  if (fs.existsSync(rootCer) && fs.existsSync(subCer)) {
    const chain =
      fs.readFileSync(rootCer, 'utf8').trim() + '\n' + fs.readFileSync(subCer, 'utf8').trim() + '\n';
    fs.mkdirSync(path.dirname(chainPath), { recursive: true });
    fs.writeFileSync(chainPath, chain);
  }

  if (fs.existsSync(chainPath)) {
    process.env.NODE_EXTRA_CA_CERTS = chainPath;
    return chainPath;
  }

  return null;
}

module.exports = { setupRussianCaCerts };
