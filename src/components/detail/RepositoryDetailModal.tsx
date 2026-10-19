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

  // Handle Escape key
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

  // Format Copy-for-Agent prompt
  const copyForAgent = () => {
    const text = `### NEXORA TOOL INTELLIGENCE REPORT
**Repository:** ${repository.fullName}
**URL:** ${repository.htmlUrl}
**Category:** ${repository.purpose?.technicalCategory} (${repository.purpose?.subcategories.join(', ')})
**Purpose:** ${repository.purpose?.functionalPurpose}
**Intended Audience:** ${repository.purpose?.intendedAudience}
**Supported Environments:** ${repository.purpose?.supportedEnvironments.join(', ')}
**Implementation Approach:** ${repository.purpose?.implementationApproach}
**License:** ${repository.license?.name || 'Unspecified'} (SPDX: ${repository.license?.spdxId})
**Install Command:** ${repository.installCommand || `npm install ${repository.name}`}

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-repo-title"
    >
      <div
        className="relative w-full max-w-4xl bg-[#131B27] border border-[#223044] rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#1E2B3C] bg-[#0B1018]/60 shrink-0">
          <div>
            {/* Unboxed Metadata (Zero-Pill Rule) */}
            <div className="flex items-center gap-2 text-xs text-[#718296] mb-2 flex-wrap">
              <span className="text-[#52D5C5] font-semibold">{repository.purpose?.technicalCategory}</span>
              <span aria-hidden="true">·</span>
              <span>{repository.primaryLanguage}</span>
              <span aria-hidden="true">·</span>
              <span>{repository.license?.spdxId || 'No License'}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{repository.stars.toLocaleString()} Stars</span>
            </div>

            <div className="flex items-center gap-3">
              <h2 id="modal-repo-title" className="text-xl sm:text-2xl font-bold text-[#F2F6FA]">
                {repository.name}
              </h2>
              <a
                href={repository.htmlUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-xs text-[#52D5C5] hover:underline flex items-center gap-1 font-mono"
              >
                <span>{repository.fullName}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <p className="mt-2 text-xs sm:text-sm text-[#A4B3C3] max-w-2xl leading-relaxed">
              {repository.description}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#718296] hover:text-[#F2F6FA] hover:bg-[#1A2533] rounded-lg transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-[#0F1621] border-b border-[#1E2B3C] text-xs shrink-0 flex-wrap gap-2">
          {/* Tab Navigation */}
          <div className="flex items-center gap-1 p-0.5 bg-[#131B27] rounded-lg border border-[#1E2B3C]">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'overview' ? 'bg-[#1A2533] text-[#F2F6FA]' : 'text-[#718296] hover:text-[#F2F6FA]'
              }`}
            >
              Overview & Purpose
            </button>
            <button
              onClick={() => setActiveTab('compatibility')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'compatibility' ? 'bg-[#1A2533] text-[#F2F6FA]' : 'text-[#718296] hover:text-[#F2F6FA]'
              }`}
            >
              <span>Compatibility</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  compat.status === 'confirmed_match'
                    ? 'bg-[#34D399]'
                    : compat.status === 'conflict'
                    ? 'bg-[#F87171]'
                    : 'bg-[#FBBF24]'
                }`}
              />
            </button>
            <button
              onClick={() => setActiveTab('readiness')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'readiness' ? 'bg-[#1A2533] text-[#F2F6FA]' : 'text-[#718296] hover:text-[#F2F6FA]'
              }`}
            >
              <span>Agent Readiness</span>
              <span className="font-mono text-[#52D5C5] tabular-nums">{readiness?.score}%</span>
            </button>
            {repository.readmeExtract && (
              <button
                onClick={() => setActiveTab('readme')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeTab === 'readme' ? 'bg-[#1A2533] text-[#F2F6FA]' : 'text-[#718296] hover:text-[#F2F6FA]'
                }`}
              >
                README Extract
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={copyForAgent}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A2533] hover:bg-[#223044] text-[#F2F6FA] border border-[#2D3E54] rounded-md transition-colors font-medium text-xs"
              title="Copy structured tool report for autonomous AI agent prompts"
            >
              {copiedAgentPrompt ? <Check className="w-3.5 h-3.5 text-[#34D399]" /> : <Copy className="w-3.5 h-3.5 text-[#52D5C5]" />}
              <span>{copiedAgentPrompt ? 'Copied for Agent' : 'Copy for Agent'}</span>
            </button>

            <button
              onClick={() => onToggleCompare(repository)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                isCompared
                  ? 'bg-[#52D5C5] text-[#0B1018] border-[#52D5C5]'
                  : 'bg-[#1A2533] text-[#F2F6FA] border-[#2D3E54] hover:bg-[#223044]'
              }`}
            >
              {isCompared ? 'In Compare List' : '+ Compare'}
            </button>

            <button
              onClick={() => onSaveToCollection(repository)}
              className="p-1.5 text-[#A4B3C3] hover:text-[#F2F6FA] bg-[#1A2533] hover:bg-[#223044] border border-[#2D3E54] rounded-md transition-colors"
              title="Save to Collection"
              aria-label="Save repository to personal collection"
            >
              <Bookmark className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* TAB 1: OVERVIEW & PURPOSE */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Purpose Intelligence Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#0B1018] border border-[#1E2B3C] rounded-xl space-y-2">
                  <span className="text-[11px] font-semibold text-[#52D5C5] uppercase tracking-wide">
                    Functional Purpose
                  </span>
                  <p className="text-xs text-[#F2F6FA] leading-relaxed">
                    {repository.purpose?.functionalPurpose}
                  </p>
                </div>

                <div className="p-4 bg-[#0B1018] border border-[#1E2B3C] rounded-xl space-y-2">
                  <span className="text-[11px] font-semibold text-[#52D5C5] uppercase tracking-wide">
                    Implementation Approach
                  </span>
                  <p className="text-xs text-[#F2F6FA] leading-relaxed">
                    {repository.purpose?.implementationApproach}
                  </p>
                </div>

                <div className="p-4 bg-[#0B1018] border border-[#1E2B3C] rounded-xl space-y-2">
                  <span className="text-[11px] font-semibold text-[#52D5C5] uppercase tracking-wide">
                    Intended Audience
                  </span>
                  <p className="text-xs text-[#F2F6FA] leading-relaxed">
                    {repository.purpose?.intendedAudience}
                  </p>
                </div>

                <div className="p-4 bg-[#0B1018] border border-[#1E2B3C] rounded-xl space-y-2">
                  <span className="text-[11px] font-semibold text-[#52D5C5] uppercase tracking-wide">
                    Supported Environments
                  </span>
                  <p className="text-xs text-[#F2F6FA] leading-relaxed">
                    {repository.purpose?.supportedEnvironments.join(', ')}
                  </p>
                </div>
              </div>

              {/* Install Command Preview */}
              {repository.installCommand && (
                <div className="p-3.5 bg-[#0B1018] border border-[#1E2B3C] rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-xs text-[#F2F6FA]">
                    <Terminal className="w-4 h-4 text-[#52D5C5]" />
                    <span>{repository.installCommand}</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(repository.installCommand || '');
                    }}
                    className="text-[#718296] hover:text-[#52D5C5] text-[11px] font-medium"
                  >
                    Copy
                  </button>
                </div>
              )}

              {/* Related Alternatives & Complementary Tools */}
              {repository.relationships && repository.relationships.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-[#F2F6FA]">
                    Discovery Graph Connections
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {repository.relationships.map((rel) => (
                      <div
                        key={rel.targetId}
                        onClick={() => onSelectRepoById && onSelectRepoById(rel.targetId)}
                        className={`p-3 bg-[#0B1018] border border-[#1E2B3C] rounded-lg flex flex-col justify-between transition-all ${
                          onSelectRepoById ? 'hover:border-[#52D5C5]/50 cursor-pointer' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-[#F2F6FA] font-mono hover:text-[#52D5C5]">
                            {rel.targetName}
                          </span>
                          <span className="text-[10px] text-[#52D5C5] font-medium capitalize">
                            {rel.relationshipType.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#A4B3C3] leading-relaxed">{rel.evidence}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: COMPATIBILITY INTELLIGENCE */}
          {activeTab === 'compatibility' && (
            <div className="space-y-6">
              <div className="p-4 bg-[#0B1018] border border-[#1E2B3C] rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#718296]">Target Environment:</span>
                    <span className="font-mono text-xs text-[#F2F6FA] font-semibold">{userStack}</span>
                  </div>
                  <span
                    className={`font-semibold capitalize text-xs ${
                      compat.status === 'confirmed_match'
                        ? 'text-[#34D399]'
                        : compat.status === 'conflict'
                        ? 'text-[#F87171]'
                        : 'text-[#FBBF24]'
                    }`}
                  >
                    {compat.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-[#A4B3C3] leading-relaxed">{compat.summary}</p>
              </div>

              {/* Supporting Evidence */}
              <div>
                <h4 className="text-xs font-semibold text-[#F2F6FA] mb-2">Supporting Manifest Evidence</h4>
                {compat.supportingEvidence.length > 0 ? (
                  <ul className="space-y-2">
                    {compat.supportingEvidence.map((ev, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-[#A4B3C3]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399] shrink-0 mt-0.5" />
                        <span>{ev}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[#718296]">No explicit supporting evidence found.</p>
                )}
              </div>

              {/* Missing Evidence / Tradeoffs */}
              {compat.missingEvidence.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-[#F2F6FA] mb-2">Missing Evidence or Caveats</h4>
                  <ul className="space-y-2">
                    {compat.missingEvidence.map((me, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-[#A4B3C3]">
                        <AlertCircle className="w-3.5 h-3.5 text-[#FBBF24] shrink-0 mt-0.5" />
                        <span>{me}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Dependency Conflicts */}
              {compat.dependencyConflicts.length > 0 && (
                <div className="p-4 bg-[#F87171]/10 border border-[#F87171]/30 rounded-xl">
                  <h4 className="text-xs font-semibold text-[#F87171] mb-2">Framework & Dependency Conflicts</h4>
                  <ul className="space-y-1 text-xs text-[#F87171]">
                    {compat.dependencyConflicts.map((dc, i) => (
                      <li key={i}>• {dc}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AGENT READINESS CHECKLIST */}
          {activeTab === 'readiness' && (
            <div className="space-y-6">
              <div className="p-4 bg-[#0B1018] border border-[#1E2B3C] rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#718296]">Autonomous Agent Readiness Index</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold font-mono text-[#52D5C5] tabular-nums">
                      {readiness?.score}/100
                    </span>
                    <span className="text-xs text-[#A4B3C3]">({readiness?.confidence} confidence)</span>
                  </div>
                </div>
                <ShieldCheck className="w-8 h-8 text-[#52D5C5]" />
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-[#F2F6FA]">Verifiable Readiness Checklist</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {readiness &&
                    Object.entries(readiness.checklist).map(([key, item]) => (
                      <div
                        key={key}
                        className="p-3 bg-[#0B1018] border border-[#1E2B3C] rounded-lg flex items-start gap-2.5"
                      >
                        {item.verified ? (
                          <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-[#718296] shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-[#F2F6FA] capitalize">
                              {key.replace(/([A-Z])/g, ' $1')}
                            </span>
                            <span className="font-mono text-[10px] text-[#52D5C5] tabular-nums">
                              +{item.score}pts
                            </span>
                          </div>
                          <span className="text-[11px] text-[#A4B3C3] block mt-0.5">{item.label}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="p-3.5 bg-[#0B1018] border border-[#1E2B3C] rounded-lg text-xs text-[#A4B3C3] leading-relaxed">
                <strong>Why this matters:</strong> Autonomous coding agents rely on strict types, unambiguous licenses, and reproducible CLI commands to write code without human hallucination.
              </div>
            </div>
          )}

          {/* TAB 4: README EXTRACT */}
          {activeTab === 'readme' && (
            <div className="p-4 bg-[#0B1018] border border-[#1E2B3C] rounded-xl font-mono text-xs text-[#A4B3C3] overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[500px]">
              {repository.readmeExtract}
            </div>
          )}

          {/* Attribution Footnote */}
          <div className="pt-4 border-t border-[#1E2B3C] flex items-center justify-between text-[11px] text-[#718296] flex-wrap gap-2">
            <div>
              <span>Indexed: {new Date(repository.lastIndexedAt).toLocaleDateString()}</span>
              <span aria-hidden="true" className="mx-2">·</span>
              <span>Source: GitHub API v3</span>
            </div>
            {repository.homepageUrl && (
              <a
                href={repository.homepageUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-[#52D5C5] hover:underline flex items-center gap-1"
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
