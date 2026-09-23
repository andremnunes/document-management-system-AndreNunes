const fs = require('node:fs');
const path = require('node:path');

const defaultStorageDirectory = path.resolve(__dirname, '../../storage');
const storageDirectory = process.env.STORAGE_DIR
  ? path.resolve(process.cwd(), process.env.STORAGE_DIR)
  : defaultStorageDirectory;

fs.mkdirSync(storageDirectory, { recursive: true });

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
  return path.join(storageDirectory, document.storageName);
}

function removeFile(document) {
  const filePath = getFilePath(document);

  try {
    fs.unlinkSync(filePath);
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
