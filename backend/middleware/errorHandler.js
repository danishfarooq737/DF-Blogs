const config = require('../config');

const notFound = (req, res) => res.status(404).json({ message: 'Not found' });

// Express identifies error middleware by its four-argument signature.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.status || err.statusCode;
  let message = err.message;

  if (err.type === 'entity.parse.failed') [status, message] = [400, 'Malformed JSON body'];
  else if (err.type === 'entity.too.large') [status, message] = [413, 'Request body too large'];
  else if (err.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large' : 'Invalid upload';
  } else if (err.name === 'CastError') [status, message] = [400, 'Invalid identifier'];
  else if (err.name === 'ValidationError') status = 400;
  else if (err.code === 11000) [status, message] = [409, 'A record with that value already exists'];

  if (!status || status >= 500) {
    if (!config.isTest) console.error(err);  
    return res.status(500).json({ message: 'Internal server error' });
  }
  const body = { message };
  if (err.errors) body.errors = err.errors;
  return res.status(status).json(body);
};

module.exports = { notFound, errorHandler };
