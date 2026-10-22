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
  Zap,
  Sparkles,
  FolderOpen
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
  const activeDoc = documents[0];
  const criticalCount = activeDoc?.findings.filter((f) => f.severity === 'critical').length || 0;
  const pendingApprovalsCount = documents.filter((d) => !d.isApproved).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="title-display">Governance Dashboard</h1>
          <p className="text-muted" style={{ marginTop: '4px' }}>
            Real-time brand rule conformance, unverified claims triage, and approval queue status.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => onNavigate('new_review')}
            className="btn btn-primary"
            style={{ padding: '10px 20px', fontSize: '14px' }}
          >
            <Plus size={16} strokeWidth={2.4} />
            <span>New Content Review</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <MetricCard
          label="Active Drafts in Review"
          value={documents.length}
          subtext="1 pending recheck evaluation"
          icon={<FileText size={20} />}
          onClick={() => onNavigate('results')}
        />
        <MetricCard
          label="Open Critical Violations"
          value={criticalCount}
          subtext="Blocks publication gate"
          icon={<AlertTriangle size={20} color="var(--color-coral)" />}
          badge={<span className="badge badge-critical">Action Req.</span>}
          onClick={() => onNavigate('results')}
        />
        <MetricCard
          label="Awaiting Formal Sign-Off"
          value={pendingApprovalsCount}
          subtext="Bound to exact SHA-256 version"
          icon={<Clock size={20} color="var(--color-warm-peach)" />}
          onClick={() => onNavigate('approvals')}
        />
        <MetricCard
          label="Active Brand Rules"
          value={rules.filter((r) => r.active).length}
          subtext="NovaPulse v2.1 Policy Baseline"
          icon={<ShieldCheck size={20} color="var(--color-deep-teal)" />}
          onClick={() => onNavigate('brand_dna')}
        />
      </div>

      {/* High-Priority Triage & Activity Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
        {/* Left: Action Triage Queue */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="var(--color-coral)" />
              <h2 className="title-section">High-Priority Action Required</h2>
            </div>
            <span className="badge badge-critical">{criticalCount} Blocking</span>
          </div>

          <p className="text-muted" style={{ fontSize: '13px' }}>
            The following content items contain verified brand policy breaches or unverified claims that must be resolved prior to publication.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeDoc && (
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'var(--color-sand)',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: '4px solid var(--color-coral)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                      {activeDoc.title}
                    </h3>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                      <span className="text-mono" style={{ backgroundColor: 'var(--color-sand-muted)', padding: '2px 6px', borderRadius: '4px' }}>
                        {activeDoc.versionNumber}
                      </span>
                      <span className="text-muted">• {activeDoc.channel}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <SeverityBadge severity="critical" />
                  </div>
                </div>

                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                  Triggered rules: <strong>NP-001 (Guaranteed Results)</strong> and <strong>NP-002 (Risk-Free Claims)</strong>. 2 claims lack approved evidence substantiation.
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button
                    onClick={() => onNavigate('fix_compare')}
                    className="btn btn-primary btn-sm"
                  >
                    <span>Fix in Compare Studio</span>
                    <ArrowRight size={14} />
                  </button>
                  <button
                    onClick={() => onNavigate('results')}
                    className="btn btn-secondary btn-sm"
                  >
                    <span>Inspect Findings ({activeDoc.findings.length})</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Recent Governance Activity Stream */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="var(--color-deep-teal)" />
              <h2 className="title-section">Recent Governance Activity</h2>
            </div>
            <button
              onClick={() => onNavigate('audit')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '12px' }}
            >
              <span>View Full Audit Ledger</span>
            </button>
          </div>

          <p className="text-muted" style={{ fontSize: '13px' }}>
            Cryptographically logged verification milestones and reviewer sign-offs.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {auditLogs.slice(0, 4).map((log) => (
              <div
                key={log.id}
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'var(--color-sand)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  border: '1px solid var(--color-sand-muted)'
                }}
              >
                <div style={{
                  padding: '6px',
                  borderRadius: '50%',
                  backgroundColor: log.eventType === 'APPROVED' ? 'var(--state-success-bg)' : 'var(--state-info-bg)',
                  color: log.eventType === 'APPROVED' ? 'var(--state-success-text)' : 'var(--state-info-text)',
                  marginTop: '2px'
                }}>
                  <CheckCircle size={14} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                      {log.eventType} • {log.documentTitle}
                    </span>
                    <span className="text-mono" style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    {log.summary}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    <span>Actor: {log.actorName} ({log.actorRole})</span>
                    <span>• Version: {log.contentVersion}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ingested Content Records & Traceability Repository */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderOpen size={18} color="var(--color-deep-teal)" />
            <h2 className="title-section">Ingested Content Repository ({savedSubmissions.length})</h2>
          </div>
          <button
            onClick={() => onNavigate('new_review')}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '12px' }}
          >
            <Plus size={13} />
            <span>Ingest New Content</span>
          </button>
        </div>

        <p className="text-muted" style={{ fontSize: '13px' }}>
          Traceable marketing content records stored with cryptographic SHA-256 fingerprints, linked brand baselines, and preserved verbatim text.
        </p>

        {savedSubmissions.length === 0 ? (
          <div style={{
            padding: '24px',
            backgroundColor: 'var(--color-sand)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
            fontSize: '13px',
            color: 'var(--color-text-secondary)'
          }}>
            No ingested content records saved yet. Click <strong>Ingest New Content</strong> or <strong>New Content Review</strong> to create your first traceable submission.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
            {savedSubmissions.map((sub) => (
              <div
                key={sub.id}
                style={{
                  padding: '14px 16px',
                  backgroundColor: 'var(--color-sand)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-sand-dark)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                      {sub.title}
                    </h3>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '3px', fontSize: '11px' }}>
                      <span className="badge badge-neutral">{sub.versionNumber}</span>
                      <span className="text-muted">• {sub.brandProfileName}</span>
                    </div>
                  </div>
                  {onReopenSubmission && (
                    <button
                      onClick={() => onReopenSubmission(sub)}
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                      title="Reopen content in reviewer"
                    >
                      Reopen
                    </button>
                  )}
                </div>

                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-mono">ID: {sub.id}</span>
                  <span>{sub.characterCount} chars</span>
                </div>

                <div className="text-mono" style={{
                  fontSize: '10.5px',
                  backgroundColor: 'var(--color-soft-white)',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--color-sand-dark)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: 'var(--color-text-secondary)'
                }}>
                  {sub.contentHash}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
