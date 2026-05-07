const fs = require('fs');
const mongoose = require('mongoose');
const colors = require('colors');
const dotenv = require('dotenv');
const geocoder = require('./utils/geocoder'); // still used here (IMPORTANT)

// Load env vars
dotenv.config({ path: './config/config.env' });

// Load model
const Bootcamp = require('./models/Bootcamp');
const Course = require('./models/Course');

// Connect DB
mongoose.connect(process.env.MONGO_URI);

// Read JSON
const bootcamps = JSON.parse(
  fs.readFileSync(`${__dirname}/_data/bootcamps.json`, 'utf-8')
);

const courses = JSON.parse(
  fs.readFileSync(`${__dirname}/_data/courses.json`, 'utf-8')
);

// ----------------------
// IMPORT DATA
// ----------------------
const importData = async () => {
  try {
    console.log('🔥 Import started');

    const enrichedBootcamps = [];

    for (const bootcamp of bootcamps) {
      const loc = await geocoder.geocode(bootcamp.address);

      if (!loc || loc.length === 0) {
        throw new Error(`No geocode result for: ${bootcamp.address}`);
      }

      const geo = loc[0];

      enrichedBootcamps.push({
        ...bootcamp,
        location: {
          type: 'Point',
          coordinates: [
            geo.longitude,
            geo.latitude
          ],
          formattedAddress: geo.formattedAddress,
          street: geo.streetName,
          city: geo.city,
          state: geo.stateCode,
          zipcode: geo.zipcode,
          country: geo.countryCode
        }
      });
    }

    await Bootcamp.create(enrichedBootcamps);
    await Course.create(courses);

    console.log('Data Imported...'.green.inverse);
  } catch (err) {
    console.error('❌ ERROR:', err);
  }

  process.exit();
};

// ----------------------
// DELETE DATA
// ----------------------
const deleteData = async () => {
  try {
    await Bootcamp.deleteMany();
    await Course.deleteMany();

    console.log('Data Destroyed...'.red.inverse);
  } catch (err) {
    console.error(err);
  }

  process.exit();
};

// ----------------------
// RUN SCRIPT
// ----------------------
if (process.argv[2] === '-i') {
  importData();
} else if (process.argv[2] === '-d') {
  deleteData();
}