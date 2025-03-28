// src/components/PasswordPrompt.tsx
import React, { useState } from 'react';

interface PasswordPromptProps {
  onPasswordCorrect: () => void;
}

const PasswordPrompt: React.FC<PasswordPromptProps> = ({ onPasswordCorrect }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const correctPassword = process.env.REACT_APP_ACCESS_PASSWORD || 'defaultpassword'; // Fallback for local dev

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === correctPassword) {
      setError('');
      onPasswordCorrect();
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  return (
    <div className="password-prompt">
      <div className="logo">
              <h1>
                QUIN<span>AI</span>
              </h1>
            </div>
            <p></p>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          required
        />
        <button type="submit">Submit</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
};

export default PasswordPrompt;