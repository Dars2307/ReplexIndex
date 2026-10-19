import React, { useState } from 'react';
import {
  Search,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Terminal,
  Cpu,
  Layers,
  Palette,
  Video,
  Database,
  Server,
  Star,
  ExternalLink,
  ChevronRight,
  Compass,
  Zap,
  FlaskConical,
} from 'lucide-react';
import type { Repository, TechnicalCategory } from '../../types/index.ts';
import { CATEGORIES } from '../../data/categories.ts';
import { evaluateCompatibility } from '../../engines/compatibility.ts';

interface DiscoverHomeProps {
  repositories: Repository[];
  userStack: string;
  onSearch: (query: string, category?: TechnicalCategory | 'All') => void;
  onSelectRepository: (repo: Repository) => void;
  onToggleCompare: (repo: Repository) => void;
  comparedRepoIds: string[];
}

export const DiscoverHome: React.FC<DiscoverHomeProps> = ({
  repositories,
  userStack,
  onSearch,
  onSelectRepository,
  onToggleCompare,
  comparedRepoIds,
}) => {
  const [searchInput, setSearchInput] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSearch(searchInput.trim());
    } else {
      onSearch('', 'All');
    }
  };

  const handleQuickTagClick = (tag: string, cat?: TechnicalCategory) => {
    onSearch(tag, cat || 'All');
  };

  // 3 spotlight tools for the hero section
  const spotlightIds = ['remotion-dev/remotion', 'drizzle-team/drizzle-orm', 'huggingface/transformers.js'];
  const spotlightRepos = spotlightIds
    .map((id) => repositories.find((r) => r.id.toLowerCase() === id.toLowerCase()))
    .filter((r): r is Repository => Boolean(r));

  return (
    <div className="relative overflow-hidden min-h-screen bg-[var(--canvas)] text-[var(--text-primary)]">
      {/* Background Decorative Gradients & Grid (Stripe/Supabase style) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-[var(--accent)]/15 via-[var(--accent)]/5 to-transparent blur-3xl opacity-70" />
        <div className="absolute top-60 right-0 w-[500px] h-[400px] bg-gradient-to-bl from-blue-500/10 to-transparent blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e2b3c12_1px,transparent_1px),linear-gradient(to_bottom,#1e2b3c12_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 text-center">
        {/* Release / Status Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface-1)] border border-[var(--accent)]/20 text-xs text-[var(--text-secondary)] shadow-sm mb-6 hover:border-[var(--accent)]/50 transition-colors">
          <span className="flex h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse" />
          <span className="font-semibold text-[var(--accent)]">Nexora</span>
          <span className="text-[var(--border-strong)]">·</span>
          <span className="font-medium text-[var(--text-secondary)]">Agent Intelligence Platform</span>
          <span className="text-[var(--border-strong)]">·</span>
          <span>Verified for {userStack}</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[var(--text-primary)] leading-[1.1] max-w-4xl mx-auto">
          Discover, evaluate & connect <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] via-[#75E5D7] to-cyan-400">
            open-source tools
          </span>{' '}
          with confidence.
        </h1>

        <p className="mt-5 text-base sm:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
          Nexora is the agent intelligence platform built for human developers and autonomous AI agents — grounded in deterministic manifest evidence, compatibility scoring, and live MCP tooling.
        </p>

        {/* Central Prominent Search Bar */}
        <form onSubmit={handleSearchSubmit} className="mt-8 max-w-2xl mx-auto relative group">
          <div className="relative flex items-center bg-[var(--surface-1)] border-2 border-[var(--border-subtle)] focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_4px_var(--accent-glow),0_8px_32px_rgba(0,0,0,0.3)] rounded-2xl shadow-lg transition-all overflow-hidden p-1.5">
            <div className="pl-4 pr-2 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by capability, stack, or keyword..."
              className="w-full h-12 bg-transparent text-sm sm:text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none px-2"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] hover:shadow-[0_4px_16px_var(--accent-glow)] active:scale-95 text-[#090E16] font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-md shrink-0 cursor-pointer"
            >
              <span>Explore</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Query Suggestions */}
          <div className="mt-3.5 flex items-center justify-center gap-1.5 flex-wrap text-xs text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text-secondary)]">Trending:</span>
            {[
              { label: 'Next.js 15', query: 'Next.js', cat: 'Frontend Engineering' as TechnicalCategory },
              { label: 'Video Canvas', query: 'Remotion video', cat: 'Video & Multimedia' as TechnicalCategory },
              { label: 'Type-Safe SQL', query: 'Drizzle ORM', cat: 'Databases' as TechnicalCategory },
              { label: 'AI Transformers', query: 'Transformers LLM', cat: 'AI & Machine Learning' as TechnicalCategory },
              { label: 'Tailwind UI', query: 'Tailwind shadcn', cat: 'Design & UI' as TechnicalCategory },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleQuickTagClick(item.query, item.cat)}
                className="px-2.5 py-1 rounded-lg bg-[var(--surface-1)] hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--accent)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
              >
                {item.label}
              </button>
            ))}
          </div>
        </form>

        {/* Live Metrics Ribbon */}
        <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 max-w-4xl mx-auto rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-1)]/90 backdrop-blur-md shadow-md">
          <div className="text-center px-4 py-5 border-r border-b sm:border-b-0 border-[var(--border-subtle)]">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-[var(--accent)]">
              {repositories.length}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-1 font-medium">Verified Repositories</div>
          </div>
          <div className="text-center px-4 py-5 border-b sm:border-b-0 sm:border-r border-[var(--border-subtle)]">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-[var(--accent)]">
              100%
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-1 font-medium">Manifest Determinism</div>
          </div>
          <div className="text-center px-4 py-5 border-r border-[var(--border-subtle)]">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[var(--text-primary)]">
              4-Tier
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-1 font-medium">Compatibility Matrix</div>
          </div>
          <div className="text-center px-4 py-5">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[var(--accent)]">
              MCP
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-1 font-medium">Protocol Ready</div>
          </div>
        </div>
      </section>

      {/* Featured Architecture Spotlight */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 border-t border-[var(--border-subtle)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Architectural Spotlights</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
              Production-grade packages with verified manifests
            </h2>
          </div>
          <button
            onClick={() => onSearch('', 'All')}
            className="self-start sm:self-auto text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] flex items-center gap-1 group cursor-pointer"
          >
            <span>View all {repositories.length} tools</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {spotlightRepos.map((repo) => {
            const compat = evaluateCompatibility(repo, userStack);
            const isCompared = comparedRepoIds.includes(repo.id);

            return (
              <div
                key={repo.id}
                onClick={() => onSelectRepository(repo)}
                className="group relative p-6 bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-subtle)] hover:border-[var(--accent)]/40 rounded-2xl transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-xs hover:shadow-[0_8px_32px_rgba(0,0,0,0.25),0_0_0_1px_rgba(77,217,200,0.12)]"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-medium text-[var(--accent)] bg-[var(--accent)]/10 px-2.5 py-0.5 rounded-full">
                      {repo.purpose?.technicalCategory}
                    </span>
                    <div className="flex items-center gap-1 text-xs font-mono text-[var(--text-secondary)]">
                      <Star className="w-3.5 h-3.5 text-amber-400" />
                      <span>{(repo.stars / 1000).toFixed(1)}k</span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                    {repo.name}
                  </h3>
                  <span className="text-xs text-[var(--text-muted)] font-mono block mb-2">
                    {repo.fullName}
                  </span>

                  <p className="text-xs text-[var(--text-secondary)] line-clamp-3 leading-relaxed mb-4">
                    {repo.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {compat.status === 'confirmed_match' ? (
                      <span className="text-emerald-400 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirmed Fit</span>
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Partial Match</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleCompare(repo);
                      }}
                      className={`px-2 py-1 text-[11px] rounded border transition-colors cursor-pointer ${
                        isCompared
                          ? 'bg-[var(--accent)] text-[#0B1018] border-[var(--accent)] font-semibold'
                          : 'bg-[var(--canvas)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {isCompared ? 'Compared' : '+ Compare'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Categories Grid (Click to Search) */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 border-t border-[var(--border-subtle)]">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider mb-1">
            <Compass className="w-3.5 h-3.5" />
            <span>Category Taxonomies</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
            Explore tools by functional purpose
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[var(--text-muted)]">
            Every repository is indexed with validated runtime environments, dependencies, and intended audiences.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => {
            const count = repositories.filter((r) => r.purpose?.technicalCategory === cat.id).length;
            const topRepos = repositories
              .filter((r) => r.purpose?.technicalCategory === cat.id)
              .slice(0, 3);

            return (
              <div
                key={cat.id}
                onClick={() => onSearch('', cat.id)}
                className="p-5 bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-subtle)] hover:border-[var(--accent)]/40 rounded-2xl transition-all cursor-pointer group shadow-xs hover:shadow-[0_8px_24px_rgba(0,0,0,0.2),0_0_0_1px_rgba(77,217,200,0.1)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-[var(--surface-2)] group-hover:bg-[var(--accent)]/15 border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] transition-colors">
                      {cat.id === 'Design & UI' && <Palette className="w-4 h-4" />}
                      {cat.id === 'Frontend Engineering' && <Layers className="w-4 h-4" />}
                      {cat.id === 'Video & Multimedia' && <Video className="w-4 h-4" />}
                      {cat.id === 'AI & Machine Learning' && <Cpu className="w-4 h-4" />}
                      {cat.id === 'Databases' && <Database className="w-4 h-4" />}
                      {cat.id === 'Backend Engineering' && <Server className="w-4 h-4" />}
                      {cat.id === 'DevOps & Infrastructure' && <Terminal className="w-4 h-4" />}
                      {cat.id === 'Developer Productivity' && <Zap className="w-4 h-4" />}
                      {cat.id === 'Testing' && <FlaskConical className="w-4 h-4" />}
                    </div>
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-secondary)]">
                      {count} tools
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                    {cat.name}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                    {cat.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]">
                  <span className="truncate max-w-[200px]">
                    {topRepos.map((r) => r.name).join(', ')}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-[var(--accent)]" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Agent-Native Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-14 border-t border-[var(--border-subtle)]">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-[var(--surface-1)] via-[var(--surface-1)] to-[var(--surface-2)] border border-[var(--accent)]/20 shadow-[0_0_40px_rgba(77,217,200,0.06),inset_0_1px_0_rgba(77,217,200,0.08)] relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-[var(--accent)]/8 blur-3xl rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-1/2 w-64 h-32 bg-[var(--accent)]/5 blur-2xl pointer-events-none" />

          <div className="relative max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-[var(--accent)]/15 border border-[var(--accent)]/25">
                <svg className="w-2.5 h-2.5 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="12 2 15 9 22 12 15 15 12 22 9 15 2 12 9 9" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
                Nexora MCP Integration
              </span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">
              Give your coding agents the power to discover and execute verified code.
            </h2>
            <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed max-w-xl">
              Nexora provides a live Model Context Protocol (MCP) server that connects Cursor, Claude Desktop, Antigravity, and autonomous LLM agents to verified repository graphs and manifest compatibility engines.
            </p>
            <div className="mt-6 flex items-center gap-3 flex-wrap">
              <button
                onClick={() => onSearch('agent mcp autonomous')}
                className="px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] hover:shadow-[0_4px_16px_var(--accent-glow)] active:scale-95 text-[#090E16] font-bold text-xs transition-all shadow-sm cursor-pointer"
              >
                Explore Agent Tools
              </button>
              <button
                onClick={() => {
                  const ev = new CustomEvent('navigate_tab', { detail: 'platform' });
                  window.dispatchEvent(ev);
                }}
                className="px-4 py-2.5 rounded-xl bg-[var(--canvas)] hover:bg-[var(--surface-1)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] font-medium text-xs transition-all cursor-pointer"
              >
                Inspect MCP Server Specs
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
