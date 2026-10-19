import React, { useState } from 'react';
import { X, Moon, Sun, Check, RotateCcw } from 'lucide-react';
import type { UserPreferences } from '../../services/storage.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: UserPreferences;
  onUpdatePreferences: (prefs: Partial<UserPreferences>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onUpdatePreferences,
}) => {
  const [targetStackInput, setTargetStackInput] = useState(preferences.targetStack);
  const [savedMessage, setSavedMessage] = useState(false);

  // Close on Escape key
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSaveStack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStackInput.trim()) return;
    onUpdatePreferences({ targetStack: targetStackInput.trim() });
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  };

  const stackPresets = [
    'Next.js + TypeScript + Tailwind',
    'React + Vite + TypeScript',
    'Python + FastAPI + PostgreSQL',
    'Node.js + Express + TypeScript',
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div
        className="w-full max-w-lg p-6 bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl text-xs text-[var(--text-primary)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] mb-5">
          <h2 id="settings-title" className="text-base font-bold text-[var(--text-primary)]">
            Workspace Settings & Preferences
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Target Stack Configuration */}
          <div>
            <label className="block text-xs font-semibold text-[#F2F6FA] mb-1">
              Default Target Stack for Compatibility Checks
            </label>
            <p className="text-[11px] text-[#718296] mb-3 leading-relaxed">
              Nexora automatically analyzes every repository's dependencies and frameworks against this environment.
            </p>

            <form onSubmit={handleSaveStack} className="flex gap-2">
              <input
                type="text"
                value={targetStackInput}
                onChange={(e) => setTargetStackInput(e.target.value)}
                placeholder="e.g. Next.js + TypeScript + Tailwind"
                className="flex-1 h-9 px-3 bg-[#0B1018] border border-[#223044] rounded-md text-[#F2F6FA] focus:border-[#52D5C5]"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-[#52D5C5] hover:bg-[#75E5D7] text-[#0B1018] font-semibold rounded-md transition-colors shrink-0"
              >
                Save Stack
              </button>
            </form>

            {savedMessage && (
              <span className="text-[11px] text-[#34D399] mt-1.5 block flex items-center gap-1">
                <Check className="w-3 h-3" /> Stack updated and applied to discovery workspace!
              </span>
            )}

            {/* Presets */}
            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-[#718296]">Presets:</span>
              {stackPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setTargetStackInput(preset);
                    onUpdatePreferences({ targetStack: preset });
                  }}
                  className="px-2 py-0.5 rounded bg-[#1A2533] hover:bg-[#223044] text-[11px] text-[#A4B3C3] border border-[#223044]"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Theme & Reduced Motion */}
          <div className="pt-4 border-t border-[#1E2B3C] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#F2F6FA] block">Appearance Theme</span>
                <span className="text-[11px] text-[#718296]">Precision Atlas dark or light mode</span>
              </div>
              <div className="flex items-center gap-1 p-0.5 bg-[#0B1018] border border-[#223044] rounded-lg">
                <button
                  onClick={() => onUpdatePreferences({ theme: 'dark' })}
                  className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                    preferences.theme === 'dark' ? 'bg-[#1A2533] text-[#F2F6FA]' : 'text-[#718296]'
                  }`}
                >
                  <Moon className="w-3 h-3" /> Dark
                </button>
                <button
                  onClick={() => onUpdatePreferences({ theme: 'light' })}
                  className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                    preferences.theme === 'light' ? 'bg-[#1A2533] text-[#F2F6FA]' : 'text-[#718296]'
                  }`}
                >
                  <Sun className="w-3 h-3" /> Light
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#F2F6FA] block">Reduced Motion</span>
                <span className="text-[11px] text-[#718296]">Disable transitions and interactive spring loops</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.reducedMotion}
                onChange={(e) => onUpdatePreferences({ reducedMotion: e.target.checked })}
                className="w-4 h-4 accent-[#52D5C5] rounded bg-[#0B1018] border-[#223044]"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-[#1E2B3C] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1A2533] hover:bg-[#223044] text-[#F2F6FA] font-medium rounded-md transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
