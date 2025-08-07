// agriconnect2.0/frontend/src/components/Chatbot.js

import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import axiosInstance from '../utils/axios';
import config from '../config';
import './Chatbot.css'; // Import your new CSS file

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en'); // Default to English
  const [sessionId, setSessionId] = useState(null); // State to store the session ID
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);

  // Initialize session ID on component mount
  useEffect(() => {
    setSessionId(uuidv4()); // Generate a unique session ID for each chat session
    // Optionally, send a welcome message from the bot when the chat starts
    setMessages([{ 
      text: "Hello! How can I assist you with your farming needs today?", 
      sender: "bot",
      timestamp: new Date().toISOString()
    }]);
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Function to send message to Dialogflow
  const sendMessage = async () => {
    if (inputMessage.trim() === '') return;

    const userMessage = { 
      text: inputMessage, 
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputMessage('');
    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.post(
        config.apiEndpoints.dialogflow,
        {
          message: inputMessage,
          sessionId: sessionId,
          languageCode: selectedLanguage,
        }
      );

      const botReply = {
        text: response.data.message,
        sender: 'bot',
        timestamp: new Date().toISOString(),
        intent: response.data.intent,
        confidence: response.data.confidence
      };
      
      setMessages(prevMessages => [...prevMessages, botReply]);
    } catch (error) {
      console.error('Chatbot error:', error);
      
      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      let errorType = 'error';
      
      if (error.response) {
        switch (error.response.data.error) {
          case 'SERVICE_DISABLED':
            errorMessage = 'The chatbot service is currently unavailable. Please try again later.';
            errorType = 'warning';
            break;
          case 'MISSING_CONFIG':
            errorMessage = 'The chatbot service is not properly configured. Please contact support.';
            errorType = 'error';
            break;
          case 'AUTH_ERROR':
            errorMessage = 'The chatbot service is experiencing authentication issues. Please try again later.';
            errorType = 'error';
            break;
          case 'INVALID_REQUEST':
            errorMessage = 'I couldn\'t understand that. Please try rephrasing your question.';
            errorType = 'warning';
            break;
          default:
            errorMessage = error.response.data.message || errorMessage;
            errorType = 'error';
        }
      }

      setError(errorMessage);
      setMessages(prevMessages => [...prevMessages, {
        text: errorMessage,
        sender: errorType,
        timestamp: new Date().toISOString(),
        isError: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      sendMessage();
    }
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    if (messages.length > 1) {
      if (!window.confirm('Changing language will reset the chat. Continue?')) return;
    }
    setSelectedLanguage(newLang);
    setMessages([{ 
      text: `Language changed to ${e.target.options[e.target.selectedIndex].text}. How can I help you?`, 
      sender: 'bot',
      timestamp: new Date().toISOString()
    }]);
  };

  return (
    <div className="chat-container">
      <div className="language-selector">
        <label htmlFor="language-select">Language:</label>
        <select
          id="language-select"
          value={selectedLanguage}
          onChange={handleLanguageChange}
        >
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="te">Telugu</option>
          <option value="ta">Tamil</option>
          <option value="ml">Malayalam</option>
          <option value="kn">Kannada</option>
          {/* Add more regional languages as needed. Use ISO 639-1 codes. */}
        </select>
      </div>

      <div className="chat-messages">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`message ${message.sender} ${message.isError ? 'error' : ''}`}
          >
            <div className="message-content">
              <p>{message.text}</p>
              {message.confidence && (
                <small className="confidence-score">
                  Confidence: {Math.round(message.confidence * 100)}%
                </small>
              )}
              <small className="message-timestamp">
                {new Date(message.timestamp).toLocaleTimeString()}
              </small>
            </div>
          </div>
        ))}
        {loading && (
          <div className="message bot">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading || !inputMessage.trim()}>
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
};

export default Chatbot;