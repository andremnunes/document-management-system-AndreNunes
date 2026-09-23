const fs = require('node:fs');
const path = require('node:path');
const { storageDirectory } = require('../config/storage');

const documents = new Map();

function saveMetadata(document) {
  documents.set(document.id, document);
  return document;
}

function listByOwner(owner) {
  return Array.from(documents.values())
    .filter((document) => document.owner === owner)
    .sort((firstDocument, secondDocument) =>
      secondDocument.uploadedAt.localeCompare(firstDocument.uploadedAt),
    );
}

function findByIdAndOwner(id, owner) {
  const document = documents.get(id);

  if (!document || document.owner !== owner) {
    return null;
  }

  return document;
}

function getFilePath(document) {
  if (
    typeof document.storageName !== 'string'
    || !document.storageName
    || path.basename(document.storageName) !== document.storageName
  ) {
    throw new Error('O nome físico do documento é inválido.');
  }

  const filePath = path.resolve(storageDirectory, document.storageName);
  const relativePath = path.relative(storageDirectory, filePath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error('O caminho do documento está fora do storage.');
  }

  return filePath;
}

async function removeFile(document) {
  const filePath = getFilePath(document);

  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  documents.delete(document.id);
}

module.exports = {
  storageDirectory,
  saveMetadata,
  listByOwner,
  findByIdAndOwner,
  getFilePath,
  removeFile,
};
