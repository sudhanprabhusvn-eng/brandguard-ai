import React, { useState } from 'react';
import type { AiProviderConfig } from '../../types';
import { aiContextualService } from '../../services/aiContextualService';
import {
  Sparkles,
  Key,
  Check,
  ShieldCheck,
  X,
  ExternalLink,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface AiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: (config: AiProviderConfig) => void;
}

export const AiSettingsModal: React.FC<AiSettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved
}) => {
  const [config, setConfig] = useState<AiProviderConfig>(() => aiContextualService.loadConfig());
  const [apiKeyInput, setApiKeyInput] = useState<string>(config.apiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    const updated: AiProviderConfig = {
      ...config,
      apiKey: apiKeyInput.trim() || undefined
    };
    aiContextualService.saveConfig(updated);
    if (onConfigSaved) onConfigSaved(updated);
    onClose();
  };

  const handleTestConnection = async () => {
    if (!apiKeyInput.trim()) {
      setTestResult({
        success: false,
        message: 'Please enter a Gemini API key to test the connection.'
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.modelName)}:generateContent`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKeyInput.trim()
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond with JSON: {"status":"ok"}' }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      setIsTesting(false);

      if (res.ok) {
        setTestResult({
          success: true,
          message: `Connection successful! Connected to Google Gemini (${config.modelName}).`
        });
      } else {
        const errJson = await res.json().catch(() => null);
        const msg = errJson?.error?.message || `HTTP ${res.status} ${res.statusText}`;
        setTestResult({
          success: false,
          message: `API Connection Failed: ${msg}`
        });
      }
    } catch (err: unknown) {
      setIsTesting(false);
      const msg = err instanceof Error ? err.message : 'Network failure';
      setTestResult({
        success: false,
        message: `Network connection error: ${msg}`
      });
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content" style={{ maxWidth: '560px', padding: '0', overflow: 'hidden' }}>
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          backgroundColor: 'var(--color-sand)',
          borderBottom: '1px solid var(--color-sand-dark)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(199, 184, 255, 0.4)',
              color: 'var(--color-deep-teal)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-midnight-ink)' }}>
                AI Contextual Review Settings
              </h3>
              <p className="text-muted" style={{ fontSize: '12px' }}>
                Configure live semantic analysis, brand voice & claim substantiation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ padding: '4px', borderRadius: '50%' }}
            title="Close Settings"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Status & Zero-Cost Notice */}
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(0, 229, 168, 0.08)',
            border: '1px solid var(--color-mint)',
            borderRadius: 'var(--radius-md)',
            fontSize: '12.5px',
            lineHeight: 1.5,
            color: 'var(--color-midnight-ink)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}>
            <ShieldCheck size={18} color="var(--color-deep-teal)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Demo mode:</strong> BrandGuard AI can call Google Gemini using your own API key (<span className="text-mono">gemini-2.5-flash</span>) with zero paid dependencies.
              Deterministic rule checking works 100% offline at all times.
            </div>
          </div>

          {/* Toggle Enable/Disable */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                Enable AI Contextual Review
              </label>
              <p className="text-muted" style={{ fontSize: '12px' }}>
                Run contextual claim verification and brand voice matching alongside deterministic checks.
              </p>
            </div>

            <label className="switch">
              <input
                type="checkbox"
                checked={config.isEnabled}
                onChange={(e) => setConfig({ ...config, isEnabled: e.target.checked })}
              />
              <span className="switch-slider" />
            </label>
          </div>

          {/* Provider Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Model Provider
            </label>
            <select
              value={config.providerId}
              onChange={(e) => setConfig({ ...config, providerId: e.target.value as 'gemini_free' | 'none' })}
              className="form-select"
            >
              <option value="gemini_free">Google Gemini (Free Tier / Flash)</option>
              <option value="none">Disabled (Deterministic Rule Engine Only)</option>
            </select>
          </div>

          {/* API Key Input */}
          {config.providerId === 'gemini_free' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Key size={14} color="var(--color-deep-teal)" />
                  <span>Google Gemini API Key</span>
                </label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '11.5px', color: 'var(--color-deep-teal)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontWeight: 500 }}
                >
                  <span>Get Free Key (Google AI Studio)</span>
                  <ExternalLink size={11} />
                </a>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Paste AI Studio API key (AIzaSy...)"
                  className="form-input"
                  style={{ flex: 1, fontFamily: showKey ? 'monospace' : undefined }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '0 12px', fontSize: '12px' }}
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                Kept in this tab session only. Your key is sent to Google for AI requests; do not use a shared production key in this browser-only demo.
              </span>
            </div>
          )}

          {/* Model Name */}
          {config.providerId === 'gemini_free' && (
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Model Identifier
              </label>
              <input
                type="text"
                value={config.modelName}
                onChange={(e) => setConfig({ ...config, modelName: e.target.value })}
                className="form-input"
                placeholder="gemini-2.5-flash"
              />
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                Default: <span className="text-mono">gemini-2.5-flash</span> (optimized for high speed and low latency).
              </span>
            </div>
          )}

          {/* Test Connection Button & Result */}
          {config.providerId === 'gemini_free' && (
            <div>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !apiKeyInput.trim()}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {isTesting ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} color="var(--color-deep-teal)" />}
                <span>{isTesting ? 'Testing Connection...' : 'Test Provider Connection'}</span>
              </button>

              {testResult && (
                <div style={{
                  marginTop: '10px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: testResult.success ? 'var(--state-success-bg)' : 'var(--state-critical-bg)',
                  border: `1px solid ${testResult.success ? 'var(--state-success-border)' : 'var(--state-critical-border)'}`,
                  fontSize: '12px',
                  color: testResult.success ? 'var(--state-success-text)' : 'var(--state-critical-text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {testResult.success ? <Check size={14} /> : <AlertCircle size={14} />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px',
          backgroundColor: 'var(--color-sand)',
          borderTop: '1px solid var(--color-sand-dark)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px'
        }}>
          <button
            onClick={onClose}
            className="btn btn-secondary btn-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary btn-sm"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
