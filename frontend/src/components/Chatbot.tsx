'use client';

import { useState } from 'react';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleChatbot = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div>
      <button
        onClick={toggleChatbot}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '60px',
          height: '60px',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <span>&#128172;</span>
      </button>
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '100px',
            right: '20px',
            width: '350px',
            height: '500px',
            backgroundColor: 'white',
            borderRadius: '10px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              backgroundColor: '#0070f3',
              color: 'white',
              padding: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>HealthLink Agent</span>
            <button
              onClick={toggleChatbot}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              &#10006;
            </button>
          </div>
          <iframe
            src="https://healthlinkagent.streamlit.app/?embed=true"
            style={{
              flex: 1,
              border: 'none',
            }}
            title="HealthLink Agent"
          ></iframe>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
