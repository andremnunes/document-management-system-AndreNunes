const express = require('express');
const documentController = require('../controllers/document.controller');
const uploadMiddleware = require('../middlewares/document-upload.middleware');

const router = express.Router();

router.post(
  '/upload',
  documentController.requireOwner,
  uploadMiddleware.single('file'),
  documentController.upload,
);
router.get('/documents', documentController.list);
router.get('/documents/:id/download', documentController.download);

module.exports = router;
