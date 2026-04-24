import React, { useState } from 'react';

export default function Chatbot({ stateSlug, formContext }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          stateSlug: stateSlug,
          formContext: formContext 
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: "Error: " + data.error }]);
      }
    } catch (error) {
      console.error("Chatbot fetch error:", error);
      setMessages((prev) => [
        ...prev, 
        { role: 'assistant', content: "Sorry, I'm having trouble connecting right now. Please try again." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  // This looks for **text** and turns it into <strong>text</strong>
  const formatMessage = (text) => {
    if (!text) return "";
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };
  return (
    <div style={styles.wrapper}>
      {/* Header */}
      <div style={styles.header}>
        Paper Prisons Assistant
      </div>

      {/* Message History */}
      <div style={styles.chatWindow}>
        {messages.length === 0 && (
          <p style={styles.welcomeText}>
            Hello! I can help answer questions about getting your ID.
          </p>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} style={msg.role === 'user' ? styles.userRow : styles.botRow}>
            <div style={msg.role === 'user' ? styles.userBubble : styles.botBubble}>
              <span style={{ whiteSpace: "pre-wrap" }}>{formatMessage(msg.content)}</span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={styles.botRow}>
            <div style={{...styles.botBubble, fontStyle: 'italic', color: '#666'}}>
              Typing...
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} style={styles.form}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          style={styles.input}
          disabled={isLoading}
        />
        <button 
          type="submit" 
          disabled={isLoading}
          style={styles.button}
        >
          Send
        </button>
      </form>
    </div>
  );
}

// Inline styles using brand colors: Blue, Grey, Black
const styles = {
  wrapper: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '420px',
    height: '550px',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 9999,
    fontFamily: 'sans-serif'
  },
  header: {
    backgroundColor: '#0056b3', // Paper Prisons Blue
    color: '#ffffff',
    padding: '16px',
    fontWeight: 'bold',
    fontSize: '16px',
    borderBottom: '1px solid #004494'
  },
  chatWindow: {
    flex: 1,
    padding: '16px',
    overflowY: 'auto',
    backgroundColor: '#f3f4f6', // Light grey background
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  welcomeText: {
    color: '#6b7280',
    fontSize: '14px',
    textAlign: 'center',
    marginTop: '20px'
  },
  userRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    width: '100%'
  },
  botRow: {
    display: 'flex',
    justifyContent: 'flex-start',
    width: '100%'
  },
  userBubble: {
    backgroundColor: '#0056b3', // Blue
    color: '#ffffff',
    padding: '10px 14px',
    borderRadius: '16px 16px 0 16px',
    maxWidth: '85%',
    fontSize: '14px',
    lineHeight: '1.4'
  },
  botBubble: {
    backgroundColor: '#e5e7eb', // Grey
    color: '#111827', // Almost black text
    padding: '10px 14px',
    borderRadius: '16px 16px 16px 0',
    maxWidth: '85%',
    fontSize: '14px',
    lineHeight: '1.4'
  },
  form: {
    display: 'flex',
    padding: '12px',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e5e7eb'
  },
  input: {
    flex: 1,
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    fontSize: '14px'
  },
  button: {
    marginLeft: '8px',
    padding: '10px 16px',
    backgroundColor: '#0056b3',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px'
  }
};