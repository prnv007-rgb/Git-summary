import React, { useState, useEffect } from 'react';

/**
 * A custom React hook to create a typewriter effect.
 * @param {string} text The full text to be typed out.
 * @param {number} speed The speed in milliseconds for each character.
 * @returns {string} The currently displayed portion of the text.
 */
const useTypewriter = (text, speed = 20) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
  
    setDisplayedText('');

    if (text) {
      let i = 0;
      
      const typingInterval = setInterval(() => {
        if (i < text.length) {
          setDisplayedText(prev => prev + text.charAt(i));
          i++;
        } else {
          // Stop the interval when the text is fully displayed
          clearInterval(typingInterval);
        }
      }, speed);

      // Cleanup function to clear the interval if the component unmounts
      return () => {
        clearInterval(typingInterval);
      };
    }
  }, [text, speed]); 

  return displayedText;
};

function AnswerDisplay({ answer, sources }) {
  
  const streamedAnswer = useTypewriter(answer);

  
  if (!answer) return null;

 
  const isTyping = streamedAnswer.length < answer.length;

  return (
   
    <div className="card answer-container">
      <h2>Answer</h2>
      <p className="answer-text">
        {streamedAnswer}
        {/* The blinking cursor, only shown while typing */}
        {isTyping && <span className="typing-cursor"></span>}
      </p>

      {/* Only show sources once the answer is fully typed */}
      {!isTyping && sources && sources.length > 0 && (
        <>
          <h3>Source Files:</h3>
          <ul className="source-list">
            {sources.map((src, idx) => (
              <li key={idx} className="source-item">{src}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default AnswerDisplay;
