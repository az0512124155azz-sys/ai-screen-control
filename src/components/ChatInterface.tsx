import React, { useEffect, useRef } from 'react';
import { Send, Settings, MessageSquare, Loader, Monitor } from 'lucide-react';
import type { Provider } from './SettingsPanel';
import '../styles/ChatInterface.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  messages: Message[];
  input: string;
  onInputChange: (value: string) => void;
  onSend: (text?: string) => void;
  loading: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  provider: Provider;
  openSettings: () => void;
}

const PROVIDER_LABEL: Record<Provider, string> = {
  claude: '🤖 Claude',
  openai: '⚡ GPT-4o',
  gemini: '🎨 Gemini',
};

export default function ChatInterface({
  messages,
  input,
  onInputChange,
  onSend,
  loading,
  inputRef,
  provider,
  openSettings,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="chat-interface">
      <div className="chat-header" data-tauri-drag-region>
        <div className="header-title" data-tauri-drag-region>
          <MessageSquare size={20} />
          <span>AI Screen Control</span>
        </div>
        <button className="provider-badge" onClick={openSettings} title="Change AI / settings">
          {PROVIDER_LABEL[provider]}
          <Settings size={15} />
        </button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-state">
            <Monitor size={48} />
            <h2>Ask about your screen</h2>
            <p>Type a question and I'll look at your screen automatically to answer.</p>
            <p className="hint">No screenshots to upload — I capture it myself.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`message message-${msg.role}`}>
              <div className="message-avatar">{msg.role === 'user' ? '👤' : '🤖'}</div>
              <div className="message-content">
                <div className="message-text">{msg.content}</div>
                <div className="message-time">{msg.timestamp.toLocaleTimeString()}</div>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="message message-assistant loading">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="message-text capturing">
                <Loader className="spinner" size={16} /> Looking at your screen…
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <div className="input-wrapper">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask anything about your screen…"
            disabled={loading}
          />
          <button className="send-btn" onClick={() => onSend()} disabled={!input.trim() || loading} aria-label="Send">
            {loading ? <Loader className="spinner" size={20} /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}
