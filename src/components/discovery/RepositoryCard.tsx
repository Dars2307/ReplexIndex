import React from 'react';
import { Star, ShieldCheck, CheckCircle2, AlertTriangle, Check, HelpCircle } from 'lucide-react';
import type { Repository } from '../../types/index.ts';
import { evaluateCompatibility } from '../../engines/compatibility.ts';

interface RepositoryCardProps {
  repository: Repository;
  userStack: string;
  onSelect: (repo: Repository) => void;
  isCompared: boolean;
  onToggleCompare: (repo: Repository) => void;
  onSaveToCollection: (repo: Repository) => void;
  viewMode?: 'grid' | 'list';
}

export const RepositoryCard: React.FC<RepositoryCardProps> = ({
  repository,
  userStack,
  onSelect,
  isCompared,
  onToggleCompare,
  onSaveToCollection,
  viewMode = 'grid',
}) => {
  const compat = evaluateCompatibility(repository, userStack);
  const readiness = repository.agentReadiness?.score || 50;

  // Format star count cleanly with tabular numerals
  const formattedStars =
    repository.stars >= 1000 ? `${(repository.stars / 1000).toFixed(1)}k` : repository.stars.toString();

  // Freshness calculation
  const daysSincePush = Math.max(
    0,
    Math.round((Date.now() - new Date(repository.pushedAt).getTime()) / (1000 * 60 * 60 * 24))
  );
  const freshnessText =
    daysSincePush === 0 ? 'Pushed today' : daysSincePush === 1 ? 'Pushed 1d ago' : `Pushed ${daysSincePush}d ago`;

  if (viewMode === 'list') {
    return (
      <article
        onClick={() => onSelect(repository)}
        className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] rounded-xl transition-all cursor-pointer gap-4 shadow-xs"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(repository);
          }
        }}
        aria-label={`Inspect ${repository.fullName}`}
      >
        <div className="flex-1 min-w-0">
          {/* Unboxed Metadata Header (Zero-Pill Rule) */}
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1.5 flex-wrap">
            <span className="text-[var(--accent)] font-medium">{repository.purpose?.technicalCategory}</span>
            <span aria-hidden="true">·</span>
            <span>{repository.primaryLanguage}</span>
            <span aria-hidden="true">·</span>
            <span>{repository.license?.spdxId || 'Unlicensed'}</span>
            <span aria-hidden="true">·</span>
            <span>{freshnessText}</span>
          </div>

          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
              {repository.name}
            </h3>
            <span className="text-xs text-[var(--text-muted)] font-mono truncate">/{repository.owner.login}</span>
          </div>

          <p className="mt-1 text-xs text-[var(--text-secondary)] line-clamp-1 max-w-2xl leading-relaxed">
            {repository.description}
          </p>
        </div>

        {/* Intelligence Metrics & Actions */}
        <div className="flex items-center gap-4 shrink-0 sm:justify-end">
          {/* Compatibility Signal */}
          <div className="flex items-center gap-1.5 text-xs">
            {compat.status === 'confirmed_match' ? (
              <span className="flex items-center gap-1 text-[var(--success)]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Compatible</span>
              </span>
            ) : compat.status === 'conflict' ? (
              <span className="flex items-center gap-1 text-[var(--danger)]">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Conflict</span>
              </span>
            ) : compat.status === 'potential_match' ? (
              <span className="flex items-center gap-1 text-[var(--warning)]">
                <Check className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Partial</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[var(--text-muted)]">
                <HelpCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Unknown</span>
              </span>
            )}
          </div>

          {/* Agent Readiness Score */}
          <div className="flex items-center gap-1 text-xs font-mono text-[var(--text-secondary)] tabular-nums" title={`Agent Readiness: ${readiness}/100`}>
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>{readiness}%</span>
          </div>

          {/* Stars */}
          <div className="flex items-center gap-1 text-xs font-mono text-[var(--text-secondary)] tabular-nums">
            <Star className="w-3.5 h-3.5 text-[var(--warning)]" />
            <span>{formattedStars}</span>
          </div>

          {/* Compare Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCompare(repository);
            }}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors cursor-pointer ${
              isCompared
                ? 'bg-[var(--accent)] text-[#0B1018] border-[var(--accent)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-2)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
            }`}
            aria-label={isCompared ? `Remove ${repository.name} from comparison` : `Compare ${repository.name}`}
          >
            {isCompared ? 'Compared' : '+ Compare'}
          </button>
        </div>
      </article>
    );
  }

  // Grid Mode (Standard Desktop / Tablet Card)
  return (
    <article
      onClick={() => onSelect(repository)}
      className="group relative flex flex-col justify-between p-5 bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] rounded-xl transition-all cursor-pointer h-full shadow-xs"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(repository);
        }
      }}
      aria-label={`Inspect ${repository.fullName}`}
    >
      <div>
        {/* Unboxed Metadata (Zero-Pill Rule) */}
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-2.5 flex-wrap">
          <span className="text-[var(--accent)] font-medium">{repository.purpose?.technicalCategory}</span>
          <span aria-hidden="true">·</span>
          <span>{repository.primaryLanguage}</span>
          <span aria-hidden="true">·</span>
          <span>{repository.license?.spdxId || 'Unlicensed'}</span>
        </div>

        {/* Title & Author */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
              {repository.name}
            </h3>
            <span className="text-xs text-[var(--text-muted)] font-mono truncate block">
              {repository.fullName}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 text-xs font-mono text-[var(--text-secondary)] tabular-nums bg-[var(--canvas)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
            <Star className="w-3 h-3 text-[var(--warning)]" />
            <span>{formattedStars}</span>
          </div>
        </div>

        {/* Purpose Description */}
        <p className="mt-3 text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
          {repository.description}
        </p>

        {/* Framework & Stack Evidence List */}
        {repository.stackEvidence?.frameworks && repository.stackEvidence.frameworks.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-[11px] text-[var(--text-muted)] flex-wrap">
            <span className="text-[var(--text-muted)] font-medium">Stack:</span>
            {repository.stackEvidence.frameworks.slice(0, 3).map((f, i) => (
              <span key={f} className="text-[var(--text-secondary)]">
                {f}
                {i < Math.min(2, repository.stackEvidence.frameworks.length - 1) ? ' ·' : ''}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer / Intelligence Status & Actions */}
      <div className="mt-5 pt-3.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
        {/* Compatibility indicator */}
        <div className="flex items-center gap-1.5" title={compat.summary}>
          {compat.status === 'confirmed_match' ? (
            <span className="flex items-center gap-1 text-[var(--success)] font-medium text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Compatible</span>
            </span>
          ) : compat.status === 'conflict' ? (
            <span className="flex items-center gap-1 text-[var(--danger)] font-medium text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Conflict</span>
            </span>
          ) : compat.status === 'potential_match' ? (
            <span className="flex items-center gap-1 text-[var(--warning)] font-medium text-[11px]">
              <Check className="w-3.5 h-3.5" />
              <span>Partial Fit</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[var(--text-muted)] text-[11px]">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Untested</span>
            </span>
          )}
        </div>

        {/* Agent Readiness mini badge */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1 font-mono text-[11px] text-[var(--text-secondary)] tabular-nums"
            title={`Agent Readiness: ${readiness}/100`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>{readiness}%</span>
          </div>

          {/* Compare Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCompare(repository);
            }}
            className={`px-2.5 py-1 text-[11px] font-medium rounded border transition-colors cursor-pointer ${
              isCompared
                ? 'bg-[var(--accent)] text-[#0B1018] border-[var(--accent)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-2)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
            }`}
            aria-label={isCompared ? `Remove ${repository.name} from comparison` : `Compare ${repository.name}`}
          >
            {isCompared ? 'Compared' : '+ Compare'}
          </button>
        </div>
      </div>
    </article>
  );
};
