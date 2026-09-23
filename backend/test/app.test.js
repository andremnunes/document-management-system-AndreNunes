const { test } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../src/app');
const documentRepository = require('../src/repositories/document.repository');

// Teste de fumaça do seed: garante que o app Express foi exportado.
// Novos testes serão adicionados durante os Steps 2, 6 e 7 com auxílio do Copilot.
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
