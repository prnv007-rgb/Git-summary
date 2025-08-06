import React, { useState } from 'react';
import axios from 'axios';

// Make sure your CSS file is imported in your main App.js or index.js
// For example, in App.js: import './App.css';

function QueryForm({ repoUrl, setAnswer, setSources }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  const handleQuery = async () => {
    if (!question.trim()) return; // Don't send empty queries
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:8000/query', {
        repo_url: repoUrl,
        question,
        k: 5
      });
      setAnswer(res.data.answer);
      setSources(res.data.source_chunks);
    } catch (err) {
      // It's better to display errors in the UI than using alert()
      setAnswer(`An error occurred: ${err.message}. Please check the console or try again.`);
      setSources([]);
    } finally {
      setLoading(false);
    }
  };

  // Allows pressing Enter to submit the form
  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
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
          // This className is the key to triggering the animation
          className={loading ? 'loading' : ''}
        >
          {loading ? (
            // This JSX structure is what the CSS targets
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
