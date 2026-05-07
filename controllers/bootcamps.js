const path = require('path');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const Bootcamp = require('../models/Bootcamp');
const geocoder = require('../utils/geocoder');

// @desc    GET all bootcamps
// @route   GET /api/v1/bootcamps
// @access  Public
exports.getBootcamps = asyncHandler(async (req, res, next) => {
  let queryObj = { ...req.query };

  // Copy req.query
  // const reqQuery = { ...req.query }; // todo

  // Fields to exclude
  // const removeFields

  // Remove special fields
  const removeFields = ['select', 'sort', 'page', 'limit'];
  removeFields.forEach(param => delete queryObj[param]);

  console.log(queryObj);

  let parsed = {};

  for (let key in queryObj) {
    let value = queryObj[key];

    // Convert booleans
    if (value === 'true') value = true;
    if (value === 'false') value = false;

    if (key.includes('[')) {
      const field = key.split('[')[0];
      const operator = key.match(/\[(.*)\]/)[1];

      if (!parsed[field]) {
        parsed[field] = {};
      }

      if (operator === 'in') {
        parsed[field][`$${operator}`] = value.split(',');
      } else {
        parsed[field][`$${operator}`] = Number(value);
      }
    } else {
      parsed[key] = value;
    }
  }

  console.log('FINAL FILTER:', parsed);

  // check it
  let query = Bootcamp.find(parsed).populate('courses');

  // Select Fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Bootcamp.countDocuments();

  query = query.skip(startIndex).limit(limit);

  // Eecuting query
  const bootcamps = await query;

  // Pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    }
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    }
  }

  res.status(200).json({
    success: true,
    count: bootcamps.length,
    pagination,
    data: bootcamps
  });
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
  const bootcamp = await Bootcamp.findById(req.params.id);

  if (!bootcamp) {
    return next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404));
  }

  await bootcamp.deleteOne();

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

// @desc    Upload photo for bootcamp
// @route   PUT /api/v1/bootcamps/:id/photo
// @access  Private
exports.bootcampPhotoUpload = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.findById(req.params.id);

  if (!bootcamp) {
    return next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404));
  }

  if (!req.files) {
    return next(new ErrorResponse(`Please upload a file`, 400));
  }

  // console.log(req.files.file);
  const file = req.files.file;

  // Make sure the image is a photo
  if (!file.mimetype.startsWith('image')) {
    return next(new ErrorResponse(`Please upload an image file`, 400));
  }

  // Check filesize
  if (file.size > process.env.MAX_FILE_UPLOAD) {
    return next(new ErrorResponse(`Please upload an image less than ${process.env.MAX_FILE_UPLOAD}`, 400));
  }

  // Create custom filename
  file.name = `photo_${bootcamp._id}${path.parse(file.name).ext}`;

  file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async err => {
    if (err) {
      console.error(err);
      return next(new ErrorResponse(`Problem with file upload`, 500));
    }

    await Bootcamp.findByIdAndUpdate(req.params.id, { photo: file.name });

    res.status(200).json({
      success: true,
      data: file.name
    });
  })

  // console.log(file.name);
});