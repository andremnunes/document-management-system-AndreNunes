import { useEffect, useState } from 'react';
import { listDocuments } from '../services/api';
import DownloadButton from './DownloadButton';

export default function DocumentList({ owner, refreshToken }) {
  const [documents, setDocuments] = useState([]);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isCurrentRequest = true;

    async function loadDocuments() {
      setStatus('loading');
      setMessage('');

      try {
        const result = await listDocuments(owner);
        if (isCurrentRequest) {
          setDocuments(result.documents);
          setStatus('success');
        }
      } catch (error) {
        if (isCurrentRequest) {
          setStatus('error');
          setMessage(error.message);
        }
      }
    }

    loadDocuments();

    return () => {
      isCurrentRequest = false;
    };
  }, [owner, refreshToken]);

  if (status === 'loading') {
    return <p className="state-message">Carregando documentos...</p>;
  }

  if (status === 'error') {
    return <p className="state-message error" role="alert">{message}</p>;
  }

  if (documents.length === 0) {
    return <p className="state-message">Nenhum documento enviado ainda.</p>;
  }

  return (
    <ul className="document-list">
      {documents.map((document) => (
        <li className="document-item" key={document.id}>
          <div>
            <strong>{document.originalName}</strong>
            <span>{formatDetails(document)}</span>
          </div>
          <DownloadButton document={document} owner={owner} />
        </li>
      ))}
    </ul>
  );
}

function formatDetails(document) {
  const sizeInKb = Math.max(1, Math.round(document.size / 1024));
  const uploadDate = new Date(document.uploadedAt).toLocaleString('pt-BR');
  return `${sizeInKb} KB · enviado em ${uploadDate}`;
}
