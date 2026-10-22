import React, { useState, useMemo } from 'react';
import type {
  PageId,
  ContentVersion,
  PersonaRole,
  SubmittedContent,
  BrandProfile,
  WorkflowStatus,
  DecisionType,
  ApprovalDecisionRecord
} from '../types';
import { approvalService } from '../services/approvalService';
import { computeWordDiff } from '../utils/diffUtils';
import { SeverityBadge } from '../components/common/SeverityBadge';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  ArrowLeft,
  ArrowRight,
  Eye,
  GitCompare,
  Search,
  Lock,
  RotateCcw,
  UserCheck,
  Clock
} from 'lucide-react';

interface ApprovalQueuePageProps {
  document?: ContentVersion;
  allSubmissions?: SubmittedContent[];
  brandProfiles?: BrandProfile[];
  currentRole: PersonaRole;
  onApprove?: (justification: string) => void;
  onRequestRevisions?: (comments: string) => void;
  onNavigate: (page: PageId) => void;
  onShowToast: (message: string) => void;
  onDecisionRecorded?: (decision: ApprovalDecisionRecord) => void;
}

export const ApprovalQueuePage: React.FC<ApprovalQueuePageProps> = ({
  document,
  allSubmissions = [],
  brandProfiles = [],
  currentRole,
  onApprove,
  onRequestRevisions,
  onNavigate,
  onShowToast,
  onDecisionRecorded
}) => {
  // Build queue items from actual saved data
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const queueItems = useMemo(() => {
    void refreshTrigger;
    return approvalService.buildQueueItems(allSubmissions, brandProfiles, document ? [document] : []);
  }, [allSubmissions, brandProfiles, document, refreshTrigger]);

  // Selected item for Detail Review view (null means Queue List view)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(() => {
    if (document) {
      return `${document.id}_${document.versionNumber}`;
    }
    return null;
  });

  // Queue Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | WorkflowStatus>('ALL');
  const [brandFilter, setBrandFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Review Detail Decision Form States
  const [decisionType, setDecisionType] = useState<DecisionType>('APPROVED');
  const [reasonInput, setReasonInput] = useState<string>('');
  const [isExceptionChecked, setIsExceptionChecked] = useState<boolean>(false);
  const [exceptionJustification, setExceptionJustification] = useState<string>('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState<boolean>(false);
  const [showDiffComparison, setShowDiffComparison] = useState<boolean>(false);

  // Active item in detail review
  const activeItem = useMemo(() => {
    if (!selectedItemId) return null;
    return queueItems.find((item) => item.id === selectedItemId) || queueItems[0] || null;
  }, [queueItems, selectedItemId]);

  // Parent version text for before/after comparison if available
  const parentVersionItem = useMemo(() => {
    if (!activeItem || !activeItem.parentVersionNumber) return null;
    return queueItems.find(
      (item) => item.contentId === activeItem.contentId && item.versionNumber === activeItem.parentVersionNumber
    );
  }, [queueItems, activeItem]);

  // Compute Diff between parent and active revision
  const diffResult = useMemo(() => {
    if (!parentVersionItem || !activeItem) return null;
    return computeWordDiff(parentVersionItem.rawText, activeItem.rawText);
  }, [parentVersionItem, activeItem]);

  // Filtered Queue Items
  const filteredQueue = useMemo(() => {
    return queueItems.filter((item) => {
      // Status filter
      if (statusFilter !== 'ALL' && item.workflowStatus !== statusFilter) {
        return false;
      }
      // Brand filter
      if (brandFilter !== 'ALL' && item.brandProfileId !== brandFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = item.contentTitle.toLowerCase().includes(query);
        const matchBrand = item.brandProfileName.toLowerCase().includes(query);
        const matchVer = item.versionNumber.toLowerCase().includes(query);
        if (!matchTitle && !matchBrand && !matchVer) return false;
      }
      return true;
    });
  }, [queueItems, statusFilter, brandFilter, searchQuery]);

  // Check if current role has reviewer/approver authority
  const isApproverRole = currentRole === 'approver' || currentRole === 'admin';

  // Handle Recording Decision
  const handleRecordDecision = () => {
    if (!activeItem) return;

    // Check superseded guard
    if (activeItem.workflowStatus === 'SUPERSEDED' || !activeItem.isLatestVersion) {
      onShowToast('Cannot make decision: Version is SUPERSEDED by a newer revision.');
      setIsConfirmModalOpen(false);
      return;
    }

    const evalResult = activeItem.latestEvaluation;
    const blockingCount = evalResult?.summary.criticalCount || 0;
    const totalCount = evalResult?.findings.length || 0;

    setIsSubmittingDecision(true);

    const reviewerName =
      currentRole === 'approver'
        ? 'J. Doe (Lead Approver)'
        : currentRole === 'admin'
        ? 'System Administrator'
        : 'Demonstration Reviewer';

    const result = approvalService.recordDecision({
      brandId: activeItem.brandProfileId,
      brandName: activeItem.brandProfileName,
      contentId: activeItem.contentId,
      contentTitle: activeItem.contentTitle,
      contentVersionId: activeItem.versionId,
      versionNumber: activeItem.versionNumber,
      contentHash: activeItem.contentHash,
      decision: decisionType,
      reviewerName,
      reviewerRole: currentRole,
      reason: reasonInput,
      comment: reasonInput,
      isException: isExceptionChecked,
      exceptionJustification,
      ruleVersionRef: activeItem.ruleVersionRef,
      evaluationStatus: evalResult?.overallStatus || 'NOT_EVALUATED',
      blockingFindingsCount: blockingCount,
      totalFindingsCount: totalCount,
      parentVersionNumber: activeItem.parentVersionNumber,
      isSupersededCheck: !activeItem.isLatestVersion
    });

    setIsSubmittingDecision(false);
    setIsConfirmModalOpen(false);

    if (!result.success || !result.decision) {
      onShowToast(result.error || 'Failed to record approval decision.');
      return;
    }

    // Trigger parent app notifications if applicable
    if (decisionType === 'APPROVED' && onApprove) {
      onApprove(isExceptionChecked ? `[EXCEPTION] ${exceptionJustification}` : reasonInput || 'Standard Approval');
    } else if (decisionType === 'CHANGES_REQUESTED' && onRequestRevisions) {
      onRequestRevisions(reasonInput);
    }

    if (onDecisionRecorded) {
      onDecisionRecorded(result.decision);
    }

    onShowToast(`Recorded decision "${decisionType}" for version ${activeItem.versionNumber}.`);
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1140px', margin: '0 auto' }}>
      {/* Top Header & Demonstration Authorization Disclaimer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="title-display">Governance Approval Gate</h1>
            <span className="badge badge-info" style={{ fontSize: '11px' }}>
              Phase 9: Human Approval Workflow
            </span>
          </div>
          <p className="text-muted" style={{ marginTop: '4px', fontSize: '13px' }}>
            Explicit human sign-off bound strictly to the evaluated content version hash. Passing automated checks does not equal approval.
          </p>
        </div>

        {selectedItemId && (
          <button
            onClick={() => setSelectedItemId(null)}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={14} />
            <span>Return to Queue List</span>
          </button>
        )}
      </div>

      {/* Honest Prototype Identity & Authorization Notice */}
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: 'var(--color-sand)',
          border: '1px solid var(--color-sand-dark)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          fontSize: '12.5px',
          color: 'var(--color-midnight-ink)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserCheck size={16} color="var(--color-deep-teal)" />
          <span>
            <strong>Simulated Persona:</strong> Acting as <strong>{currentRole.replace('_', ' ').toUpperCase()}</strong>.
            (Client-side demonstration mode; no server-side authentication is enforced in this prototype).
          </span>
        </div>

        {!isApproverRole && (
          <span className="badge badge-warning" style={{ fontSize: '11px' }}>
            Switch to Approver in Top Bar to Sign Off
          </span>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: APPROVAL QUEUE LIST VIEW                                          */}
      {/* ========================================================================= */}
      {!selectedItemId && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Filters Bar */}
          <div
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: 'var(--color-soft-white)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              {/* Status Tabs */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`btn btn-sm ${statusFilter === 'ALL' ? 'btn-dark' : 'btn-secondary'}`}
                  style={{ fontSize: '11.5px', padding: '5px 10px' }}
                >
                  All Items ({queueItems.length})
                </button>
                <button
                  onClick={() => setStatusFilter('IN_REVIEW')}
                  className={`btn btn-sm ${statusFilter === 'IN_REVIEW' ? 'btn-dark' : 'btn-secondary'}`}
                  style={{ fontSize: '11.5px', padding: '5px 10px' }}
                >
                  <Clock size={12} />
                  <span>Awaiting Review ({queueItems.filter((q) => q.workflowStatus === 'IN_REVIEW').length})</span>
                </button>
                <button
                  onClick={() => setStatusFilter('APPROVED')}
                  className={`btn btn-sm ${statusFilter === 'APPROVED' ? 'btn-dark' : 'btn-secondary'}`}
                  style={{ fontSize: '11.5px', padding: '5px 10px' }}
                >
                  <ShieldCheck size={12} />
                  <span>Approved ({queueItems.filter((q) => q.workflowStatus === 'APPROVED').length})</span>
                </button>
                <button
                  onClick={() => setStatusFilter('CHANGES_REQUESTED')}
                  className={`btn btn-sm ${statusFilter === 'CHANGES_REQUESTED' ? 'btn-dark' : 'btn-secondary'}`}
                  style={{ fontSize: '11.5px', padding: '5px 10px' }}
                >
                  <RotateCcw size={12} />
                  <span>Changes Requested</span>
                </button>
                <button
                  onClick={() => setStatusFilter('SUPERSEDED')}
                  className={`btn btn-sm ${statusFilter === 'SUPERSEDED' ? 'btn-dark' : 'btn-secondary'}`}
                  style={{ fontSize: '11.5px', padding: '5px 10px' }}
                >
                  <Lock size={12} />
                  <span>Superseded Archive</span>
                </button>
              </div>

              {/* Brand Filter & Search input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <select
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                  style={{
                    padding: '5px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-sand-dark)',
                    fontSize: '11.5px',
                    backgroundColor: 'var(--color-sand)',
                    color: 'var(--color-midnight-ink)'
                  }}
                >
                  <option value="ALL">All Brands</option>
                  {brandProfiles.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Search size={14} color="var(--color-text-muted)" />
                  <input
                    type="text"
                    placeholder="Search submissions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-sand-dark)',
                      fontSize: '12px',
                      fontFamily: 'Inter, sans-serif'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Queue Items Table / Cards */}
          {filteredQueue.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '48px 20px',
                backgroundColor: 'var(--color-soft-white)'
              }}
            >
              <CheckCircle2 size={36} color="var(--color-mint)" style={{ margin: '0 auto 10px', display: 'block' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                No queue records match the active filter
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                {statusFilter === 'IN_REVIEW'
                  ? 'There are no pending submissions awaiting reviewer sign-off.'
                  : 'Adjust your status or brand filter to inspect other saved items.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredQueue.map((item) => {
                const evalSummary = item.latestEvaluation?.summary;
                const criticalCount = evalSummary?.criticalCount || 0;
                const warningCount = evalSummary?.warningCount || 0;
                const overallStatus = evalSummary?.overallStatus || 'NOT_EVALUATED';

                const statusColor =
                  item.workflowStatus === 'APPROVED'
                    ? 'var(--color-mint)'
                    : item.workflowStatus === 'IN_REVIEW'
                    ? 'var(--color-warm-peach)'
                    : item.workflowStatus === 'REJECTED'
                    ? 'var(--color-coral)'
                    : 'var(--color-text-muted)';

                return (
                  <div
                    key={item.id}
                    className="card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      borderLeft: `5px solid ${statusColor}`,
                      backgroundColor: item.workflowStatus === 'SUPERSEDED' ? 'var(--color-sand)' : 'var(--color-soft-white)',
                      transition: 'all 120ms ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-midnight-ink)' }}>
                            {item.contentTitle}
                          </h3>
                          <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                            {item.versionNumber}
                          </span>
                          {!item.isLatestVersion && (
                            <span className="badge" style={{ backgroundColor: 'var(--color-sand-dark)', fontSize: '10.5px' }}>
                              Superseded
                            </span>
                          )}
                          <span
                            className="badge"
                            style={{
                              fontSize: '11px',
                              backgroundColor:
                                item.workflowStatus === 'APPROVED'
                                  ? 'rgba(0, 229, 168, 0.2)'
                                  : item.workflowStatus === 'IN_REVIEW'
                                  ? 'rgba(255, 182, 133, 0.3)'
                                  : item.workflowStatus === 'REJECTED'
                                  ? 'rgba(240, 107, 112, 0.2)'
                                  : 'var(--color-sand-dark)',
                              color: 'var(--color-midnight-ink)'
                            }}
                          >
                            Status: {item.workflowStatus.replace('_', ' ')}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px', flexWrap: 'wrap' }}>
                          <span>Brand: <strong>{item.brandProfileName} ({item.ruleVersionRef})</strong></span>
                          <span>• Type: {item.contentType}</span>
                          <span>• Submitted: {new Date(item.submittedAt).toLocaleDateString()}</span>
                          <span className="text-mono">• SHA-256: {item.contentHash.substring(0, 14)}...</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {/* Conformance pill */}
                        <div style={{ textAlign: 'right', fontSize: '11.5px' }}>
                          <div style={{ fontWeight: 600, color: overallStatus === 'FAIL' ? 'var(--color-coral)' : overallStatus === 'PASS' ? 'var(--color-deep-teal)' : 'var(--color-midnight-ink)' }}>
                            Scan: {overallStatus}
                          </div>
                          <div style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>
                            {criticalCount} Critical • {warningCount} Warnings
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedItemId(item.id);
                            setShowDiffComparison(false);
                            setReasonInput('');
                            setIsExceptionChecked(false);
                            setExceptionJustification('');
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                        >
                          <Eye size={13} />
                          <span>Review & Decide</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Short quote snippet */}
                    <div style={{
                      padding: '8px 12px',
                      backgroundColor: 'var(--color-sand)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12.5px',
                      color: 'var(--color-text-secondary)',
                      fontStyle: 'italic',
                      lineHeight: 1.5
                    }}>
                      "{item.rawText.substring(0, 180)}{item.rawText.length > 180 ? '...' : ''}"
                    </div>

                    {/* Historical Decision Banner if present */}
                    {item.historicalDecisions.length > 0 && (
                      <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={12} color="var(--color-deep-teal)" />
                        <span>
                          Latest Decision: <strong>{item.historicalDecisions[0].decision}</strong> by {item.historicalDecisions[0].reviewerName} on {new Date(item.historicalDecisions[0].timestamp).toLocaleDateString()}
                          {item.historicalDecisions[0].isException && ' (Exception Granted)'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: REVIEW DETAIL & SIGN-OFF VIEW                                     */}
      {/* ========================================================================= */}
      {selectedItemId && activeItem && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Card for Selected Version */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-midnight-ink)' }}>
                    {activeItem.contentTitle}
                  </h2>
                  <span className="badge badge-neutral" style={{ fontSize: '12px' }}>
                    Version: {activeItem.versionNumber}
                  </span>
                  <span
                    className="badge"
                    style={{
                      fontSize: '11px',
                      backgroundColor:
                        activeItem.workflowStatus === 'APPROVED'
                          ? 'rgba(0, 229, 168, 0.2)'
                          : activeItem.workflowStatus === 'IN_REVIEW'
                          ? 'rgba(255, 182, 133, 0.3)'
                          : 'var(--color-sand-dark)'
                    }}
                  >
                    Workflow: {activeItem.workflowStatus.replace('_', ' ')}
                  </span>
                  {!activeItem.isLatestVersion && (
                    <span className="badge badge-critical" style={{ fontSize: '11px' }}>
                      SUPERSEDED BY NEWER REVISION
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px', flexWrap: 'wrap' }}>
                  <span>Brand: <strong>{activeItem.brandProfileName} ({activeItem.ruleVersionRef})</strong></span>
                  <span>• Type: {activeItem.contentType}</span>
                  <span>• Submitted by {activeItem.submitterName}</span>
                </div>
              </div>

              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                <div>
                  <span className="text-muted" style={{ fontSize: '11px', display: 'block' }}>
                    Cryptographic Version Fingerprint (SHA-256)
                  </span>
                  <code className="text-mono" style={{ fontSize: '12px', color: 'var(--color-deep-teal)', fontWeight: 600 }}>
                    {activeItem.contentHash.substring(0, 24)}...
                  </code>
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                  <button
                    onClick={() => onNavigate('results')}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                  >
                    Analysis Results
                  </button>
                  <button
                    onClick={() => onNavigate('fix_compare')}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                  >
                    Fix & Compare
                  </button>
                </div>
              </div>
            </div>

            {/* Superseded Warning Banner if not latest */}
            {!activeItem.isLatestVersion && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: 'var(--state-critical-bg)',
                border: '1px solid var(--state-critical-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--state-critical-text)',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <AlertOctagon size={18} />
                <span>
                  <strong>Stale Version Protected:</strong> A newer revision exists for this content. Decisions cannot be made on superseded historical versions.
                </span>
              </div>
            )}

            {/* Content Text Inspection Box */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  Exact Version Copy Under Review:
                </span>
                {parentVersionItem && (
                  <button
                    onClick={() => setShowDiffComparison(!showDiffComparison)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11.5px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  >
                    <GitCompare size={12} />
                    <span>{showDiffComparison ? 'Hide Before/After Diff' : `Compare with ${parentVersionItem.versionNumber}`}</span>
                  </button>
                )}
              </div>

              {/* Plain text view or Before/After Diff view */}
              {showDiffComparison && diffResult ? (
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: 'var(--color-sand)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-sand-dark)',
                    fontSize: '14px',
                    lineHeight: 1.7,
                    fontFamily: 'Inter, sans-serif'
                  }}
                >
                  <div style={{ fontSize: '11.5px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-deep-teal)' }}>
                    Diff vs Parent {parentVersionItem?.versionNumber}:
                  </div>
                  {diffResult.segments.map((seg, idx) => {
                    if (seg.type === 'removed') {
                      return (
                        <del
                          key={idx}
                          aria-label="Removed text"
                          style={{
                            backgroundColor: 'rgba(240, 107, 112, 0.25)',
                            color: 'var(--color-coral)',
                            padding: '1px 3px',
                            margin: '0 1px',
                            borderRadius: '2px'
                          }}
                        >
                          [-] {seg.text}
                        </del>
                      );
                    }
                    if (seg.type === 'added') {
                      return (
                        <ins
                          key={idx}
                          aria-label="Added text"
                          style={{
                            backgroundColor: 'rgba(0, 229, 168, 0.2)',
                            color: 'var(--color-deep-teal)',
                            textDecoration: 'none',
                            fontWeight: 600,
                            padding: '1px 3px',
                            margin: '0 1px',
                            borderRadius: '2px'
                          }}
                        >
                          [+] {seg.text}
                        </ins>
                      );
                    }
                    return <span key={idx}>{seg.text}</span>;
                  })}
                </div>
              ) : (
                <div
                  style={{
                    padding: '18px',
                    backgroundColor: 'var(--color-sand)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-sand-dark)',
                    fontSize: '14px',
                    lineHeight: 1.7,
                    color: 'var(--color-midnight-ink)',
                    fontFamily: 'Inter, sans-serif'
                  }}
                >
                  "{activeItem.rawText}"
                </div>
              )}
            </div>
          </div>

          {/* Governance Conformance Matrix */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-midnight-ink)' }}>
                Pre-Publication Governance Conformance Evaluation
              </h3>
              <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                Engine Ref: {activeItem.ruleVersionRef}
              </span>
            </div>

            {/* Evaluation summary rows */}
            {activeItem.latestEvaluation ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Critical Blocking Checks */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  backgroundColor: activeItem.latestEvaluation.summary.criticalCount === 0 ? 'var(--state-success-bg)' : 'var(--state-critical-bg)',
                  border: `1px solid ${activeItem.latestEvaluation.summary.criticalCount === 0 ? 'var(--state-success-border)' : 'var(--state-critical-border)'}`,
                  borderRadius: 'var(--radius-md)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {activeItem.latestEvaluation.summary.criticalCount === 0 ? (
                      <CheckCircle2 size={18} color="var(--state-success-text)" />
                    ) : (
                      <AlertOctagon size={18} color="var(--state-critical-text)" />
                    )}
                    <div>
                      <strong style={{ fontSize: '13px' }}>Prohibited Language & Legal Guarantees</strong>
                      <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                        Exact phrase brand policy compliance checks
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 700 }}>
                    {activeItem.latestEvaluation.summary.criticalCount === 0
                      ? 'PASSED (0 Violations)'
                      : `BLOCKED (${activeItem.latestEvaluation.summary.criticalCount} Critical Violations)`}
                  </span>
                </div>

                {/* Disclosure & Warning Checks */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  backgroundColor: activeItem.latestEvaluation.summary.warningCount === 0 ? 'var(--state-success-bg)' : 'var(--state-warning-bg)',
                  border: `1px solid ${activeItem.latestEvaluation.summary.warningCount === 0 ? 'var(--state-success-border)' : 'var(--state-warning-border)'}`,
                  borderRadius: 'var(--radius-md)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {activeItem.latestEvaluation.summary.warningCount === 0 ? (
                      <CheckCircle2 size={18} color="var(--state-success-text)" />
                    ) : (
                      <AlertTriangle size={18} color="var(--state-warning-text)" />
                    )}
                    <div>
                      <strong style={{ fontSize: '13px' }}>Mandatory Disclosures & Terms</strong>
                      <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                        Statutory required disclosure terms in promotional material
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>
                    {activeItem.latestEvaluation.summary.warningCount === 0
                      ? 'ALL DISCLOSURES VERIFIED'
                      : `${activeItem.latestEvaluation.summary.warningCount} WARNINGS / UNVERIFIED`}
                  </span>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                No automated evaluation recorded for this version.
              </p>
            )}

            {/* Findings Detailed Breakdown if any exist */}
            {activeItem.latestEvaluation && activeItem.latestEvaluation.findings.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  Active Governance Items ({activeItem.latestEvaluation.findings.length}):
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {activeItem.latestEvaluation.findings.map((f) => (
                    <div
                      key={f.id}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: 'var(--color-sand)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <SeverityBadge severity={f.severity} />
                        <span className="text-mono" style={{ fontWeight: 600, color: 'var(--color-deep-teal)' }}>
                          {f.ruleId}
                        </span>
                        <span>{f.explanation}</span>
                      </div>
                      <span className="text-muted" style={{ fontStyle: 'italic' }}>
                        Excerpt: "{f.triggerText || 'N/A'}"
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Historical Decisions Log for this Version */}
          {activeItem.historicalDecisions.length > 0 && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--color-soft-white)' }}>
              <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--color-midnight-ink)' }}>
                Recorded Governance Decisions on {activeItem.versionNumber} ({activeItem.historicalDecisions.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeItem.historicalDecisions.map((dec) => (
                  <div
                    key={dec.id}
                    style={{
                      padding: '12px',
                      backgroundColor: 'var(--color-sand)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '12.5px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{
                          color: dec.decision === 'APPROVED' ? 'var(--color-deep-teal)' : dec.decision === 'REJECTED' ? 'var(--color-coral)' : 'var(--color-midnight-ink)'
                        }}>
                          {dec.decision}
                        </strong>
                        {dec.isException && (
                          <span className="badge badge-warning" style={{ fontSize: '10px' }}>
                            Exception Overrule
                          </span>
                        )}
                        <span className="text-muted">• by {dec.reviewerName} ({dec.reviewerRole})</span>
                      </div>
                      <span className="text-muted" style={{ fontSize: '11px' }}>
                        {new Date(dec.timestamp).toLocaleString()}
                      </span>
                    </div>

                    {dec.reason && (
                      <div style={{ color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                        Reason / Attestation: "{dec.reason}"
                      </div>
                    )}
                    {dec.exceptionJustification && (
                      <div style={{ color: 'var(--color-coral)', fontWeight: 500 }}>
                        Exception Justification: "{dec.exceptionJustification}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviewer Sign-Off Decision Form */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-midnight-ink)' }}>
                Reviewer Governance Decision & Attestation
              </h3>
              <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                Bound to Version: {activeItem.versionNumber}
              </span>
            </div>

            {!activeItem.isLatestVersion ? (
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                This version has been superseded by a newer revision. Formal decisions can only be recorded on the current active version.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Decision Type Radio Buttons */}
                <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="decision_type"
                      checked={decisionType === 'APPROVED'}
                      onChange={() => setDecisionType('APPROVED')}
                    />
                    <span style={{ fontWeight: 600, color: 'var(--color-midnight-ink)', fontSize: '13.5px' }}>
                      Approve for Publication
                    </span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="decision_type"
                      checked={decisionType === 'CHANGES_REQUESTED'}
                      onChange={() => setDecisionType('CHANGES_REQUESTED')}
                    />
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '13.5px' }}>
                      Request Additional Changes
                    </span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="decision_type"
                      checked={decisionType === 'REJECTED'}
                      onChange={() => setDecisionType('REJECTED')}
                    />
                    <span style={{ color: 'var(--color-coral)', fontSize: '13.5px' }}>
                      Reject Content
                    </span>
                  </label>
                </div>

                {/* Conditional Exception Checkbox for Approval with Critical Violations */}
                {decisionType === 'APPROVED' && (activeItem.latestEvaluation?.summary.criticalCount || 0) > 0 && (
                  <div style={{
                    padding: '12px 14px',
                    backgroundColor: 'rgba(255, 182, 133, 0.2)',
                    border: '1px solid var(--color-warm-peach)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                      <input
                        type="checkbox"
                        checked={isExceptionChecked}
                        onChange={(e) => setIsExceptionChecked(e.target.checked)}
                      />
                      <span>Authorize Documented Exception Overrule (Requires Policy Justification)</span>
                    </label>

                    {isExceptionChecked && (
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                          Legal/Business Exception Justification (Required):
                        </label>
                        <textarea
                          value={exceptionJustification}
                          onChange={(e) => setExceptionJustification(e.target.value)}
                          rows={2}
                          className="form-textarea"
                          placeholder="State authorized legal clearance or special contractual exception..."
                          style={{ fontSize: '13px' }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Reason / Attestation Notes input */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    {decisionType === 'REJECTED'
                      ? 'Rejection Justification (Mandatory):'
                      : decisionType === 'CHANGES_REQUESTED'
                      ? 'Actionable Creator Feedback (Mandatory):'
                      : 'Audit Attestation / Approval Notes (Optional):'}
                  </label>
                  <textarea
                    value={reasonInput}
                    onChange={(e) => setReasonInput(e.target.value)}
                    rows={3}
                    className="form-textarea"
                    placeholder={
                      decisionType === 'REJECTED'
                        ? 'Explain why this copy is rejected and cannot be published...'
                        : decisionType === 'CHANGES_REQUESTED'
                        ? 'Describe specific edits the creator must make before resubmitting...'
                        : 'Notes on evidence verification, scope, or audience considerations...'
                    }
                    style={{ fontSize: '13px' }}
                  />
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
                  <button
                    onClick={() => setSelectedItemId(null)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={() => setIsConfirmModalOpen(true)}
                    disabled={
                      isSubmittingDecision ||
                      (decisionType === 'REJECTED' && reasonInput.trim().length < 5) ||
                      (decisionType === 'CHANGES_REQUESTED' && reasonInput.trim().length < 5) ||
                      (decisionType === 'APPROVED' &&
                        (activeItem.latestEvaluation?.summary.criticalCount || 0) > 0 &&
                        (!isExceptionChecked || exceptionJustification.trim().length < 10))
                    }
                    className="btn btn-primary"
                    style={{
                      padding: '9px 22px',
                      backgroundColor: decisionType === 'REJECTED' ? 'var(--color-coral)' : undefined
                    }}
                  >
                    <ShieldCheck size={15} />
                    <span>Confirm & Sign Decision ({decisionType})</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {isConfirmModalOpen && activeItem && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(20, 35, 35, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '480px',
              width: '100%',
              backgroundColor: 'var(--color-soft-white)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={24} color={decisionType === 'REJECTED' ? 'var(--color-coral)' : 'var(--color-deep-teal)'} />
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-midnight-ink)' }}>
                Confirm Governance Decision: {decisionType}
              </h3>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              You are recording a durable governance decision for <strong>"{activeItem.contentTitle}"</strong> bound to version <strong>{activeItem.versionNumber}</strong> (hash: {activeItem.contentHash.substring(0, 16)}...).
            </p>

            {isExceptionChecked && (
              <div style={{ padding: '8px 12px', backgroundColor: 'rgba(240, 107, 112, 0.1)', borderRadius: '4px', fontSize: '12px', color: 'var(--color-coral)' }}>
                <strong>Exception Overrule Active:</strong> This decision explicitly overrides {activeItem.latestEvaluation?.summary.criticalCount || 0} Critical brand violations.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="btn btn-secondary btn-sm"
              >
                Go Back
              </button>
              <button
                onClick={handleRecordDecision}
                disabled={isSubmittingDecision}
                className="btn btn-primary btn-sm"
                style={{
                  backgroundColor: decisionType === 'REJECTED' ? 'var(--color-coral)' : undefined
                }}
              >
                Sign & Record Decision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalQueuePage;
