const { test } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../src/app');
const documentRepository = require('../src/repositories/document.repository');

// Mantém uma verificação mínima da composição do app Express.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('rejeita caminhos de documento fora do storage', () => {
  assert.throws(
    () => documentRepository.getFilePath({ storageName: '../outside.txt' }),
    /nome físico|fora do storage/,
  );
});

test('retorna erros JSON para header ausente e rota desconhecida', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    const missingOwnerResponse = await fetch(
      `http://127.0.0.1:${port}/documents`,
    );
    assert.strictEqual(missingOwnerResponse.status, 400);
    assert.strictEqual(
      (await missingOwnerResponse.json()).error.code,
      'VALIDATION_ERROR',
    );

    const unknownRouteResponse = await fetch(
      `http://127.0.0.1:${port}/does-not-exist`,
    );
    assert.strictEqual(unknownRouteResponse.status, 404);
    assert.strictEqual(
      (await unknownRouteResponse.json()).error.code,
      'NOT_FOUND',
    );
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('faz upload, lista por usuário e baixa o documento', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  let documentId;

  try {
    const formData = new FormData();
    formData.append(
      'file',
      new Blob(['conteúdo de teste'], { type: 'text/plain' }),
      'teste.txt',
    );

    const uploadResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: { 'X-User-Id': 'user-a' },
      body: formData,
    });
    assert.strictEqual(uploadResponse.status, 201);

    const uploadedDocument = (await uploadResponse.json()).document;
    documentId = uploadedDocument.id;
    assert.strictEqual(uploadedDocument.originalName, 'teste.txt');
    assert.strictEqual(uploadedDocument.owner, 'user-a');

    const ownerListResponse = await fetch(`${baseUrl}/documents`, {
      headers: { 'X-User-Id': 'user-a' },
    });
    assert.strictEqual(ownerListResponse.status, 200);
    const ownerDocuments = (await ownerListResponse.json()).documents;
    assert.ok(ownerDocuments.some((document) => document.id === documentId));

    const otherUserListResponse = await fetch(`${baseUrl}/documents`, {
      headers: { 'X-User-Id': 'user-b' },
    });
    assert.deepStrictEqual(
      (await otherUserListResponse.json()).documents,
      [],
    );

    const downloadResponse = await fetch(
      `${baseUrl}/documents/${documentId}/download`,
      { headers: { 'X-User-Id': 'user-a' } },
    );
    assert.strictEqual(downloadResponse.status, 200);
    assert.strictEqual(await downloadResponse.text(), 'conteúdo de teste');

    const unauthorizedDownloadResponse = await fetch(
      `${baseUrl}/documents/${documentId}/download`,
      { headers: { 'X-User-Id': 'user-b' } },
    );
    assert.strictEqual(unauthorizedDownloadResponse.status, 404);
  } finally {
    if (documentId) {
      const document = documentRepository.findByIdAndOwner(
        documentId,
        'user-a',
      );
      if (document) {
        await documentRepository.removeFile(document);
      }
    }

    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
