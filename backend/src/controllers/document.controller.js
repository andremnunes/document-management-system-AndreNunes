const documentService = require('../services/document.service');

function upload(req, res, next) {
  try {
    const owner = getOwner(req);
    const document = documentService.createDocument(req.file, owner);
    res.status(201).json({ document: toPublicDocument(document) });
  } catch (error) {
    next(error);
  }
}

function requireOwner(req, res, next) {
  try {
    getOwner(req);
    next();
  } catch (error) {
    next(error);
  }
}

function list(req, res, next) {
  try {
    const owner = getOwner(req);
    res.json({ documents: documentService.listDocuments(owner) });
  } catch (error) {
    next(error);
  }
}

function download(req, res, next) {
  try {
    const owner = getOwner(req);
    const { document, filePath } = documentService.prepareDownload(
      req.params.id,
      owner,
    );

    res.download(filePath, document.originalName, (error) => {
      if (error && !res.headersSent) {
        next(error);
      }
    });
  } catch (error) {
    next(error);
  }
}

function getOwner(req) {
  const owner = req.get('X-User-Id')?.trim();

  if (!owner) {
    const error = new documentService.DocumentError(
      'VALIDATION_ERROR',
      'O header X-User-Id é obrigatório.',
      400,
    );
    throw error;
  }

  return owner;
}

function toPublicDocument(document) {
  const { storageName, ...publicDocument } = document;
  return publicDocument;
}

module.exports = {
  upload,
  requireOwner,
  list,
  download,
};
