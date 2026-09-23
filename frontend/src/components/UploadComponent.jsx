import { useRef, useState } from 'react';
import { uploadDocument } from '../services/api';

export default function UploadComponent({ owner, onUploaded }) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedFile) {
      setStatus('error');
      setMessage('Selecione um arquivo para enviar.');
      return;
    }

    setStatus('loading');
    setMessage('Enviando arquivo...');

    try {
      await uploadDocument(selectedFile, owner);
      setSelectedFile(null);
      fileInputRef.current.value = '';
      setStatus('success');
      setMessage('Documento enviado com sucesso.');
      onUploaded();
    } catch (error) {
      setStatus('error');
      setMessage(error.message);
    }
  }

  function handleFileChange(event) {
    setSelectedFile(event.target.files?.[0] || null);
    setStatus('idle');
    setMessage('');
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <div className="field-group">
        <label htmlFor="document-file">Arquivo</label>
        <input
          ref={fileInputRef}
          id="document-file"
          name="file"
          type="file"
          onChange={handleFileChange}
          disabled={status === 'loading'}
        />
      </div>
      <button type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Enviando...' : 'Enviar documento'}
      </button>
      {message && (
        <p className={`form-message ${status}`} role={status === 'error' ? 'alert' : 'status'}>
          {message}
        </p>
      )}
    </form>
  );
}
