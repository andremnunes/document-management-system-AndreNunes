const express = require('express');
const multer = require('multer');
const crypto = require('node:crypto');
const path = require('node:path');
const documentRepository = require('../repositories/document.repository');
const documentController = require('../controllers/document.controller');

const router = express.Router();
const maximumFileSize = Number(process.env.MAX_FILE_SIZE || 10 * 1024 * 1024);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      callback(null, documentRepository.storageDirectory);
    },
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${crypto.randomUUID()}${extension}`);
    },
  }),
  limits: {
    files: 1,
    fileSize: maximumFileSize,
  },
});

router.post(
  '/upload',
  documentController.requireOwner,
  upload.single('file'),
  documentController.upload,
);
router.get('/documents', documentController.list);
router.get('/documents/:id/download', documentController.download);

module.exports = router;
