import React, { useState } from 'react';
import axios from 'axios';

function QueryForm({ repoUrl, setAnswer, setSources }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  const handleQuery = async () => {
    if (!question.trim()) return; 
    setLoading(true);
    try {
      // --- THIS IS THE FIX ---
      // Use the environment variable for the API URL, with a fallback for local development.
      const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      
      const res = await axios.post(`${API_URL}/query`, {
        repo_url: repoUrl,
        question,
        k: 5
      });
      
      setAnswer(res.data.answer);
      setSources(res.data.source_chunks);
    } catch (err) {
      const errorMessage = err.response ? JSON.stringify(err.response.data) : err.message;
      setAnswer(`An error occurred: ${errorMessage}. Please check the console or try again.`);
      setSources([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !loading) {
      handleQuery();
    }
  };

  return (
    <div className="card">
      <h2>Step 2: Ask a Question</h2>
      <div className="input-group">
        <input
          type="text"
          placeholder="e.g., What is the main purpose of this library?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
        <button
          onClick={handleQuery}
          disabled={loading || !question.trim()}
          className={loading ? 'loading' : ''}
        >
          {loading ? (
            <span className="thinking-text">
              Thinking
              <span className="dot-container">
                <span className="dot">.</span>
                <span className="dot">.</span>
                <span className="dot">.</span>
              </span>
            </span>
          ) : (
            'Ask'
          )}
        </button>
      </div>
    </div>
  );
}

export default QueryForm;
