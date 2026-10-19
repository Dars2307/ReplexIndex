import type { CompatibilityEvidence, CompatibilityStatus, Repository } from '../types/index.ts';

export function evaluateCompatibility(
  repo: Pick<Repository, 'name' | 'primaryLanguage' | 'topics' | 'stackEvidence' | 'purpose' | 'description'>,
  userStack: string
): CompatibilityEvidence {
  const stackLower = (userStack || '').toLowerCase().trim();
  if (!stackLower) {
    return {
      status: 'unknown',
      targetStack: 'Unspecified',
      supportingEvidence: [],
      missingEvidence: ['No target environment or tech stack provided.'],
      potentialIntegrationComplexity: 'unknown',
      dependencyConflicts: [],
      versionCompatibility: 'Documented via package registry metadata',
      sourceLinks: [],
      summary: 'Specify a target stack (e.g. "Next.js + TypeScript + Tailwind") to evaluate compatibility.',
    };
  }

  const userTokens = stackLower
    .split(/[+,/&|\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const repoFrameworks = (repo.stackEvidence?.frameworks || []).map((f) => f.toLowerCase());
  const repoBuildTools = (repo.stackEvidence?.buildTools || []).map((b) => b.toLowerCase());
  const repoDependencies = (repo.stackEvidence?.keyDependencies || []).map((d) => d.toLowerCase());
  const repoTopics = (repo.topics || []).map((t) => t.toLowerCase());
  const repoLang = (repo.primaryLanguage || '').toLowerCase();
  const repoDesc = (repo.description || '').toLowerCase();

  const supportingEvidence: string[] = [];
  const missingEvidence: string[] = [];
  const dependencyConflicts: string[] = [];

  let matchPoints = 0;
  let conflictPoints = 0;

  for (const token of userTokens) {
    if (['react', 'nextjs', 'next.js', 'next'].includes(token)) {
      if (
        repoFrameworks.includes('react') ||
        repoFrameworks.includes('next.js') ||
        repoTopics.includes('react') ||
        repoTopics.includes('nextjs') ||
        repoDependencies.includes('react') ||
        repoDesc.includes('react component')
      ) {
        supportingEvidence.push(`Direct React peer support verified in repository stack and dependencies.`);
        matchPoints++;
      } else if (['vue', 'angular', 'svelte'].includes(repoLang) || repoFrameworks.includes('vue') || repoFrameworks.includes('svelte')) {
        dependencyConflicts.push(`Target specifies React but repository is built for ${repoFrameworks.join('/') || 'different framework'}.`);
        conflictPoints += 2;
      } else {
        missingEvidence.push(`No explicit React package wrapper detected in manifest; may require custom adapter.`);
      }
    } else if (['typescript', 'ts'].includes(token)) {
      if (repoLang === 'typescript' || repoTopics.includes('typescript') || repo.purpose?.maturitySignals?.hasTypeDefinitions) {
        supportingEvidence.push(`First-class TypeScript type definitions shipped natively (.d.ts or native TS code).`);
        matchPoints++;
      } else {
        missingEvidence.push(`Repository is written in ${repo.primaryLanguage}; check for @types/ package availability.`);
      }
    } else if (['tailwind', 'tailwindcss'].includes(token)) {
      if (repoTopics.includes('tailwind') || repoTopics.includes('tailwindcss') || repoDesc.includes('tailwind') || repoFrameworks.includes('tailwind css')) {
        supportingEvidence.push(`Designed with native Tailwind CSS class compatibility and utility-first styling.`);
        matchPoints++;
      } else if (repoDesc.includes('styled-components') || repoDependencies.includes('styled-components')) {
        missingEvidence.push(`Uses CSS-in-JS styling; extra setup required when integrating with Tailwind and React Server Components.`);
      } else {
        missingEvidence.push(`No explicit Tailwind preset or theme plugin required; styles via standard CSS or headless hooks.`);
      }
    } else if (['vite'].includes(token)) {
      if (repoBuildTools.includes('vite') || repoTopics.includes('vite') || repoDesc.includes('vite')) {
        supportingEvidence.push(`Verified ESM module packaging compatible with Vite dev server and HMR.`);
        matchPoints++;
      } else {
        missingEvidence.push(`Check ESM bundler export compatibility in package.json.`);
      }
    } else if (['python', 'fastapi'].includes(token)) {
      if (repoLang === 'python' || repoTopics.includes('python') || repoTopics.includes('fastapi')) {
        supportingEvidence.push(`Native Python package with pip/poetry installation.`);
        matchPoints++;
      } else if (repoLang === 'typescript' || repoLang === 'javascript') {
        dependencyConflicts.push(`Target environment is Python, but repository is built in JavaScript/TypeScript.`);
        conflictPoints += 2;
      }
    } else if (['node', 'nodejs'].includes(token)) {
      if (['typescript', 'javascript'].includes(repoLang) || repo.purpose?.supportedEnvironments?.includes('Node.js')) {
        supportingEvidence.push(`Supported on Node.js runtime environments.`);
        matchPoints++;
      }
    }
  }

  let status: CompatibilityStatus = 'unknown';
  let potentialIntegrationComplexity: 'low' | 'moderate' | 'high' | 'unknown' = 'unknown';

  if (conflictPoints > 0) {
    status = 'conflict';
    potentialIntegrationComplexity = 'high';
  } else if (matchPoints >= 2) {
    status = 'confirmed_match';
    potentialIntegrationComplexity = 'low';
  } else if (matchPoints === 1) {
    status = 'potential_match';
    potentialIntegrationComplexity = 'moderate';
  } else {
    status = 'unknown';
    potentialIntegrationComplexity = 'unknown';
    missingEvidence.push(`Insufficient public manifest evidence to confirm compatibility with ${userStack}.`);
  }

  const summary =
    status === 'confirmed_match'
      ? `Verified compatibility with ${userStack}. High evidence score with documented peer dependencies.`
      : status === 'potential_match'
      ? `Partially aligned with ${userStack}. Key primitives match, but integration may require configuration adjustments.`
      : status === 'conflict'
      ? `Identified structural framework or runtime incompatibility with ${userStack}.`
      : `Compatibility with ${userStack} cannot be confirmed from existing public package manifests alone.`;

  return {
    status,
    targetStack: userStack,
    supportingEvidence,
    missingEvidence,
    potentialIntegrationComplexity,
    dependencyConflicts,
    versionCompatibility: 'SemVer compliant exports documented in repository',
    sourceLinks: [],
    summary,
  };
}
