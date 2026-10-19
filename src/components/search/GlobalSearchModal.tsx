import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Star, ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, CornerDownLeft, Sparkles } from 'lucide-react';
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

  // Auto focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global Escape and Arrow Key handling
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

  // Filter repositories based on search term
  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) {
      // Return top starred/popular tools by default for quick access
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

  // Handle keyboard list navigation
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
        className="w-full max-w-2xl bg-[#131B27] border border-[#223044] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-xs text-[#F2F6FA]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#1E2B3C] bg-[#0B1018]">
          <Search className="w-5 h-5 text-[#52D5C5] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search tools by name, description, category, or stack (e.g. 'video', 'orm', 'drizzle')..."
            className="flex-1 bg-transparent text-sm text-[#F2F6FA] placeholder-[#718296] focus:outline-hidden"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                inputRef.current?.focus();
              }}
              className="p-1 text-[#718296] hover:text-[#F2F6FA]"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium text-[#718296] bg-[#1A2533] border border-[#223044] rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-[#1E2B3C]/50 p-1.5">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-[#718296] space-y-2">
              <Search className="w-8 h-8 mx-auto text-[#223044]" />
              <p className="text-sm font-medium text-[#A4B3C3]">No tools matched "{searchTerm}"</p>
              <p className="text-[11px]">Try searching by keyword, purpose, or broader technology terms.</p>
              {onNavigateToAtlasWithQuery && searchTerm.trim() && (
                <button
                  onClick={() => {
                    onNavigateToAtlasWithQuery(searchTerm.trim());
                    onClose();
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1A2533] hover:bg-[#223044] text-[#52D5C5] rounded-md font-medium"
                >
                  <span>Search across all facets in Atlas</span>
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
                    isSelected ? 'bg-[#1A2533] border border-[#52D5C5]/40' : 'hover:bg-[#162130]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-sm text-[#F2F6FA] truncate">{repo.name}</span>
                      <span className="text-[11px] text-[#718296] font-mono truncate">/{repo.owner.login}</span>
                      <span className="text-[11px] text-[#52D5C5] bg-[#52D5C5]/10 px-2 py-0.2 rounded font-medium">
                        {repo.purpose?.technicalCategory}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A4B3C3] line-clamp-1 leading-relaxed">
                      {repo.description}
                    </p>
                  </div>

                  {/* Metadata Chips */}
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Compatibility */}
                    <div className="flex items-center gap-1 text-[11px]">
                      {compat.status === 'confirmed_match' ? (
                        <span className="text-[#34D399] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span className="hidden sm:inline">Compatible</span>
                        </span>
                      ) : compat.status === 'conflict' ? (
                        <span className="text-[#F87171] flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span className="hidden sm:inline">Conflict</span>
                        </span>
                      ) : (
                        <span className="text-[#FBBF24] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span className="hidden sm:inline">Partial</span>
                        </span>
                      )}
                    </div>

                    {/* Agent Readiness */}
                    <div className="flex items-center gap-1 font-mono text-[11px] text-[#A4B3C3]" title="Agent Readiness">
                      <ShieldCheck className="w-3 h-3 text-[#52D5C5]" />
                      <span>{repo.agentReadiness?.score}%</span>
                    </div>

                    {/* Stars */}
                    <div className="flex items-center gap-1 font-mono text-[11px] text-[#A4B3C3]">
                      <Star className="w-3 h-3 text-[#FBBF24]" />
                      <span>{formattedStars}</span>
                    </div>

                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-[#52D5C5] hidden sm:block" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0B1018] border-t border-[#1E2B3C] text-[11px] text-[#718296]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[#131B27] border border-[#223044] text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-[#131B27] border border-[#223044] text-[10px]">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[#131B27] border border-[#223044] text-[10px]">↵</kbd>
              Inspect
            </span>
          </div>

          {searchTerm.trim() && onNavigateToAtlasWithQuery && (
            <button
              onClick={() => {
                onNavigateToAtlasWithQuery(searchTerm.trim());
                onClose();
              }}
              className="text-[#52D5C5] hover:underline flex items-center gap-1 font-medium"
            >
              <span>Explore "{searchTerm}" in Atlas</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
