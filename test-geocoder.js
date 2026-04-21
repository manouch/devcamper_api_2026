const dotenv = require('dotenv');
dotenv.config({ path: './config/config.env' });

const geocoder = require('./utils/geocoder');

(async () => {
  try {
    const res = await geocoder.geocode('Houston, TX');
    console.log('GEOCODER RESULT:', res);
  } catch (err) {
    console.error(err);
  }
})();