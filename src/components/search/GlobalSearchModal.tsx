import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Star, ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, CornerDownLeft } from 'lucide-react';
import type { Repository } from '../../types/index.ts';
import { evaluateCompatibility } from '../../engines/compatibility.ts';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  repositories: Repository[];
  userStack: string;
  onSelectRepository: (repo: Repository) => void;
  onNavigateToAtlasWithQuery?: (query: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  repositories,
  userStack,
  onSelectRepository,
  onNavigateToAtlasWithQuery,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
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

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) {
      return [...repositories].sort((a, b) => b.stars - a.stars).slice(0, 7);
    }
    const tokens = q.split(/\s+/).filter(Boolean);
    return repositories
      .filter((repo) => {
        const text = `${repo.name} ${repo.fullName} ${repo.description} ${(repo.topics || []).join(' ')} ${repo.purpose?.technicalCategory || ''} ${repo.purpose?.functionalPurpose || ''} ${(repo.stackEvidence?.frameworks || []).join(' ')}`.toLowerCase();
        return tokens.every((token) => text.includes(token));
      })
      .slice(0, 8);
  }, [searchTerm, repositories]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (filtered.length > 0 ? (prev + 1) % filtered.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        onSelectRepository(filtered[selectedIndex]);
        onClose();
      } else if (searchTerm.trim() && onNavigateToAtlasWithQuery) {
        onNavigateToAtlasWithQuery(searchTerm.trim());
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="global-search-heading"
    >
      <div
        className="w-full max-w-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-xs text-[var(--text-primary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--canvas)]">
          <Search className="w-5 h-5 text-[var(--accent)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search tools by name, category, or stack..."
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                inputRef.current?.focus();
              }}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium text-[var(--text-muted)] bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-[var(--border-subtle)]/50 p-1.5">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-[var(--text-muted)] space-y-2">
              <Search className="w-8 h-8 mx-auto text-[var(--border-subtle)]" />
              <p className="text-sm font-medium text-[var(--text-secondary)]">No tools matched "{searchTerm}"</p>
              <p className="text-[11px]">Try broader keywords or technology terms.</p>
              {onNavigateToAtlasWithQuery && searchTerm.trim() && (
                <button
                  onClick={() => {
                    onNavigateToAtlasWithQuery(searchTerm.trim());
                    onClose();
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-2)] hover:bg-[var(--surface-raised)] text-[var(--accent)] rounded-md font-medium cursor-pointer"
                >
                  <span>Search in full directory</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            filtered.map((repo, idx) => {
              const isSelected = idx === selectedIndex;
              const compat = evaluateCompatibility(repo, userStack);
              const formattedStars =
                repo.stars >= 1000 ? `${(repo.stars / 1000).toFixed(1)}k` : repo.stars.toString();

              return (
                <div
                  key={repo.id}
                  onClick={() => {
                    onSelectRepository(repo);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-lg flex items-center justify-between gap-4 cursor-pointer transition-colors ${
                    isSelected ? 'bg-[var(--surface-2)] border border-[var(--accent)]/40' : 'hover:bg-[var(--surface-2)]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-sm text-[var(--text-primary)] truncate">{repo.name}</span>
                      <span className="text-[11px] text-[var(--text-muted)] font-mono truncate">/{repo.owner.login}</span>
                      <span className="text-[11px] text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded font-medium">
                        {repo.purpose?.technicalCategory}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1 leading-relaxed">
                      {repo.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1 text-[11px]">
                      {compat.status === 'confirmed_match' ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span className="hidden sm:inline">Compatible</span>
                        </span>
                      ) : compat.status === 'conflict' ? (
                        <span className="text-rose-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span className="hidden sm:inline">Conflict</span>
                        </span>
                      ) : (
                        <span className="text-amber-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span className="hidden sm:inline">Partial</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 font-mono text-[11px] text-[var(--text-secondary)]" title="Agent Readiness">
                      <ShieldCheck className="w-3 h-3 text-[var(--accent)]" />
                      <span>{repo.agentReadiness?.score}%</span>
                    </div>

                    <div className="flex items-center gap-1 font-mono text-[11px] text-[var(--text-secondary)]">
                      <Star className="w-3 h-3 text-amber-400" />
                      <span>{formattedStars}</span>
                    </div>

                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-[var(--accent)] hidden sm:block" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--canvas)] border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-1)] border border-[var(--border-subtle)] text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-1)] border border-[var(--border-subtle)] text-[10px]">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-1)] border border-[var(--border-subtle)] text-[10px]">↵</kbd>
              Inspect
            </span>
          </div>

          {searchTerm.trim() && onNavigateToAtlasWithQuery && (
            <button
              onClick={() => {
                onNavigateToAtlasWithQuery(searchTerm.trim());
                onClose();
              }}
              className="text-[var(--accent)] hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <span>Explore "{searchTerm}" in Search</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
