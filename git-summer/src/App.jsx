import React, { useState } from 'react';
import RepoInputForm from './components/input';
import QueryForm from './components/query';
import AnswerDisplay from './components/Answer';

function App() {
  const [repoUrl, setRepoUrl] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>GitHub Repo RAG Assistant</h1>
    
      <RepoInputForm setRepoUrl={setRepoUrl} />
      <hr />
      {repoUrl && <QueryForm repoUrl={repoUrl} setAnswer={setAnswer} setSources={setSources} />}
      <AnswerDisplay answer={answer} sources={sources} />
    </div>
  );
}

export default App;
