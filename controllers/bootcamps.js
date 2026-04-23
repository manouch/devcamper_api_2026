const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const Bootcamp = require('../models/Bootcamp');
const geocoder = require('../utils/geocoder');

// @desc    GET all bootcamps
// @route   GET /api/v1/bootcamps
// @access  Public
exports.getBootcamps = asyncHandler(async (req, res, next) => {
  // res.send('<h1>Hello from express</h1>');
  // res.send({name: 'Manuchehr'});
  // res.json({name: 'Manuchehr'});
  // res.sendStatus(400);
  // res.status(400).json({ success: false });
  const bootcamps = await Bootcamp.find();

  res.status(200).json({ success: true, count: bootcamps.length, data: bootcamps });
});

// @desc    GET single bootcamp
// @route   GET /api/v1/bootcamps/:id
// @access  Public
exports.getBootcamp = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.findById(req.params.id);

  if (!bootcamp) {
    return next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({ success: true, data: bootcamp });
});

// @desc    Create new bootcamp
// @route   POST /api/v1/bootcamps
// @access  Private

exports.createBootcamp = asyncHandler(async (req, res, next) => {
  // res.status(200).json({ success: true, msg: 'Create new bootcamp' });
  const bootcamp = await Bootcamp.create(req.body);

  res.status(201).json({
    success: true,
    data: bootcamp
  })
});

// @desc    Update bootcamp
// @route   PUT /api/v1/bootcamps/:id
// @access  Private

exports.updateBootcamp = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!bootcamp) {
    return next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({ success: true, data: bootcamp });
});

// @desc    Delete bootcamp
// @route   DELETE /api/v1/bootcamps/:id
// @access  Private
exports.deleteBootcamp = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.findByIdAndDelete(req.params.id);

  if (!bootcamp) {
    return next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({ success: true, data: {} });
});

exports.getBootcampsInRadius = asyncHandler(async (req, res, next) => {
  const distance = parseFloat(req.params.distance);
  const zipcode = req.params.zipcode;

  // Get lat/lng from geocoder
  const loc = await geocoder.geocode(zipcode);
  // const lat = loc[0].latitude;
  // const lng = loc[0].longitude;

  const geoResult = loc.find(
  item => item.countryCode === 'us'
);

if (!geoResult) {
  return next(new ErrorResponse('No US location found for ZIP', 400));
}

const lat = geoResult.latitude;
const lng = geoResult.longitude;

  console.log('ZIP COORDS:', lng, lat);
  console.log('ZIP RESULT:', loc);

  const bootcamps = await Bootcamp.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        distanceField: 'distance',
        spherical: true,
        maxDistance: distance * 1609 // miles → meters
      }
    }
  ]);

  res.status(200).json({
    success: true,
    count: bootcamps.length,
    data: bootcamps
  });
});