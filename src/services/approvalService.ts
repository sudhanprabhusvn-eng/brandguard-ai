/**
 * BrandGuard AI — Human Approval Workflow & Governance Control Service (Phase 9)
 *
 * Implements:
 * - Version-bound approval decision records (immutable historical decisions)
 * - Strict workflow state machine (DRAFT -> IN_REVIEW -> APPROVED / REJECTED / CHANGES_REQUESTED -> SUPERSEDED)
 * - Approval eligibility and exception policy enforcement
 * - Stale version concurrency defense (superseded versions cannot be approved as latest)
 * - Durable client-side persistence with honest disclosure of prototype limitations
 */

import type {
  WorkflowStatus,
  DecisionType,
  ApprovalDecisionRecord,
  ApprovalQueueItem,
  SubmittedContent,
  BrandProfile,
  ContentVersion,
  PersonaRole
} from '../types';
import { governanceEngine } from './governanceEngine.ts';

export const APPROVAL_DECISIONS_STORAGE_KEY = 'brandguard_approval_decisions_v1';
export const WORKFLOW_STATUS_STORAGE_KEY = 'brandguard_workflow_statuses_v1';

export interface WorkflowStatusEntry {
  contentId: string;
  versionNumber: string;
  status: WorkflowStatus;
  updatedAt: string;
  updatedBy: string;
  updatedByRole: PersonaRole;
}

/**
 * Validated State Machine transition rules.
 */
export function canTransitionWorkflowStatus(
  current: WorkflowStatus,
  target: WorkflowStatus
): { allowed: boolean; reason?: string } {
  if (current === target) {
    return { allowed: true };
  }

  // Superseding is always valid when a newer version is minted
  if (target === 'SUPERSEDED') {
    return { allowed: true };
  }

  switch (current) {
    case 'DRAFT':
      if (target === 'IN_REVIEW') {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: `Cannot transition directly from DRAFT to ${target}. Content must be submitted to IN_REVIEW first.`
      };

    case 'IN_REVIEW':
      if (target === 'APPROVED' || target === 'REJECTED' || target === 'CHANGES_REQUESTED') {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: `Cannot transition from IN_REVIEW to ${target}. Reviewer must make an explicit decision (APPROVED, REJECTED, or CHANGES_REQUESTED).`
      };

    case 'CHANGES_REQUESTED':
    case 'REJECTED':
      if (target === 'IN_REVIEW') {
        return {
          allowed: false,
          reason: `Version is ${current}. To proceed, the creator must create a new revision (e.g. v1.1), not resubmit the rejected version in place.`
        };
      }
      return {
        allowed: false,
        reason: `Version is already ${current}. Historical decisions cannot be overwritten in place.`
      };

    case 'APPROVED':
      return {
        allowed: false,
        reason: 'Version is already APPROVED and locked. Approved versions cannot be altered or un-approved.'
      };

    case 'SUPERSEDED':
      return {
        allowed: false,
        reason: 'Version is SUPERSEDED by a newer revision and is archived. Decisions must be made on the latest active version.'
      };

    default:
      return { allowed: false, reason: `Unknown workflow state transition from ${current} to ${target}.` };
  }
}

export const approvalService = {
  /**
   * Load all durable approval decision records from localStorage.
   */
  loadAllDecisions(): ApprovalDecisionRecord[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem(APPROVAL_DECISIONS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  /**
   * Save an immutable decision record to storage.
   */
  saveDecision(record: ApprovalDecisionRecord): boolean {
    try {
      if (typeof localStorage === 'undefined') return false;
      const all = this.loadAllDecisions();
      // Immutable append: never overwrite existing decision records
      const updated = [record, ...all];
      localStorage.setItem(APPROVAL_DECISIONS_STORAGE_KEY, JSON.stringify(updated));
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Load workflow status map.
   */
  loadWorkflowStatuses(): Record<string, WorkflowStatusEntry> {
    try {
      if (typeof localStorage === 'undefined') return {};
      const raw = localStorage.getItem(WORKFLOW_STATUS_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  },

  /**
   * Get workflow status for a specific version.
   */
  getWorkflowStatus(contentId: string, versionNumber: string): WorkflowStatus {
    const key = `${contentId}_${versionNumber}`;
    const statuses = this.loadWorkflowStatuses();
    return statuses[key]?.status || 'DRAFT';
  },

  /**
   * Set workflow status for a specific content version.
   */
  setWorkflowStatus(params: {
    contentId: string;
    versionNumber: string;
    status: WorkflowStatus;
    actorName: string;
    actorRole: PersonaRole;
  }): boolean {
    try {
      if (typeof localStorage === 'undefined') return false;
      const key = `${params.contentId}_${params.versionNumber}`;
      const statuses = this.loadWorkflowStatuses();

      statuses[key] = {
        contentId: params.contentId,
        versionNumber: params.versionNumber,
        status: params.status,
        updatedAt: new Date().toISOString(),
        updatedBy: params.actorName,
        updatedByRole: params.actorRole
      };

      localStorage.setItem(WORKFLOW_STATUS_STORAGE_KEY, JSON.stringify(statuses));
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Submit a draft version into the approval queue (DRAFT -> IN_REVIEW).
   */
  submitForReview(params: {
    contentId: string;
    versionNumber: string;
    submitterName: string;
    submitterRole: PersonaRole;
  }): { success: boolean; error?: string } {
    const currentStatus = this.getWorkflowStatus(params.contentId, params.versionNumber);
    const transitionCheck = canTransitionWorkflowStatus(currentStatus, 'IN_REVIEW');

    if (!transitionCheck.allowed) {
      return { success: false, error: transitionCheck.reason };
    }

    const saved = this.setWorkflowStatus({
      contentId: params.contentId,
      versionNumber: params.versionNumber,
      status: 'IN_REVIEW',
      actorName: params.submitterName,
      actorRole: params.submitterRole
    });

    if (!saved) {
      return { success: false, error: 'Storage write failed while updating workflow status.' };
    }

    return { success: true };
  },

  /**
   * Record a formal reviewer decision (APPROVED, REJECTED, or CHANGES_REQUESTED).
   */
  recordDecision(params: {
    brandId: string;
    brandName: string;
    contentId: string;
    contentTitle: string;
    contentVersionId: string;
    versionNumber: string;
    contentHash: string;
    decision: DecisionType;
    reviewerName: string;
    reviewerRole: PersonaRole;
    reason?: string;
    comment?: string;
    isException?: boolean;
    exceptionJustification?: string;
    ruleVersionRef: string;
    evaluationStatus: string;
    blockingFindingsCount: number;
    totalFindingsCount: number;
    parentVersionNumber?: string;
    isSupersededCheck?: boolean;
  }): { success: boolean; decision?: ApprovalDecisionRecord; error?: string } {
    const currentStatus = this.getWorkflowStatus(params.contentId, params.versionNumber);

    // 1. Concurrency & Stale Check: verify version is not superseded
    if (params.isSupersededCheck) {
      return {
        success: false,
        error: `Cannot record decision: Version ${params.versionNumber} is SUPERSEDED by a newer revision. Review must be performed on the latest active version.`
      };
    }

    // 2. Validate state machine transition
    const targetStatus: WorkflowStatus = params.decision;
    const transitionCheck = canTransitionWorkflowStatus(currentStatus, targetStatus);
    if (!transitionCheck.allowed) {
      return { success: false, error: transitionCheck.reason };
    }

    // 3. Validation: Rejection requires a meaningful reason
    if (params.decision === 'REJECTED') {
      const reason = params.reason?.trim();
      if (!reason || reason.length < 5) {
        return {
          success: false,
          error: 'Rejection requires a meaningful justification explaining why the content cannot be published (at least 5 characters).'
        };
      }
    }

    // 4. Validation: Request Changes requires actionable feedback
    if (params.decision === 'CHANGES_REQUESTED') {
      const reason = params.reason?.trim();
      if (!reason || reason.length < 5) {
        return {
          success: false,
          error: 'Requesting changes requires actionable feedback explaining what modifications the author must make (at least 5 characters).'
        };
      }
    }

    // 5. Validation: Approval with active Critical Blocking Violations requires an explicit exception policy
    if (params.decision === 'APPROVED' && params.blockingFindingsCount > 0) {
      if (!params.isException) {
        return {
          success: false,
          error: `Cannot approve content with ${params.blockingFindingsCount} blocking Critical brand rule violations without an authorized Exception Overrule.`
        };
      }
      if (!params.exceptionJustification || params.exceptionJustification.trim().length < 10) {
        return {
          success: false,
          error: 'An Exception Overrule approval requires a documented business/legal justification of at least 10 characters.'
        };
      }
    }

    const decisionId = `dec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const timestamp = new Date().toISOString();

    const decisionRecord: ApprovalDecisionRecord = {
      id: decisionId,
      brandId: params.brandId,
      brandName: params.brandName,
      contentId: params.contentId,
      contentTitle: params.contentTitle,
      contentVersionId: params.contentVersionId,
      versionNumber: params.versionNumber,
      contentHash: params.contentHash,
      decision: params.decision,
      reviewerName: params.reviewerName,
      reviewerRole: params.reviewerRole,
      timestamp,
      reason: params.reason?.trim(),
      comment: params.comment?.trim(),
      isException: !!params.isException,
      exceptionJustification: params.exceptionJustification?.trim(),
      ruleVersionRef: params.ruleVersionRef,
      evaluationStatus: params.evaluationStatus,
      blockingFindingsCount: params.blockingFindingsCount,
      totalFindingsCount: params.totalFindingsCount,
      parentVersionNumber: params.parentVersionNumber
    };

    // 6. Save decision to durable storage
    const saveSuccess = this.saveDecision(decisionRecord);
    if (!saveSuccess) {
      return { success: false, error: 'Storage failure: unable to persist approval decision record.' };
    }

    // 7. Update current version workflow status
    this.setWorkflowStatus({
      contentId: params.contentId,
      versionNumber: params.versionNumber,
      status: targetStatus,
      actorName: params.reviewerName,
      actorRole: params.reviewerRole
    });

    return { success: true, decision: decisionRecord };
  },

  /**
   * Mark all older versions of a content item as SUPERSEDED when a new revision is created.
   */
  supersedePriorVersions(
    contentId: string,
    newestVersionNumber: string,
    actorName: string,
    actorRole: PersonaRole
  ): void {
    const statuses = this.loadWorkflowStatuses();
    let modified = false;

    Object.keys(statuses).forEach((key) => {
      if (key.startsWith(`${contentId}_`)) {
        const entry = statuses[key];
        if (entry.versionNumber !== newestVersionNumber && entry.status !== 'SUPERSEDED') {
          statuses[key] = {
            ...entry,
            status: 'SUPERSEDED',
            updatedAt: new Date().toISOString(),
            updatedBy: actorName,
            updatedByRole: actorRole
          };
          modified = true;
        }
      }
    });

    if (modified && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(WORKFLOW_STATUS_STORAGE_KEY, JSON.stringify(statuses));
      } catch {
        // ignore
      }
    }
  },

  /**
   * Build complete queue items from actual saved content and brands.
   */
  buildQueueItems(
    submissions: SubmittedContent[],
    brandProfiles: BrandProfile[],
    activeDocuments: ContentVersion[]
  ): ApprovalQueueItem[] {
    const decisions = this.loadAllDecisions();
    const statuses = this.loadWorkflowStatuses();
    const queueItems: ApprovalQueueItem[] = [];

    // Helper to evaluate a content version
    const evaluateVersion = (text: string, brand: BrandProfile) => {
      const doc: ContentVersion = {
        id: 'temp_queue_eval',
        title: 'Queue Review',
        versionNumber: 'v1.0',
        contentHash: 'hash',
        channel: 'marketing',
        text,
        timestamp: new Date().toISOString(),
        author: 'Creator',
        findings: [],
        isApproved: false
      };
      return governanceEngine.evaluateContent(doc, brand);
    };

    // 1. Process all SubmittedContent records
    submissions.forEach((submission) => {
      const brand = brandProfiles.find((b) => b.id === submission.brandProfileId) || brandProfiles[0];
      const versionHistory = submission.versionHistory || [];

      // Determine newest version number
      const latestVerRecord = versionHistory[versionHistory.length - 1];
      const latestVerNumber = latestVerRecord?.versionNumber || submission.versionNumber;

      versionHistory.forEach((ver, index) => {
        const isLatest = ver.versionNumber === latestVerNumber;
        const parentVer = index > 0 ? versionHistory[index - 1].versionNumber : undefined;
        const statusKey = `${submission.id}_${ver.versionNumber}`;
        const rawStatus = statuses[statusKey]?.status;

        // Auto-assign SUPERSEDED if an older version has no decision or wasn't marked yet
        let effectiveStatus: WorkflowStatus = rawStatus || (isLatest ? 'IN_REVIEW' : 'SUPERSEDED');
        if (!isLatest && effectiveStatus !== 'APPROVED' && effectiveStatus !== 'REJECTED') {
          effectiveStatus = 'SUPERSEDED';
        }

        // Run evaluation
        const evalResult = brand ? evaluateVersion(ver.rawText, brand) : undefined;

        // Historical decisions for this specific version
        const versionDecisions = decisions.filter(
          (d) => d.contentId === submission.id && d.versionNumber === ver.versionNumber
        );

        queueItems.push({
          id: `${submission.id}_${ver.versionNumber}`,
          contentId: submission.id,
          contentTitle: submission.title,
          contentType: submission.contentType,
          brandProfileId: submission.brandProfileId,
          brandProfileName: submission.brandProfileName,
          ruleVersionRef: ver.ruleVersionRef || submission.ruleVersionRef,
          versionId: ver.versionId,
          versionNumber: ver.versionNumber,
          contentHash: ver.contentHash,
          rawText: ver.rawText,
          submittedAt: ver.createdAt || submission.createdAt,
          submitterName: 'Content Creator',
          submitterRole: 'creator',
          workflowStatus: effectiveStatus,
          latestEvaluation: evalResult,
          isLatestVersion: isLatest,
          parentVersionNumber: parentVer,
          historicalDecisions: versionDecisions
        });
      });
    });

    // 2. If no submissions exist, include activeDocuments to maintain demo usability
    if (queueItems.length === 0 && activeDocuments.length > 0) {
      activeDocuments.forEach((doc) => {
        const brand = brandProfiles.find((b) => b.id === doc.brandProfileId) || brandProfiles[0];
        const statusKey = `${doc.id}_${doc.versionNumber}`;
        const effectiveStatus: WorkflowStatus =
          statuses[statusKey]?.status || (doc.isApproved ? 'APPROVED' : 'IN_REVIEW');

        const evalResult = brand ? evaluateVersion(doc.text, brand) : undefined;
        const versionDecisions = decisions.filter(
          (d) => d.contentId === doc.id && d.versionNumber === doc.versionNumber
        );

        queueItems.push({
          id: `${doc.id}_${doc.versionNumber}`,
          contentId: doc.id,
          contentTitle: doc.title,
          contentType: doc.contentType || 'general_marketing',
          brandProfileId: doc.brandProfileId || brand.id,
          brandProfileName: doc.brandProfileName || brand.name,
          ruleVersionRef: doc.ruleVersionRef || brand.version,
          versionId: doc.id,
          versionNumber: doc.versionNumber,
          contentHash: doc.contentHash,
          rawText: doc.text,
          submittedAt: doc.timestamp || new Date().toISOString(),
          submitterName: doc.author || 'Content Creator',
          submitterRole: 'creator',
          workflowStatus: effectiveStatus,
          latestEvaluation: evalResult,
          isLatestVersion: true,
          historicalDecisions: versionDecisions
        });
      });
    }

    return queueItems;
  }
};
