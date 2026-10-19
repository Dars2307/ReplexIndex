import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  X,
  Grid,
  List,
  Network,
  RotateCcw,
  Star,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  Bookmark,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { Repository, SearchFilters, TechnicalCategory } from '../../types/index.ts';
import { searchRepositories } from '../../engines/search.ts';
import { evaluateCompatibility } from '../../engines/compatibility.ts';
import { CATEGORIES } from '../../data/categories.ts';

interface SearchWorkspaceProps {
  repositories: Repository[];
  userStack: string;
  initialQuery?: string;
  initialCategory?: TechnicalCategory | 'All';
  onSelectRepository: (repo: Repository) => void;
  comparedRepoIds: string[];
  onToggleCompare: (repo: Repository) => void;
  onSaveToCollection: (repo: Repository) => void;
}

export const SearchWorkspace: React.FC<SearchWorkspaceProps> = ({
  repositories,
  userStack,
  initialQuery = '',
  initialCategory = 'All',
  onSelectRepository,
  comparedRepoIds,
  onToggleCompare,
  onSaveToCollection,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<TechnicalCategory | 'All'>(initialCategory || 'All');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All');
  const [selectedFramework, setSelectedFramework] = useState<string>('All');
  const [selectedLicense, setSelectedLicense] = useState<string>('All');
  const [minReadiness, setMinReadiness] = useState<number>(0);
  const [compatFilter, setCompatFilter] = useState<'all' | 'compatible'>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'stars' | 'freshness' | 'readiness'>('relevance');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'graph'>('grid');
  const [page, setPage] = useState(1);
  const [copiedInstallId, setCopiedInstallId] = useState<string | null>(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Graph state (for integrated Visual Graph mode)
  const [selectedGraphNodeId, setSelectedGraphNodeId] = useState<string>(repositories[0]?.id || '');

  // Keep local query in sync if initialQuery or initialCategory changes from parent
  useEffect(() => {
    if (initialQuery !== undefined) setQuery(initialQuery);
    if (initialCategory) setSelectedCategory(initialCategory);
    setPage(1);
  }, [initialQuery, initialCategory]);

  const searchFilters: SearchFilters = useMemo(
    () => ({
      query,
      category: selectedCategory,
      language: selectedLanguage,
      framework: selectedFramework,
      license: selectedLicense,
      minReadinessScore: minReadiness > 0 ? minReadiness : undefined,
      userStack,
      sortBy,
      page,
      limit: 15,
    }),
    [query, selectedCategory, selectedLanguage, selectedFramework, selectedLicense, minReadiness, userStack, sortBy, page]
  );

  const searchResponse = useMemo(() => {
    let resp = searchRepositories(repositories, searchFilters);
    if (compatFilter === 'compatible') {
      const filteredResults = resp.results.filter(
        (r) => evaluateCompatibility(r, userStack).status === 'confirmed_match'
      );
      return {
        ...resp,
        results: filteredResults,
        total: filteredResults.length,
      };
    }
    return resp;
  }, [repositories, searchFilters, compatFilter, userStack]);

  const resetAllFilters = () => {
    setQuery('');
    setSelectedCategory('All');
    setSelectedLanguage('All');
    setSelectedFramework('All');
    setSelectedLicense('All');
    setMinReadiness(0);
    setCompatFilter('all');
    setSortBy('relevance');
    setPage(1);
  };

  const hasActiveFilters =
    query.trim() !== '' ||
    selectedCategory !== 'All' ||
    selectedLanguage !== 'All' ||
    selectedFramework !== 'All' ||
    selectedLicense !== 'All' ||
    minReadiness > 0 ||
    compatFilter !== 'all';

  // Available facet options
  const availableLanguages = useMemo(() => Object.keys(searchResponse.facets.languages).sort(), [searchResponse.facets.languages]);
  const availableFrameworks = useMemo(() => Object.keys(searchResponse.facets.frameworks).sort(), [searchResponse.facets.frameworks]);
  const availableLicenses = useMemo(() => Object.keys(searchResponse.facets.licenses).sort(), [searchResponse.facets.licenses]);

  const handleCopyInstall = (repo: Repository, e: React.MouseEvent) => {
    e.stopPropagation();
    const cmd = repo.installCommand || `npm install ${repo.name}`;
    navigator.clipboard.writeText(cmd);
    setCopiedInstallId(repo.id);
    setTimeout(() => setCopiedInstallId(null), 1500);
  };

  // Graph calculations for the integrated graph view
  const graphNodes = searchResponse.results || [];
  const selectedGraphRepo = useMemo(() => {
    return repositories.find((r) => r.id.toLowerCase() === selectedGraphNodeId.toLowerCase()) || graphNodes[0];
  }, [repositories, selectedGraphNodeId, graphNodes]);

  const nodeCoordinates = useMemo(() => {
    const coords = new Map<string, { x: number; y: number }>();
    const count = graphNodes.length;
    const cx = 380;
    const cy = 250;
    const radius = Math.min(220, 80 + count * 10);

    graphNodes.forEach((node, i) => {
      const angle = (i / Math.max(1, count)) * 2 * Math.PI;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      coords.set(node.id, { x, y });
    });

    return coords;
  }, [graphNodes]);

  const graphEdges = useMemo(() => {
    const linkList: { sourceId: string; targetId: string; type: string }[] = [];
    graphNodes.forEach((node) => {
      node.relationships?.forEach((rel) => {
        const targetNode = graphNodes.find((n) => n.id.toLowerCase() === rel.targetId.toLowerCase());
        if (targetNode) {
          linkList.push({ sourceId: node.id, targetId: targetNode.id, type: rel.relationshipType });
        }
      });
    });
    return linkList;
  }, [graphNodes]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 text-[var(--text-primary)]">
      {/* Search Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Repository Search & Directory
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--border-subtle)]">
              {searchResponse.total} found
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Explore verified open-source libraries evaluated against <strong className="text-[var(--text-primary)] font-mono">{userStack}</strong>
          </p>
        </div>

        {/* Global Search Input Box */}
        <div className="w-full md:w-96 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Filter by keyword, purpose, framework..."
            className="w-full h-10 pl-10 pr-9 bg-[var(--surface-1)] border border-[var(--border-subtle)] focus:border-[var(--accent)] focus:outline-hidden rounded-xl text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] shadow-xs transition-colors"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              aria-label="Clear query"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Multi-Column Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pt-6 items-start">
        {/* Left Sidebar: Faceted Filter Panel (Supabase / Stripe dashboard style) */}
        <aside className="lg:col-span-1 space-y-6 bg-[var(--surface-1)] p-5 rounded-2xl border border-[var(--border-subtle)] shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Filter Facets</span>
            </div>
            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="text-[11px] text-[var(--accent)] hover:underline flex items-center gap-1 font-medium cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Compatibility Preset Toggle */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-2">
              Stack Compatibility
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[var(--surface-2)] rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setCompatFilter('all')}
                className={`py-1 rounded text-center transition-colors cursor-pointer ${
                  compatFilter === 'all'
                    ? 'bg-[var(--surface-1)] text-[var(--text-primary)] font-semibold shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                All Tools
              </button>
              <button
                type="button"
                onClick={() => setCompatFilter('compatible')}
                className={`py-1 rounded text-center transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                  compatFilter === 'compatible'
                    ? 'bg-[var(--accent)] text-[#0B1018] font-bold shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Matches</span>
              </button>
            </div>
          </div>

          {/* Category Facet */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-2">
              Categories
            </label>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All');
                  setPage(1);
                }}
                className={`w-full px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between text-left transition-colors cursor-pointer ${
                  selectedCategory === 'All'
                    ? 'bg-[var(--surface-2)] text-[var(--accent)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>All Categories</span>
                <span className="font-mono text-[10px] text-[var(--text-muted)]">{repositories.length}</span>
              </button>
              {CATEGORIES.map((cat) => {
                const count = repositories.filter((r) => r.purpose?.technicalCategory === cat.id).length;
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(isSelected ? 'All' : cat.id);
                      setPage(1);
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--surface-2)] text-[var(--accent)] font-semibold border-l-2 border-[var(--accent)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="truncate pr-2">{cat.name}</span>
                    <span className="font-mono text-[10px] text-[var(--text-muted)] shrink-0">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Programming Language */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
              Primary Language
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => {
                setSelectedLanguage(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 px-2.5 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-lg text-xs text-[var(--text-primary)] focus:border-[var(--accent)]"
            >
              <option value="All">All Languages ({repositories.length})</option>
              {availableLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang} ({searchResponse.facets.languages[lang]})
                </option>
              ))}
            </select>
          </div>

          {/* Framework Manifest */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
              Framework & Toolchain
            </label>
            <select
              value={selectedFramework}
              onChange={(e) => {
                setSelectedFramework(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 px-2.5 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-lg text-xs text-[var(--text-primary)] focus:border-[var(--accent)]"
            >
              <option value="All">All Frameworks</option>
              {availableFrameworks.map((fw) => (
                <option key={fw} value={fw}>
                  {fw} ({searchResponse.facets.frameworks[fw]})
                </option>
              ))}
            </select>
          </div>

          {/* License */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
              License (SPDX)
            </label>
            <select
              value={selectedLicense}
              onChange={(e) => {
                setSelectedLicense(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 px-2.5 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-lg text-xs text-[var(--text-primary)] focus:border-[var(--accent)]"
            >
              <option value="All">All Licenses</option>
              {availableLicenses.map((lic) => (
                <option key={lic} value={lic}>
                  {lic} ({searchResponse.facets.licenses[lic]})
                </option>
              ))}
            </select>
          </div>

          {/* Agent Readiness Score Slider */}
          <div className="pt-2 border-t border-[var(--border-subtle)]">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-[var(--text-primary)]">Min Agent Readiness</span>
              <span className="font-mono text-[var(--accent)] font-bold">{minReadiness}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="90"
              step="10"
              value={minReadiness}
              onChange={(e) => {
                setMinReadiness(Number(e.target.value));
                setPage(1);
              }}
              className="w-full accent-[var(--accent)] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
              <span>0% (Any)</span>
              <span>50%</span>
              <span>90%+ (Strict)</span>
            </div>
          </div>
        </aside>

        {/* Right Content Area: Results, View Modes, Pagination */}
        <section className="lg:col-span-3 space-y-4">
          {/* Controls Bar: Sort, View Mode, Active Filter Tags */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl shadow-xs">
            {/* Active Filters Summary */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <span className="text-[var(--text-muted)] font-medium">Filters:</span>
              {selectedCategory !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--border-subtle)]">
                  <span>{selectedCategory}</span>
                  <button onClick={() => setSelectedCategory('All')}>
                    <X className="w-3 h-3 hover:text-red-400" />
                  </button>
                </span>
              )}
              {selectedLanguage !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--border-subtle)]">
                  <span>Lang: {selectedLanguage}</span>
                  <button onClick={() => setSelectedLanguage('All')}>
                    <X className="w-3 h-3 hover:text-red-400" />
                  </button>
                </span>
              )}
              {selectedFramework !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--border-subtle)]">
                  <span>Fw: {selectedFramework}</span>
                  <button onClick={() => setSelectedFramework('All')}>
                    <X className="w-3 h-3 hover:text-red-400" />
                  </button>
                </span>
              )}
              {compatFilter === 'compatible' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span>Confirmed Match</span>
                  <button onClick={() => setCompatFilter('all')}>
                    <X className="w-3 h-3 hover:text-red-400" />
                  </button>
                </span>
              )}
              {!hasActiveFilters && (
                <span className="text-[var(--text-muted)] italic">No active filter restrictions</span>
              )}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              {/* Sort selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-8 px-2.5 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-lg text-xs font-medium text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-hidden"
                aria-label="Sort repositories"
              >
                <option value="relevance">Sort: Highest Relevance</option>
                <option value="stars">Sort: Most Stars</option>
                <option value="freshness">Sort: Recently Pushed</option>
                <option value="readiness">Sort: Agent Readiness</option>
              </select>

              {/* View Switchers */}
              <div className="flex items-center h-8 p-0.5 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-lg">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    viewMode === 'grid' ? 'bg-[var(--surface-1)] text-[var(--accent)] shadow-xs' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                  title="Grid View"
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    viewMode === 'list' ? 'bg-[var(--surface-1)] text-[var(--accent)] shadow-xs' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                  title="Dense List View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('graph')}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    viewMode === 'graph' ? 'bg-[var(--surface-1)] text-[var(--accent)] shadow-xs' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                  title="Visual Graph Topology"
                >
                  <Network className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* View Mode 1: Redesigned Stripe/Supabase Style Grid Cards */}
          {viewMode === 'grid' && (
            <>
              {searchResponse.results.length === 0 ? (
                <div className="py-20 text-center bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl p-8">
                  <Search className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">No matching repositories found</h3>
                  <p className="mt-1 text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                    Try adjusting keywords, clearing specific language or framework filters, or resetting filters.
                  </p>
                  <button
                    onClick={resetAllFilters}
                    className="mt-4 px-4 py-2 text-xs font-bold text-[#0B1018] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg transition-colors cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResponse.results.map((repo) => {
                    const compat = evaluateCompatibility(repo, userStack);
                    const readiness = repo.agentReadiness?.score || 50;
                    const isCompared = comparedRepoIds.includes(repo.id);

                    return (
                      <div
                        key={repo.id}
                        onClick={() => onSelectRepository(repo)}
                        className="group relative flex flex-col justify-between p-5 bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-subtle)] hover:border-[var(--accent)]/50 rounded-2xl transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md"
                      >
                        <div>
                          {/* Top Badges */}
                          <div className="flex items-center justify-between gap-2 mb-2.5">
                            <span className="text-[11px] font-semibold text-[var(--accent)] bg-[var(--accent)]/10 px-2.5 py-0.5 rounded-full">
                              {repo.purpose?.technicalCategory}
                            </span>
                            <div className="flex items-center gap-1 text-xs font-mono font-medium text-amber-400 bg-[var(--canvas)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
                              <Star className="w-3 h-3 fill-amber-400" />
                              <span>{(repo.stars / 1000).toFixed(1)}k</span>
                            </div>
                          </div>

                          {/* Repo Title & Author */}
                          <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
                            {repo.name}
                          </h3>
                          <span className="text-xs text-[var(--text-muted)] font-mono block mb-2 truncate">
                            {repo.fullName}
                          </span>

                          <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed mb-3">
                            {repo.description}
                          </p>

                          {/* Tech Stack Evidence Chips */}
                          {repo.stackEvidence?.frameworks && repo.stackEvidence.frameworks.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap mb-3">
                              {repo.stackEvidence.frameworks.slice(0, 3).map((fw) => (
                                <span
                                  key={fw}
                                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-secondary)]"
                                >
                                  {fw}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Agent Readiness Health Bar */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="text-[var(--text-muted)] flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-[var(--accent)]" />
                                <span>Agent Readiness</span>
                              </span>
                              <span className="font-mono font-bold text-[var(--text-primary)]">{readiness}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-[var(--canvas)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
                              <div
                                className="h-full bg-gradient-to-r from-[var(--accent)] to-cyan-400 rounded-full"
                                style={{ width: `${readiness}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                          {/* Compatibility Indicator */}
                          <div className="flex items-center gap-1.5">
                            {compat.status === 'confirmed_match' ? (
                              <span className="flex items-center gap-1 text-emerald-400 font-medium text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Compatible</span>
                              </span>
                            ) : compat.status === 'conflict' ? (
                              <span className="flex items-center gap-1 text-rose-400 font-medium text-[11px]">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Conflict</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-amber-400 font-medium text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Partial</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => handleCopyInstall(repo, e)}
                              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--surface-2)] rounded border border-[var(--border-subtle)] transition-colors"
                              title="Copy install command"
                            >
                              {copiedInstallId === repo.id ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSaveToCollection(repo);
                              }}
                              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--surface-2)] rounded border border-[var(--border-subtle)] transition-colors"
                              title="Save to collection"
                            >
                              <Bookmark className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleCompare(repo);
                              }}
                              className={`px-2 py-1 text-[11px] font-semibold rounded border transition-colors cursor-pointer ${
                                isCompared
                                  ? 'bg-[var(--accent)] text-[#0B1018] border-[var(--accent)]'
                                  : 'bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-subtle)]'
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
              )}
            </>
          )}

          {/* View Mode 2: Detailed Dense List */}
          {viewMode === 'list' && (
            <div className="space-y-3">
              {searchResponse.results.map((repo) => {
                const compat = evaluateCompatibility(repo, userStack);
                const readiness = repo.agentReadiness?.score || 50;
                const isCompared = comparedRepoIds.includes(repo.id);

                return (
                  <div
                    key={repo.id}
                    onClick={() => onSelectRepository(repo)}
                    className="p-4 bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-subtle)] hover:border-[var(--accent)]/50 rounded-xl transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1 flex-wrap">
                        <span className="text-[var(--accent)] font-semibold">{repo.purpose?.technicalCategory}</span>
                        <span>·</span>
                        <span>{repo.primaryLanguage}</span>
                        <span>·</span>
                        <span>{repo.license?.spdxId}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors truncate">
                          {repo.name}
                        </h3>
                        <span className="text-xs text-[var(--text-muted)] font-mono truncate">/{repo.owner.login}</span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-secondary)] line-clamp-1 max-w-2xl leading-relaxed">
                        {repo.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1 font-mono text-xs text-amber-400">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{(repo.stars / 1000).toFixed(1)}k</span>
                      </div>
                      <div className="flex items-center gap-1 font-mono text-xs text-[var(--accent)]">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{readiness}%</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleCompare(repo);
                        }}
                        className={`px-2.5 py-1 text-xs font-semibold rounded border transition-colors cursor-pointer ${
                          isCompared
                            ? 'bg-[var(--accent)] text-[#0B1018] border-[var(--accent)]'
                            : 'bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-subtle)]'
                        }`}
                      >
                        {isCompared ? 'Compared' : '+ Compare'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* View Mode 3: Integrated Visual Graph Mode */}
          {viewMode === 'graph' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* SVG Visual Graph Canvas */}
              <div className="lg:col-span-2 relative bg-[var(--canvas)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden min-h-[500px] flex items-center justify-center p-4">
                <div className="absolute top-3 left-3 z-10 text-[11px] font-mono text-[var(--text-muted)] bg-[var(--surface-1)]/90 px-2.5 py-1 rounded border border-[var(--border-subtle)]">
                  Topology Map: {graphNodes.length} nodes
                </div>

                <svg className="w-full h-full min-h-[460px]" viewBox="0 0 760 500">
                  {/* Edges */}
                  {graphEdges.map((edge, i) => {
                    const s = nodeCoordinates.get(edge.sourceId);
                    const t = nodeCoordinates.get(edge.targetId);
                    if (!s || !t) return null;
                    return (
                      <line
                        key={i}
                        x1={s.x}
                        y1={s.y}
                        x2={t.x}
                        y2={t.y}
                        stroke="var(--accent)"
                        strokeWidth="1.5"
                        strokeOpacity="0.4"
                        strokeDasharray="4 2"
                      />
                    );
                  })}

                  {/* Nodes */}
                  {graphNodes.map((node) => {
                    const pt = nodeCoordinates.get(node.id);
                    if (!pt) return null;
                    const isSelected = selectedGraphRepo?.id === node.id;
                    return (
                      <g
                        key={node.id}
                        onClick={() => setSelectedGraphNodeId(node.id)}
                        className="cursor-pointer group"
                      >
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isSelected ? 18 : 12}
                          fill={isSelected ? 'var(--accent)' : 'var(--surface-1)'}
                          stroke={isSelected ? '#F2F6FA' : 'var(--border-strong)'}
                          strokeWidth={isSelected ? 3 : 1.5}
                          className="transition-all duration-200"
                        />
                        <text
                          x={pt.x}
                          y={pt.y + 24}
                          textAnchor="middle"
                          fill={isSelected ? 'var(--accent)' : 'var(--text-secondary)'}
                          fontSize="10"
                          fontFamily="monospace"
                          className="pointer-events-none select-none font-medium"
                        >
                          {node.name}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Selected Node Inspector Pane */}
              <div className="p-5 bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl flex flex-col justify-between space-y-4">
                {selectedGraphRepo ? (
                  <div>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1.5">
                      <span className="text-[var(--accent)] font-semibold">{selectedGraphRepo.purpose?.technicalCategory}</span>
                      <span>·</span>
                      <span>{selectedGraphRepo.primaryLanguage}</span>
                    </div>

                    <h3 className="text-lg font-bold text-[var(--text-primary)]">
                      {selectedGraphRepo.name}
                    </h3>
                    <span className="text-xs font-mono text-[var(--text-muted)] block mb-3">
                      /{selectedGraphRepo.owner.login}
                    </span>

                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
                      {selectedGraphRepo.description}
                    </p>

                    <div className="space-y-2.5 pt-3 border-t border-[var(--border-subtle)] text-xs">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">License</span>
                        <span className="text-[var(--text-primary)] font-mono">{selectedGraphRepo.license?.spdxId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Agent Readiness</span>
                        <span className="text-[var(--accent)] font-mono font-bold">{selectedGraphRepo.agentReadiness?.score}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">GitHub Stars</span>
                        <span className="text-amber-400 font-mono font-bold">{selectedGraphRepo.stars.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-xs text-[var(--text-muted)]">
                    Click any node in the constellation to inspect its properties.
                  </div>
                )}

                {selectedGraphRepo && (
                  <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center gap-2">
                    <button
                      onClick={() => onSelectRepository(selectedGraphRepo)}
                      className="flex-1 py-2 text-xs font-bold text-[#0B1018] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg transition-colors text-center cursor-pointer"
                    >
                      Deep Inspector
                    </button>
                    <button
                      onClick={() => onToggleCompare(selectedGraphRepo)}
                      className="px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-lg cursor-pointer"
                    >
                      + Compare
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pagination Controls */}
          {searchResponse.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between border-t border-[var(--border-subtle)] pt-4 text-xs">
              <span className="text-[var(--text-muted)]">
                Page <strong className="text-[var(--text-primary)] font-mono tabular-nums">{page}</strong> of{' '}
                <span className="font-mono tabular-nums">{searchResponse.totalPages}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--surface-2)] cursor-pointer"
                >
                  Previous
                </button>
                <button
                  disabled={page >= searchResponse.totalPages}
                  onClick={() => {
                    setPage((p) => Math.min(searchResponse.totalPages, p + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--surface-2)] cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
