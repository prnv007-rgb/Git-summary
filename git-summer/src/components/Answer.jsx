import React from 'react';

function AnswerDisplay({ answer, sources }) {
  if (!answer) return null;

  return (
    <div style={{ marginTop: '2rem' }}>
      <h2>🧠 Answer</h2>
      <p>{answer}</p>
      <h3>📂 Source Files:</h3>
      <ul>
        {sources.map((src, idx) => (
          <li key={idx}>{src}</li>
        ))}
      </ul>
    </div>
  );
}

export default AnswerDisplay;
