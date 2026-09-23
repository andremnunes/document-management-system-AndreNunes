const fs = require('node:fs');
const path = require('node:path');

const defaultStorageDirectory = path.resolve(__dirname, '../../storage');
const configuredStorageDirectory = process.env.STORAGE_DIR
  ? path.resolve(process.cwd(), process.env.STORAGE_DIR)
  : defaultStorageDirectory;
const maximumFileSize = parsePositiveInteger(
  process.env.MAX_FILE_SIZE,
  10 * 1024 * 1024,
  'MAX_FILE_SIZE',
);
const allowedMimeTypes = (process.env.ALLOWED_MIME_TYPES || '')
  .split(',')
  .map((mimeType) => mimeType.trim())
  .filter(Boolean);

fs.mkdirSync(configuredStorageDirectory, { recursive: true });

function parsePositiveInteger(value, fallback, name) {
  if (value === undefined) {
    return fallback;
  }

  const parsedValue = Number(value);
  if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${name} deve ser um inteiro positivo.`);
  }

  return parsedValue;
}

module.exports = {
  storageDirectory: configuredStorageDirectory,
  maximumFileSize,
  allowedMimeTypes,
};
