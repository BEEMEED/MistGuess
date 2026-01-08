import React, { useState, useEffect, useRef } from 'react';
import './ChatBox.css';

interface ChatMessage {
  player: string;
  message: string;
  timestamp: number;
}

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  currentUser: string;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ messages, onSendMessage, currentUser }) => {
  const [inputValue, setInputValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const dragStartPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    // Don't start dragging if clicking on interactive elements
    if (
      target.closest('.chat-toggle') ||
      target.closest('.chat-input') ||
      target.closest('.chat-send-button') ||
      target.closest('.chat-input-form')
    ) {
      return;
    }

    setIsDragging(true);
    hasMoved.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };

    const rect = chatBoxRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = Math.abs(e.clientX - dragStartPos.current.x);
      const deltaY = Math.abs(e.clientY - dragStartPos.current.y);

      if (deltaX > 5 || deltaY > 5) {
        hasMoved.current = true;
      }

      if (hasMoved.current) {
        setPosition({
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const chatBoxStyle = position.x !== 0 || position.y !== 0 ? {
    left: `${position.x}px`,
    top: `${position.y}px`,
    right: 'auto',
  } : {};

  return (
    <div
      ref={chatBoxRef}
      className={`chat-box ${isExpanded ? 'expanded' : 'collapsed'} ${isDragging ? 'dragging' : ''}`}
      style={chatBoxStyle}
    >
      <div
        className="chat-header"
        onMouseDown={handleMouseDown}
        onClick={() => !hasMoved.current && setIsExpanded(!isExpanded)}
      >
        <span className="chat-title">💬 Chat</span>
        <span className="chat-toggle">{isExpanded ? '−' : '+'}</span>
      </div>

      {isExpanded && (
        <>
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="chat-empty">No messages yet...</div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`chat-message ${msg.player === currentUser ? 'own-message' : ''}`}
                >
                  <div className="message-header">
                    <span className="message-player">{msg.player}</span>
                    <span className="message-time">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="message-text">{msg.message}</div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input-form" onSubmit={handleSubmit}>
            <input
              type="text"
              className="chat-input"
              placeholder="Type a message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              maxLength={200}
            />
            <button type="submit" className="chat-send-button" disabled={!inputValue.trim()}>
              Send
            </button>
          </form>
        </>
      )}
    </div>
  );
};
