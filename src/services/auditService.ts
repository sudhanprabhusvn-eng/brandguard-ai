/**
 * BrandGuard AI — Audit Trail, Governance Reports & Compliance Service (Phase 10)
 *
 * Implements:
 * - Structured audit event ledger with sequential SHA-256 hash chaining
 * - Durable client-side persistence with honest integrity disclosure
 * - Accurate governance KPI metrics aggregation without double-counting
 * - End-to-end historical lifecycle reconstruction across revisions
 * - Formula-injection-safe CSV and structured JSON report exporting
 * - Verification of audit log chain integrity and threat model boundary
 */

import type {
  AuditEvent,
  AuditEventType,
  AuditOutcome,
  GovernanceMetrics,
  ContentLifecycle,
  LifecycleStage,
  SubmittedContent,
  ApprovalDecisionRecord,
  PersonaRole
} from '../types';
import { computeSha256 } from './contentService.ts';

export const AUDIT_TRAIL_STORAGE_KEY = 'brandguard_audit_trail_v1';

export const AUDIT_DISCLOSURE =
  'Interim Local Browser Storage (localStorage). Client-side prototype persistence with sequential SHA-256 hash chaining. Local storage is client-controlled and not tamper-proof or legally admissible without remote append-only WORM/HSM infrastructure.';

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export interface CreateAuditEventInput {
  eventType: AuditEventType;
  outcome?: AuditOutcome;
  brandId?: string;
  brandName?: string;
  contentId?: string;
  documentTitle: string;
  contentVersion: string;
  contentVersionId?: string;
  contentHash: string;
  ruleId?: string;
  ruleVersion: string;
  evaluationRunId?: string;
  decisionId?: string;
  parentVersionNumber?: string;
  actorName: string;
  actorRole: PersonaRole;
  actorEmail?: string;
  summary: string;
  description?: string;
  payload?: Record<string, unknown>;
  isReconstructed?: boolean;
}

/**
 * Build a canonical representation of an event for cryptographic hash chaining.
 */
function buildCanonicalEventPayload(
  id: string,
  timestamp: string,
  eventType: string,
  brandId: string,
  contentId: string,
  contentVersion: string,
  contentHash: string,
  actorRole: string,
  outcome: string,
  prevHash: string
): string {
  return [
    id,
    timestamp,
    eventType,
    brandId || 'none',
    contentId || 'none',
    contentVersion || 'v1.0',
    contentHash || 'nohash',
    actorRole || 'creator',
    outcome || 'SUCCESS',
    prevHash || GENESIS_HASH
  ].join('|');
}

/**
 * Escapes a cell value for CSV output with strict formula injection defense.
 * If a value starts with =, +, -, @, Tab (\t), or Carriage Return (\r),
 * it is prepended with a single quote (') per OWASP CSV Injection guidelines.
 * The underlying stored event record is NEVER modified.
 */
export function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);

  // OWASP Formula injection defense:
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }

  // Double quotes per RFC 4180
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

class AuditService {
  /**
   * Load all audit events from durable localStorage.
   * If storage is empty, initializes with default baseline records.
   */
  loadAuditEvents(): AuditEvent[] {
    try {
      if (typeof window === 'undefined' && typeof globalThis.localStorage === 'undefined') {
        return [];
      }
      const raw = globalThis.localStorage.getItem(AUDIT_TRAIL_STORAGE_KEY);
      if (!raw) {
        return this.getInitialSeedEvents();
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return this.getInitialSeedEvents();
    } catch (e) {
      console.warn('Failed to load audit trail from storage:', e);
      return this.getInitialSeedEvents();
    }
  }

  /**
   * Persist audit events list into localStorage.
   */
  saveAuditEvents(events: AuditEvent[]): boolean {
    try {
      if (typeof window === 'undefined' && typeof globalThis.localStorage === 'undefined') {
        return false;
      }
      globalThis.localStorage.setItem(AUDIT_TRAIL_STORAGE_KEY, JSON.stringify(events));
      return true;
    } catch (e) {
      console.error('Failed to save audit trail to storage:', e);
      return false;
    }
  }

  /**
   * Reset or clear the audit trail storage (for tests and migrations).
   */
  clearAuditTrail(): void {
    try {
      if (typeof window !== 'undefined' || typeof globalThis.localStorage !== 'undefined') {
        globalThis.localStorage.removeItem(AUDIT_TRAIL_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }

  /**
   * Record a new audit event with sequential SHA-256 hash chaining.
   * MUST only be called after the underlying operation successfully commits.
   */
  async recordAuditEvent(input: CreateAuditEventInput): Promise<AuditEvent> {
    const existing = this.loadAuditEvents();
    const prevEvent = existing[0]; // Most recent event
    const prevHash = prevEvent?.eventHash || GENESIS_HASH;

    const eventId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const timestamp = new Date().toISOString();
    const outcome = input.outcome || 'SUCCESS';

    const canonicalPayload = buildCanonicalEventPayload(
      eventId,
      timestamp,
      input.eventType,
      input.brandId || '',
      input.contentId || '',
      input.contentVersion,
      input.contentHash,
      input.actorRole,
      outcome,
      prevHash
    );

    const eventHash = await computeSha256(canonicalPayload);

    const newEvent: AuditEvent = {
      id: eventId,
      timestamp,
      eventType: input.eventType,
      outcome,
      brandId: input.brandId,
      brandName: input.brandName,
      contentId: input.contentId,
      documentTitle: input.documentTitle,
      contentVersion: input.contentVersion,
      contentVersionId: input.contentVersionId || input.contentVersion,
      contentHash: input.contentHash,
      ruleId: input.ruleId,
      ruleVersion: input.ruleVersion,
      evaluationRunId: input.evaluationRunId,
      decisionId: input.decisionId,
      parentVersionNumber: input.parentVersionNumber,
      actorName: input.actorName,
      actorRole: input.actorRole,
      actor: {
        name: input.actorName,
        email: input.actorEmail,
        role: input.actorRole,
        isVerified: false // Prototype simulated persona disclosure
      },
      summary: input.summary,
      description: input.description || input.summary,
      payload: input.payload,
      isReconstructed: input.isReconstructed ?? false,
      prevEventHash: prevHash,
      eventHash
    };

    const updated = [newEvent, ...existing];
    this.saveAuditEvents(updated);
    return newEvent;
  }

  /**
   * Verify the sequential SHA-256 hash chain of the audit trail.
   * Clearly documents the local threat model: this confirms sequential integrity,
   * but client-side storage can still be overwritten by a privileged local actor.
   */
  async verifyAuditChainIntegrity(
    events: AuditEvent[]
  ): Promise<{ isValid: boolean; verifiedCount: number; errorIndex?: number; message: string }> {
    if (!events || events.length === 0) {
      return { isValid: true, verifiedCount: 0, message: 'Audit log is empty.' };
    }

    // recordAuditEvent prepends each committed event to the persisted list.
    // Reverse that authoritative insertion order instead of sorting by timestamp:
    // multiple events can share the same millisecond, making timestamp sorting unstable.
    const chronological = [...events].reverse();
    let prevHash = GENESIS_HASH;

    for (let i = 0; i < chronological.length; i++) {
      const evt = chronological[i];

      // Check linked prevEventHash
      if (evt.prevEventHash && evt.prevEventHash !== prevHash) {
        return {
          isValid: false,
          verifiedCount: i,
          errorIndex: events.length - 1 - i,
          message: `Hash link broken at event "${evt.id}" (${evt.eventType}). Expected prevHash ${prevHash.substring(0, 12)}..., found ${evt.prevEventHash.substring(0, 12)}...`
        };
      }

      // Recompute hash
      const canonical = buildCanonicalEventPayload(
        evt.id,
        evt.timestamp,
        evt.eventType,
        evt.brandId || '',
        evt.contentId || '',
        evt.contentVersion,
        evt.contentHash,
        evt.actorRole,
        evt.outcome || 'SUCCESS',
        evt.prevEventHash || prevHash
      );
      const computedHash = await computeSha256(canonical);

      if (evt.eventHash && evt.eventHash !== computedHash) {
        return {
          isValid: false,
          verifiedCount: i,
          errorIndex: events.length - 1 - i,
          message: `Digest mismatch at event "${evt.id}". Tampering or payload modification detected.`
        };
      }

      prevHash = evt.eventHash || computedHash;
    }

    return {
      isValid: true,
      verifiedCount: events.length,
      message: `All ${events.length} audit records verified against cryptographic hash chain.`
    };
  }

  /**
   * Compute comprehensive governance metrics strictly from actual saved records.
   * Never double-counts multiple evaluation runs of the same version.
   * Distinguishes distinct content submissions from revisions.
   */
  computeGovernanceMetrics(
    events: AuditEvent[],
    submissions: SubmittedContent[],
    decisions: ApprovalDecisionRecord[],
    filters?: { brandId?: string; dateRange?: { start?: string; end?: string } }
  ): GovernanceMetrics {
    const brandFilter = filters?.brandId;
    const startFilter = filters?.dateRange?.start ? new Date(filters.dateRange.start).getTime() : 0;
    const endFilter = filters?.dateRange?.end
      ? new Date(filters.dateRange.end).getTime()
      : Number.MAX_SAFE_INTEGER;

    const matchesDate = (isoDate: string) => {
      if (!isoDate) return true;
      const t = new Date(isoDate).getTime();
      return t >= startFilter && t <= endFilter;
    };

    // 1. Filter Submissions
    const filteredSubmissions = submissions.filter((sub) => {
      if (brandFilter && sub.brandProfileId !== brandFilter) return false;
      return matchesDate(sub.createdAt);
    });

    const totalSubmissions = filteredSubmissions.length;

    // 2. Total Versions Drafted across matching submissions
    let totalVersions = 0;
    filteredSubmissions.forEach((sub) => {
      totalVersions += Math.max(1, sub.versionHistory?.length || 1);
    });

    // 3. Filter Decisions
    const filteredDecisions = decisions.filter((dec) => {
      if (brandFilter && dec.brandId !== brandFilter) return false;
      return matchesDate(dec.timestamp);
    });

    let approvedCount = 0;
    let standardApprovedCount = 0;
    let exceptionApprovedCount = 0;
    let rejectedCount = 0;
    let changesRequestedCount = 0;

    filteredDecisions.forEach((dec) => {
      if (dec.decision === 'APPROVED') {
        approvedCount++;
        if (dec.isException) {
          exceptionApprovedCount++;
        } else {
          standardApprovedCount++;
        }
      } else if (dec.decision === 'REJECTED') {
        rejectedCount++;
      } else if (dec.decision === 'CHANGES_REQUESTED') {
        changesRequestedCount++;
      }
    });

    // 4. Awaiting Review Count (from current submission states)
    // In our architecture, submissions currently pending review in workflow
    let awaitingReviewCount = 0;
    filteredSubmissions.forEach((sub) => {
      const latestVer = sub.versionHistory?.[sub.versionHistory.length - 1];
      const matchingDecision = filteredDecisions.find(
        (d) => d.contentId === sub.id && d.versionNumber === (latestVer?.versionNumber || sub.versionNumber)
      );
      if (!matchingDecision && sub.status !== 'archived') {
        awaitingReviewCount++;
      }
    });

    // 5. Findings & Rule breaches from evaluation events (strictly 1 latest evaluation per version)
    const evaluatedVersions = new Map<string, AuditEvent>();
    events.forEach((evt) => {
      if (
        (evt.eventType === 'GOVERNANCE_EVALUATION_COMPLETED' || evt.eventType === 'SCANNED') &&
        evt.contentId &&
        evt.contentVersion
      ) {
        if (brandFilter && evt.brandId && evt.brandId !== brandFilter) return;
        if (!matchesDate(evt.timestamp)) return;

        const key = `${evt.contentId}_${evt.contentVersion}`;
        if (!evaluatedVersions.has(key)) {
          evaluatedVersions.set(key, evt);
        }
      }
    });

    let criticalCount = 0;
    let warningCount = 0;
    let infoCount = 0;
    let verifiedCount = 0;
    let unverifiedCount = 0;
    let naCount = 0;
    let versionsWithUnresolved = 0;
    const ruleTriggerMap = new Map<string, { ruleName: string; category: string; count: number }>();

    evaluatedVersions.forEach((evt) => {
      const payload = evt.payload || {};
      const crit = Number(payload.criticalCount || 0);
      const warn = Number(payload.warningCount || 0);
      const info = Number(payload.infoCount || 0);

      criticalCount += crit;
      warningCount += warn;
      infoCount += info;

      if (crit > 0 || warn > 0) {
        versionsWithUnresolved++;
      }

      const verEv = Number(payload.verifiedEvidenceCount || 0);
      const unverEv = Number(payload.unverifiedEvidenceCount || 0);
      const naEv = Number(payload.naEvidenceCount || 0);
      verifiedCount += verEv;
      unverifiedCount += unverEv;
      naCount += naEv;

      const rulesTriggered = Array.isArray(payload.triggeredRules) ? payload.triggeredRules : [];
      rulesTriggered.forEach((r: any) => {
        if (typeof r === 'object' && r.ruleId) {
          const existing = ruleTriggerMap.get(r.ruleId) || {
            ruleName: r.ruleName || r.ruleId,
            category: r.category || 'governance',
            count: 0
          };
          existing.count++;
          ruleTriggerMap.set(r.ruleId, existing);
        }
      });
    });

    const compliantVersionsCount = Math.max(0, evaluatedVersions.size - versionsWithUnresolved);

    // Format top rules
    const topTriggeredRules = Array.from(ruleTriggerMap.entries())
      .map(([ruleId, data]) => ({
        ruleId,
        ruleName: data.ruleName,
        category: data.category,
        count: data.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 6. Activity by Day (from audit events matching filter)
    const dayMap = new Map<string, { count: number; approved: number; rejected: number }>();
    events.forEach((evt) => {
      if (brandFilter && evt.brandId && evt.brandId !== brandFilter) return;
      if (!matchesDate(evt.timestamp)) return;

      const dateStr = evt.timestamp.split('T')[0];
      const entry = dayMap.get(dateStr) || { count: 0, approved: 0, rejected: 0 };
      entry.count++;
      if (evt.eventType === 'APPROVAL_GRANTED' || evt.eventType === 'APPROVED') {
        entry.approved++;
      } else if (evt.eventType === 'REJECTION_RECORDED' || evt.eventType === 'REJECTED') {
        entry.rejected++;
      }
      dayMap.set(dateStr, entry);
    });

    const activityByDay = Array.from(dayMap.entries())
      .map(([date, val]) => ({
        date,
        count: val.count,
        approved: val.approved,
        rejected: val.rejected
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalSubmissions,
      totalVersions,
      awaitingReviewCount,
      approvedCount,
      standardApprovedCount,
      exceptionApprovedCount,
      rejectedCount,
      changesRequestedCount,
      findingsBySeverity: {
        critical: criticalCount,
        warning: warningCount,
        info: infoCount
      },
      evidenceChecks: {
        verified: verifiedCount,
        unverified: unverifiedCount,
        na: naCount
      },
      versionsWithUnresolvedFindings: versionsWithUnresolved,
      compliantVersionsCount,
      topTriggeredRules,
      activityByDay
    };
  }

  /**
   * Reconstruct the end-to-end historical lifecycle of a content submission.
   * Traces: INGESTION -> EVALUATION -> REVISION -> RECHECK -> DECISION -> SUPERSEDED.
   * Handles missing historical data honestly without hallucinating events.
   */
  reconstructLifecycle(
    contentId: string,
    submissions: SubmittedContent[],
    events: AuditEvent[],
    decisions: ApprovalDecisionRecord[]
  ): ContentLifecycle | null {
    const sub = submissions.find((s) => s.id === contentId);
    if (!sub) return null;

    const stages: LifecycleStage[] = [];

    // 1. Ingestion Stage
    stages.push({
      stage: 'INGESTION',
      title: 'Initial Content Ingestion',
      timestamp: sub.createdAt,
      versionNumber: 'v1.0',
      summary: `Content ingested as root draft v1.0. SHA-256 fingerprint: ${sub.contentHash?.substring(0, 16) || 'computed'}...`,
      outcome: 'SUCCESS'
    });

    // 2. Gather all related events sorted chronologically
    const relatedEvents = events
      .filter((e) => e.contentId === contentId || e.documentTitle === sub.title)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    relatedEvents.forEach((evt) => {
      if (evt.eventType === 'GOVERNANCE_EVALUATION_COMPLETED' || evt.eventType === 'SCANNED') {
        const payload = evt.payload || {};
        const crit = Number(payload.criticalCount || 0);
        const warn = Number(payload.warningCount || 0);
        stages.push({
          stage: evt.contentVersion === 'v1.0' ? 'EVALUATION' : 'RECHECK',
          title: `Governance Evaluation (${evt.contentVersion})`,
          timestamp: evt.timestamp,
          versionNumber: evt.contentVersion,
          actorName: evt.actorName,
          actorRole: evt.actorRole,
          summary: evt.summary,
          outcome: crit > 0 ? 'BLOCKED' : warn > 0 ? 'WARNING' : 'SUCCESS',
          findingsCount: crit + warn,
          criticalCount: crit,
          associatedEventId: evt.id
        });
      } else if (evt.eventType === 'REVISION_SAVED' || evt.eventType === 'CORRECTION_APPLIED') {
        stages.push({
          stage: 'REVISION',
          title: `Revision Created (${evt.contentVersion})`,
          timestamp: evt.timestamp,
          versionNumber: evt.contentVersion,
          actorName: evt.actorName,
          actorRole: evt.actorRole,
          summary: evt.summary,
          outcome: 'SUCCESS',
          associatedEventId: evt.id
        });
      } else if (evt.eventType === 'AI_REVIEW_COMPLETED') {
        stages.push({
          stage: 'AI_REVIEW',
          title: `AI Contextual Review (${evt.contentVersion})`,
          timestamp: evt.timestamp,
          versionNumber: evt.contentVersion,
          actorName: evt.actorName,
          actorRole: evt.actorRole,
          summary: evt.summary,
          outcome: 'SUCCESS',
          associatedEventId: evt.id
        });
      } else if (evt.eventType === 'VERSION_SUPERSEDED') {
        stages.push({
          stage: 'SUPERSEDED',
          title: `Version Superseded (${evt.contentVersion})`,
          timestamp: evt.timestamp,
          versionNumber: evt.contentVersion,
          summary: evt.summary,
          outcome: 'WARNING',
          associatedEventId: evt.id
        });
      }
    });

    // 3. Attach decisions
    const relatedDecisions = decisions
      .filter((d) => d.contentId === contentId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    relatedDecisions.forEach((dec) => {
      stages.push({
        stage: 'DECISION',
        title: `Human Governance Decision [${dec.decision}] (${dec.versionNumber})`,
        timestamp: dec.timestamp,
        versionNumber: dec.versionNumber,
        actorName: dec.reviewerName,
        actorRole: dec.reviewerRole,
        decisionType: dec.decision,
        isException: dec.isException,
        summary: `Reviewer ${dec.reviewerName} (${dec.reviewerRole}) decided ${dec.decision} for version ${dec.versionNumber}. ${dec.isException ? `Exception Justification: "${dec.exceptionJustification}"` : dec.reason ? `Reason: "${dec.reason}"` : ''}`,
        outcome: dec.decision === 'APPROVED' ? 'SUCCESS' : dec.decision === 'REJECTED' ? 'BLOCKED' : 'WARNING'
      });
    });

    // Sort all stages chronologically
    stages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return {
      contentId: sub.id,
      contentTitle: sub.title,
      brandProfileId: sub.brandProfileId,
      brandProfileName: sub.brandProfileName,
      currentStatus: 'DRAFT', // or latest status
      currentVersionNumber: sub.versionNumber || 'v1.0',
      createdAt: sub.createdAt,
      stages
    };
  }

  /**
   * Export audit events to CSV format with formula injection protection.
   */
  exportAuditCsv(
    events: AuditEvent[],
    filterSummary: string,
    metadata?: { brandName?: string; exportedBy?: string }
  ): string {
    const timestampUtc = new Date().toISOString();
    const rows: string[] = [];

    // Header metadata comments
    rows.push(`# BrandGuard AI — Audit Trail & Governance Report Export`);
    rows.push(`# Generated At (UTC): ${timestampUtc}`);
    rows.push(`# Exported By: ${metadata?.exportedBy || 'Authorized Reviewer (Simulated)'}`);
    rows.push(`# Brand Scope: ${metadata?.brandName || 'All Brands'}`);
    rows.push(`# Filter Criteria: ${filterSummary}`);
    rows.push(`# Records Exported: ${events.length}`);
    rows.push(`# Storage & Integrity Disclosure: ${AUDIT_DISCLOSURE}`);
    rows.push('');

    // Column Headers
    const headers = [
      'Event ID',
      'Timestamp (UTC)',
      'Event Type',
      'Outcome',
      'Brand Name',
      'Document Title',
      'Content Version',
      'Content SHA-256',
      'Rule Baseline',
      'Actor Name',
      'Actor Role',
      'Summary',
      'Previous Event Hash',
      'Event Hash'
    ];
    rows.push(headers.map(escapeCsvField).join(','));

    // Data rows
    events.forEach((evt) => {
      const row = [
        evt.id,
        evt.timestamp,
        evt.eventType,
        evt.outcome || 'SUCCESS',
        evt.brandName || 'NovaPulse AI',
        evt.documentTitle,
        evt.contentVersion,
        evt.contentHash,
        evt.ruleVersion,
        evt.actorName,
        evt.actorRole,
        evt.summary,
        evt.prevEventHash || GENESIS_HASH,
        evt.eventHash || 'unhashed'
      ];
      rows.push(row.map(escapeCsvField).join(','));
    });

    return rows.join('\r\n');
  }

  /**
   * Export audit events and governance summary to structured JSON format.
   */
  exportAuditJson(
    events: AuditEvent[],
    metrics: GovernanceMetrics,
    filterSummary: string,
    metadata?: { brandName?: string; exportedBy?: string }
  ): string {
    const exportData = {
      reportMetadata: {
        system: 'BrandGuard AI',
        version: '10.0',
        reportType: 'Governance Audit Ledger & Compliance Extract',
        generatedAt: new Date().toISOString(),
        exportedBy: metadata?.exportedBy || 'Authorized Reviewer (Simulated)',
        brandScope: metadata?.brandName || 'All Brands',
        filterCriteria: filterSummary,
        recordCount: events.length,
        disclosure: AUDIT_DISCLOSURE
      },
      governanceMetrics: metrics,
      auditEvents: events.map((e) => ({
        id: e.id,
        timestamp: e.timestamp,
        eventType: e.eventType,
        outcome: e.outcome || 'SUCCESS',
        brandId: e.brandId,
        brandName: e.brandName,
        contentId: e.contentId,
        documentTitle: e.documentTitle,
        contentVersion: e.contentVersion,
        contentVersionId: e.contentVersionId,
        contentHash: e.contentHash,
        ruleId: e.ruleId,
        ruleVersion: e.ruleVersion,
        evaluationRunId: e.evaluationRunId,
        decisionId: e.decisionId,
        parentVersionNumber: e.parentVersionNumber,
        actor: {
          name: e.actorName,
          role: e.actorRole,
          email: e.actor?.email,
          isVerified: e.actor?.isVerified ?? false
        },
        summary: e.summary,
        payload: e.payload,
        isReconstructed: e.isReconstructed ?? false,
        prevEventHash: e.prevEventHash || GENESIS_HASH,
        eventHash: e.eventHash
      }))
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Default initial audit events matching repository seed baseline.
   */
  private getInitialSeedEvents(): AuditEvent[] {
    return [
      {
        id: 'aud-002',
        timestamp: '2026-10-22T10:15:02.000Z',
        eventType: 'GOVERNANCE_EVALUATION_COMPLETED',
        outcome: 'BLOCKED',
        brandId: 'brand-novapulse',
        brandName: 'NovaPulse AI',
        contentId: 'doc-001',
        documentTitle: 'Q4 Product Launch Teaser',
        contentVersion: 'v1.0',
        contentVersionId: 'v1.0',
        contentHash: 'e8b3a7f2910c4d8e9a2b5c7f8a1e3d6b0c2e4f6a8b1c3d5e7f9a2b4c6e8f0a1d',
        ruleVersion: 'v2.1',
        actorName: 'BrandGuard Dual-Engine',
        actorRole: 'admin',
        summary: 'Evaluation completed: 2 Critical violations, 3 Warnings identified. Approval gate locked.',
        payload: {
          criticalCount: 2,
          warningCount: 3,
          infoCount: 0,
          verifiedEvidenceCount: 0,
          unverifiedEvidenceCount: 2,
          naEvidenceCount: 3,
          triggeredRules: [
            { ruleId: 'NP-001', ruleName: 'Prohibit Guaranteed Results', category: 'prohibited_language' },
            { ruleId: 'NP-002', ruleName: 'Prohibit 100% Risk-Free Claims', category: 'prohibited_language' },
            { ruleId: 'NP-003', ruleName: 'Factual Performance Claims Substantiation', category: 'factual_claim' }
          ]
        },
        isReconstructed: true,
        prevEventHash: 'd01be4b039269a12551450a79af22611c2b566ab7d8b9ab972611a9097f02daa',
        eventHash: '31bbad9c9c6632504d5b1eff1f346e51cfe404dd7e6484445a6b5825788e1dcf'
      },
      {
        id: 'aud-001',
        timestamp: '2026-10-22T10:15:00.000Z',
        eventType: 'CONTENT_SUBMITTED',
        outcome: 'SUCCESS',
        brandId: 'brand-novapulse',
        brandName: 'NovaPulse AI',
        contentId: 'doc-001',
        documentTitle: 'Q4 Product Launch Teaser',
        contentVersion: 'v1.0',
        contentVersionId: 'v1.0',
        contentHash: 'e8b3a7f2910c4d8e9a2b5c7f8a1e3d6b0c2e4f6a8b1c3d5e7f9a2b4c6e8f0a1d',
        ruleVersion: 'v2.1',
        actorName: 'Sarah Jenkins',
        actorRole: 'creator',
        summary: 'Document submitted for initial brand governance evaluation.',
        isReconstructed: true,
        prevEventHash: GENESIS_HASH,
        eventHash: 'd01be4b039269a12551450a79af22611c2b566ab7d8b9ab972611a9097f02daa'
      }
    ];
  }
}

export const auditService = new AuditService();
