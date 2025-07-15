import React, { useState } from 'react';
import axios from 'axios';

function RepoInputForm({ setRepoUrl }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBuild = async () => {
    setLoading(true);
    try {
      await axios.post('http://localhost:8000/build', {
        repo_url: url,
        branch: 'main',
        chunk_size: 800,
        chunk_overlap: 100
      });
      setRepoUrl(url);
      alert('FAISS index built successfully!');
    } catch (err) {
      alert('Error building index: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Step 1: Enter GitHub Repo</h2>
      <input
        type="text"
        placeholder="https://github.com/user/repo"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{ width: '60%', marginRight: '10px' }}
      />
      <button onClick={handleBuild} disabled={loading}>
        {loading ? 'Building...' : 'Build RAG Index'}
      </button>
    </div>
  );
}

export default RepoInputForm;
