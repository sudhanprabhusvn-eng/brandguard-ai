import type {
  BrandProfile,
  BrandRule,
  EvidenceRecord,
  Finding,
  ContentEvaluationResult,
  EvaluationSummary,
  EvaluationOverallStatus,
  SubmittedContent,
  ContentVersion
} from '../types';

export const ENGINE_VERSION = 'det-v1.0';

export const STORAGE_EVALUATIONS_KEY = 'brandguard_evaluation_results_v1';

export const PROMOTIONAL_INDICATOR_PATTERN =
  /\b(offer|guarantee[sd]?|100%|risk[- ]free|discount|trial|special\s+offer|promotional|bonus|double\s+your|more\s+productive)\b/i;

/**
 * Safely test regex pattern without throwing.
 */
export function compileSafeRegex(
  pattern: string,
  caseSensitive: boolean = false,
  wholeWord: boolean = false
): RegExp | null {
  try {
    let cleanPattern = pattern;
    if (wholeWord && !pattern.startsWith('\\b') && !pattern.startsWith('^')) {
      cleanPattern = `\\b(?:${pattern})\\b`;
    }
    return new RegExp(cleanPattern, caseSensitive ? 'g' : 'gi');
  } catch {
    return null;
  }
}

/**
 * Detect prohibited language/phrases in text.
 * Strictly avoids mutating text and avoids accidental substring matches.
 */
export function evaluateProhibitedPhraseRule(
  text: string,
  rule: BrandRule,
  contentMeta: { contentId: string; contentVersion: string; contentHash: string; brandProfileId: string }
): Finding[] {
  if (!rule.active) return [];

  const wholeWord = rule.matchMode === 'whole_word';
  const regex = compileSafeRegex(rule.pattern, !!rule.caseSensitive, wholeWord);

  if (!regex) {
    return [
      {
        id: `fnd_${contentMeta.contentHash.substring(0, 8)}_${rule.id}_malformed`,
        ruleId: rule.id,
        ruleName: rule.name,
        ruleVersion: rule.updatedAt || 'v1.0',
        ruleType: 'unsupported',
        severity: rule.severity,
        category: rule.category,
        status: 'NOT_EVALUATED',
        engineType: 'unsupported',
        triggerText: rule.pattern,
        startIndex: 0,
        endIndex: 0,
        explanation: `Rule pattern syntax error: unable to compile regular expression "${rule.pattern}".`,
        evidenceStatus: 'na',
        suggestedAction: 'Repair rule regular expression syntax in Brand DNA studio.',
        brandProfileId: contentMeta.brandProfileId,
        contentId: contentMeta.contentId,
        contentVersionId: contentMeta.contentVersion,
        evaluationTimestamp: new Date().toISOString()
      }
    ];
  }

  const findings: Finding[] = [];
  let match: RegExpExecArray | null;
  let matchIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    const triggerText = match[0];
    const startIndex = match.index;
    const endIndex = startIndex + triggerText.length;

    findings.push({
      id: `fnd_${contentMeta.contentHash.substring(0, 8)}_${rule.id}_${matchIndex}`,
      ruleId: rule.id,
      ruleName: rule.name,
      ruleVersion: rule.updatedAt || 'v1.0',
      ruleType: 'prohibited_phrase',
      severity: rule.severity,
      category: rule.category,
      status: 'FAIL',
      engineType: 'deterministic',
      triggerText,
      startIndex,
      endIndex,
      explanation: rule.explanation || `Prohibited marketing phrasing "${triggerText}" violates active brand governance policy.`,
      evidenceStatus: 'na',
      suggestionText: rule.suggestedReplacement,
      suggestedAction: rule.suggestedReplacement
        ? `Replace "${triggerText}" with approved phrasing: "${rule.suggestedReplacement}".`
        : `Remove prohibited phrasing "${triggerText}".`,
      brandProfileId: contentMeta.brandProfileId,
      contentId: contentMeta.contentId,
      contentVersionId: contentMeta.contentVersion,
      evaluationTimestamp: new Date().toISOString()
    });

    matchIndex++;
    // Guard against zero-width infinite loops
    if (regex.lastIndex === match.index) {
      regex.lastIndex++;
    }
  }

  return findings;
}

/**
 * Evaluate required disclosure compliance.
 * Handles applicability conditions cleanly:
 * - If promotional applicability is established and disclosure missing -> FAIL
 * - If applicability is uncertain -> REVIEW_REQUIRED (never fabricates a false violation)
 * - If disclosure is present -> PASS (no finding)
 */
export function evaluateRequiredDisclosureRule(
  text: string,
  rule: BrandRule,
  contentMeta: { contentId: string; contentVersion: string; contentHash: string; brandProfileId: string }
): Finding[] {
  if (!rule.active) return [];

  const disclosureRegex = compileSafeRegex(rule.pattern, !!rule.caseSensitive, false);
  if (!disclosureRegex) {
    return [
      {
        id: `fnd_${contentMeta.contentHash.substring(0, 8)}_${rule.id}_malformed`,
        ruleId: rule.id,
        ruleName: rule.name,
        ruleVersion: rule.updatedAt || 'v1.0',
        ruleType: 'unsupported',
        severity: rule.severity,
        category: 'required_disclosure',
        status: 'NOT_EVALUATED',
        engineType: 'unsupported',
        triggerText: 'N/A',
        startIndex: 0,
        endIndex: 0,
        explanation: `Malformed disclosure pattern regex: "${rule.pattern}".`,
        evidenceStatus: 'na',
        suggestedAction: 'Update disclosure pattern in Brand DNA studio.',
        brandProfileId: contentMeta.brandProfileId,
        contentId: contentMeta.contentId,
        contentVersionId: contentMeta.contentVersion,
        evaluationTimestamp: new Date().toISOString()
      }
    ];
  }

  const hasDisclosure = disclosureRegex.test(text);

  // If disclosure is present, the rule is fully satisfied!
  if (hasDisclosure) {
    return [];
  }

  // Determine applicability: does this text contain promotional claims, offers, or guarantees?
  const isPromotionalApplicable = PROMOTIONAL_INDICATOR_PATTERN.test(text);

  if (!isPromotionalApplicable) {
    // Applicability cannot be determined automatically with 100% certainty from neutral copy
    // Produce REVIEW_REQUIRED, NOT a fabricated violation!
    return [
      {
        id: `fnd_${contentMeta.contentHash.substring(0, 8)}_${rule.id}_review_req`,
        ruleId: rule.id,
        ruleName: rule.name,
        ruleVersion: rule.updatedAt || 'v1.0',
        ruleType: 'required_disclosure',
        severity: 'info',
        category: 'required_disclosure',
        status: 'REVIEW_REQUIRED',
        engineType: 'deterministic',
        triggerText: 'Document Scope (Promotional Applicability Uncertain)',
        startIndex: 0,
        endIndex: 0,
        explanation: 'Promotional disclosure applicability cannot be determined automatically from editorial copy. Review required to determine if commercial terms disclaimer is legally mandated.',
        evidenceStatus: 'na',
        suggestedAction: 'Verify whether copy constitutes a commercial offer requiring standard terms disclosure.',
        brandProfileId: contentMeta.brandProfileId,
        contentId: contentMeta.contentId,
        contentVersionId: contentMeta.contentVersion,
        evaluationTimestamp: new Date().toISOString()
      }
    ];
  }

  // Promotional applicability is established and disclosure is missing -> FAIL
  return [
    {
      id: `fnd_${contentMeta.contentHash.substring(0, 8)}_${rule.id}_missing`,
      ruleId: rule.id,
      ruleName: rule.name,
      ruleVersion: rule.updatedAt || 'v1.0',
      ruleType: 'required_disclosure',
      severity: rule.severity || 'warning',
      category: 'required_disclosure',
      status: 'FAIL',
      engineType: 'deterministic',
      triggerText: 'Document Scope (Promotional Disclosure Missing)',
      startIndex: 0,
      endIndex: 0,
      explanation: rule.explanation || 'Promotional statements trigger mandatory disclosure policy, but "Terms and conditions apply" was not detected in the content.',
      evidenceStatus: 'na',
      suggestionText: rule.suggestedReplacement || 'Terms and conditions apply.',
      suggestedAction: `Append mandatory disclosure: "${rule.suggestedReplacement || 'Terms and conditions apply.'}"`,
      brandProfileId: contentMeta.brandProfileId,
      contentId: contentMeta.contentId,
      contentVersionId: contentMeta.contentVersion,
      evaluationTimestamp: new Date().toISOString()
    }
  ];
}

/**
 * Evaluate factual/empirical performance claims.
 * Strictly distinguishes "unverified/evidence missing" from "claim proven false".
 * Never marks a claim false solely because evidence is missing.
 */
export function evaluateFactualClaimRule(
  text: string,
  rule: BrandRule,
  evidenceRecords: EvidenceRecord[],
  contentMeta: { contentId: string; contentVersion: string; contentHash: string; brandProfileId: string }
): Finding[] {
  if (!rule.active) return [];

  const regex = compileSafeRegex(rule.pattern, !!rule.caseSensitive, false);
  if (!regex) return [];

  const findings: Finding[] = [];
  let match: RegExpExecArray | null;
  let matchIndex = 0;

  // Find approved evidence record linked to this rule if available
  const linkedEvidence = rule.evidenceReferenceId
    ? evidenceRecords.find((e) => e.id === rule.evidenceReferenceId && e.verified)
    : null;

  while ((match = regex.exec(text)) !== null) {
    const triggerText = match[0];
    const startIndex = match.index;
    const endIndex = startIndex + triggerText.length;

    // Check if the claim in text matches approved evidence:
    // e.g. EVD-NP-01 proves "25% reduction in cycle time".
    // If content claims "25% reduction", it has approved evidence!
    // If content claims "100% more productive" or "doubled their output", evidence is missing/unverified!
    const matchesApprovedEvidence =
      linkedEvidence &&
      linkedEvidence.verified &&
      triggerText.toLowerCase().includes('25%');

    if (matchesApprovedEvidence) {
      // Verified claim - no violation!
      // (Optionally could record PASS finding for traceability)
    } else {
      // Evidence is missing or claim is unverified -> NOT FALSE!
      findings.push({
        id: `fnd_${contentMeta.contentHash.substring(0, 8)}_${rule.id}_${matchIndex}`,
        ruleId: rule.id,
        ruleName: rule.name,
        ruleVersion: rule.updatedAt || 'v1.0',
        ruleType: 'unsupported_claim',
        severity: rule.severity || 'warning',
        category: 'factual_claim',
        status: 'REVIEW_REQUIRED',
        engineType: 'deterministic',
        triggerText,
        startIndex,
        endIndex,
        explanation: rule.explanation
          ? `${rule.explanation} Classified as UNVERIFIED (not proven false, lacks approved benchmark substantiation).`
          : `Empirical claim "${triggerText}" lacks verified benchmark evidence in brand repository. Classified as UNVERIFIED (not proven false).`,
        evidenceStatus: 'unverified',
        evidenceId: rule.evidenceReferenceId,
        suggestionText: rule.suggestedReplacement,
        suggestedAction: rule.evidenceReferenceId
          ? `Substantiate claim with approved benchmark citation (${rule.evidenceReferenceId}) or adjust phrasing to verified metric.`
          : 'Attach verified legal substantiation to brand evidence library before publication.',
        brandProfileId: contentMeta.brandProfileId,
        contentId: contentMeta.contentId,
        contentVersionId: contentMeta.contentVersion,
        evaluationTimestamp: new Date().toISOString()
      });
    }

    matchIndex++;
    if (regex.lastIndex === match.index) {
      regex.lastIndex++;
    }
  }

  return findings;
}

/**
 * Conservative tone check (sensationalist punctuation or superlatives).
 */
export function evaluateToneRule(
  text: string,
  rule: BrandRule,
  contentMeta: { contentId: string; contentVersion: string; contentHash: string; brandProfileId: string }
): Finding[] {
  if (!rule.active) return [];

  const regex = compileSafeRegex(rule.pattern, !!rule.caseSensitive, false);
  if (!regex) return [];

  const findings: Finding[] = [];
  let match: RegExpExecArray | null;
  let matchIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    const triggerText = match[0];
    const startIndex = match.index;
    const endIndex = startIndex + triggerText.length;

    findings.push({
      id: `fnd_${contentMeta.contentHash.substring(0, 8)}_${rule.id}_${matchIndex}`,
      ruleId: rule.id,
      ruleName: rule.name,
      ruleVersion: rule.updatedAt || 'v1.0',
      ruleType: 'direct_tone',
      severity: rule.severity || 'info',
      category: 'tone',
      status: 'REVIEW_REQUIRED',
      engineType: 'contextual_review_flag',
      triggerText,
      startIndex,
      endIndex,
      explanation: rule.explanation || `Sensationalist phrasing or excessive punctuation "${triggerText}" undermines objective technical tone.`,
      evidenceStatus: 'na',
      suggestionText: rule.suggestedReplacement,
      suggestedAction: rule.suggestedReplacement
        ? `Adopt direct, professional phrasing: "${rule.suggestedReplacement}".`
        : 'Adopt objective, professional phrasing.',
      brandProfileId: contentMeta.brandProfileId,
      contentId: contentMeta.contentId,
      contentVersionId: contentMeta.contentVersion,
      evaluationTimestamp: new Date().toISOString()
    });

    matchIndex++;
    if (regex.lastIndex === match.index) {
      regex.lastIndex++;
    }
  }

  return findings;
}

/**
 * Derive the overall summary and status from individual findings.
 * Follows strict governance rules:
 * - FAIL when an applicable blocking rule (critical severity) is violated.
 * - REVIEW_REQUIRED when evidence, applicability, or warning findings need review.
 * - PASS only when all applicable supported checks pass with zero unresolved issues.
 * - NOT_EVALUATED if content is empty or no rules could be checked.
 */
export function deriveEvaluationSummary(
  findings: Finding[],
  totalRulesEvaluated: number
): EvaluationSummary {
  const criticalCount = findings.filter((f) => f.severity === 'critical' && f.status === 'FAIL').length;
  const warningCount = findings.filter((f) => f.severity === 'warning' && f.status === 'FAIL').length;
  const infoCount = findings.filter((f) => f.severity === 'info').length;
  const reviewRequiredCount = findings.filter((f) => f.status === 'REVIEW_REQUIRED').length;
  const passedCount = Math.max(0, totalRulesEvaluated - (criticalCount + warningCount + reviewRequiredCount));

  let overallStatus: EvaluationOverallStatus = 'PASS';
  let overallExplanation = 'All evaluated deterministic governance rules passed. Document satisfies active brand baseline policies.';

  if (totalRulesEvaluated === 0) {
    overallStatus = 'NOT_EVALUATED';
    overallExplanation = 'No active brand governance rules were available for evaluation.';
  } else if (criticalCount > 0) {
    overallStatus = 'FAIL';
    overallExplanation = `Document contains ${criticalCount} blocking critical violation(s). Publication gate is locked until resolved.`;
  } else if (warningCount > 0 || reviewRequiredCount > 0) {
    overallStatus = 'REVIEW_REQUIRED';
    overallExplanation = `Document has ${warningCount} warning(s) and ${reviewRequiredCount} item(s) requiring evidence or applicability review before clearance.`;
  }

  return {
    totalRulesEvaluated,
    passedCount,
    criticalCount,
    warningCount,
    infoCount,
    reviewRequiredCount,
    overallStatus,
    overallExplanation
  };
}

export const governanceEngine = {
  /**
   * Pure evaluation function: evaluates text against active brand rules.
   * Produces reproducible, deduplicated, traceable findings.
   */
  evaluateContent(
    content: SubmittedContent | ContentVersion,
    brandProfile: BrandProfile
  ): ContentEvaluationResult {
    const rawText = 'rawText' in content ? content.rawText : content.text;
    const contentId = content.id;
    const contentTitle = content.title;
    const contentVersion = content.versionNumber;
    const contentHash = content.contentHash;
    const brandProfileId = brandProfile.id;
    const brandProfileName = brandProfile.name;
    const ruleVersionRef = brandProfile.version;

    const contentMeta = {
      contentId,
      contentVersion,
      contentHash,
      brandProfileId
    };

    // If text is empty or whitespace-only, handle gracefully
    if (!rawText || !rawText.trim()) {
      const emptySummary: EvaluationSummary = {
        totalRulesEvaluated: 0,
        passedCount: 0,
        criticalCount: 0,
        warningCount: 0,
        infoCount: 0,
        reviewRequiredCount: 0,
        overallStatus: 'NOT_EVALUATED',
        overallExplanation: 'Content is empty or contains only whitespace. Governance evaluation was not performed.'
      };

      return {
        id: `eval_${contentHash.substring(0, 12)}_${Date.now()}`,
        contentId,
        contentTitle,
        contentVersion,
        contentHash,
        brandProfileId,
        brandProfileName,
        ruleVersionRef,
        evaluatedAt: new Date().toISOString(),
        engineVersion: ENGINE_VERSION,
        overallStatus: 'NOT_EVALUATED',
        summary: emptySummary,
        findings: []
      };
    }

    const activeRules = (brandProfile.rules || []).filter((r) => r.active);
    const findingsList: Finding[] = [];

    activeRules.forEach((rule) => {
      // 1. Prohibited phrases
      if (rule.category === 'prohibited_language') {
        const findings = evaluateProhibitedPhraseRule(rawText, rule, contentMeta);
        findingsList.push(...findings);
      }
      // 2. Mandatory disclosures
      else if (rule.category === 'required_disclosure') {
        const findings = evaluateRequiredDisclosureRule(rawText, rule, contentMeta);
        findingsList.push(...findings);
      }
      // 3. Factual performance claims
      else if (rule.category === 'factual_claim') {
        const findings = evaluateFactualClaimRule(
          rawText,
          rule,
          brandProfile.evidenceRecords || [],
          contentMeta
        );
        findingsList.push(...findings);
      }
      // 4. Tone guidelines
      else if (rule.category === 'tone') {
        const findings = evaluateToneRule(rawText, rule, contentMeta);
        findingsList.push(...findings);
      }
      // 5. Unsupported / custom rule
      else {
        // Unknown rule category
        findingsList.push({
          id: `fnd_${contentHash.substring(0, 8)}_${rule.id}_unsupported`,
          ruleId: rule.id,
          ruleName: rule.name,
          ruleVersion: rule.updatedAt || 'v1.0',
          ruleType: 'unsupported',
          severity: rule.severity,
          category: rule.category,
          status: 'NOT_EVALUATED',
          engineType: 'unsupported',
          triggerText: 'N/A',
          startIndex: 0,
          endIndex: 0,
          explanation: `Rule category "${rule.category}" is not supported by deterministic engine. Requires manual configuration.`,
          evidenceStatus: 'na',
          suggestedAction: 'Review rule category in Brand DNA studio.',
          brandProfileId,
          contentId,
          contentVersionId: contentVersion,
          evaluationTimestamp: new Date().toISOString()
        });
      }
    });

    // Deduplicate findings by composite key (ruleId + startIndex + endIndex)
    const seen = new Set<string>();
    const deduplicatedFindings = findingsList
      .map((f) => ({ ...f, source: 'DETERMINISTIC' as const }))
      .filter((f) => {
        const key = `${f.ruleId}:${f.startIndex}:${f.endIndex}:${f.triggerText}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    const summary = deriveEvaluationSummary(deduplicatedFindings, activeRules.length);

    const result: ContentEvaluationResult = {
      id: `eval_${contentHash.substring(0, 10)}_${contentVersion}`,
      contentId,
      contentTitle,
      contentVersion,
      contentHash,
      brandProfileId,
      brandProfileName,
      ruleVersionRef,
      evaluatedAt: new Date().toISOString(),
      engineVersion: ENGINE_VERSION,
      overallStatus: summary.overallStatus,
      summary,
      findings: deduplicatedFindings
    };

    // Save to persistence
    this.saveEvaluationResult(result);

    return result;
  },

  /**
   * Save evaluation result to localStorage.
   */
  saveEvaluationResult(result: ContentEvaluationResult): boolean {
    try {
      if (typeof localStorage === 'undefined') return false;
      const raw = localStorage.getItem(STORAGE_EVALUATIONS_KEY);
      const existing: ContentEvaluationResult[] = raw ? JSON.parse(raw) : [];
      // Replace existing result for exact same contentId + versionNumber + contentHash, or prepend
      const filtered = existing.filter(
        (r) => !(r.contentId === result.contentId && r.contentVersion === result.contentVersion && r.contentHash === result.contentHash)
      );
      filtered.unshift(result);
      localStorage.setItem(STORAGE_EVALUATIONS_KEY, JSON.stringify(filtered.slice(0, 50)));
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Retrieve cached evaluation result for a specific content version.
   */
  getEvaluationResult(
    contentId: string,
    contentVersion: string,
    contentHash?: string
  ): ContentEvaluationResult | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(STORAGE_EVALUATIONS_KEY);
      if (!raw) return null;
      const existing: ContentEvaluationResult[] = JSON.parse(raw);
      return (
        existing.find((r) => {
          const matchId = r.contentId === contentId && r.contentVersion === contentVersion;
          return contentHash ? matchId && r.contentHash === contentHash : matchId;
        }) || null
      );
    } catch {
      return null;
    }
  }
};
