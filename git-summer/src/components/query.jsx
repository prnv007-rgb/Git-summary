import React, { useState } from 'react';
import axios from 'axios';

function QueryForm({ repoUrl, setAnswer, setSources }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  const handleQuery = async () => {
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
      alert('Error querying: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Step 2: Ask a Question</h2>
      <input
        type="text"
        placeholder="What does this repo do?"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        style={{ width: '60%', marginRight: '10px' }}
      />
      <button onClick={handleQuery} disabled={loading}>
        {loading ? 'Thinking...' : 'Ask'}
      </button>
    </div>
  );
}

export default QueryForm;
