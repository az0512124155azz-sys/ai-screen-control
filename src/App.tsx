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

type View = 'bubble' | 'chat' | 'settings';

const BUBBLE = { w: 60, h: 60 };
const PANEL = { w: 400, h: 620 };

const DEFAULT_CONFIG: ProviderConfig = { provider: 'claude', claudeKey: '', openaiKey: '', geminiKey: '' };

function loadConfig(): ProviderConfig {
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem('ai_config') || '{}') };
  } catch {
    return DEFAULT_CONFIG;
  }
}
const keyFor = (c: ProviderConfig) =>
  c.provider === 'ollama' ? '' :
  c.provider === 'openai' ? c.openaiKey :
  c.provider === 'gemini' ? c.geminiKey : c.claudeKey;
const modelFor = (p: Provider) => PROVIDERS.find((x) => x.id === p)!.model;

// Resize + reposition the always-on-top overlay window between the tiny bubble
// and the full chat panel. Guards let it run harmlessly in a plain browser.
async function setWindow(expanded: boolean) {
  try {
    const { getCurrentWindow, LogicalSize, LogicalPosition } = await import('@tauri-apps/api/window');
    const win = getCurrentWindow();
    const sw = window.screen.availWidth;
    const sh = window.screen.availHeight;
    if (expanded) {
      await win.setSize(new LogicalSize(PANEL.w, PANEL.h));
      await win.setPosition(new LogicalPosition(Math.max(0, sw - PANEL.w - 20), Math.max(0, sh - PANEL.h - 40)));
      await win.setFocus();
    } else {
      await win.setSize(new LogicalSize(BUBBLE.w, BUBBLE.h));
      await win.setPosition(new LogicalPosition(Math.max(0, sw - BUBBLE.w - 28), Math.max(0, sh - BUBBLE.h - 60)));
    }
  } catch {
    /* running in a normal browser (preview) — nothing to resize */
  }
}

export default function App() {
  const [view, setView] = useState<View>('bubble');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<ProviderConfig>(loadConfig());
  const [useScreen, setUseScreen] = useState<boolean>(
    localStorage.getItem('use_screen') !== 'false'
  );
  const [ollamaUp, setOllamaUp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { localStorage.setItem('use_screen', String(useScreen)); }, [useScreen]);

  // Live connection check — polls Ollama every 5s so the badge turns green
  // within seconds of it starting up.
  useEffect(() => {
    let alive = true;
    const check = () => {
      invoke<{ connected: boolean }>('ollama_status')
        .then((s) => { if (alive) setOllamaUp(s.connected); })
        .catch(() => { if (alive) setOllamaUp(false); });
    };
    check();
    const id = setInterval(check, 5000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Start collapsed as a small bubble in the bottom-right of the desktop.
  useEffect(() => { setWindow(false); }, []);
  useEffect(() => { localStorage.setItem('ai_config', JSON.stringify(config)); }, [config]);

  const open = () => { setView('chat'); setWindow(true); };
  const minimize = () => { setView('bubble'); setWindow(false); };

  // Bubble interaction: quick tap opens the chat; press-and-hold drags the
  // bubble anywhere on screen (so the user can move it wherever they like).
  const holdTimer = useRef<number | null>(null);
  const draggingRef = useRef(false);

  const onBubbleDown = () => {
    draggingRef.current = false;
    holdTimer.current = window.setTimeout(async () => {
      draggingRef.current = true;
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().startDragging();
      } catch { /* browser preview */ }
    }, 150);
  };
  const onBubbleUp = () => {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
    if (!draggingRef.current) open();
  };

  const addMessage = (role: Message['role'], content: string) =>
    setMessages((p) => [...p, { role, content, id: `${Date.now()}-${Math.random()}`, timestamp: new Date() }]);

  const sendMessage = async (text?: string) => {
    const question = (text ?? input).trim();
    if (!question || loading) return;
    const apiKey = keyFor(config);
    // Ollama runs locally and needs no key; the others require one.
    if (config.provider !== 'ollama' && !apiKey) { setView('settings'); return; }

    addMessage('user', question);
    setInput('');
    setLoading(true);
    try {
      const result: any = await invoke('ask', {
        request: { question, provider: config.provider, apiKey, model: modelFor(config.provider), captureScreen: useScreen },
      });
      addMessage('assistant', result?.response ?? 'No response');
    } catch (err) {
      addMessage('assistant', `❌ Error: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  if (view === 'bubble') {
    return (
      <div className="bubble-root">
        <button
          className="global-bubble"
          onPointerDown={onBubbleDown}
          onPointerUp={onBubbleUp}
          aria-label="Open AI Screen Control"
          title="Tap to open · hold to move"
        >
          <span className="bubble-emoji">🤖</span>
        </button>
      </div>
    );
  }

  if (view === 'settings') {
    return (
      <SettingsPanel
        config={config}
        onSave={(c) => { setConfig(c); setView('chat'); }}
        onClose={() => setView('chat')}
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
        connected={config.provider === 'ollama' ? ollamaUp : !!keyFor(config)}
        openSettings={() => setView('settings')}
        onMinimize={minimize}
        useScreen={useScreen}
        onToggleScreen={() => setUseScreen((v) => !v)}
      />
    </div>
  );
}
