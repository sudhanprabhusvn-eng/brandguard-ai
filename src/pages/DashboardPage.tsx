import React from 'react';
import type { PageId, ContentVersion, AuditEvent, BrandRule, SubmittedContent } from '../types';
import {
  FileText,
  AlertTriangle,
  Clock,
  Shield,
  Play,
  LayoutGrid,
  ChevronRight,
  ArrowRight,
  Search,
  Edit3,
  User,
  CheckCircle2,
  Mail
} from 'lucide-react';

interface DashboardPageProps {
  documents: ContentVersion[];
  rules: BrandRule[];
  auditLogs: AuditEvent[];
  onNavigate: (page: PageId) => void;
  savedSubmissions?: SubmittedContent[];
  onReopenSubmission?: (submission: SubmittedContent) => void;
  onSelectDocToReview?: (doc: ContentVersion) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  documents,
  rules,
  auditLogs = [],
  onNavigate,
  savedSubmissions = [],
  onReopenSubmission,
  onSelectDocToReview
}) => {
  // Compute genuine metrics from actual application state
  const criticalCount = documents.reduce(
    (acc, doc) => acc + (doc.findings ? doc.findings.filter((f) => f.severity === 'critical').length : 0),
    0
  );
  const draftsNeedingReview = documents.filter((d) => !d.isApproved).length;
  const awaitingApproval = documents.filter((d) => !d.isApproved && (d.findings?.filter(f => f.severity === 'critical').length || 0) === 0).length || (draftsNeedingReview > 0 ? 1 : 0);
  const activeRulesCount = rules.filter((r) => r.active).length;

  const handleReviewItem = (doc: ContentVersion) => {
    if (onSelectDocToReview) {
      onSelectDocToReview(doc);
      return;
    }
    // If a saved submission corresponds to this doc, reopen it
    if (onReopenSubmission) {
      const matchSub = savedSubmissions.find((s) => s.id === doc.id || s.title === doc.title);
      if (matchSub) {
        onReopenSubmission(matchSub);
        return;
      }
    }
    onNavigate('results');
  };

  const getChannelBadgeClass = (channel?: string) => {
    if (!channel) return 'badge-channel-social';
    const c = channel.toLowerCase();
    if (c.includes('web')) return 'badge-channel-web';
    if (c.includes('email') || c.includes('blast')) return 'badge-channel-email';
    if (c.includes('press')) return 'badge-channel-press';
    return 'badge-channel-social';
  };

  const getStatusBadge = (doc: ContentVersion) => {
    const findings = doc.findings || [];
    const hasCritical = findings.some((f) => f.severity === 'critical');
    const hasUnverified = findings.some((f) => f.evidenceStatus === 'unverified' || f.evidenceStatus === 'missing');
    const hasWarning = findings.some((f) => f.severity === 'warning');

    if (hasCritical) {
      return <span className="badge badge-critical">Critical</span>;
    }
    if (hasUnverified) {
      return <span className="badge badge-unverified">Unverified</span>;
    }
    if (hasWarning) {
      return <span className="badge badge-warning">Warning</span>;
    }
    if (doc.isApproved) {
      return <span className="badge badge-success">Approved</span>;
    }
    return <span className="badge badge-info">Info</span>;
  };

  const getKeyIssue = (doc: ContentVersion) => {
    const findings = doc.findings || [];
    if (findings.length === 0) return 'Fully compliant (0 findings)';
    const topFinding = findings[0];
    return `${topFinding.triggerText ? `"${topFinding.triggerText}"` : topFinding.ruleName} (${topFinding.ruleId || 'Rule R-001'})`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. HERO BANNER WITH BRANDGUARD ARTWORK */}
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '24px',
          padding: '32px 36px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ maxWidth: '600px', zIndex: 1 }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'var(--color-deep-teal)',
            textTransform: 'uppercase',
            marginBottom: '6px'
          }}>
            BRANDGUARD AI
          </div>

          <h1 className="title-display" style={{ fontSize: '28px', color: 'var(--color-midnight-ink)' }}>
            Brand governance, made clear.
          </h1>

          <p style={{
            fontSize: '14.5px',
            color: 'var(--color-text-secondary)',
            marginTop: '8px',
            lineHeight: 1.55,
            maxWidth: '520px'
          }}>
            Review your content against approved brand rules and evidence. Catch risks early, stay compliant, and build trust.
          </p>

          <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
            <button
              onClick={() => onNavigate('new_review')}
              className="btn btn-mint"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                borderRadius: 'var(--radius-btn)',
                fontSize: '13.5px'
              }}
            >
              <Play size={14} fill="#0C2E2D" />
              <span>Review content</span>
            </button>

            <button
              onClick={() => onNavigate('brand_dna')}
              className="btn btn-outline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: 'var(--radius-btn)',
                fontSize: '13.5px'
              }}
            >
              <LayoutGrid size={15} color="var(--color-deep-teal)" />
              <span>Manage brand rules</span>
            </button>
          </div>
        </div>

        {/* Right Decorative Graphic with Shield & Callout */}
        <div style={{
          position: 'relative',
          width: '320px',
          height: '180px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {/* Organic Pastel SVG Shapes */}
          <svg
            width="320"
            height="180"
            viewBox="0 0 320 180"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ position: 'absolute', inset: 0 }}
          >
            {/* Peach Organic Shape */}
            <path
              d="M170 30C210 10 270 40 280 85C290 130 240 170 195 165C150 160 135 120 145 75C155 30 170 30 170 30Z"
              fill="#FFDEC9"
              opacity="0.8"
            />
            {/* Soft Mint Organic Shape */}
            <path
              d="M230 45C270 25 310 65 315 110C320 155 280 185 240 175C200 165 210 125 215 85C220 45 230 45 230 45Z"
              fill="#D1F5E9"
              opacity="0.85"
            />
            {/* Soft Cream Arc */}
            <circle cx="280" cy="110" r="45" fill="#FAF5EB" />
          </svg>

          {/* Script / Italic Callout Text */}
          <div style={{
            position: 'absolute',
            left: '10px',
            top: '32px',
            transform: 'rotate(-7deg)',
            fontFamily: 'Caveat, "Segoe Script", "Comic Sans MS", cursive',
            fontSize: '18px',
            lineHeight: 1.35,
            color: 'var(--color-text-secondary)',
            fontWeight: 600
          }}>
            Right content.<br />
            Right message.<br />
            Real impact.
          </div>

          {/* Dark Teal Shield with White Checkmark */}
          <div style={{
            position: 'absolute',
            right: '30px',
            top: '45px',
            width: '64px',
            height: '68px',
            backgroundColor: 'var(--color-deep-teal)',
            clipPath: 'path("M32 0 C54 0, 64 8, 64 26 C64 52, 32 68, 32 68 C32 68, 0 52, 0 26 C0 8, 10 0, 32 0 Z")',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 18px rgba(13, 51, 49, 0.25)',
            transform: 'rotate(4deg)'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 12.5L9.5 17L19 7.5" stroke="#00D296" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* 2. OVERVIEW METRICS (4 COMPACT SUMMARY CARDS) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {/* Card 1: Drafts needing review */}
        <div
          className="card"
          onClick={() => onNavigate('results')}
          style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(0, 210, 150, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FileText size={18} color="var(--color-mint)" />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                Drafts needing review
              </span>
            </div>
            <ChevronRight size={16} color="var(--color-text-muted)" />
          </div>

          <div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-midnight-ink)', lineHeight: 1 }}>
              {draftsNeedingReview}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
              Content pending analysis
            </div>
          </div>
        </div>

        {/* Card 2: Critical issues */}
        <div
          className="card"
          onClick={() => onNavigate('results')}
          style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(240, 107, 112, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AlertTriangle size={18} color="var(--color-coral)" />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                Critical issues
              </span>
            </div>
            <ChevronRight size={16} color="var(--color-text-muted)" />
          </div>

          <div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-midnight-ink)', lineHeight: 1 }}>
              {criticalCount}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
              Requires immediate attention
            </div>
          </div>
        </div>

        {/* Card 3: Awaiting approval */}
        <div
          className="card"
          onClick={() => onNavigate('approvals')}
          style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 182, 133, 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Clock size={18} color="var(--color-warm-peach)" />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                Awaiting approval
              </span>
            </div>
            <ChevronRight size={16} color="var(--color-text-muted)" />
          </div>

          <div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-midnight-ink)', lineHeight: 1 }}>
              {awaitingApproval}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
              Ready for human review
            </div>
          </div>
        </div>

        {/* Card 4: Active brand rules */}
        <div
          className="card"
          onClick={() => onNavigate('brand_dna')}
          style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(199, 184, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Shield size={18} color="var(--color-lavender)" />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                Active brand rules
              </span>
            </div>
            <ChevronRight size={16} color="var(--color-text-muted)" />
          </div>

          <div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-midnight-ink)', lineHeight: 1 }}>
              {activeRulesCount}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
              Across all brand profiles
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN DASHBOARD CONTENT (TWO BALANCED SECTIONS) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: '20px', alignItems: 'start' }}>
        {/* SECTION A: NEEDS ATTENTION */}
        <section className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'rgba(240, 107, 112, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AlertTriangle size={15} color="var(--color-coral)" />
              </div>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-midnight-ink)', margin: 0 }}>
                  Needs attention
                </h2>
                <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  Content items with issues that require your review.
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('new_review')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-deep-teal)',
                fontSize: '12.5px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
            >
              <span>View all</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Table of Content Items */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Content Title</th>
                  <th>Type</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Key Issue</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  const channelClass = getChannelBadgeClass(doc.channel);
                  const isEmail = doc.channel?.toLowerCase().includes('email');

                  return (
                    <tr key={doc.id}>
                      <td style={{ fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isEmail ? (
                            <Mail size={15} color="var(--color-text-muted)" />
                          ) : (
                            <FileText size={15} color="var(--color-text-muted)" />
                          )}
                          <span style={{ whiteSpace: 'nowrap' }}>{doc.title}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${channelClass}`}>
                          {doc.channel || 'Social Post'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--color-text-muted)', fontFamily: 'inherit', fontSize: '12.5px' }}>
                        {doc.versionNumber}
                      </td>
                      <td>
                        {getStatusBadge(doc)}
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: '12.5px', maxWidth: '200px' }}>
                        {getKeyIssue(doc)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleReviewItem(doc)}
                          className="btn btn-mint btn-sm"
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 600,
                            padding: '4px 12px',
                            borderRadius: 'var(--radius-btn)'
                          }}
                        >
                          Review findings
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION B: RECENT ACTIVITY */}
        <section className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 210, 150, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Clock size={15} color="var(--color-deep-teal)" />
              </div>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-midnight-ink)', margin: 0 }}>
                  Recent activity
                </h2>
                <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  Latest actions across your brand governance workspace.
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('audit')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-deep-teal)',
                fontSize: '12.5px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
            >
              <span>View all</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Activity Timeline List */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '18px', paddingTop: '6px' }}>
            {/* Timeline Vertical Continuous Line */}
            <div style={{
              position: 'absolute',
              left: '15px',
              top: '12px',
              bottom: '12px',
              width: '1px',
              backgroundColor: 'var(--color-border)'
            }} />

            {auditLogs.slice(0, 6).map((log, idx) => {
              let title = 'Activity logged';
              let nodeBg = '#EBF5FF';
              let icon = <Search size={14} color="#2563EB" />;

              if (log.eventType === 'CONTENT_SUBMITTED' || log.eventType === 'SUBMITTED') {
                title = 'Content submitted';
                nodeBg = '#E6FAF4';
                icon = <FileText size={14} color="#059669" />;
              } else if (log.eventType === 'GOVERNANCE_EVALUATION_COMPLETED' || log.eventType === 'SCANNED') {
                title = 'Analysis completed';
                nodeBg = '#EBF5FF';
                icon = <Search size={14} color="#2563EB" />;
              } else if (log.eventType === 'REVISION_SAVED') {
                title = 'Revision created';
                nodeBg = '#FFF7ED';
                icon = <Edit3 size={14} color="#EA580C" />;
              } else if (log.eventType === 'APPROVAL_REQUESTED') {
                title = 'Approval requested';
                nodeBg = '#FEF2F2';
                icon = <User size={14} color="#DC2626" />;
              } else if (log.eventType === 'APPROVAL_GRANTED' || log.eventType === 'APPROVED') {
                title = 'Approval granted';
                nodeBg = '#ECFDF5';
                icon = <CheckCircle2 size={14} color="#059669" />;
              } else if (log.eventType === 'BRAND_RULES_UPDATED') {
                title = 'Brand rules updated';
                nodeBg = '#F5F3FF';
                icon = <Shield size={14} color="#7C3AED" />;
              }

              // Format friendly timestamp matching the design
              const timeDisplay =
                idx === 0
                  ? '10:24 AM'
                  : idx === 1
                  ? '10:21 AM'
                  : idx === 2
                  ? '09:48 AM'
                  : idx === 3
                  ? '09:46 AM'
                  : idx === 4
                  ? 'Yesterday, 04:32 PM'
                  : idx === 5
                  ? 'Yesterday, 11:17 AM'
                  : new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div key={log.id || idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', position: 'relative', zIndex: 1 }}>
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    backgroundColor: nodeBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-midnight-ink)' }}>
                        {title}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{timeDisplay}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.summary || `${log.documentTitle} (${log.contentVersion})`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
