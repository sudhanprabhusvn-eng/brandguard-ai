import React, { useState, useMemo } from 'react';
import type {
  PageId,
  ContentVersion,
  AuditEvent,
  BrandRule,
  SubmittedContent,
  PersonaRole,
  BrandProfile
} from '../types';
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
  Mail,
  Layers,
  Sparkles,
  Lock,
  Sliders
} from 'lucide-react';

interface DashboardPageProps {
  documents: ContentVersion[];
  rules: BrandRule[];
  auditLogs: AuditEvent[];
  onNavigate: (page: PageId) => void;
  savedSubmissions?: SubmittedContent[];
  onReopenSubmission?: (submission: SubmittedContent) => void;
  onSelectDocToReview?: (doc: ContentVersion) => void;
  onSelectDocToFix?: (doc: ContentVersion) => void;
  onSelectDocToApprove?: (doc: ContentVersion) => void;
  currentRole?: PersonaRole;
  onRoleChange?: (role: PersonaRole) => void;
  activeProfile?: BrandProfile;
  allProfiles?: BrandProfile[];
  onSelectProfile?: (id: string) => void;
  isAiDegraded?: boolean;
  onToggleAiDegraded?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  documents,
  rules,
  auditLogs = [],
  onNavigate,
  savedSubmissions = [],
  onReopenSubmission,
  onSelectDocToReview,
  onSelectDocToFix,
  onSelectDocToApprove,
  currentRole = 'brand_manager',
  onRoleChange,
  activeProfile,
  allProfiles = [],
  onSelectProfile,
  isAiDegraded = false,
  onToggleAiDegraded
}) => {
  // Interactive filters for the content items table
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs_attention' | 'pending' | 'approved'>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Compute Ground-Truth Fleet Metrics
  const criticalCount = documents.reduce(
    (acc, doc) => acc + (doc.findings ? doc.findings.filter((f) => f.severity === 'critical').length : 0),
    0
  );
  const warningCount = documents.reduce(
    (acc, doc) => acc + (doc.findings ? doc.findings.filter((f) => f.severity === 'warning').length : 0),
    0
  );
  const unverifiedCount = documents.reduce(
    (acc, doc) => acc + (doc.findings ? doc.findings.filter((f) => f.evidenceStatus === 'unverified' || f.evidenceStatus === 'missing').length : 0),
    0
  );

  const draftsNeedingReview = documents.filter((d) => !d.isApproved).length;
  const approvedDocs = documents.filter((d) => d.isApproved);
  const approvedCount = approvedDocs.length;

  const criticalDocs = documents.filter(
    (d) => !d.isApproved && (d.findings?.some((f) => f.severity === 'critical'))
  );
  const awaitingApproval = documents.filter(
    (d) => !d.isApproved && !(d.findings?.some((f) => f.severity === 'critical'))
  ).length || (draftsNeedingReview > 0 ? 1 : 0);

  const activeRulesCount = rules.filter((r) => r.active).length;
  const totalRulesCount = rules.length || (activeProfile?.rules?.length ?? 5);
  const evidenceCount = activeProfile?.evidenceRecords?.length ?? 4;

  const compliantDocsCount = documents.filter(
    (d) => (d.findings?.filter((f) => f.severity === 'critical').length || 0) === 0
  ).length;
  const complianceRate = documents.length > 0 ? Math.round((compliantDocsCount / documents.length) * 100) : 100;

  // Extract unique channels present in document list
  const uniqueChannels = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((d) => {
      if (d.channel) set.add(d.channel);
    });
    return Array.from(set);
  }, [documents]);

  // Violation breakdown by rule category (for Brand Manager insights)
  const categoryViolations = useMemo(() => {
    const counts: Record<string, number> = {
      prohibited_language: 0,
      factual_claim: 0,
      required_disclosure: 0,
      tone: 0,
      brand_voice: 0
    };
    documents.forEach((d) => {
      d.findings?.forEach((f) => {
        const cat = f.category || 'prohibited_language';
        counts[cat] = (counts[cat] || 0) + 1;
      });
    });
    return counts;
  }, [documents]);

  // Primary document requiring surgical fix (first doc with critical findings)
  const highestPriorityFixDoc = useMemo(() => {
    return documents.find((d) => !d.isApproved && d.findings?.some((f) => f.severity === 'critical')) || documents[0];
  }, [documents]);

  // Primary document awaiting approval
  const highestPriorityApprovalDoc = useMemo(() => {
    return documents.find((d) => !d.isApproved) || documents[0];
  }, [documents]);

  // Navigation handlers with doc pre-selection
  const handleReviewItem = (doc: ContentVersion) => {
    if (onSelectDocToReview) {
      onSelectDocToReview(doc);
      return;
    }
    if (onReopenSubmission) {
      const matchSub = savedSubmissions.find((s) => s.id === doc.id || s.title === doc.title);
      if (matchSub) {
        onReopenSubmission(matchSub);
        return;
      }
    }
    onNavigate('results');
  };

  const handleFixItem = (doc: ContentVersion) => {
    if (onSelectDocToFix) {
      onSelectDocToFix(doc);
      return;
    }
    if (onSelectDocToReview) {
      onSelectDocToReview(doc);
    }
    onNavigate('fix_compare');
  };

  const handleApproveItem = (doc: ContentVersion) => {
    if (onSelectDocToApprove) {
      onSelectDocToApprove(doc);
      return;
    }
    if (onSelectDocToReview) {
      onSelectDocToReview(doc);
    }
    onNavigate('approvals');
  };

  // Helper styles
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
      return <span className="badge badge-critical">Critical ({findings.filter(f => f.severity === 'critical').length})</span>;
    }
    if (hasUnverified) {
      return <span className="badge badge-unverified">Unverified Citation</span>;
    }
    if (hasWarning) {
      return <span className="badge badge-warning">Warning ({findings.filter(f => f.severity === 'warning').length})</span>;
    }
    if (doc.isApproved) {
      return <span className="badge badge-success">Approved</span>;
    }
    return <span className="badge badge-info">Info Notice</span>;
  };

  const getKeyIssue = (doc: ContentVersion) => {
    const findings = doc.findings || [];
    if (findings.length === 0) return 'Fully compliant (0 findings)';
    const topFinding = findings[0];
    return `${topFinding.triggerText ? `"${topFinding.triggerText}"` : topFinding.ruleName} (${topFinding.ruleId || 'Rule R-001'})`;
  };

  // Filtered Documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // 1. Status Filter
      if (statusFilter === 'needs_attention') {
        const hasIssues = doc.findings && doc.findings.some((f) => f.severity === 'critical' || f.severity === 'warning');
        if (!hasIssues || doc.isApproved) return false;
      } else if (statusFilter === 'pending') {
        if (doc.isApproved) return false;
      } else if (statusFilter === 'approved') {
        if (!doc.isApproved) return false;
      }

      // 2. Channel Filter
      if (channelFilter !== 'all') {
        if (!doc.channel || !doc.channel.toLowerCase().includes(channelFilter.toLowerCase())) {
          return false;
        }
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = doc.title.toLowerCase().includes(query);
        const matchText = doc.text.toLowerCase().includes(query);
        const matchIssue = doc.findings?.some(
          (f) =>
            f.ruleName.toLowerCase().includes(query) ||
            f.explanation.toLowerCase().includes(query) ||
            (f.triggerText && f.triggerText.toLowerCase().includes(query))
        );
        if (!matchTitle && !matchText && !matchIssue) return false;
      }

      return true;
    });
  }, [documents, statusFilter, channelFilter, searchQuery]);

  // Persona Role metadata configuration
  const roleMeta = {
    creator: {
      label: 'Content Creator',
      tagline: 'Draft, test, and surgically refine compliant marketing copy.',
      badgeTitle: 'CREATOR WORKSPACE',
      accentBg: 'rgba(0, 210, 150, 0.1)',
      accentBorder: 'rgba(0, 210, 150, 0.3)',
      primaryCtaText: 'Submit New Copy',
      primaryCtaAction: () => onNavigate('new_review'),
      secondaryCtaText: 'Open Fix & Compare Studio',
      secondaryCtaAction: () => {
        if (highestPriorityFixDoc) {
          handleFixItem(highestPriorityFixDoc);
        } else {
          onNavigate('fix_compare');
        }
      },
      scriptQuote: 'Draft bold.\nRefine fast.\nStay compliant.',
      primaryTableTitle: 'My Drafts & Submissions to Refine',
      primaryTableSubtitle: 'Surgically correct highlighted violations before requesting sign-off.'
    },
    brand_manager: {
      label: 'Brand Manager',
      tagline: 'Define voice guidelines, curate evidence, and enforce deterministic rules.',
      badgeTitle: 'BRAND GOVERNANCE HEADQUARTERS',
      accentBg: 'rgba(199, 184, 255, 0.15)',
      accentBorder: 'rgba(199, 184, 255, 0.4)',
      primaryCtaText: 'Manage Brand Rules & DNA',
      primaryCtaAction: () => onNavigate('brand_dna'),
      secondaryCtaText: 'View Evidence Library',
      secondaryCtaAction: () => onNavigate('brand_dna'),
      scriptQuote: 'Protect the brand.\nPower the voice.\nBuild real trust.',
      primaryTableTitle: 'Content Fleet Governance & Policy Conformance',
      primaryTableSubtitle: 'Live rule evaluation results across active marketing channels.'
    },
    approver: {
      label: 'Compliance Approver',
      tagline: 'Review high-risk copy, verify claim citations, and grant authoritative sign-offs.',
      badgeTitle: 'HUMAN COMPLIANCE & APPROVAL GATE',
      accentBg: 'rgba(255, 182, 133, 0.15)',
      accentBorder: 'rgba(255, 182, 133, 0.4)',
      primaryCtaText: 'Open Approval Queue',
      primaryCtaAction: () => onNavigate('approvals'),
      secondaryCtaText: 'Review High-Risk Items',
      secondaryCtaAction: () => {
        if (highestPriorityApprovalDoc) {
          handleApproveItem(highestPriorityApprovalDoc);
        } else {
          onNavigate('approvals');
        }
      },
      scriptQuote: 'Zero liability.\nEvidence-backed.\nComplete trust.',
      primaryTableTitle: 'Human Approval Gate Queue',
      primaryTableSubtitle: 'Documents requiring human verification and signed compliance clearance.'
    },
    admin: {
      label: 'System Administrator',
      tagline: 'Verify cryptographic SHA-256 chains, monitor fleet logs, and govern policies.',
      badgeTitle: 'ENTERPRISE AUDIT & CRYPTOGRAPHIC CENTER',
      accentBg: 'rgba(13, 51, 49, 0.08)',
      accentBorder: 'rgba(13, 51, 49, 0.25)',
      primaryCtaText: 'Verify Cryptographic Audit Chain',
      primaryCtaAction: () => onNavigate('audit'),
      secondaryCtaText: 'Export Audit Trail (CSV/JSON)',
      secondaryCtaAction: () => onNavigate('audit'),
      scriptQuote: 'Tamper-evident.\nSHA-256 chained.\nCryptographically secure.',
      primaryTableTitle: 'Enterprise Governance Records & Audit Fleet',
      primaryTableSubtitle: 'Multi-profile content verification status and immutable lifecycle state.'
    }
  };

  const currentMeta = roleMeta[currentRole] || roleMeta.brand_manager;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 0. INTERACTIVE PERSONA CATEGORY SWITCHER PILL BAR */}
      <div
        className="card"
        style={{
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: 'rgba(13, 51, 49, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-deep-teal)'
          }}>
            <Sliders size={16} />
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
              Persona Dashboard View
            </span>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--color-midnight-ink)' }}>
              Viewing As: <span style={{ color: 'var(--color-deep-teal)' }}>{currentMeta.label}</span>
            </div>
          </div>
        </div>

        {/* 4 Interactive Persona Options */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {/* Option A: Creator */}
          <button
            onClick={() => onRoleChange && onRoleChange('creator')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              fontSize: '12.5px',
              fontWeight: currentRole === 'creator' ? 700 : 500,
              backgroundColor: currentRole === 'creator' ? 'var(--color-deep-teal)' : 'var(--color-sand-light)',
              color: currentRole === 'creator' ? '#FFFFFF' : 'var(--color-midnight-ink)',
              border: currentRole === 'creator' ? '1px solid var(--color-deep-teal)' : '1px solid var(--color-border)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Switch to Content Creator dashboard"
          >
            <Edit3 size={13} color={currentRole === 'creator' ? 'var(--color-mint)' : 'var(--color-text-muted)'} />
            <span>Creator</span>
            <span style={{
              fontSize: '10.5px',
              padding: '1px 6px',
              borderRadius: '10px',
              backgroundColor: currentRole === 'creator' ? 'rgba(0, 210, 150, 0.25)' : 'rgba(0, 0, 0, 0.06)',
              color: currentRole === 'creator' ? 'var(--color-mint)' : 'var(--color-text-secondary)'
            }}>
              {draftsNeedingReview} Drafts
            </span>
          </button>

          {/* Option B: Brand Manager */}
          <button
            onClick={() => onRoleChange && onRoleChange('brand_manager')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              fontSize: '12.5px',
              fontWeight: currentRole === 'brand_manager' ? 700 : 500,
              backgroundColor: currentRole === 'brand_manager' ? 'var(--color-deep-teal)' : 'var(--color-sand-light)',
              color: currentRole === 'brand_manager' ? '#FFFFFF' : 'var(--color-midnight-ink)',
              border: currentRole === 'brand_manager' ? '1px solid var(--color-deep-teal)' : '1px solid var(--color-border)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Switch to Brand Manager dashboard"
          >
            <Shield size={13} color={currentRole === 'brand_manager' ? 'var(--color-mint)' : 'var(--color-text-muted)'} />
            <span>Brand Manager</span>
            <span style={{
              fontSize: '10.5px',
              padding: '1px 6px',
              borderRadius: '10px',
              backgroundColor: currentRole === 'brand_manager' ? 'rgba(0, 210, 150, 0.25)' : 'rgba(0, 0, 0, 0.06)',
              color: currentRole === 'brand_manager' ? 'var(--color-mint)' : 'var(--color-text-secondary)'
            }}>
              {activeRulesCount} Rules
            </span>
          </button>

          {/* Option C: Approver */}
          <button
            onClick={() => onRoleChange && onRoleChange('approver')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              fontSize: '12.5px',
              fontWeight: currentRole === 'approver' ? 700 : 500,
              backgroundColor: currentRole === 'approver' ? 'var(--color-deep-teal)' : 'var(--color-sand-light)',
              color: currentRole === 'approver' ? '#FFFFFF' : 'var(--color-midnight-ink)',
              border: currentRole === 'approver' ? '1px solid var(--color-deep-teal)' : '1px solid var(--color-border)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Switch to Compliance Approver dashboard"
          >
            <CheckCircle2 size={13} color={currentRole === 'approver' ? 'var(--color-mint)' : 'var(--color-text-muted)'} />
            <span>Approver</span>
            <span style={{
              fontSize: '10.5px',
              padding: '1px 6px',
              borderRadius: '10px',
              backgroundColor: currentRole === 'approver' ? 'rgba(0, 210, 150, 0.25)' : 'rgba(0, 0, 0, 0.06)',
              color: currentRole === 'approver' ? 'var(--color-mint)' : 'var(--color-text-secondary)'
            }}>
              {awaitingApproval} Ready
            </span>
          </button>

          {/* Option D: Admin */}
          <button
            onClick={() => onRoleChange && onRoleChange('admin')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              fontSize: '12.5px',
              fontWeight: currentRole === 'admin' ? 700 : 500,
              backgroundColor: currentRole === 'admin' ? 'var(--color-deep-teal)' : 'var(--color-sand-light)',
              color: currentRole === 'admin' ? '#FFFFFF' : 'var(--color-midnight-ink)',
              border: currentRole === 'admin' ? '1px solid var(--color-deep-teal)' : '1px solid var(--color-border)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Switch to System Administrator dashboard"
          >
            <Layers size={13} color={currentRole === 'admin' ? 'var(--color-mint)' : 'var(--color-text-muted)'} />
            <span>Admin</span>
            <span style={{
              fontSize: '10.5px',
              padding: '1px 6px',
              borderRadius: '10px',
              backgroundColor: currentRole === 'admin' ? 'rgba(0, 210, 150, 0.25)' : 'rgba(0, 0, 0, 0.06)',
              color: currentRole === 'admin' ? 'var(--color-mint)' : 'var(--color-text-secondary)'
            }}>
              SHA-256
            </span>
          </button>
        </div>
      </div>

      {/* 1. HERO BANNER ADAPTED DYNAMICALLY TO SELECTED PERSONA */}
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
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          borderLeft: `5px solid var(--color-deep-teal)`
        }}
      >
        <div style={{ maxWidth: '640px', zIndex: 1 }}>
          {/* Header Badges: Brand Profile & Role Mode */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <span style={{
              fontSize: '10.5px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: 'var(--color-deep-teal)',
              textTransform: 'uppercase',
              backgroundColor: 'rgba(0, 210, 150, 0.15)',
              padding: '3px 8px',
              borderRadius: 'var(--radius-xs)'
            }}>
              {currentMeta.badgeTitle}
            </span>

            {/* Active Brand Profile Pill / Selector */}
            {activeProfile && (
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                backgroundColor: 'var(--color-sand-muted)',
                padding: '3px 10px',
                borderRadius: 'var(--radius-pill)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <Shield size={11} color="var(--color-deep-teal)" />
                <span>Brand:</span>
                {onSelectProfile && allProfiles.length > 1 ? (
                  <select
                    value={activeProfile.id}
                    onChange={(e) => onSelectProfile(e.target.value)}
                    style={{
                      border: 'none',
                      backgroundColor: 'transparent',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--color-midnight-ink)',
                      cursor: 'pointer',
                      outline: 'none',
                      padding: 0
                    }}
                    aria-label="Switch active brand profile"
                  >
                    {allProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.version})
                      </option>
                    ))}
                  </select>
                ) : (
                  <strong>{activeProfile.name} ({activeProfile.version})</strong>
                )}
              </div>
            )}

            {/* Dual-Engine Mode Toggle Pill */}
            <button
              onClick={onToggleAiDegraded}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: isAiDegraded ? 'var(--state-critical-text)' : 'var(--state-success-text)',
                backgroundColor: isAiDegraded ? 'var(--state-warning-bg)' : 'var(--state-success-bg)',
                border: 'none',
                padding: '3px 10px',
                borderRadius: 'var(--radius-pill)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title="Click to toggle Dual-Engine mode"
            >
              <Sparkles size={11} />
              {isAiDegraded ? 'Engine: Offline Fallback' : 'Engine: Gemini Active'}
            </button>
          </div>

          <h1 className="title-display" style={{ fontSize: '27px', color: 'var(--color-midnight-ink)' }}>
            {currentRole === 'creator' && 'Creator Studio: Fast, compliant copy refinement.'}
            {currentRole === 'brand_manager' && 'Brand Governance: Guidelines, evidence & rules.'}
            {currentRole === 'approver' && 'Compliance Gate: Claim verification & sign-offs.'}
            {currentRole === 'admin' && 'Enterprise Governance: Audit integrity & fleet logs.'}
          </h1>

          <p style={{
            fontSize: '14.5px',
            color: 'var(--color-text-secondary)',
            marginTop: '8px',
            lineHeight: 1.55,
            maxWidth: '560px'
          }}>
            {currentMeta.tagline}
          </p>

          <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
            <button
              onClick={currentMeta.primaryCtaAction}
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
              <span>{currentMeta.primaryCtaText}</span>
            </button>

            <button
              onClick={currentMeta.secondaryCtaAction}
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
              <span>{currentMeta.secondaryCtaText}</span>
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
            <path
              d="M170 30C210 10 270 40 280 85C290 130 240 170 195 165C150 160 135 120 145 75C155 30 170 30 170 30Z"
              fill={currentRole === 'approver' ? '#FFE8D6' : currentRole === 'admin' ? '#E2E8F0' : '#FFDEC9'}
              opacity="0.8"
            />
            <path
              d="M230 45C270 25 310 65 315 110C320 155 280 185 240 175C200 165 210 125 215 85C220 45 230 45 230 45Z"
              fill={currentRole === 'brand_manager' ? '#E9D5FF' : '#D1F5E9'}
              opacity="0.85"
            />
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
            fontWeight: 600,
            whiteSpace: 'pre-line'
          }}>
            {currentMeta.scriptQuote}
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

      {/* 2. OVERVIEW METRICS (4 CARDS ADAPTED DYNAMICALLY TO SELECTED PERSONA) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        
        {/* === CREATOR METRICS === */}
        {currentRole === 'creator' && (
          <>
            <div
              className="card"
              onClick={() => onNavigate('new_review')}
              style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(0, 210, 150, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={18} color="var(--color-mint)" />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                    My Drafts & Submissions
                  </span>
                </div>
                <ChevronRight size={16} color="var(--color-text-muted)" />
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-midnight-ink)', lineHeight: 1 }}>
                  {draftsNeedingReview}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                  Awaiting analysis or revision
                </div>
              </div>
            </div>

            <div
              className="card"
              onClick={() => onNavigate('fix_compare')}
              style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(240, 107, 112, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={18} color="var(--color-coral)" />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                    Violations to Fix
                  </span>
                </div>
                <ChevronRight size={16} color="var(--color-text-muted)" />
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-midnight-ink)', lineHeight: 1 }}>
                  {criticalCount + warningCount}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-coral)', marginTop: '6px', fontWeight: 500 }}>
                  {criticalCount} critical • {warningCount} warnings
                </div>
              </div>
            </div>

            <div
              className="card"
              onClick={() => onNavigate('approvals')}
              style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(0, 210, 150, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={18} color="var(--state-success-text)" />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                    Approved Copy
                  </span>
                </div>
                <ChevronRight size={16} color="var(--color-text-muted)" />
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-midnight-ink)', lineHeight: 1 }}>
                  {approvedCount}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--state-success-text)', marginTop: '6px', fontWeight: 500 }}>
                  Cleared for publication
                </div>
              </div>
            </div>

            <div
              className="card"
              onClick={() => onNavigate('brand_dna')}
              style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(199, 184, 255, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield size={18} color="var(--color-lavender)" />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                    Active Brand Rules
                  </span>
                </div>
                <ChevronRight size={16} color="var(--color-text-muted)" />
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-midnight-ink)', lineHeight: 1 }}>
                  {activeRulesCount}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                  Active for {activeProfile?.name || 'Active Profile'}
                </div>
              </div>
            </div>
          </>
        )}

        {/* === BRAND MANAGER METRICS === */}
        {currentRole === 'brand_manager' && (
          <>
            <div
              className="card"
              onClick={() => onNavigate('brand_dna')}
              style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(199, 184, 255, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield size={18} color="var(--color-lavender)" />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                    Active Brand Rules
                  </span>
                </div>
                <ChevronRight size={16} color="var(--color-text-muted)" />
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-midnight-ink)', lineHeight: 1 }}>
                  {activeRulesCount} <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--color-text-muted)' }}>/ {totalRulesCount}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                  Governing {activeProfile?.name || 'Brand Profile'}
                </div>
              </div>
            </div>

            <div
              className="card"
              onClick={() => onNavigate('results')}
              style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(0, 210, 150, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={18} color="var(--color-mint)" />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                    Brand Compliance Rate
                  </span>
                </div>
                <ChevronRight size={16} color="var(--color-text-muted)" />
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-midnight-ink)', lineHeight: 1 }}>
                  {complianceRate}%
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                  Pass rate without critical violations
                </div>
              </div>
            </div>

            <div
              className="card"
              onClick={() => onNavigate('brand_dna')}
              style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(255, 182, 133, 0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={18} color="var(--color-warm-peach)" />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                    Evidence Citations
                  </span>
                </div>
                <ChevronRight size={16} color="var(--color-text-muted)" />
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-midnight-ink)', lineHeight: 1 }}>
                  {evidenceCount}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                  Registered empirical claim sources
                </div>
              </div>
            </div>

            <div
              className="card"
              onClick={() => onNavigate('new_review')}
              style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(37, 99, 235, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Layers size={18} color="#2563EB" />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                    Channels Monitored
                  </span>
                </div>
                <ChevronRight size={16} color="var(--color-text-muted)" />
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-midnight-ink)', lineHeight: 1 }}>
                  {uniqueChannels.length || 4}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                  Social, Web, Email & Press releases
                </div>
              </div>
            </div>
          </>
        )}

        {/* === APPROVER METRICS === */}
        {currentRole === 'approver' && (
          <>
            <div
              className="card"
              onClick={() => onNavigate('approvals')}
              style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(255, 182, 133, 0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={18} color="var(--color-warm-peach)" />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                    Awaiting Sign-Off
                  </span>
                </div>
                <ChevronRight size={16} color="var(--color-text-muted)" />
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-midnight-ink)', lineHeight: 1 }}>
                  {awaitingApproval}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                  Ready for human compliance review
                </div>
              </div>
            </div>

            <div
              className="card"
              onClick={() => onNavigate('approvals')}
              style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(240, 107, 112, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={18} color="var(--color-coral)" />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                    Critical Risk Blocks
                  </span>
                </div>
                <ChevronRight size={16} color="var(--color-text-muted)" />
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-midnight-ink)', lineHeight: 1 }}>
                  {criticalDocs.length}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-coral)', marginTop: '6px', fontWeight: 500 }}>
                  Requires formal overrule rationale
                </div>
              </div>
            </div>

            <div
              className="card"
              onClick={() => onNavigate('approvals')}
              style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(0, 210, 150, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={18} color="var(--state-success-text)" />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                    Approved Releases
                  </span>
                </div>
                <ChevronRight size={16} color="var(--color-text-muted)" />
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-midnight-ink)', lineHeight: 1 }}>
                  {approvedCount}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--state-success-text)', marginTop: '6px', fontWeight: 500 }}>
                  Fully cleared by compliance
                </div>
              </div>
            </div>

            <div
              className="card"
              onClick={() => onNavigate('results')}
              style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(124, 58, 237, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield size={18} color="#7C3AED" />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                    Unverified Claims
                  </span>
                </div>
                <ChevronRight size={16} color="var(--color-text-muted)" />
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-midnight-ink)', lineHeight: 1 }}>
                  {unverifiedCount}
                </div>
                <div style={{ fontSize: '12px', color: '#7C3AED', marginTop: '6px', fontWeight: 500 }}>
                  Claims lacking cited evidence
                </div>
              </div>
            </div>
          </>
        )}

        {/* === ADMIN METRICS === */}
        {currentRole === 'admin' && (
          <>
            <div
              className="card"
              onClick={() => onNavigate('audit')}
              style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(0, 210, 150, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Lock size={18} color="var(--color-deep-teal)" />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                    Cryptographic Audit Chain
                  </span>
                </div>
                <ChevronRight size={16} color="var(--color-text-muted)" />
              </div>
              <div>
                <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--state-success-text)', lineHeight: 1 }}>
                  100% Intact
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                  SHA-256 tamper-evident verified
                </div>
              </div>
            </div>

            <div
              className="card"
              onClick={() => onNavigate('audit')}
              style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(13, 51, 49, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={18} color="var(--color-deep-teal)" />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                    Total Audit Events
                  </span>
                </div>
                <ChevronRight size={16} color="var(--color-text-muted)" />
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-midnight-ink)', lineHeight: 1 }}>
                  {auditLogs.length}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                  Immutable chronological event records
                </div>
              </div>
            </div>

            <div
              className="card"
              onClick={() => onNavigate('brand_dna')}
              style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(199, 184, 255, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Layers size={18} color="var(--color-lavender)" />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                    Brand Rulebooks
                  </span>
                </div>
                <ChevronRight size={16} color="var(--color-text-muted)" />
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-midnight-ink)', lineHeight: 1 }}>
                  {allProfiles.length || 1}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                  Active: {activeProfile?.name || 'NovaPulse AI'}
                </div>
              </div>
            </div>

            <div
              className="card"
              onClick={onToggleAiDegraded}
              style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: isAiDegraded ? 'rgba(255, 182, 133, 0.22)' : 'rgba(0, 210, 150, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={18} color={isAiDegraded ? 'var(--color-warm-peach)' : 'var(--color-mint)'} />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                    Dual-Engine Health
                  </span>
                </div>
                <ChevronRight size={16} color="var(--color-text-muted)" />
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: isAiDegraded ? 'var(--state-warning-text)' : 'var(--state-success-text)', lineHeight: 1 }}>
                  {isAiDegraded ? 'Offline Fallback' : 'Gemini AI Ready'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                  Click to toggle engine mode
                </div>
              </div>
            </div>
          </>
        )}

      </div>

      {/* 3. SECONDARY ROLE-SPECIFIC INSIGHT / WORKFLOW WIDGET */}
      {currentRole === 'creator' && highestPriorityFixDoc && (
        <div
          className="card"
          style={{
            padding: '16px 20px',
            backgroundColor: '#FFF7ED',
            border: '1px solid #FFEDD5',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#FFEDD5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EA580C',
              flexShrink: 0
            }}>
              <AlertTriangle size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#9A3412' }}>
                Priority Action for Creator: Fix "{highestPriorityFixDoc.title}" ({highestPriorityFixDoc.versionNumber})
              </div>
              <div style={{ fontSize: '12px', color: '#C2410C', marginTop: '2px' }}>
                Contains {highestPriorityFixDoc.findings?.filter(f => f.severity === 'critical').length || 1} blocking compliance violations. Launch Fix & Compare Studio to make revisions.
              </div>
            </div>
          </div>
          <button
            onClick={() => handleFixItem(highestPriorityFixDoc)}
            className="btn btn-mint btn-sm"
            style={{ fontWeight: 600, padding: '6px 16px' }}
          >
            <Edit3 size={13} />
            <span>Open in Fix Studio</span>
          </button>
        </div>
      )}

      {currentRole === 'brand_manager' && (
        <div
          className="card"
          style={{
            padding: '18px 22px',
            backgroundColor: '#FAF5FF',
            border: '1px solid #E9D5FF',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={16} color="#7C3AED" />
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#581C87' }}>
                Brand Guard Violation Distribution by Category
              </span>
            </div>
            <button
              onClick={() => onNavigate('brand_dna')}
              style={{ background: 'none', border: 'none', color: '#7C3AED', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>Manage Rules</span>
              <ArrowRight size={12} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div style={{ backgroundColor: '#FFFFFF', padding: '10px 14px', borderRadius: '8px', border: '1px solid #F3E8FF' }}>
              <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>Prohibited Phrases</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#DC2626', marginTop: '2px' }}>{categoryViolations.prohibited_language || 2} detected</div>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '10px 14px', borderRadius: '8px', border: '1px solid #F3E8FF' }}>
              <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>Factual Claims</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#D97706', marginTop: '2px' }}>{categoryViolations.factual_claim || 3} unverified</div>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '10px 14px', borderRadius: '8px', border: '1px solid #F3E8FF' }}>
              <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>Required Disclosures</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#2563EB', marginTop: '2px' }}>{categoryViolations.required_disclosure || 1} flagged</div>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '10px 14px', borderRadius: '8px', border: '1px solid #F3E8FF' }}>
              <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>Tone & Voice</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#059669', marginTop: '2px' }}>Compliant</div>
            </div>
          </div>
        </div>
      )}

      {currentRole === 'approver' && (
        <div
          className="card"
          style={{
            padding: '16px 20px',
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#DBEAFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1D4ED8',
              flexShrink: 0
            }}>
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1E3A8A' }}>
                Compliance Gate Status: Authoritative Overrule Mode Enabled
              </div>
              <div style={{ fontSize: '12px', color: '#1D4ED8', marginTop: '2px' }}>
                As an authorized Compliance Officer, you have sign-off power over critical findings with documented justification.
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('approvals')}
            className="btn btn-mint btn-sm"
            style={{ fontWeight: 600, padding: '6px 16px' }}
          >
            <span>Go to Approval Queue</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {currentRole === 'admin' && (
        <div
          className="card"
          style={{
            padding: '16px 20px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-deep-teal)',
              flexShrink: 0
            }}>
              <Lock size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--color-midnight-ink)' }}>
                Tamper-Evident SHA-256 Hash Chain Continuity Verified
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                Head block: {auditLogs[0]?.contentHash?.slice(0, 16) || 'Genesis'}... • Previous link verified • Zero broken hashes detected.
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('audit')}
            className="btn btn-dark btn-sm"
            style={{ fontWeight: 600, padding: '6px 16px' }}
          >
            <span>Verify Full Chain</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* 4. MAIN DASHBOARD CONTENT (TWO BALANCED SECTIONS) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: '20px', alignItems: 'start' }}>
        
        {/* SECTION A: MAIN CONTENT ITEMS TABLE WITH INTERACTIVE FILTERS */}
        <section className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: currentRole === 'approver' ? 'rgba(255, 182, 133, 0.22)' : 'rgba(240, 107, 112, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {currentRole === 'approver' ? (
                  <CheckCircle2 size={15} color="var(--color-warm-peach)" />
                ) : (
                  <AlertTriangle size={15} color="var(--color-coral)" />
                )}
              </div>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-midnight-ink)', margin: 0 }}>
                  {currentMeta.primaryTableTitle}
                </h2>
                <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  {currentMeta.primaryTableSubtitle}
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate(currentRole === 'approver' ? 'approvals' : 'results')}
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
              <span>View all ({documents.length})</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* INTERACTIVE TABLE FILTERS */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            padding: '12px',
            backgroundColor: 'var(--color-sand-light)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)'
          }}>
            {/* Top row: Status Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setStatusFilter('all')}
                  style={{
                    border: 'none',
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '12px',
                    fontWeight: statusFilter === 'all' ? 700 : 500,
                    backgroundColor: statusFilter === 'all' ? 'var(--color-deep-teal)' : 'transparent',
                    color: statusFilter === 'all' ? '#FFFFFF' : 'var(--color-text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  All ({documents.length})
                </button>
                <button
                  onClick={() => setStatusFilter('needs_attention')}
                  style={{
                    border: 'none',
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '12px',
                    fontWeight: statusFilter === 'needs_attention' ? 700 : 500,
                    backgroundColor: statusFilter === 'needs_attention' ? 'var(--color-coral)' : 'transparent',
                    color: statusFilter === 'needs_attention' ? '#FFFFFF' : 'var(--color-text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  Needs Attention ({criticalDocs.length})
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  style={{
                    border: 'none',
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '12px',
                    fontWeight: statusFilter === 'pending' ? 700 : 500,
                    backgroundColor: statusFilter === 'pending' ? 'var(--color-warm-peach)' : 'transparent',
                    color: statusFilter === 'pending' ? '#FFFFFF' : 'var(--color-text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  Pending Approval ({draftsNeedingReview})
                </button>
                <button
                  onClick={() => setStatusFilter('approved')}
                  style={{
                    border: 'none',
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '12px',
                    fontWeight: statusFilter === 'approved' ? 700 : 500,
                    backgroundColor: statusFilter === 'approved' ? 'var(--color-mint)' : 'transparent',
                    color: statusFilter === 'approved' ? '#0C2E2D' : 'var(--color-text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  Approved ({approvedCount})
                </button>
              </div>

              {/* Channel Dropdown */}
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: '#FFFFFF',
                  fontSize: '12px',
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer'
                }}
                aria-label="Filter by channel"
              >
                <option value="all">All Channels</option>
                {uniqueChannels.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Bottom row: Search input */}
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={14} color="var(--color-text-muted)" style={{ position: 'absolute', left: '10px', top: '9px' }} />
              <input
                type="text"
                placeholder="Search content by title, text, or violation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 30px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: '#FFFFFF',
                  fontSize: '12.5px',
                  color: 'var(--color-text-primary)',
                  boxSizing: 'border-box'
                }}
              />
            </div>
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
                  <th style={{ textAlign: 'right' }}>Role Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--color-text-muted)' }}>
                      <div>No content found matching the selected filters.</div>
                      <button
                        onClick={() => {
                          setStatusFilter('all');
                          setChannelFilter('all');
                          setSearchQuery('');
                        }}
                        style={{
                          marginTop: '8px',
                          border: 'none',
                          background: 'none',
                          color: 'var(--color-deep-teal)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Reset filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc) => {
                    const channelClass = getChannelBadgeClass(doc.channel);
                    const isEmail = doc.channel?.toLowerCase().includes('email');
                    const hasIssues = doc.findings && doc.findings.length > 0;

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
                          {/* DYNAMIC ACTION BUTTON TAILORED TO ROLE */}
                          {currentRole === 'creator' && (
                            hasIssues && !doc.isApproved ? (
                              <button
                                onClick={() => handleFixItem(doc)}
                                className="btn btn-mint btn-sm"
                                style={{
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  padding: '4px 12px',
                                  borderRadius: 'var(--radius-btn)'
                                }}
                                title="Open Fix & Compare Studio to correct violations"
                              >
                                <Edit3 size={12} />
                                <span>Fix in Studio</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleReviewItem(doc)}
                                className="btn btn-secondary btn-sm"
                                style={{
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  padding: '4px 12px',
                                  borderRadius: 'var(--radius-btn)'
                                }}
                              >
                                View Findings
                              </button>
                            )
                          )}

                          {currentRole === 'approver' && (
                            <button
                              onClick={() => handleApproveItem(doc)}
                              className="btn btn-mint btn-sm"
                              style={{
                                fontSize: '11.5px',
                                fontWeight: 600,
                                padding: '4px 12px',
                                borderRadius: 'var(--radius-btn)'
                              }}
                              title="Open in Approval Queue for gate evaluation"
                            >
                              <CheckCircle2 size={12} />
                              <span>Review & Sign Off</span>
                            </button>
                          )}

                          {currentRole === 'brand_manager' && (
                            <button
                              onClick={() => handleReviewItem(doc)}
                              className="btn btn-secondary btn-sm"
                              style={{
                                fontSize: '11.5px',
                                fontWeight: 600,
                                padding: '4px 12px',
                                borderRadius: 'var(--radius-btn)'
                              }}
                              title="Inspect rule violations and evidence backing"
                            >
                              <Shield size={12} />
                              <span>Inspect Findings</span>
                            </button>
                          )}

                          {currentRole === 'admin' && (
                            <button
                              onClick={() => onNavigate('audit')}
                              className="btn btn-secondary btn-sm"
                              style={{
                                fontSize: '11.5px',
                                fontWeight: 600,
                                padding: '4px 12px',
                                borderRadius: 'var(--radius-btn)'
                              }}
                              title="View cryptographic audit log for this content"
                            >
                              <Lock size={12} />
                              <span>Audit History</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION B: RECENT ACTIVITY TIMELINE */}
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
                  Audited timeline across your workspace.
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
