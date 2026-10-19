import React, { useState } from 'react';
import { GitCompare, X, Plus, Star, ShieldCheck, CheckCircle2, AlertTriangle, HelpCircle, Copy, Check, Info } from 'lucide-react';
import type { Repository } from '../../types/index.ts';
import { evaluateCompatibility } from '../../engines/compatibility.ts';

interface CompareWorkspaceProps {
  repositories: Repository[];
  comparedRepoIds: string[];
  onRemoveFromCompare: (repoId: string) => void;
  onAddRepoToCompare: (repoId: string) => void;
  userStack: string;
  onSelectRepository: (repo) => void;
}

export const CompareWorkspace: React.FC<CompareWorkspaceProps> = ({
  repositories,
  comparedRepoIds,
  onRemoveFromCompare,
  onAddRepoToCompare,
  userStack,
  onSelectRepository,
}) => {
  const [copiedShare, setCopiedShare] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState('');

  const candidates = comparedRepoIds
    .map((id) => repositories.find((r) => r.id.toLowerCase() === id.toLowerCase()))
    .filter((r): r is Repository => Boolean(r));

  const copyComparison = () => {
    const lines = candidates.map((r) => {
      const compat = evaluateCompatibility(r, userStack);
      return `• ${r.name} (${r.fullName}): ${r.purpose?.functionalPurpose} | License: ${r.license?.spdxId} | Readiness: ${r.agentReadiness?.score}% | Compat with ${userStack}: ${compat.status}`;
    });
    navigator.clipboard.writeText(`### REPLEX COMPARISON MATRIX\nTarget Stack: ${userStack}\n\n${lines.join('\n')}`);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const availableToAdd = repositories.filter(
    (r) => !comparedRepoIds.map((id) => id.toLowerCase()).includes(r.id.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">Compare Workspace</h1>
            <span className="font-mono text-xs text-[var(--accent)] tabular-nums font-semibold">
              ({candidates.length}/4 selected)
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Structured side-by-side architectural comparison grounded in verified manifest evidence.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {candidates.length >= 2 && (
            <button
              onClick={copyComparison}
              className="px-3 py-1.5 text-xs font-semibold text-[#0B1018] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-md transition-colors flex items-center gap-1.5 shadow-sm"
            >
              {copiedShare ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedShare ? 'Copied Matrix' : 'Copy Comparison Matrix'}</span>
            </button>
          )}

          {candidates.length < 4 && (
            <div className="flex items-center gap-1.5">
              <select
                value={selectedToAdd}
                onChange={(e) => {
                  if (e.target.value) {
                    onAddRepoToCompare(e.target.value);
                    setSelectedToAdd('');
                  }
                }}
                className="h-9 px-2.5 bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-md text-xs text-[var(--text-primary)] focus:border-[var(--accent)]"
              >
                <option value="">+ Add repository to compare...</option>
                {availableToAdd.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.fullName} ({r.purpose?.technicalCategory})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Advisory for 1 item edge case */}
      {candidates.length === 1 && (
        <div className="mb-6 p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--accent)]/30 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <span className="text-[var(--text-secondary)]">
              You have selected <strong>{candidates[0].name}</strong>. Add at least 1 more repository from the dropdown above to view side-by-side comparative diffs.
            </span>
          </div>
        </div>
      )}

      {candidates.length === 0 ? (
        <div className="py-20 text-center bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl p-8">
          <GitCompare className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">No repositories selected for comparison</h3>
          <p className="mt-1 text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            Select 2 to 4 repositories from the Atlas or Search view using the "+ Compare" button.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                <th className="p-3 text-xs font-semibold text-[var(--text-muted)] w-48 bg-[var(--surface-1)] sticky left-0 z-10 border-r border-[var(--border-subtle)]">
                  Dimension
                </th>
                {candidates.map((repo) => (
                  <th key={repo.id} className="p-4 bg-[var(--surface-1)] border-l border-[var(--border-subtle)] align-top">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <button
                          onClick={() => onSelectRepository(repo)}
                          className="text-sm font-bold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors truncate block text-left"
                        >
                          {repo.name}
                        </button>
                        <span className="text-[11px] text-[var(--text-muted)] font-mono block">/{repo.owner.login}</span>
                      </div>
                      <button
                        onClick={() => onRemoveFromCompare(repo.id)}
                        className="text-[var(--text-muted)] hover:text-[var(--danger)] p-1 transition-colors"
                        aria-label={`Remove ${repo.name} from comparison`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
              {/* Category & Purpose */}
              <tr>
                <td className="p-3 font-semibold text-[var(--text-muted)] bg-[var(--surface-1)] sticky left-0 z-10 border-r border-[var(--border-subtle)]">
                  Category & Purpose
                </td>
                {candidates.map((repo) => (
                  <td key={repo.id} className="p-4 bg-[var(--surface-2)] border-l border-[var(--border-subtle)]">
                    <span className="text-[var(--accent)] font-semibold block mb-1">
                      {repo.purpose?.technicalCategory}
                    </span>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {repo.purpose?.functionalPurpose}
                    </p>
                  </td>
                ))}
              </tr>

              {/* Compatibility with Target Stack */}
              <tr>
                <td className="p-3 font-semibold text-[var(--text-muted)] bg-[var(--surface-1)] sticky left-0 z-10 border-r border-[var(--border-subtle)]">
                  Compatibility
                  <span className="block text-[10px] text-[var(--accent)] font-mono mt-0.5">{userStack}</span>
                </td>
                {candidates.map((repo) => {
                  const compat = evaluateCompatibility(repo, userStack);
                  return (
                    <td key={repo.id} className="p-4 bg-[var(--surface-2)] border-l border-[var(--border-subtle)]">
                      <div className="flex items-center gap-1.5 font-medium mb-1.5">
                        {compat.status === 'confirmed_match' ? (
                          <span className="text-[var(--success)] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed Match
                          </span>
                        ) : compat.status === 'conflict' ? (
                          <span className="text-[var(--danger)] flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Conflict
                          </span>
                        ) : compat.status === 'potential_match' ? (
                          <span className="text-[var(--warning)] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Partial Fit
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)] flex items-center gap-1">
                            <HelpCircle className="w-3.5 h-3.5" /> Unknown
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{compat.summary}</p>
                    </td>
                  );
                })}
              </tr>

              {/* Tech Stack & Frameworks */}
              <tr>
                <td className="p-3 font-semibold text-[var(--text-muted)] bg-[var(--surface-1)] sticky left-0 z-10 border-r border-[var(--border-subtle)]">
                  Tech Stack Evidence
                </td>
                {candidates.map((repo) => (
                  <td key={repo.id} className="p-4 bg-[var(--surface-2)] border-l border-[var(--border-subtle)]">
                    <div className="space-y-1">
                      <div>
                        <span className="text-[var(--text-muted)]">Language: </span>
                        <span className="text-[var(--text-primary)] font-medium">{repo.primaryLanguage}</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">Frameworks: </span>
                        <span className="text-[var(--text-secondary)]">
                          {repo.stackEvidence?.frameworks.join(', ') || 'Framework-agnostic'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">Runtimes: </span>
                        <span className="text-[var(--text-secondary)]">
                          {repo.purpose?.supportedEnvironments.join(', ')}
                        </span>
                      </div>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Agent Readiness */}
              <tr>
                <td className="p-3 font-semibold text-[var(--text-muted)] bg-[var(--surface-1)] sticky left-0 z-10 border-r border-[var(--border-subtle)]">
                  Agent Readiness
                </td>
                {candidates.map((repo) => (
                  <td key={repo.id} className="p-4 bg-[var(--surface-2)] border-l border-[var(--border-subtle)]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base font-bold font-mono text-[var(--accent)] tabular-nums">
                        {repo.agentReadiness?.score}%
                      </span>
                      <span className="text-[var(--text-muted)]">({repo.agentReadiness?.confidence} confidence)</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      {repo.agentReadiness?.summary}
                    </p>
                  </td>
                ))}
              </tr>

              {/* License & Commercial Safety */}
              <tr>
                <td className="p-3 font-semibold text-[var(--text-muted)] bg-[var(--surface-1)] sticky left-0 z-10 border-r border-[var(--border-subtle)]">
                  License & Safety
                </td>
                {candidates.map((repo) => (
                  <td key={repo.id} className="p-4 bg-[var(--surface-2)] border-l border-[var(--border-subtle)]">
                    <span className="font-semibold text-[var(--text-primary)]">
                      {repo.license?.name || 'Unspecified License'}
                    </span>
                    <span className="block text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                      SPDX: {repo.license?.spdxId || 'NOASSERTION'}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Stars & Maintenance */}
              <tr>
                <td className="p-3 font-semibold text-[var(--text-muted)] bg-[var(--surface-1)] sticky left-0 z-10 border-r border-[var(--border-subtle)]">
                  Popularity & Activity
                </td>
                {candidates.map((repo) => (
                  <td key={repo.id} className="p-4 bg-[var(--surface-2)] border-l border-[var(--border-subtle)]">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 font-mono text-[var(--warning)] tabular-nums">
                        <Star className="w-3.5 h-3.5" />
                        <span>{repo.stars.toLocaleString()} stars</span>
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        Last pushed: {new Date(repo.pushedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Install Command */}
              <tr>
                <td className="p-3 font-semibold text-[var(--text-muted)] bg-[var(--surface-1)] sticky left-0 z-10 border-r border-[var(--border-subtle)]">
                  Install Command
                </td>
                {candidates.map((repo) => (
                  <td key={repo.id} className="p-4 bg-[var(--surface-2)] border-l border-[var(--border-subtle)] font-mono text-xs text-[var(--accent)]">
                    {repo.installCommand || 'Manual setup'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
