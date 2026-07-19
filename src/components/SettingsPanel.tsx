import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import '../styles/SettingsPanel.css';

// Open an external link in the real browser (Tauri webviews don't do this by default).
function openExternal(url: string) {
  invoke('open_url', { url }).catch(() => window.open(url, '_blank'));
}

export type Provider = 'claude' | 'openai' | 'gemini' | 'ollama';

export interface ProviderConfig {
  provider: Provider;
  claudeKey: string;
  openaiKey: string;
  geminiKey: string;
}

interface SettingsPanelProps {
  config: ProviderConfig;
  onSave: (config: ProviderConfig) => void;
  onClose: () => void;
}

const PROVIDERS: { id: Provider; label: string; icon: string; keyPage: string; model: string }[] = [
  { id: 'ollama', label: 'Local AI · Free', icon: '💻', keyPage: 'https://ollama.com/download', model: 'gemma3' },
  { id: 'claude', label: 'Claude', icon: '🤖', keyPage: 'https://console.anthropic.com/settings/keys', model: 'claude-3-5-sonnet-20241022' },
  { id: 'openai', label: 'OpenAI (GPT-4o)', icon: '⚡', keyPage: 'https://platform.openai.com/api-keys', model: 'gpt-4o' },
  { id: 'gemini', label: 'Gemini', icon: '🎨', keyPage: 'https://aistudio.google.com/app/apikey', model: 'gemini-flash-latest' },
];

export default function SettingsPanel({ config, onSave, onClose }: SettingsPanelProps) {
  const [draft, setDraft] = useState<ProviderConfig>(config);
  const [show, setShow] = useState<Record<string, boolean>>({});

  const set = (patch: Partial<ProviderConfig>) => setDraft((d) => ({ ...d, ...patch }));
  const toggle = (id: string) => setShow((s) => ({ ...s, [id]: !s[id] }));

  const keyField = (id: Exclude<Provider, 'ollama'>) => {
    const map = { claude: 'claudeKey', openai: 'openaiKey', gemini: 'geminiKey' } as const;
    return map[id];
  };

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <button className="back-btn" onClick={onClose} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <h1>Settings</h1>
      </div>

      <div className="settings-content">
        <div className="setting-group">
          <h3>Active AI</h3>
          <p className="help-text">Choose which AI answers your questions. You can switch anytime.</p>
          <div className="provider-picker">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                className={`provider-chip ${draft.provider === p.id ? 'active' : ''}`}
                onClick={() => set({ provider: p.id })}
              >
                <span className="chip-icon">{p.icon}</span>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {draft.provider === 'ollama' && (
          <div className="setting-group">
            <h3>💻 Local AI — Free (no key, no credit card)</h3>
            <p className="info-text">Run a smart AI on your own computer. Free, private, works offline.</p>
            <ol className="ollama-steps">
              <li>Install Ollama (one click):
                <a href="https://ollama.com/download" onClick={(e) => { e.preventDefault(); openExternal('https://ollama.com/download'); }}> ollama.com/download →</a>
              </li>
              <li>Open a terminal and download a vision model:
                <code>ollama pull gemma3</code>
              </li>
              <li>Come back here and just start chatting — no key needed.</li>
            </ol>
            <p className="info-text">Needs a reasonably modern computer (8&nbsp;GB+ RAM). Less powerful than Claude/GPT, but completely free.</p>
          </div>
        )}

        {PROVIDERS.filter((p) => p.id !== 'ollama').map((p) => {
          const field = keyField(p.id as Exclude<Provider, 'ollama'>);
          return (
            <div className="setting-group" key={p.id}>
              <label htmlFor={`key-${p.id}`}>
                {p.icon} {p.label} API key
              </label>
              <div className="api-key-input">
                <input
                  id={`key-${p.id}`}
                  type={show[p.id] ? 'text' : 'password'}
                  value={(draft as any)[field]}
                  onChange={(e) => set({ [field]: e.target.value } as any)}
                  placeholder={p.id === 'claude' ? 'sk-ant-...' : p.id === 'openai' ? 'sk-...' : 'AQ... or AIza...'}
                />
                <button className="toggle-btn" onClick={() => toggle(p.id)} type="button" aria-label="Show/hide key">
                  {show[p.id] ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="help-text">
                <a href={p.keyPage} onClick={(e) => { e.preventDefault(); openExternal(p.keyPage); }}>
                  Get a {p.label} key →
                </a>
              </p>
            </div>
          );
        })}

        <div className="setting-group">
          <h3>How it works</h3>
          <p className="info-text">💻 <strong>Local AI</strong> is completely free — no key, no credit card. The paid APIs (Claude/GPT/Gemini) are smarter but now require billing.</p>
          <p className="info-text">📸 The app captures your screen automatically with every question — you never upload anything.</p>
          <p className="info-text">🔀 Switch between AIs anytime.</p>
        </div>
      </div>

      <div className="settings-footer">
        <button className="cancel-btn" onClick={onClose}>Cancel</button>
        <button className="save-btn" onClick={() => onSave(draft)}>Save</button>
      </div>
    </div>
  );
}

export { PROVIDERS };
