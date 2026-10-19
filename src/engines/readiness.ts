import type { AgentReadiness, Repository } from '../types/index.ts';

export function evaluateAgentReadiness(
  repo: Pick<Repository, 'license' | 'isArchived' | 'pushedAt' | 'primaryLanguage' | 'readmeExtract' | 'installCommand' | 'stackEvidence'>
): AgentReadiness {
  let score = 0;

  // 1. License Clarity (Max 20 pts)
  const hasSpdx = Boolean(repo.license?.spdxId && repo.license.spdxId !== 'NOASSERTION');
  const isPermissive = ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'ISC'].includes(repo.license?.spdxId || '');
  const licenseScore = hasSpdx ? (isPermissive ? 20 : 15) : 0;
  score += licenseScore;

  // 2. Documentation Availability (Max 25 pts)
  const hasReadme = Boolean(repo.readmeExtract && repo.readmeExtract.length > 100);
  const docScore = hasReadme ? (repo.readmeExtract!.length > 400 ? 25 : 15) : 5;
  score += docScore;

  // 3. Package or Integration Instructions (Max 20 pts)
  const hasInstall = Boolean(repo.installCommand && repo.installCommand.length > 5);
  const installScore = hasInstall ? 20 : 5;
  score += installScore;

  // 4. Type Definitions (Max 15 pts)
  const isTyped = ['typescript', 'rust', 'go'].includes((repo.primaryLanguage || '').toLowerCase());
  const typesScore = isTyped ? 15 : 5;
  score += typesScore;

  // 5. Maintenance Signals (Max 10 pts)
  const isFresh = !repo.isArchived;
  const maintenanceScore = isFresh ? 10 : 0;
  score += maintenanceScore;

  // 6. Configuration Complexity (Max 10 pts)
  const configScore = (repo.stackEvidence?.configFileDetected?.length || 0) > 0 ? 10 : 7;
  score += configScore;

  const total = Math.min(100, score);
  const confidence = hasReadme && hasSpdx ? 'high' : hasReadme || hasSpdx ? 'medium' : 'low';

  const checklist = {
    licenseClarity: {
      score: licenseScore,
      label: repo.license?.name || 'No recognized license',
      verified: hasSpdx,
    },
    documentationAvailability: {
      score: docScore,
      label: hasReadme ? 'Structured README with installation and API sections' : 'Minimal documentation',
      verified: hasReadme,
    },
    packageOrIntegrationInstructions: {
      score: installScore,
      label: repo.installCommand || 'No single-command install documented',
      verified: hasInstall,
    },
    typeDefinitions: {
      score: typesScore,
      label: isTyped ? 'Native static types included' : 'Untyped or external types required',
      verified: isTyped,
    },
    maintenanceSignals: {
      score: maintenanceScore,
      label: isFresh ? 'Active codebase, unarchived' : 'Repository is archived',
      verified: isFresh,
    },
    configurationComplexity: {
      score: configScore,
      label: 'Standard framework configuration',
      verified: true,
    },
  };

  const summary =
    total >= 80
      ? 'High agent readiness. Autonomous coding agents can inspect types, invoke CLI/package commands, and understand API contracts without manual intervention.'
      : total >= 60
      ? 'Moderate agent readiness. Clear basics available, but agents may require fallback strategies for ambiguous configurations or missing typing.'
      : 'Lower readiness. Incomplete API docs or licensing may require human verification before automated integration.';

  return {
    score: total,
    confidence,
    checklist,
    summary,
  };
}
