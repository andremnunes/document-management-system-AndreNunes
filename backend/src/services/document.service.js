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

async function createDocument(file, owner) {
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
    try {
      await documentRepository.removeFile(document);
    } catch {
      // A falha na limpeza não deve substituir o erro de persistência original.
    }
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

async function prepareDownload(id, owner) {
  const document = documentRepository.findByIdAndOwner(id, owner);

  if (!document) {
    throw new DocumentError(
      'DOCUMENT_NOT_FOUND',
      'Documento não encontrado.',
      404,
    );
  }

  let filePath;
  try {
    filePath = documentRepository.getFilePath(document);
  } catch {
    throw new DocumentError(
      'STORAGE_ERROR',
      'O caminho físico do documento é inválido.',
      500,
    );
  }

  try {
    await fs.promises.access(filePath, fs.constants.R_OK);
  } catch {
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
