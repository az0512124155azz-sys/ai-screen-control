import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import ChatInterface from './components/ChatInterface';
import SettingsPanel, { ProviderConfig, Provider, PROVIDERS } from './components/SettingsPanel';
import './App.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const DEFAULT_CONFIG: ProviderConfig = {
  provider: 'claude',
  claudeKey: '',
  openaiKey: '',
  geminiKey: '',
};

function loadConfig(): ProviderConfig {
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem('ai_config') || '{}') };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function keyFor(cfg: ProviderConfig): string {
  return cfg.provider === 'openai' ? cfg.openaiKey : cfg.provider === 'gemini' ? cfg.geminiKey : cfg.claudeKey;
}

function modelFor(provider: Provider): string {
  return PROVIDERS.find((p) => p.id === provider)!.model;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<ProviderConfig>(loadConfig());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('ai_config', JSON.stringify(config));
  }, [config]);

  const addMessage = (role: Message['role'], content: string) =>
    setMessages((prev) => [...prev, { role, content, id: `${Date.now()}-${Math.random()}`, timestamp: new Date() }]);

  const sendMessage = async (text?: string) => {
    const question = (text ?? input).trim();
    if (!question || loading) return;

    const apiKey = keyFor(config);
    if (!apiKey) {
      setShowSettings(true);
      return;
    }

    addMessage('user', question);
    setInput('');
    setLoading(true);

    try {
      // The app captures the screen automatically — the user never uploads anything.
      const result: any = await invoke('ask', {
        request: {
          question,
          provider: config.provider,
          apiKey,
          model: modelFor(config.provider),
          captureScreen: true,
        },
      });
      addMessage('assistant', result?.response ?? 'No response');
    } catch (err) {
      addMessage('assistant', `❌ Error: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  if (showSettings) {
    return (
      <SettingsPanel
        config={config}
        onSave={(c) => { setConfig(c); setShowSettings(false); }}
        onClose={() => setShowSettings(false)}
      />
    );
  }

  return (
    <div className="app-container">
      <ChatInterface
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSend={sendMessage}
        loading={loading}
        inputRef={inputRef}
        provider={config.provider}
        openSettings={() => setShowSettings(true)}
      />
    </div>
  );
}
