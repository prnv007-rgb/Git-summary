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
    // Reset the text when a new answer comes in
    setDisplayedText('');

    if (text) {
      let i = 0;
      // Set up an interval to add one character at a time
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
  }, [text, speed]); // Rerun effect if text or speed changes

  return displayedText;
};

function AnswerDisplay({ answer, sources }) {
  // Use the custom hook to get the streaming text
  const streamedAnswer = useTypewriter(answer);

  // Don't render anything if there's no answer yet
  if (!answer) return null;

  // Check if the answer is fully typed out to hide the cursor
  const isTyping = streamedAnswer.length < answer.length;

  return (
    // Use new CSS classes for styling
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
