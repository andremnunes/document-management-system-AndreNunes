const API_PREFIX = '/api';

class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_PREFIX}${path}`, options);
  const contentType = response.headers.get('content-type') || '';

  if (!response.ok) {
    const errorBody = contentType.includes('application/json')
      ? await response.json()
      : null;
    const error = errorBody?.error;
    throw new ApiError(
      error?.message || 'Não foi possível concluir a operação.',
      response.status,
      error?.code,
    );
  }

  return response;
}

export async function uploadDocument(file, owner) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await request('/upload', {
    method: 'POST',
    headers: { 'X-User-Id': owner },
    body: formData,
  });

  return response.json();
}

export async function listDocuments(owner) {
  const response = await request('/documents', {
    headers: { 'X-User-Id': owner },
  });

  return response.json();
}

export async function downloadDocument(id, owner) {
  const response = await request(
    `/documents/${encodeURIComponent(id)}/download`,
    { headers: { 'X-User-Id': owner } },
  );
  const blob = await response.blob();
  const contentDisposition = response.headers.get('content-disposition');

  return {
    blob,
    fileName: getFileName(contentDisposition) || 'documento',
  };
}

function getFileName(contentDisposition) {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) {
    return decodeURIComponent(utf8Match[1]);
  }

  const basicMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return basicMatch?.[1] || null;
}

export { ApiError };
