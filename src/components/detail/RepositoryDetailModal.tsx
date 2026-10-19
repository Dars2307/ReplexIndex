import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Star,
  GitFork,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Bookmark,
  Share2,
  ArrowRight,
  Terminal,
  FileText,
  Layers,
  Code2,
} from 'lucide-react';
import type { Repository } from '../../types/index.ts';
import { evaluateCompatibility } from '../../engines/compatibility.ts';

interface RepositoryDetailModalProps {
  repository: Repository | null;
  onClose: () => void;
  userStack: string;
  isCompared: boolean;
  onToggleCompare: (repo: Repository) => void;
  onSaveToCollection: (repo: Repository) => void;
  onSelectRepoById?: (repoId: string) => void;
}

export const RepositoryDetailModal: React.FC<RepositoryDetailModalProps> = ({
  repository,
  onClose,
  userStack,
  isCompared,
  onToggleCompare,
  onSaveToCollection,
  onSelectRepoById,
}) => {
  const [copiedAgentPrompt, setCopiedAgentPrompt] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'compatibility' | 'readiness' | 'readme'>('overview');

  React.useEffect(() => {
    if (!repository) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [repository, onClose]);

  if (!repository) return null;

  const compat = evaluateCompatibility(repository, userStack);
  const readiness = repository.agentReadiness;

  const copyForAgent = () => {
    const text = `### REPLEX TOOL INTELLIGENCE REPORT
**Repository:** ${repository.fullName}
**URL:** ${repository.htmlUrl}
**Category:** ${repository.purpose?.technicalCategory} (${repository.purpose?.subcategories.join(', ')})
**Purpose:** ${repository.purpose?.functionalPurpose}
**Intended Audience:** ${repository.purpose?.intendedAudience}
**Supported Environments:** ${repository.purpose?.supportedEnvironments.join(', ')}
**Implementation Approach:** ${repository.purpose?.implementationApproach}
**License:** ${repository.license?.name || 'Unspecified'} (SPDX: ${repository.license?.spdxId})
**Install Command:** ${repository.installCommand || 'npm install ' + repository.name}

#### Compatibility with: ${userStack}
- **Status:** ${compat.status}
- **Complexity:** ${compat.potentialIntegrationComplexity}
- **Evidence:** ${compat.supportingEvidence.join('; ') || 'None documented'}
- **Missing Elements:** ${compat.missingEvidence.join('; ') || 'None'}

#### Agent Readiness: ${readiness?.score}/100
- **Type Definitions:** ${readiness?.checklist.typeDefinitions.verified ? 'Verified native static typing' : 'External / Untyped'}
- **Documentation:** ${readiness?.checklist.documentationAvailability.verified ? 'Complete' : 'Basic'}
- **Summary:** ${readiness?.summary}
`;
    navigator.clipboard.writeText(text);
    setCopiedAgentPrompt(true);
    setTimeout(() => setCopiedAgentPrompt(false), 2000);
  };

  const tabItems = [
    { key: 'overview' as const, label: 'Overview & Purpose' },
    { key: 'compatibility' as const, label: 'Compatibility', dot: compat.status === 'confirmed_match' ? 'bg-emerald-400' : compat.status === 'conflict' ? 'bg-rose-400' : 'bg-amber-400' },
    { key: 'readiness' as const, label: 'Agent Readiness', extra: `${readiness?.score}%` },
    ...(repository.readmeExtract ? [{ key: 'readme' as const, label: 'README Extract' }] : []),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-repo-title"
    >
      <div
        className="relative w-full max-w-4xl bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[var(--border-subtle)] bg-[var(--canvas)]/60 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-2 flex-wrap">
              <span className="text-[var(--accent)] font-semibold">{repository.purpose?.technicalCategory}</span>
              <span>·</span>
              <span>{repository.primaryLanguage}</span>
              <span>·</span>
              <span>{repository.license?.spdxId || 'No License'}</span>
              <span>·</span>
              <span className="font-mono tabular-nums">{repository.stars.toLocaleString()} Stars</span>
            </div>

            <div className="flex items-center gap-3">
              <h2 id="modal-repo-title" className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                {repository.name}
              </h2>
              <a
                href={repository.htmlUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 font-mono"
              >
                <span>{repository.fullName}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <p className="mt-2 text-xs sm:text-sm text-[var(--text-secondary)] max-w-2xl leading-relaxed">
              {repository.description}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] rounded-lg transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-[var(--surface-2)] border-b border-[var(--border-subtle)] text-xs shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-1 p-0.5 bg-[var(--surface-1)] rounded-lg border border-[var(--border-subtle)]">
            {tabItems.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === tab.key
                    ? 'bg-[var(--surface-2)] text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>{tab.label}</span>
                {'dot' in tab && tab.dot && <span className={`w-1.5 h-1.5 rounded-full ${tab.dot}`} />}
                {'extra' in tab && tab.extra && <span className="font-mono text-[var(--accent)] tabular-nums">{tab.extra}</span>}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyForAgent}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-1)] hover:bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-md transition-colors font-medium text-xs cursor-pointer"
              title="Copy structured tool report for autonomous AI agent prompts"
            >
              {copiedAgentPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[var(--accent)]" />}
              <span>{copiedAgentPrompt ? 'Copied for Agent' : 'Copy for Agent'}</span>
            </button>

            <button
              onClick={() => onToggleCompare(repository)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                isCompared
                  ? 'bg-[var(--accent)] text-[#0B1018] border-[var(--accent)]'
                  : 'bg-[var(--surface-1)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:bg-[var(--surface-raised)]'
              }`}
            >
              {isCompared ? 'In Compare List' : '+ Compare'}
            </button>

            <button
              onClick={() => onSaveToCollection(repository)}
              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-1)] hover:bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-md transition-colors cursor-pointer"
              title="Save to Collection"
            >
              <Bookmark className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Functional Purpose', value: repository.purpose?.functionalPurpose },
                  { label: 'Implementation Approach', value: repository.purpose?.implementationApproach },
                  { label: 'Intended Audience', value: repository.purpose?.intendedAudience },
                  { label: 'Supported Environments', value: repository.purpose?.supportedEnvironments.join(', ') },
                ].map((item) => (
                  <div key={item.label} className="p-4 bg-[var(--canvas)] border border-[var(--border-subtle)] rounded-xl space-y-2">
                    <span className="text-[11px] font-semibold text-[var(--accent)] uppercase tracking-wide">
                      {item.label}
                    </span>
                    <p className="text-xs text-[var(--text-primary)] leading-relaxed">{item.value}</p>
                  </div>
                ))}
              </div>

              {repository.installCommand && (
                <div className="p-3.5 bg-[var(--canvas)] border border-[var(--border-subtle)] rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-xs text-[var(--text-primary)]">
                    <Terminal className="w-4 h-4 text-[var(--accent)]" />
                    <span>{repository.installCommand}</span>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(repository.installCommand || '')}
                    className="text-[var(--text-muted)] hover:text-[var(--accent)] text-[11px] font-medium cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
              )}

              {repository.relationships && repository.relationships.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-[var(--text-primary)]">Discovery Graph Connections</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {repository.relationships.map((rel) => (
                      <div
                        key={rel.targetId}
                        onClick={() => onSelectRepoById && onSelectRepoById(rel.targetId)}
                        className={`p-3 bg-[var(--canvas)] border border-[var(--border-subtle)] rounded-lg flex flex-col justify-between transition-all ${
                          onSelectRepoById ? 'hover:border-[var(--accent)]/50 cursor-pointer' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-[var(--text-primary)] font-mono hover:text-[var(--accent)]">
                            {rel.targetName}
                          </span>
                          <span className="text-[10px] text-[var(--accent)] font-medium capitalize">
                            {rel.relationshipType.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{rel.evidence}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'compatibility' && (
            <div className="space-y-6">
              <div className="p-4 bg-[var(--canvas)] border border-[var(--border-subtle)] rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)]">Target Environment:</span>
                    <span className="font-mono text-xs text-[var(--text-primary)] font-semibold">{userStack}</span>
                  </div>
                  <span
                    className={`font-semibold capitalize text-xs ${
                      compat.status === 'confirmed_match' ? 'text-emerald-400' : compat.status === 'conflict' ? 'text-rose-400' : 'text-amber-400'
                    }`}
                  >
                    {compat.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{compat.summary}</p>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-2">Supporting Manifest Evidence</h4>
                {compat.supportingEvidence.length > 0 ? (
                  <ul className="space-y-2">
                    {compat.supportingEvidence.map((ev, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{ev}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[var(--text-muted)]">No explicit supporting evidence found.</p>
                )}
              </div>

              {compat.missingEvidence.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-2">Missing Evidence or Caveats</h4>
                  <ul className="space-y-2">
                    {compat.missingEvidence.map((me, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>{me}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {compat.dependencyConflicts.length > 0 && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl">
                  <h4 className="text-xs font-semibold text-rose-400 mb-2">Framework & Dependency Conflicts</h4>
                  <ul className="space-y-1 text-xs text-rose-400">
                    {compat.dependencyConflicts.map((dc, i) => (
                      <li key={i}>• {dc}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'readiness' && (
            <div className="space-y-6">
              <div className="p-4 bg-[var(--canvas)] border border-[var(--border-subtle)] rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-[var(--text-muted)]">Autonomous Agent Readiness Index</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold font-mono text-[var(--accent)] tabular-nums">
                      {readiness?.score}/100
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">({readiness?.confidence} confidence)</span>
                  </div>
                </div>
                <ShieldCheck className="w-8 h-8 text-[var(--accent)]" />
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-[var(--text-primary)]">Verifiable Readiness Checklist</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {readiness &&
                    Object.entries(readiness.checklist).map(([key, item]) => (
                      <div key={key} className="p-3 bg-[var(--canvas)] border border-[var(--border-subtle)] rounded-lg flex items-start gap-2.5">
                        {item.verified ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-[var(--text-primary)] capitalize">
                              {key.replace(/([A-Z])/g, ' $1')}
                            </span>
                            <span className="font-mono text-[10px] text-[var(--accent)] tabular-nums">+{item.score}pts</span>
                          </div>
                          <span className="text-[11px] text-[var(--text-secondary)] block mt-0.5">{item.label}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="p-3.5 bg-[var(--canvas)] border border-[var(--border-subtle)] rounded-lg text-xs text-[var(--text-secondary)] leading-relaxed">
                <strong>Why this matters:</strong> Autonomous coding agents rely on strict types, unambiguous licenses, and reproducible CLI commands to write code without human hallucination.
              </div>
            </div>
          )}

          {activeTab === 'readme' && (
            <div className="p-4 bg-[var(--canvas)] border border-[var(--border-subtle)] rounded-xl font-mono text-xs text-[var(--text-secondary)] overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[500px]">
              {repository.readmeExtract}
            </div>
          )}

          <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)] flex-wrap gap-2">
            <div>
              <span>Indexed: {new Date(repository.lastIndexedAt).toLocaleDateString()}</span>
              <span className="mx-2">·</span>
              <span>Source: GitHub API v3</span>
            </div>
            {repository.homepageUrl && (
              <a
                href={repository.homepageUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-[var(--accent)] hover:underline flex items-center gap-1"
              >
                <span>Project Homepage</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
