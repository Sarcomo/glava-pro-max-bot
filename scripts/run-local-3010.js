require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
process.env.PORT = '3010';
require('../src/index.js');
