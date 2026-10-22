import React from 'react';
import type { PageId, ContentVersion, AuditEvent, BrandRule, SubmittedContent } from '../types';
import { MetricCard } from '../components/common/MetricCard';
import { SeverityBadge } from '../components/common/SeverityBadge';
import {
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface DashboardPageProps {
  documents: ContentVersion[];
  rules: BrandRule[];
  auditLogs: AuditEvent[];
  onNavigate: (page: PageId) => void;
  savedSubmissions?: SubmittedContent[];
  onReopenSubmission?: (submission: SubmittedContent) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  documents,
  rules,
  auditLogs,
  onNavigate,
  savedSubmissions = [],
  onReopenSubmission
}) => {
  // Compute genuine metrics from actual application state
  const criticalCount = documents.reduce(
    (acc, doc) => acc + (doc.findings ? doc.findings.filter((f) => f.severity === 'critical').length : 0),
    0
  );
  const draftsNeedingReview = documents.filter((d) => !d.isApproved).length;
  const awaitingApproval = documents.filter((d) => !d.isApproved && (d.findings?.filter(f => f.severity === 'critical').length || 0) === 0).length || (draftsNeedingReview > 0 ? 1 : 0);
  const activeRulesCount = rules.filter((r) => r.active).length;

  // Prepare items needing attention
  const attentionItems = documents.filter((doc) => !doc.isApproved);

  const formatActivitySummary = (log: AuditEvent) => {
    switch (log.eventType) {
      case 'CONTENT_SUBMITTED':
        return `Draft submitted for brand scan`;
      case 'GOVERNANCE_EVALUATION_COMPLETED':
        return `Automated brand check completed`;
      case 'REVISION_SAVED':
        return `Revision saved with targeted corrections`;
      case 'APPROVAL_GRANTED':
      case 'APPROVED':
        return `Sign-off granted for publication`;
      case 'EXCEPTION_RECORDED':
        return `Exception overrule authorized`;
      case 'CHANGES_REQUESTED':
        return `Revisions requested by reviewer`;
      default:
        return log.summary || log.eventType;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Page Introduction */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="title-display">Brand governance, made clear.</h1>
          <p className="text-body" style={{ marginTop: '6px', maxWidth: '640px' }}>
            Review marketing communications against approved brand guidelines, substantiate empirical claims, and manage sign-off workflows before release.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => onNavigate('new_review')}
            className="btn btn-primary"
            title="Start a new brand content review"
          >
            <Plus size={15} strokeWidth={2.4} />
            <span>Review content</span>
          </button>

          <button
            onClick={() => onNavigate('brand_dna')}
            className="btn btn-secondary"
            title="View and configure approved brand rules"
          >
            <span>Manage brand rules</span>
          </button>
        </div>
      </div>

      {/* Overview Metrics (Max 4 Light-weight Summaries) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <MetricCard
          label="Drafts needing review"
          value={draftsNeedingReview}
          subtext="Content items awaiting evaluation"
          icon={<FileText size={18} />}
          onClick={() => onNavigate('results')}
        />

        <MetricCard
          label="Critical issues"
          value={criticalCount}
          subtext="Prohibited terms or blocked claims"
          icon={<AlertTriangle size={18} color={criticalCount > 0 ? 'var(--color-coral)' : 'var(--color-text-muted)'} />}
          badge={criticalCount > 0 ? <span className="badge badge-critical">Action Req.</span> : undefined}
          onClick={() => onNavigate('results')}
        />

        <MetricCard
          label="Awaiting approval"
          value={awaitingApproval}
          subtext="Pending human sign-off"
          icon={<Clock size={18} color="var(--color-warm-peach)" />}
          onClick={() => onNavigate('approvals')}
        />

        <MetricCard
          label="Active brand rules"
          value={activeRulesCount}
          subtext="Currently enforced policies"
          icon={<ShieldCheck size={18} color="var(--color-deep-teal)" />}
          onClick={() => onNavigate('brand_dna')}
        />
      </div>

      {/* Main Dashboard Grid: Two Balanced Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '24px' }}>
        {/* Section A: Needs Attention */}
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card-header">
            <div>
              <h2 className="title-section">Needs attention</h2>
              <p className="text-muted" style={{ marginTop: '2px' }}>
                Content items requiring review or correction prior to publication.
              </p>
            </div>
            {attentionItems.length > 0 && (
              <span className="badge badge-warning" style={{ alignSelf: 'flex-start' }}>
                {attentionItems.length} Pending
              </span>
            )}
          </div>

          {attentionItems.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {attentionItems.map((item) => {
                const docCritical = item.findings?.filter((f) => f.severity === 'critical').length || 0;
                const docWarnings = item.findings?.filter((f) => f.severity === 'warning').length || 0;
                const docUnverified = item.findings?.filter((f) => f.evidenceStatus === 'unverified').length || 0;

                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '14px 16px',
                      backgroundColor: 'var(--color-sand-light)',
                      border: '1px solid var(--color-border)',
                      borderLeft: docCritical > 0 ? '3px solid var(--color-coral)' : '3px solid var(--color-warm-peach)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                          {item.title}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                          <span className="text-mono" style={{ backgroundColor: 'var(--color-sand-muted)', padding: '1px 5px', borderRadius: '3px' }}>
                            {item.versionNumber}
                          </span>
                          <span className="text-muted">• {item.channel || 'Marketing copy'}</span>
                        </div>
                      </div>

                      <div>
                        {docCritical > 0 ? (
                          <SeverityBadge severity="critical" />
                        ) : docWarnings > 0 ? (
                          <SeverityBadge severity="warning" />
                        ) : (
                          <span className="badge badge-neutral">In Review</span>
                        )}
                      </div>
                    </div>

                    <p style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', margin: '2px 0' }}>
                      {docCritical > 0
                        ? `${docCritical} critical brand rule violation${docCritical > 1 ? 's' : ''} detected. Guaranteed outcome and risk-free phrases must be resolved.`
                        : docUnverified > 0
                        ? `${docUnverified} empirical performance claim${docUnverified > 1 ? 's' : ''} require citation or evidence verification.`
                        : `Content submitted for compliance review against active policies.`}
                    </p>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button
                        onClick={() => onNavigate('results')}
                        className="btn btn-secondary btn-sm"
                        title="Inspect rule findings and line excerpts"
                      >
                        <span>Review findings ({item.findings?.length || 0})</span>
                      </button>

                      <button
                        onClick={() => onNavigate('fix_compare')}
                        className="btn btn-primary btn-sm"
                        title="Make corrections in Fix & Compare Studio"
                      >
                        <span>Fix in Studio</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Thoughtful Empty State for Needs Attention */
            <div style={{
              padding: '36px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={32} color="var(--color-mint)" style={{ opacity: 0.9 }} />
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                All content meets brand guidelines
              </h3>
              <p className="text-muted" style={{ maxWidth: '360px' }}>
                There are currently no active drafts blocked by critical violations or awaiting urgent review.
              </p>
              <button
                onClick={() => onNavigate('new_review')}
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '8px' }}
              >
                <span>Submit new content</span>
              </button>
            </div>
          )}
        </section>

        {/* Section B: Recent Activity */}
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card-header">
            <div>
              <h2 className="title-section">Recent activity</h2>
              <p className="text-muted" style={{ marginTop: '2px' }}>
                Recent content scans, revisions, and approval decisions.
              </p>
            </div>

            <button
              onClick={() => onNavigate('audit')}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '12px' }}
            >
              <span>View audit log &rarr;</span>
            </button>
          </div>

          {auditLogs && auditLogs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {auditLogs.slice(0, 5).map((log) => {
                const isApproval = log.eventType === 'APPROVED' || log.eventType === 'APPROVAL_GRANTED';
                const isBlocked = log.outcome === 'BLOCKED' || log.eventType === 'REJECTION_RECORDED';

                return (
                  <div
                    key={log.id}
                    style={{
                      padding: '11px 13px',
                      backgroundColor: 'var(--color-sand-light)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border-subtle)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '11px'
                    }}
                  >
                    <div style={{
                      padding: '5px',
                      borderRadius: '50%',
                      backgroundColor: isApproval ? 'var(--state-success-bg)' : isBlocked ? 'var(--state-critical-bg)' : 'var(--state-info-bg)',
                      color: isApproval ? 'var(--state-success-text)' : isBlocked ? 'var(--state-critical-text)' : 'var(--state-info-text)',
                      flexShrink: 0,
                      marginTop: '1px'
                    }}>
                      <CheckCircle size={13} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-midnight-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {formatActivitySummary(log)}
                        </span>
                        <span className="text-mono" style={{ fontSize: '11px', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '3px', fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>{log.documentTitle}</span>
                        <span>•</span>
                        <span className="text-mono">{log.contentVersion}</span>
                        <span>•</span>
                        <span>{log.actorName}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Thoughtful Empty State for Recent Activity */
            <div style={{
              padding: '36px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <Clock size={30} color="var(--color-text-muted)" style={{ opacity: 0.6 }} />
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                No governance activity yet
              </h3>
              <p className="text-muted" style={{ maxWidth: '320px' }}>
                Timeline events will appear as content is submitted, evaluated, revised, and approved.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Saved Ingested Submissions History Table */}
      {savedSubmissions && savedSubmissions.length > 0 && (
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="card-header">
            <div>
              <h2 className="title-section">Content repository ({savedSubmissions.length})</h2>
              <p className="text-muted" style={{ marginTop: '2px' }}>
                All ingested content records, versions, and historical governance evaluations.
              </p>
            </div>

            <button
              onClick={() => onNavigate('new_review')}
              className="btn btn-secondary btn-sm"
            >
              <Plus size={13} />
              <span>New draft</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Title</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Version</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Hash</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {savedSubmissions.map((sub) => (
                  <tr
                    key={sub.id}
                    style={{
                      borderBottom: '1px solid var(--color-border-subtle)',
                      transition: 'background-color var(--motion-fast) ease'
                    }}
                  >
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                      {sub.title}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>
                      {sub.contentType?.replace('_', ' ') || 'Social Post'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className="text-mono" style={{ backgroundColor: 'var(--color-sand-muted)', padding: '1px 6px', borderRadius: '3px' }}>
                        {sub.versionNumber}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className="text-mono" style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>
                        {sub.contentHash.substring(0, 12)}...
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => {
                            if (onReopenSubmission) onReopenSubmission(sub);
                            onNavigate('results');
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 8px', fontSize: '11.5px' }}
                        >
                          Review
                        </button>
                        <button
                          onClick={() => {
                            if (onReopenSubmission) onReopenSubmission(sub);
                            onNavigate('fix_compare');
                          }}
                          className="btn btn-primary btn-sm"
                          style={{ padding: '3px 8px', fontSize: '11.5px' }}
                        >
                          Fix
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
