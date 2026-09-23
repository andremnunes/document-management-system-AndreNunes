const crypto = require('node:crypto');
const multer = require('multer');
const storageConfig = require('../config/storage');

const uploadMiddleware = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      callback(null, storageConfig.storageDirectory);
    },
    filename: (_req, _file, callback) => {
      callback(null, crypto.randomUUID());
    },
  }),
  limits: {
    files: 1,
    fileSize: storageConfig.maximumFileSize,
  },
  fileFilter: (_req, file, callback) => {
    if (
      storageConfig.allowedMimeTypes.length > 0
      && !storageConfig.allowedMimeTypes.includes(file.mimetype)
    ) {
      const error = new Error('O tipo MIME do arquivo não é permitido.');
      error.code = 'UNSUPPORTED_MEDIA_TYPE';
      error.statusCode = 415;
      return callback(error);
    }

    return callback(null, true);
  },
});

module.exports = uploadMiddleware;
