import { useState } from 'react';
import DocumentList from './components/DocumentList';
import UploadComponent from './components/UploadComponent';
import './App.css';

export default function App() {
  const [owner, setOwner] = useState('user-demo');
  const [refreshToken, setRefreshToken] = useState(0);

  function handleUploaded() {
    setRefreshToken((currentToken) => currentToken + 1);
  }

  return (
    <main className="app-shell">
      <div className="app-container">
        <header className="app-header">
          <div>
            <p className="eyebrow">Arquivo local · DMS</p>
            <h1>Seus documentos, em ordem.</h1>
          </div>
          <div className="user-field">
            <label htmlFor="owner">Usuário</label>
            <input
              id="owner"
              type="text"
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
              placeholder="Identificador do usuário"
            />
          </div>
        </header>

        <div className="workspace">
          <section className="panel" aria-labelledby="upload-title">
            <div className="panel-heading">
              <h2 id="upload-title">Enviar documento</h2>
            </div>
            <UploadComponent owner={owner} onUploaded={handleUploaded} />
          </section>

          <section className="panel" aria-labelledby="documents-title">
            <div className="panel-heading">
              <h2 id="documents-title">Documentos</h2>
              <span>Mais recentes primeiro</span>
            </div>
            <DocumentList owner={owner} refreshToken={refreshToken} />
          </section>
        </div>
      </div>
    </main>
  );
}
