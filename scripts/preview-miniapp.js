require('dotenv').config();
require('../src/app').createApp().listen(3010, () => {
  console.log('miniapp preview on http://127.0.0.1:3010/app/');
});
