import React, { useState } from 'react';
import axios from 'axios';

// This component handles providing a repo URL and building the index.
// It's styled to match the rest of your application.
function IndexForm({ setRepoUrl }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleBuildIndex = async () => {
    if (!url.trim()) {
      setStatusMessage('Please enter a repository URL.');
      setIsError(true);
      return;
    }
    setLoading(true);
    setStatusMessage('');
    setIsError(false);

    try {
      // Use the environment variable for the API URL for deployment flexibility.
      const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      
      // The payload is updated to let the backend handle the branch logic.
      await axios.post(`${API_URL}/build`, {
        repo_url: url,
        chunk_size: 800,
        chunk_overlap: 100
        // The 'branch' field is intentionally removed.
      });
      
      setStatusMessage('FAISS index built successfully! You can now ask questions.');
      setRepoUrl(url); // Notify the parent App component that the URL is set.
      
    } catch (err) {
      const errorMessage = err.response ? JSON.stringify(err.response.data) : err.message;
      setStatusMessage(`Error building index: ${errorMessage}`);
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  // Allows pressing Enter to submit
  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !loading) {
      handleBuildIndex();
    }
  };

  return (
    <div className="card">
      <h2>Step 1: Enter GitHub Repo</h2>
      <div className="input-group">
        <input
          type="text"
          placeholder="https://github.com/user/repo"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
        <button
          onClick={handleBuildIndex}
          disabled={loading || !url.trim()}
          className={loading ? 'loading' : ''}
        >
          {loading ? (
            <span className="thinking-text">
              Building
              <span className="dot-container">
                <span className="dot">.</span>
                <span className="dot">.</span>
                <span className="dot">.</span>
              </span>
            </span>
          ) : (
            'Build RAG Index'
          )}
        </button>
      </div>
      {/* Display status messages directly in the UI instead of using alert() */}
      {statusMessage && (
        <p className={`status-message ${isError ? 'error' : 'success'}`}>
          {statusMessage}
        </p>
      )}
    </div>
  );
}

export default IndexForm;
