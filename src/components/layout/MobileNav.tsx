import React from 'react';
import { Compass, Search, GitCompare, Bookmark, Terminal } from 'lucide-react';
import type { NavView } from './Header.tsx';

interface MobileNavProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  compareCount: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentView, onNavigate, compareCount }) => {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-[var(--canvas)]/95 border-t border-[var(--border-subtle)] backdrop-blur-md flex items-center justify-around px-2 transition-colors"
      aria-label="Mobile Navigation Bar"
    >
      <button
        onClick={() => onNavigate('discover')}
        className={`flex flex-col items-center justify-center min-w-[40px] min-h-[44px] text-[10px] transition-colors cursor-pointer ${
          currentView === 'discover' ? 'text-[var(--accent)] font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
        }`}
        aria-label="Discover Overview"
      >
        <Compass className="w-4 h-4 mb-0.5" />
        <span>Discover</span>
      </button>

      <button
        onClick={() => onNavigate('search')}
        className={`flex flex-col items-center justify-center min-w-[40px] min-h-[44px] text-[10px] transition-colors cursor-pointer ${
          currentView === 'search' ? 'text-[var(--accent)] font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
        }`}
        aria-label="Search Workspace"
      >
        <Search className="w-4 h-4 mb-0.5" />
        <span>Search</span>
      </button>

      <button
        onClick={() => onNavigate('compare')}
        className={`relative flex flex-col items-center justify-center min-w-[40px] min-h-[44px] text-[10px] transition-colors cursor-pointer ${
          currentView === 'compare' ? 'text-[var(--accent)] font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
        }`}
        aria-label="Compare Tools"
      >
        <GitCompare className="w-4 h-4 mb-0.5" />
        <span>Compare</span>
        {compareCount > 0 && (
          <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-[var(--accent)] text-[#0B1018] rounded-full text-[9px] font-mono flex items-center justify-center font-bold">
            {compareCount}
          </span>
        )}
      </button>

      <button
        onClick={() => onNavigate('library')}
        className={`flex flex-col items-center justify-center min-w-[40px] min-h-[44px] text-[10px] transition-colors cursor-pointer ${
          currentView === 'library' ? 'text-[var(--accent)] font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
        }`}
        aria-label="Saved Library"
      >
        <Bookmark className="w-4 h-4 mb-0.5" />
        <span>Library</span>
      </button>

      <button
        onClick={() => onNavigate('platform')}
        className={`flex flex-col items-center justify-center min-w-[40px] min-h-[44px] text-[10px] transition-colors cursor-pointer ${
          currentView === 'platform' ? 'text-[var(--accent)] font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
        }`}
        aria-label="Developer Platform"
      >
        <Terminal className="w-4 h-4 mb-0.5" />
        <span>Platform</span>
      </button>
    </nav>
  );
};
