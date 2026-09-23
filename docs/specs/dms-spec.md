# Especificação - Document Management System

## 1. Objetivo

Entregar um sistema web que permita a um usuário enviar, listar e baixar seus documentos, mantendo os arquivos no filesystem local da aplicação e seus metadados em memória.

## 2. Escopo

### 2.1 Dentro do escopo

- Upload de um documento por requisição.
- Listagem dos documentos pertencentes ao usuário informado na requisição.
- Download de um documento pelo identificador.
- Gestão simples por usuário, usando o header `X-User-Id` como identificador de contexto.
- Interface React para upload, listagem, estados de carregamento, estado vazio, erros e download.
- API HTTP documentada e acessível pelo prefixo `/api` no frontend via proxy do Vite.

### 2.2 Fora do escopo

- Armazenamento externo, em nuvem ou em banco de dados.
- Versionamento, histórico ou restauração de documentos.
- Autenticação, autorização robusta, cadastro de usuários ou gerenciamento de sessões.
- Exclusão, edição, renomeação ou compartilhamento de documentos.
- Upload de múltiplos arquivos em uma única requisição.
- Reconstrução dos metadados após reinício do processo.

## 3. Requisitos funcionais

| ID | Requisito | Critério de aceite |
| --- | --- | --- |
| RF-01 | O usuário pode enviar um documento. | Uma requisição válida salva o arquivo em `backend/storage`, cria os metadados e retorna `201` com o documento criado. |
| RF-02 | O usuário pode listar os documentos enviados. | Uma requisição válida retorna `200` com somente os documentos cujo `owner` corresponde ao `X-User-Id` informado. |
| RF-03 | O usuário pode baixar um documento pelo identificador. | Para um documento existente e pertencente ao usuário, a API retorna o conteúdo binário com headers apropriados. |
| RF-04 | O sistema deve rejeitar uploads inválidos. | Ausência de arquivo, mais de um arquivo, usuário ausente ou arquivo acima do limite retornam erro JSON padronizado e não deixam metadados válidos incompletos. |
| RF-05 | O sistema deve impedir acesso cruzado entre usuários. | Um usuário não pode listar ou baixar documento pertencente a outro usuário; o endpoint responde `404` para não revelar a existência do recurso. |
| RF-06 | O sistema deve expor seu estado de disponibilidade. | `GET /health` retorna `200` e `{ "status": "ok" }` quando a aplicação está disponível. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos devem ser gravados exclusivamente no filesystem local, em `backend/storage`, usando `multer` com `diskStorage`. |
| RNF-02 | Os metadados devem ser mantidos em memória nesta fase inicial. |
| RNF-03 | O armazenamento deve ser separado por um nome interno seguro, derivado do identificador do documento; o `originalName` não deve ser usado diretamente como caminho. |
| RNF-04 | O limite de tamanho, a porta e o diretório de storage devem ser configuráveis por variáveis de ambiente, seguindo o princípio 12-Factor. |
| RNF-05 | A API deve retornar erros previsíveis em JSON e não deve expor stack traces, caminhos absolutos ou detalhes internos ao cliente. |
| RNF-06 | O backend deve manter as responsabilidades separadas em `routes`, `controllers`, `services` e `repositories`. |
| RNF-07 | A solução deve permitir testes isolados dos serviços e testes de integração HTTP sem depender de um servidor externo. |
| RNF-08 | O frontend deve usar componentes funcionais React e acessar a API por `fetch`, usando o prefixo `/api`. |

### 4.1 Limitações conhecidas

Como os metadados vivem apenas em memória, o reinício do processo perde a associação entre documentos e seus metadados. Os arquivos físicos podem permanecer em `backend/storage`, mas não devem ser considerados acessíveis pela API após o reinício até que uma persistência futura seja definida. Essa limitação é aceita nesta versão.

## 5. Modelo de dados

### 5.1 Metadados do documento

O modelo lógico `DocumentMetadata` deve conter:

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | `string` | Sim | Identificador único e não previsível do documento. Deve ser seguro para uso em URL. |
| `originalName` | `string` | Sim | Nome original informado pelo cliente, preservado apenas como metadado e para o nome sugerido no download. |
| `size` | `number` | Sim | Tamanho do arquivo em bytes. Deve ser maior ou igual a zero. |
| `uploadedAt` | `string` | Sim | Data e hora da criação em ISO 8601 UTC. |
| `owner` | `string` | Sim | Valor normalizado do header `X-User-Id`. |
| `storageName` | `string` | Sim, interno | Nome seguro usado no filesystem. Não deve ser exposto nas respostas públicas. |

Exemplo de representação pública:

```json
{
  "id": "8f4f5f30-1d3e-4c72-9b4e-6e2e8a7c2c01",
  "originalName": "relatorio.pdf",
  "size": 24576,
  "uploadedAt": "2026-09-23T14:30:00.000Z",
  "owner": "user-123"
}
```

### 5.2 Regras do modelo

- `id` deve ser gerado pelo servidor e não pode depender do nome original.
- `originalName` deve ser tratado como dado não confiável: não pode permitir traversal de diretórios nem sobrescrever outro arquivo.
- `owner` deve ser obtido do contexto HTTP, nunca de um campo livre do formulário.
- A listagem deve retornar somente metadados públicos, sem `storageName`.
- A ordem padrão da listagem deve ser a mais recente primeiro, usando `uploadedAt`.
- Se o registro de metadados não puder ser criado depois do salvamento físico, o serviço deve tentar remover o arquivo recém-criado e retornar erro de armazenamento.

## 6. Contratos de API

### 6.1 Convenções gerais

- Base URL do frontend: `/api`.
- Content-Type de respostas JSON: `application/json; charset=utf-8`.
- Datas: ISO 8601 em UTC.
- Identidade: header obrigatório `X-User-Id` nos endpoints de documentos.
- O valor de `X-User-Id` deve ser uma string não vazia, após trim, com tamanho máximo configurável ou documentado pelo backend.
- Erros seguem o formato:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Um arquivo deve ser enviado.",
    "details": {}
  }
}
```

`details` é opcional e não deve conter caminhos internos, stack traces ou dados sensíveis.

### 6.2 GET /health

Verifica se a aplicação está disponível.

**Resposta `200`:**

```json
{ "status": "ok" }
```

Esse endpoint não exige `X-User-Id`.

### 6.3 POST /upload

Cria um documento para o usuário informado.

**Headers obrigatórios:**

```text
X-User-Id: user-123
Content-Type: multipart/form-data; boundary=...
```

**Corpo:**

- Campo multipart: `file`.
- Deve existir exatamente um arquivo.
- O limite de tamanho é definido pela configuração do servidor.
- O tipo MIME pode ser validado por uma lista configurável; a política mínima exige somente um arquivo válido e dentro do limite.

**Resposta `201`:**

```json
{
  "document": {
    "id": "8f4f5f30-1d3e-4c72-9b4e-6e2e8a7c2c01",
    "originalName": "relatorio.pdf",
    "size": 24576,
    "uploadedAt": "2026-09-23T14:30:00.000Z",
    "owner": "user-123"
  }
}
```

**Erros esperados:**

| Status | Código | Situação |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | Campo `file` ausente, mais de um arquivo ou `X-User-Id` inválido. |
| `413` | `FILE_TOO_LARGE` | Arquivo excede o limite configurado. |
| `415` | `UNSUPPORTED_MEDIA_TYPE` | Tipo MIME rejeitado quando houver lista configurada. |
| `500` | `STORAGE_ERROR` | Falha ao gravar ou registrar o documento. |

### 6.4 GET /documents

Lista os documentos do usuário informado.

**Header obrigatório:**

```text
X-User-Id: user-123
```

**Resposta `200`:**

```json
{
  "documents": [
    {
      "id": "8f4f5f30-1d3e-4c72-9b4e-6e2e8a7c2c01",
      "originalName": "relatorio.pdf",
      "size": 24576,
      "uploadedAt": "2026-09-23T14:30:00.000Z",
      "owner": "user-123"
    }
  ]
}
```

Uma lista sem documentos retorna `200` com `documents: []`.

**Erros esperados:**

| Status | Código | Situação |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | `X-User-Id` ausente ou inválido. |
| `500` | `INTERNAL_ERROR` | Falha inesperada ao consultar os metadados. |

### 6.5 GET /documents/:id/download

Baixa o conteúdo binário de um documento pertencente ao usuário informado.

**Header obrigatório:**

```text
X-User-Id: user-123
```

**Resposta `200`:**

- Corpo: conteúdo binário do arquivo.
- `Content-Type`: tipo MIME registrado ou `application/octet-stream` quando desconhecido.
- `Content-Length`: tamanho registrado quando disponível.
- `Content-Disposition`: `attachment` com o nome original sanitizado como nome sugerido.

**Erros esperados:**

| Status | Código | Situação |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | ID ausente ou em formato inválido. |
| `404` | `DOCUMENT_NOT_FOUND` | Documento inexistente, sem metadados ou pertencente a outro usuário. |
| `500` | `STORAGE_ERROR` | Metadado existe, mas a leitura do arquivo falha. |

A resposta `404` para documento de outro usuário evita revelar sua existência.

### 6.6 Códigos de erro

Os controllers devem traduzir erros conhecidos do domínio para os contratos acima. Erros não mapeados devem retornar `500` com `INTERNAL_ERROR`, sem detalhes de implementação.

## 7. Decisões arquiteturais

### 7.1 Backend

O backend usa Node.js, Express e CommonJS, com o fluxo de dependências:

```text
routes -> controllers -> services -> repositories
```

- `routes/`: registra os caminhos HTTP, middlewares de upload e controllers. Não contém regra de negócio.
- `controllers/`: lê headers, parâmetros, arquivos e configurações HTTP; chama os serviços e monta status, headers e respostas.
- `services/`: aplica validações de negócio, filtra por proprietário, coordena o ciclo de upload e decide os erros de domínio.
- `repositories/`: encapsula o acesso ao mapa de metadados em memória e ao filesystem local. Não conhece Express.
- `app.js`: compõe o Express, middlewares, rotas e endpoint de health.

### 7.2 Upload e armazenamento

- `multer` deve usar `diskStorage` apontando para `backend/storage` por padrão.
- O nome físico deve ser gerado pelo servidor, sem confiar no nome enviado pelo cliente.
- O diretório deve existir antes do uso; a criação pode ocorrer na inicialização do repositório.
- O repository deve armazenar o vínculo entre `id`, `storageName` e os metadados.
- A falha de uma etapa deve acionar compensação local quando possível, removendo o arquivo órfão.
- Não deve haver integração com S3, bancos, APIs de terceiros ou qualquer storage externo.

### 7.3 Frontend

A interface React deve ser organizada em `components/`, `pages/` e `services/`:

- `services/`: encapsula chamadas `fetch` para `/api` e conversão dos erros padronizados.
- `components/`: concentra formulário de upload, lista, item de documento e ação de download.
- `pages/`: compõe a tela principal e mantém o estado da experiência.
- A interface deve representar carregamento, sucesso, erro e lista vazia.
- O valor de `X-User-Id` deve vir de uma configuração simples da aplicação nesta fase, sem sugerir autenticação real.
- O `frontend/vite.config.js` mantém o proxy `/api` para o backend local.

### 7.4 Configuração

Variáveis previstas:

| Variável | Padrão | Uso |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP do backend. |
| `STORAGE_DIR` | `backend/storage` | Diretório local dos arquivos. |
| `MAX_FILE_SIZE` | valor definido pelo ambiente | Limite máximo do upload em bytes. |
| `ALLOWED_MIME_TYPES` | vazio ou política do ambiente | Lista opcional de MIME permitidos. |

A aplicação deve validar configurações inválidas na inicialização e usar defaults apenas quando documentados.

## 8. Plano de execução

1. **Configuração e composição**: definir variáveis de ambiente, garantir a criação de `backend/storage` e preservar o endpoint `/health`.
2. **Repository de documentos**: implementar o mapa de metadados e as operações de salvar, buscar por ID, listar por owner e ler o arquivo físico.
3. **Multer e upload local**: configurar `diskStorage`, limite de tamanho, campo `file`, nome físico seguro e tratamento de arquivos órfãos.
4. **Services**: implementar upload, listagem e download com validação de usuário, filtragem por owner e erros de domínio.
5. **Controllers e routes**: registrar os endpoints, interpretar entradas HTTP e aplicar o formato de resposta e erro definido.
6. **Testes backend**: cobrir health, upload válido, validações, limite, listagem isolada por usuário, download, documento inexistente e falhas de storage usando `node --test`.
7. **Serviços do frontend**: criar cliente `fetch` para os contratos, propagando `X-User-Id` e mensagens de erro.
8. **Componentes e página React**: implementar upload, listagem, download e estados de carregamento, vazio, sucesso e erro.
9. **Integração**: validar o proxy `/api`, executar backend e frontend juntos e conferir o fluxo completo no navegador.
10. **Aceite**: confirmar os critérios dos RFs, verificar que arquivos ficam somente no storage local e registrar a limitação de perda de metadados no reinício.

## 9. Critérios gerais de aceite

- O documento criado aparece na listagem do mesmo usuário.
- O documento não aparece na listagem de outro usuário.
- O download retorna o conteúdo correto e o nome original como sugestão.
- Upload sem arquivo, acima do limite ou sem `X-User-Id` retorna erro padronizado.
- Documento inexistente ou sem acesso retorna `404` sem revelar dados.
- Nenhum caminho do filesystem interno é exposto pela API.
- O backend continua organizado nas quatro camadas definidas.
- A implementação não adiciona storage externo, banco de dados ou autenticação fora do escopo.
