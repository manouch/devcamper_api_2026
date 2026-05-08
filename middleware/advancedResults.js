const advancedResults   = (model, populate) => async (req, res, next) => {
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
  // let query = model.find(parsed).populate('courses');
  let query = model.find(parsed);

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
  const total = await model.countDocuments();

  query = query.skip(startIndex).limit(limit);

  if (populate) {
    query = query.populate(populate);
  }

  // Eecuting query
  const results = await query;

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

  res.advancedResults = {
    success: true,
    count: results.length,
    pagination,
    data: results
  }

  next();
}

module.exports = advancedResults;