const crypto = require('node:crypto');
const fs = require('node:fs');
const documentRepository = require('../repositories/document.repository');

class DocumentError extends Error {
  constructor(code, message, statusCode, details = {}) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

function createDocument(file, owner) {
  if (!file) {
    throw new DocumentError(
      'VALIDATION_ERROR',
      'Um arquivo deve ser enviado.',
      400,
    );
  }

  const document = {
    id: crypto.randomUUID(),
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    storageName: file.filename,
  };

  try {
    return documentRepository.saveMetadata(document);
  } catch (error) {
    documentRepository.removeFile(document);
    throw new DocumentError(
      'STORAGE_ERROR',
      'Não foi possível registrar o documento.',
      500,
      {},
    );
  }
}

function listDocuments(owner) {
  return documentRepository.listByOwner(owner).map(toPublicDocument);
}

function prepareDownload(id, owner) {
  const document = documentRepository.findByIdAndOwner(id, owner);

  if (!document) {
    throw new DocumentError(
      'DOCUMENT_NOT_FOUND',
      'Documento não encontrado.',
      404,
    );
  }

  const filePath = documentRepository.getFilePath(document);

  if (!fs.existsSync(filePath)) {
    throw new DocumentError(
      'DOCUMENT_NOT_FOUND',
      'Documento não encontrado.',
      404,
    );
  }

  return {
    document: toPublicDocument(document),
    filePath,
  };
}

function toPublicDocument(document) {
  const { storageName, ...publicDocument } = document;
  return publicDocument;
}

module.exports = {
  DocumentError,
  createDocument,
  listDocuments,
  prepareDownload,
};
